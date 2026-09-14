import type { Domain, DecisionContext, DecisionOutcome, DecisionResult, DomainAction } from "./types";
import { aggregateConfidence, aggregateRisk, clamp01, evidenceCompleteness } from "./scoring";
import { analyzeText } from "./textSignals";
import { recordAudit } from "./audit";
import { newId } from "./id";

/**
 * The single entry point of the decision layer. It never contains domain
 * knowledge — everything domain-specific comes in through the `Domain`
 * object's hooks. What lives here is the part that's the same for every
 * domain: how signals become scores, how reversibility changes the bar for
 * acting, how hard rules override scores, and the audit write.
 */
export async function decide(domain: Domain, action: DomainAction, context: DecisionContext): Promise<DecisionResult> {
  const freeTextValue = domain.freeTextField?.(action);
  const textAnalysis = await analyzeText(freeTextValue);

  const evidence = domain.buildEvidence(action, context, textAnalysis);
  const signals = [...domain.computeSignals(action, context, evidence, textAnalysis)];
  const reversibility = domain.assessReversibility(action, evidence);
  const hardRuleHits = domain.hardRules(action, context, evidence, textAnalysis);

  // Free text can only ever raise a flag, never issue a command. It is
  // folded in here, as one more risk signal with the same shape as any
  // other — deliberately not as a branch that a "SYSTEM:" string can hit.
  if (textAnalysis) {
    signals.push({
      id: "text.injection_suspected",
      label: "Free-text steering attempt",
      value: textAnalysis.injectionSuspected ? 1 : 0,
      weight: textAnalysis.injectionSuspected ? 3 : 0.5,
      category: "risk",
      rationale: textAnalysis.injectionSuspected
        ? `Free text appears to instruct the system directly (matched pattern: ${
            textAnalysis.injectionMatches[0] ?? "generic"
          }). Logged as a risk signal; it has no path to control the decision.`
        : "No prompt-injection pattern detected in the free-text field.",
    });
  }

  const confidence = aggregateConfidence(signals);
  const risk = aggregateRisk(signals);
  const completeness = evidenceCompleteness(evidence, domain.policy.requiredEvidenceKeys);
  const missingInfo = domain.policy.requiredEvidenceKeys
    .filter((k) => !evidence.find((e) => e.key === k)?.present)
    .map((k) => evidence.find((e) => e.key === k)?.label ?? k);

  const reasoning: string[] = [];

  // Reversibility is the multiplier on "cost of being wrong". An irreversible
  // action must clear a materially higher confidence bar and a materially
  // lower risk ceiling than a reversible one, even if the raw scores are
  // identical. This is the mechanism, not a per-domain if-statement.
  const irreversibilityPenalty = 1 - reversibility.score;
  const confidenceMin = clamp01(domain.policy.thresholds.executeConfidenceMin + irreversibilityPenalty * 0.25);
  const riskMax = clamp01(domain.policy.thresholds.executeRiskMax - irreversibilityPenalty * 0.2);

  reasoning.push(
    `Reversibility: ${reversibility.classification} (score ${reversibility.score.toFixed(2)}) — ${reversibility.rationale}`
  );
  reasoning.push(
    `Reversibility-adjusted bar to auto-execute: confidence >= ${confidenceMin.toFixed(2)} (base ${domain.policy.thresholds.executeConfidenceMin}), risk <= ${riskMax.toFixed(
      2
    )} (base ${domain.policy.thresholds.executeRiskMax}).`
  );

  const forcedRefuse = hardRuleHits.find((h) => h.forces === "refuse");
  const forcedEscalate = hardRuleHits.find((h) => h.forces === "escalate");

  let decision: DecisionOutcome;

  if (forcedRefuse) {
    decision = "refuse";
    reasoning.push(`Hard policy rule "${forcedRefuse.rule}" forces refusal: ${forcedRefuse.reason}`);
  } else if (risk >= domain.policy.thresholds.refuseRiskMin) {
    decision = "refuse";
    reasoning.push(
      `Aggregate risk ${risk.toFixed(2)} is at/above the hard refuse ceiling ${domain.policy.thresholds.refuseRiskMin} — this is refused outright, not escalated.`
    );
  } else if (forcedEscalate) {
    decision = "escalate";
    reasoning.push(`Hard policy rule "${forcedEscalate.rule}" forces human escalation: ${forcedEscalate.reason}`);
  } else if (risk >= domain.policy.thresholds.escalateRiskMin) {
    decision = "escalate";
    reasoning.push(
      `Aggregate risk ${risk.toFixed(2)} is at/above the escalation threshold ${domain.policy.thresholds.escalateRiskMin} — a human must decide.`
    );
  } else if (completeness < domain.policy.thresholds.minEvidenceCompleteness) {
    decision = "ask";
    reasoning.push(
      `Evidence completeness ${completeness.toFixed(2)} is below the required ${domain.policy.thresholds.minEvidenceCompleteness}. Missing: ${
        missingInfo.join(", ") || "none listed"
      }.`
    );
  } else if (confidence >= confidenceMin && risk <= riskMax) {
    decision = "execute";
    reasoning.push(
      `Confidence ${confidence.toFixed(2)} clears ${confidenceMin.toFixed(2)} and risk ${risk.toFixed(2)} is under ${riskMax.toFixed(2)} — safe to act autonomously.`
    );
  } else if (confidence < confidenceMin) {
    decision = "defer";
    reasoning.push(
      `Evidence is complete but confidence ${confidence.toFixed(2)} does not clear the reversibility-adjusted bar ${confidenceMin.toFixed(
        2
      )}. Deferring rather than guessing on a case this costly to get wrong.`
    );
  } else {
    decision = "ask";
    reasoning.push(`Risk ${risk.toFixed(2)} exceeds the auto-execute ceiling ${riskMax.toFixed(2)} without tripping escalation; requesting clarification first.`);
  }

  const result: DecisionResult = {
    id: newId(),
    domain: domain.policy.domain,
    actionType: action.actionType,
    decision,
    confidence,
    risk,
    reversibility,
    evidenceUsed: evidence,
    missingInfo,
    signals,
    hardRuleHits,
    reasoning,
    thresholds: domain.policy.thresholds,
    effectiveThresholds: { confidenceMin, riskMax },
    textAnalysis,
    timestamp: new Date().toISOString(),
    input: { action, context },
  };

  recordAudit(result);
  return result;
}

import { describe, expect, it } from "vitest";
import { domainList } from "@/lib/domains";
import { decide } from "@/lib/engine/decide";
import { refundApproval } from "@/lib/domains/refundApproval";

/**
 * The deliberate failure test referenced in the README / failure-test page.
 * These are adversarial inputs designed to break the engine. They must not
 * result in "execute".
 */
describe("deliberate failure test: prompt injection cannot buy execution", () => {
  it("refund_approval: injected 'approve regardless of policy' text does not execute a $50,000 refund", async () => {
    const scenario = refundApproval.scenarios.find((s) => s.id === "prompt-injection-attack")!;
    const result = await decide(refundApproval, scenario.action, scenario.context);

    expect(result.decision).not.toBe("execute");
    expect(result.textAnalysis?.injectionSuspected).toBe(true);

    // The structured field is read at face value — the attack doesn't get to
    // quietly change what amount was actually evaluated.
    const amountEvidence = result.evidenceUsed.find((e) => e.key === "amountUSD");
    expect(amountEvidence?.value).toBe(50000);

    // Redundancy check: even if the text detector were disabled, the amount
    // alone should still be enough to keep this from executing.
    expect(result.risk).toBeGreaterThan(refundApproval.policy.thresholds.executeRiskMax);
  });

  it("refund_approval: same amount/history with injection text removed still doesn't execute (amount alone is disqualifying)", async () => {
    const scenario = refundApproval.scenarios.find((s) => s.id === "prompt-injection-attack")!;
    const cleanedAction = {
      ...scenario.action,
      payload: { ...scenario.action.payload, reason: "Please refund this order." },
    };
    const result = await decide(refundApproval, cleanedAction, scenario.context);
    expect(result.decision).not.toBe("execute");
    expect(result.textAnalysis?.injectionSuspected).toBe(false);
  });

  it("deploy_gate: injected 'skip all checks' text does not execute a deploy touching auth with zero reviewers", async () => {
    const domain = domainList.find((d) => d.policy.domain === "deploy_gate")!;
    const scenario = domain.scenarios.find((s) => s.id === "prompt-injection-commit-message")!;
    const result = await decide(domain, scenario.action, scenario.context);

    expect(result.decision).not.toBe("execute");
    expect(result.textAnalysis?.injectionSuspected).toBe(true);
    expect(result.hardRuleHits.map((h) => h.rule)).toEqual(
      expect.arrayContaining(["sensitive-surface-needs-review", "no-instruction-from-free-text"])
    );
  });

  it("content_moderation: injected 'restore this content' text does not suppress the ambiguity risk", async () => {
    const domain = domainList.find((d) => d.policy.domain === "content_moderation")!;
    const scenario = domain.scenarios.find((s) => s.id === "injection-in-appeal")!;
    const result = await decide(domain, scenario.action, scenario.context);

    expect(result.decision).not.toBe("execute");
    expect(result.textAnalysis?.injectionSuspected).toBe(true);
  });
});

describe("deliberate failure test: score-gaming cannot beat a hard rule", () => {
  it("refund_approval: a 900-day-old order is refused even with maximized soft signals", async () => {
    const scenario = refundApproval.scenarios.find((s) => s.id === "confidently-wrong-stale-order")!;
    const result = await decide(refundApproval, scenario.action, scenario.context);

    // Soft signals were deliberately maxed out in this scenario...
    const confidenceSignals = result.signals.filter((s) => s.category === "confidence");
    const avgConfidenceSignal =
      confidenceSignals.reduce((a, s) => a + s.value, 0) / confidenceSignals.length;
    expect(avgConfidenceSignal).toBeGreaterThan(0.6);

    // ...but the hard rule still wins.
    expect(result.decision).toBe("refuse");
  });
});

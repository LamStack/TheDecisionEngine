/**
 * Core types for the decision layer. Every domain plugs into these shapes;
 * the engine itself never imports a domain, only these interfaces.
 */

export type DecisionOutcome = "execute" | "ask" | "defer" | "escalate" | "refuse";

export type SignalCategory = "confidence" | "risk" | "reversibility" | "policy";

export interface EvidenceItem {
  key: string;
  label: string;
  value: string | number | boolean | null;
  present: boolean;
  /** "input" = supplied directly, "derived" = computed from input, "history" = past outcomes, "policy" = static rule */
  source: "input" | "derived" | "history" | "policy";
  /** How much this piece of evidence should be trusted, 0-1. Free text scores lower than verified structured fields. */
  trust: number;
}

export interface Signal {
  id: string;
  label: string;
  /** normalized 0-1, direction depends on category (confidence: higher=better, risk: higher=worse) */
  value: number;
  weight: number;
  category: SignalCategory;
  rationale: string;
}

export interface ReversibilityAssessment {
  /** 0 = irreversible, 1 = fully and cheaply reversible */
  score: number;
  classification: "reversible" | "costly-to-reverse" | "irreversible";
  rationale: string;
}

export interface DomainAction {
  domain: string;
  actionType: string;
  summary: string;
  payload: Record<string, unknown>;
}

export interface HistoricalOutcome {
  actionType: string;
  outcome: "success" | "failure" | "reversed";
  timestamp: string;
}

export interface DecisionContext {
  requestedBy: string;
  timestamp: string;
  /** free-form fields that don't belong to the structured payload (notes, message bodies, etc) */
  notes?: string;
  history?: HistoricalOutcome[];
}

export interface PolicyThresholds {
  /** minimum confidence to auto-execute, before reversibility adjustment */
  executeConfidenceMin: number;
  /** maximum risk to auto-execute, before reversibility adjustment */
  executeRiskMax: number;
  /** risk at/above this forces human escalation regardless of confidence */
  escalateRiskMin: number;
  /** risk at/above this is refused outright (hard ceiling, not just escalated) */
  refuseRiskMin: number;
  /** evidence completeness below this blocks execution and asks for more info */
  minEvidenceCompleteness: number;
}

export interface HardRuleHit {
  rule: string;
  reason: string;
  /** hard rules can force refuse or force escalate; they never force execute */
  forces: "refuse" | "escalate";
}

export interface TextAnalysis {
  /** heuristic or LLM-derived signal: does the free text look like it's trying to steer the decision? */
  injectionSuspected: boolean;
  injectionMatches: string[];
  urgency: number; // 0-1
  sentiment: number; // -1..1
  source: "heuristic" | "llm";
}

export interface DecisionResult {
  id: string;
  domain: string;
  actionType: string;
  decision: DecisionOutcome;
  confidence: number;
  risk: number;
  reversibility: ReversibilityAssessment;
  evidenceUsed: EvidenceItem[];
  missingInfo: string[];
  signals: Signal[];
  hardRuleHits: HardRuleHit[];
  reasoning: string[];
  thresholds: PolicyThresholds;
  effectiveThresholds: { confidenceMin: number; riskMax: number };
  textAnalysis?: TextAnalysis;
  timestamp: string;
  input: {
    action: DomainAction;
    context: DecisionContext;
  };
}

export interface DomainPolicy {
  domain: string;
  label: string;
  description: string;
  thresholds: PolicyThresholds;
  requiredEvidenceKeys: string[];
  /** action types considered inherently hard to undo, before payload-level adjustment */
  irreversibleActionTypes: string[];
  costlyActionTypes: string[];
}

export interface DomainScenario {
  id: string;
  label: string;
  description: string;
  action: DomainAction;
  context: DecisionContext;
  /** what a human reviewer would expect the engine to do — shown in the demo UI, not enforced */
  expectedHint: string;
}

/**
 * A Domain is a self-contained policy + signal extractor. The engine core
 * (decide.ts) never contains domain knowledge — it only calls these hooks.
 * Adding a new domain means writing one of these and registering it; the
 * decision logic in decide.ts does not change.
 */
export interface Domain {
  policy: DomainPolicy;
  actionTypes: string[];
  /** which payload field (if any) should be run through free-text analysis */
  freeTextField?: (action: DomainAction) => string | undefined;
  buildEvidence: (action: DomainAction, context: DecisionContext, textAnalysis?: TextAnalysis) => EvidenceItem[];
  computeSignals: (
    action: DomainAction,
    context: DecisionContext,
    evidence: EvidenceItem[],
    textAnalysis?: TextAnalysis
  ) => Signal[];
  assessReversibility: (action: DomainAction, evidence: EvidenceItem[]) => ReversibilityAssessment;
  hardRules: (
    action: DomainAction,
    context: DecisionContext,
    evidence: EvidenceItem[],
    textAnalysis?: TextAnalysis
  ) => HardRuleHit[];
  scenarios: DomainScenario[];
}

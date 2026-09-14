import { describe, expect, it } from "vitest";
import { aggregateConfidence, aggregateRisk, evidenceCompleteness, clamp01 } from "@/lib/engine/scoring";
import type { EvidenceItem, Signal } from "@/lib/engine/types";

describe("clamp01", () => {
  it("clamps to [0,1]", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(NaN)).toBe(0);
  });
});

describe("aggregateConfidence", () => {
  it("defaults to 0.5 with no confidence signals", () => {
    expect(aggregateConfidence([])).toBe(0.5);
  });

  it("computes a weighted average of confidence signals only", () => {
    const signals: Signal[] = [
      { id: "a", label: "a", value: 1, weight: 1, category: "confidence", rationale: "" },
      { id: "b", label: "b", value: 0, weight: 1, category: "confidence", rationale: "" },
      { id: "c", label: "c", value: 0, weight: 99, category: "risk", rationale: "" },
    ];
    expect(aggregateConfidence(signals)).toBeCloseTo(0.5);
  });

  it("weights higher-weight signals more", () => {
    const signals: Signal[] = [
      { id: "a", label: "a", value: 1, weight: 3, category: "confidence", rationale: "" },
      { id: "b", label: "b", value: 0, weight: 1, category: "confidence", rationale: "" },
    ];
    expect(aggregateConfidence(signals)).toBeCloseTo(0.75);
  });
});

describe("aggregateRisk", () => {
  it("defaults to 0.5 with no risk signals", () => {
    expect(aggregateRisk([])).toBe(0.5);
  });

  it("ignores confidence signals", () => {
    const signals: Signal[] = [
      { id: "a", label: "a", value: 1, weight: 5, category: "confidence", rationale: "" },
      { id: "b", label: "b", value: 0.2, weight: 1, category: "risk", rationale: "" },
    ];
    expect(aggregateRisk(signals)).toBeCloseTo(0.2);
  });
});

describe("evidenceCompleteness", () => {
  it("is 1 when there are no required keys", () => {
    expect(evidenceCompleteness([], [])).toBe(1);
  });

  it("counts only present evidence for required keys", () => {
    const evidence: EvidenceItem[] = [
      { key: "a", label: "a", value: 1, present: true, source: "input", trust: 1 },
      { key: "b", label: "b", value: null, present: false, source: "input", trust: 0 },
      { key: "c", label: "c", value: "x", present: true, source: "input", trust: 1 },
    ];
    expect(evidenceCompleteness(evidence, ["a", "b"])).toBeCloseTo(0.5);
    expect(evidenceCompleteness(evidence, ["a", "c"])).toBeCloseTo(1);
    expect(evidenceCompleteness(evidence, ["a", "b", "missing-key"])).toBeCloseTo(1 / 3);
  });
});

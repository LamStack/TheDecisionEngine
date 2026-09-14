import type { EvidenceItem, Signal } from "./types";

export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Weighted average of all "confidence" signals. Higher = more sure the action is correct. */
export function aggregateConfidence(signals: Signal[]): number {
  const relevant = signals.filter((s) => s.category === "confidence");
  if (relevant.length === 0) return 0.5;
  const totalWeight = relevant.reduce((a, s) => a + s.weight, 0) || 1;
  return clamp01(relevant.reduce((a, s) => a + s.value * s.weight, 0) / totalWeight);
}

/** Weighted average of all "risk" signals. Higher = more dangerous / costly if wrong. */
export function aggregateRisk(signals: Signal[]): number {
  const relevant = signals.filter((s) => s.category === "risk");
  if (relevant.length === 0) return 0.5;
  const totalWeight = relevant.reduce((a, s) => a + s.weight, 0) || 1;
  return clamp01(relevant.reduce((a, s) => a + s.value * s.weight, 0) / totalWeight);
}

/** Fraction of the domain's required evidence keys that are actually present. */
export function evidenceCompleteness(evidence: EvidenceItem[], requiredKeys: string[]): number {
  if (requiredKeys.length === 0) return 1;
  const present = requiredKeys.filter((k) => evidence.find((e) => e.key === k)?.present).length;
  return present / requiredKeys.length;
}

import type { EvidenceItem } from "@/lib/engine/types";

export type { Domain, DomainScenario } from "@/lib/engine/types";

export function ev(
  key: string,
  label: string,
  value: string | number | boolean | null | undefined,
  opts: Partial<Pick<EvidenceItem, "source" | "trust">> = {}
): EvidenceItem {
  const present = value !== undefined && value !== null && value !== "";
  return {
    key,
    label,
    value: value ?? null,
    present,
    source: opts.source ?? "input",
    trust: opts.trust ?? (present ? 0.9 : 0),
  };
}

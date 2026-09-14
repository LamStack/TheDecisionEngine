import type { DecisionOutcome } from "@/lib/engine/types";

const STYLES: Record<DecisionOutcome, { bg: string; text: string; border: string; icon: string }> = {
  execute: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/40", icon: "✓" },
  ask: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/40", icon: "?" },
  defer: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/40", icon: "⏸" },
  escalate: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/40", icon: "⚠" },
  refuse: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/40", icon: "✕" },
};

export function DecisionBadge({ decision, size = "md" }: { decision: DecisionOutcome; size?: "sm" | "md" | "lg" }) {
  const s = STYLES[decision];
  const sizeCls = size === "lg" ? "px-4 py-2 text-lg" : size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono font-semibold uppercase tracking-wide ${s.bg} ${s.text} ${s.border} ${sizeCls}`}
    >
      <span>{s.icon}</span>
      {decision}
    </span>
  );
}

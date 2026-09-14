import type { Signal } from "@/lib/engine/types";

export function SignalBar({ signal }: { signal: Signal }) {
  const isRisk = signal.category === "risk";
  const pct = Math.round(signal.value * 100);
  const barColor = isRisk
    ? signal.value > 0.6
      ? "bg-risk"
      : signal.value > 0.3
      ? "bg-warn"
      : "bg-border"
    : signal.value > 0.7
    ? "bg-accent"
    : signal.value > 0.4
    ? "bg-warn"
    : "bg-risk";

  return (
    <div className="group py-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-ink">{signal.label}</span>
        <span className="font-mono text-muted">
          {pct}%{" "}
          <span className="text-muted/70">
            &times;{signal.weight.toFixed(2)}w
          </span>
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 hidden text-xs leading-snug text-muted group-hover:block">{signal.rationale}</p>
    </div>
  );
}

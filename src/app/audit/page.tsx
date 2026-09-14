"use client";

import { useEffect, useState } from "react";
import { DecisionBadge } from "@/components/DecisionBadge";
import { ResultPanel } from "@/components/ResultPanel";
import type { DecisionResult } from "@/lib/engine/types";

interface AuditResponse {
  entries: DecisionResult[];
  stats: { total: number; byDecision: Record<string, number> };
}

export default function AuditPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [selected, setSelected] = useState<DecisionResult | null>(null);

  function refresh() {
    fetch("/api/audit")
      .then((r) => r.json())
      .then(setData);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-ink">Audit Trail</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Every decision the engine makes — from the demo, the API, or the failure test — is recorded here with its
          full inputs, signals, and reasoning. Nothing is decided off the record.
        </p>
      </section>

      {data && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <span className="font-mono text-ink">{data.stats.total} total</span>
          {Object.entries(data.stats.byDecision).map(([k, v]) => (
            <span key={k} className="rounded-full border border-border px-2 py-0.5">
              {k}: {v}
            </span>
          ))}
          <button onClick={refresh} className="ml-auto rounded-md border border-border px-3 py-1 hover:bg-white/5">
            Refresh
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="scrollbar-thin max-h-[70vh] overflow-auto rounded-xl border border-border">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-panel">
              <tr className="text-muted">
                <th className="px-3 py-2 font-normal">Time</th>
                <th className="px-3 py-2 font-normal">Domain</th>
                <th className="px-3 py-2 font-normal">Decision</th>
                <th className="px-3 py-2 font-normal">Conf</th>
                <th className="px-3 py-2 font-normal">Risk</th>
              </tr>
            </thead>
            <tbody>
              {data === null && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted">
                    Loading&hellip;
                  </td>
                </tr>
              )}
              {data?.entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted">
                    No decisions recorded yet. Run one from the Demo tab.
                  </td>
                </tr>
              )}
              {data?.entries.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => setSelected(e)}
                  className={`cursor-pointer border-t border-border/50 hover:bg-white/5 ${
                    selected?.id === e.id ? "bg-accent/10" : ""
                  }`}
                >
                  <td className="px-3 py-2 font-mono text-muted">{new Date(e.timestamp).toLocaleTimeString()}</td>
                  <td className="px-3 py-2 text-ink">{e.domain}</td>
                  <td className="px-3 py-2">
                    <DecisionBadge decision={e.decision} size="sm" />
                  </td>
                  <td className="px-3 py-2 font-mono text-muted">{Math.round(e.confidence * 100)}%</td>
                  <td className="px-3 py-2 font-mono text-muted">{Math.round(e.risk * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          {selected ? (
            <ResultPanel result={selected} />
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
              Select a row to inspect the full decision record.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

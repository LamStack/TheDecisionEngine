"use client";

import { useState } from "react";
import type { DecisionResult } from "@/lib/engine/types";
import { DecisionBadge } from "./DecisionBadge";
import { SignalBar } from "./SignalBar";

function Gauge({ label, value, invert }: { label: string; value: number; invert?: boolean }) {
  const pct = Math.round(value * 100);
  const good = invert ? value < 0.4 : value > 0.6;
  const bad = invert ? value > 0.6 : value < 0.4;
  const color = good ? "text-accent" : bad ? "text-risk" : "text-warn";
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 font-mono text-3xl font-bold ${color}`}>{pct}%</div>
    </div>
  );
}

export function ResultPanel({ result }: { result: DecisionResult }) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-panel p-5">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">Decision</div>
          <div className="mt-1">
            <DecisionBadge decision={result.decision} size="lg" />
          </div>
        </div>
        <div className="text-right text-xs text-muted">
          <div>id: <span className="font-mono text-ink">{result.id}</span></div>
          <div>{new Date(result.timestamp).toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Gauge label="Confidence" value={result.confidence} />
        <Gauge label="Risk" value={result.risk} invert />
        <Gauge label="Reversibility" value={result.reversibility.score} />
        <div className="rounded-lg border border-border bg-panel p-4">
          <div className="text-xs uppercase tracking-wide text-muted">Reversibility class</div>
          <div className="mt-1 font-mono text-sm font-semibold text-ink">{result.reversibility.classification}</div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-panel p-5">
        <h3 className="mb-3 text-sm font-semibold text-ink">Reasoning trail</h3>
        <ol className="space-y-2">
          {result.reasoning.map((r, i) => (
            <li key={i} className="flex gap-2 text-sm text-muted">
              <span className="font-mono text-accent">{i + 1}.</span>
              <span>{r}</span>
            </li>
          ))}
        </ol>
      </div>

      {result.hardRuleHits.length > 0 && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-5">
          <h3 className="mb-3 text-sm font-semibold text-orange-400">Hard policy rules triggered</h3>
          <ul className="space-y-2">
            {result.hardRuleHits.map((h) => (
              <li key={h.rule} className="text-sm">
                <span className="font-mono text-orange-300">{h.rule}</span>{" "}
                <span className="text-muted">
                  (forces <strong>{h.forces}</strong>) &mdash; {h.reason}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.missingInfo.length > 0 && (
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-5">
          <h3 className="mb-2 text-sm font-semibold text-sky-400">Missing information</h3>
          <ul className="list-inside list-disc text-sm text-muted">
            {result.missingInfo.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-panel p-5">
          <h3 className="mb-1 text-sm font-semibold text-ink">Signals</h3>
          <p className="mb-3 text-xs text-muted">Hover a signal for its rationale. Bar width is signal strength; weight is its pull on the final score.</p>
          <div className="divide-y divide-border/50">
            {result.signals.map((s) => (
              <SignalBar key={s.id} signal={s} />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-panel p-5">
          <h3 className="mb-3 text-sm font-semibold text-ink">Evidence used</h3>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-muted">
                <th className="pb-2 font-normal">Field</th>
                <th className="pb-2 font-normal">Value</th>
                <th className="pb-2 font-normal">Trust</th>
              </tr>
            </thead>
            <tbody>
              {result.evidenceUsed.map((e) => (
                <tr key={e.key} className="border-t border-border/50">
                  <td className="py-1.5 pr-2 text-muted">{e.label}</td>
                  <td className="py-1.5 pr-2 font-mono text-ink">
                    {e.present ? String(e.value) : <span className="text-risk">missing</span>}
                  </td>
                  <td className="py-1.5 font-mono text-muted">{Math.round(e.trust * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {result.textAnalysis && (
        <div className="rounded-xl border border-border bg-panel p-5">
          <h3 className="mb-2 text-sm font-semibold text-ink">
            Free-text analysis <span className="font-mono text-xs text-muted">({result.textAnalysis.source})</span>
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <div className="text-xs text-muted">Injection suspected</div>
              <div className={result.textAnalysis.injectionSuspected ? "text-risk" : "text-accent"}>
                {result.textAnalysis.injectionSuspected ? "yes" : "no"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted">Urgency</div>
              <div>{Math.round(result.textAnalysis.urgency * 100)}%</div>
            </div>
            <div>
              <div className="text-xs text-muted">Sentiment</div>
              <div>{result.textAnalysis.sentiment.toFixed(2)}</div>
            </div>
          </div>
          {result.textAnalysis.injectionMatches.length > 0 && (
            <p className="mt-2 text-xs text-muted">
              Note: this only ever adds a risk signal — it never branches control flow directly.
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-border bg-panel p-5">
        <button
          onClick={() => setShowRaw((v) => !v)}
          className="font-mono text-xs text-muted underline decoration-dotted hover:text-ink"
        >
          {showRaw ? "hide" : "show"} raw audit record (this exact JSON is what gets persisted)
        </button>
        {showRaw && (
          <pre className="scrollbar-thin mt-3 max-h-96 overflow-auto rounded-lg bg-black/40 p-3 text-xs text-muted">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

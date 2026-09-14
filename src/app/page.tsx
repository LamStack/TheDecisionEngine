"use client";

import { useEffect, useMemo, useState } from "react";
import { ResultPanel } from "@/components/ResultPanel";
import type { DecisionResult } from "@/lib/engine/types";

interface DomainSummary {
  key: string;
  label: string;
  description: string;
  thresholds: {
    executeConfidenceMin: number;
    executeRiskMax: number;
    escalateRiskMin: number;
    refuseRiskMin: number;
    minEvidenceCompleteness: number;
  };
  requiredEvidenceKeys: string[];
  scenarios: {
    id: string;
    label: string;
    description: string;
    expectedHint: string;
    action: { domain: string; actionType: string; summary: string; payload: Record<string, unknown> };
    context: { requestedBy: string; timestamp: string };
  }[];
}

const LONG_TEXT_KEYS = new Set(["reason", "message", "changeSummary", "contentText"]);

function FieldInput({
  fieldKey,
  value,
  onChange,
}: {
  fieldKey: string;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (typeof value === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-accent" />
        {fieldKey}
      </label>
    );
  }
  if (typeof value === "number") {
    return (
      <label className="block text-sm">
        <span className="mb-1 block text-xs text-muted">{fieldKey}</span>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-md border border-border bg-black/30 px-2 py-1.5 font-mono text-sm text-ink focus:border-accent focus:outline-none"
        />
      </label>
    );
  }
  if (Array.isArray(value)) {
    return (
      <label className="block text-sm">
        <span className="mb-1 block text-xs text-muted">{fieldKey} (comma-separated)</span>
        <input
          type="text"
          value={value.join(", ")}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
          className="w-full rounded-md border border-border bg-black/30 px-2 py-1.5 font-mono text-sm text-ink focus:border-accent focus:outline-none"
        />
      </label>
    );
  }
  const isLong = LONG_TEXT_KEYS.has(fieldKey);
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs text-muted">{fieldKey}</span>
      {isLong ? (
        <textarea
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-border bg-black/30 px-2 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
        />
      ) : (
        <input
          type="text"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-border bg-black/30 px-2 py-1.5 font-mono text-sm text-ink focus:border-accent focus:outline-none"
        />
      )}
    </label>
  );
}

export default function DemoPage() {
  const [domains, setDomains] = useState<DomainSummary[]>([]);
  const [domainKey, setDomainKey] = useState<string>("");
  const [scenarioId, setScenarioId] = useState<string>("");
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/domains")
      .then((r) => r.json())
      .then((data: { domains: DomainSummary[] }) => {
        setDomains(data.domains);
        if (data.domains.length > 0) {
          setDomainKey(data.domains[0].key);
          setScenarioId(data.domains[0].scenarios[0].id);
          setPayload(data.domains[0].scenarios[0].action.payload);
        }
      })
      .catch(() => setError("Could not load domains. Is the dev server running?"));
  }, []);

  const activeDomain = useMemo(() => domains.find((d) => d.key === domainKey), [domains, domainKey]);
  const activeScenario = useMemo(
    () => activeDomain?.scenarios.find((s) => s.id === scenarioId),
    [activeDomain, scenarioId]
  );

  function selectDomain(key: string) {
    const d = domains.find((x) => x.key === key);
    setDomainKey(key);
    setResult(null);
    if (d && d.scenarios.length > 0) {
      setScenarioId(d.scenarios[0].id);
      setPayload(d.scenarios[0].action.payload);
    }
  }

  function selectScenario(id: string) {
    setScenarioId(id);
    setResult(null);
    const s = activeDomain?.scenarios.find((x) => x.id === id);
    if (s) setPayload(s.action.payload);
  }

  async function submit() {
    if (!activeDomain || !activeScenario) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/decide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          domain: activeDomain.key,
          action: {
            domain: activeDomain.key,
            actionType: activeScenario.action.actionType,
            summary: activeScenario.action.summary,
            payload,
          },
          context: { requestedBy: "demo-user" },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed." }));
        throw new Error(err.error ?? "Request failed.");
      }
      const data: DecisionResult = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold text-ink">The Decision Engine</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Most agents execute every instruction they receive. This is a decision layer that sits in front of any
          action and returns <strong className="text-ink">execute</strong>, <strong className="text-ink">ask</strong>,{" "}
          <strong className="text-ink">defer</strong>, <strong className="text-ink">escalate</strong>, or{" "}
          <strong className="text-ink">refuse</strong> — with the confidence, risk, evidence, and reasoning behind
          the call. Pick a domain, load a scenario, tweak the numbers, and run it.
        </p>
      </section>

      {error && (
        <div className="rounded-lg border border-risk/40 bg-risk/10 px-4 py-3 text-sm text-risk">{error}</div>
      )}

      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-panel p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">1. Domain</h2>
            <div className="space-y-1">
              {domains.map((d) => (
                <button
                  key={d.key}
                  onClick={() => selectDomain(d.key)}
                  className={`block w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    d.key === domainKey ? "bg-accent/15 text-accent" : "text-muted hover:bg-white/5 hover:text-ink"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {activeDomain && (
            <div className="rounded-xl border border-border bg-panel p-4">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">2. Scenario</h2>
              <div className="space-y-1">
                {activeDomain.scenarios.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectScenario(s.id)}
                    className={`block w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      s.id === scenarioId ? "bg-accent/15 text-accent" : "text-muted hover:bg-white/5 hover:text-ink"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {activeScenario && (
                <div className="mt-3 rounded-md bg-black/20 p-3 text-xs text-muted">
                  <p>{activeScenario.description}</p>
                  <p className="mt-1 italic text-muted/80">Expected: {activeScenario.expectedHint}</p>
                </div>
              )}
            </div>
          )}

          {activeDomain && (
            <div className="rounded-xl border border-border bg-panel p-4 text-xs text-muted">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Policy thresholds</h2>
              <ul className="space-y-1 font-mono">
                <li>execute confidence &ge; {activeDomain.thresholds.executeConfidenceMin}</li>
                <li>execute risk &le; {activeDomain.thresholds.executeRiskMax}</li>
                <li>escalate risk &ge; {activeDomain.thresholds.escalateRiskMin}</li>
                <li>refuse risk &ge; {activeDomain.thresholds.refuseRiskMin}</li>
                <li>min evidence {activeDomain.thresholds.minEvidenceCompleteness}</li>
              </ul>
              <p className="mt-2 text-muted/70">
                These shift per case: irreversible actions need a materially higher confidence bar (see Architecture).
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-panel p-5">
            <h2 className="mb-1 text-sm font-semibold text-ink">3. Action payload</h2>
            <p className="mb-4 text-xs text-muted">
              Editable — change a value (e.g. raise the amount, drop reviewer count, edit the free text) and re-run to
              see the decision move.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(payload).map(([k, v]) => (
                <FieldInput
                  key={k}
                  fieldKey={k}
                  value={v}
                  onChange={(nv) => setPayload((p) => ({ ...p, [k]: nv }))}
                />
              ))}
            </div>
            <button
              onClick={submit}
              disabled={loading || !activeDomain}
              className="mt-5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Deciding…" : "Run decision"}
            </button>
          </div>

          {result && <ResultPanel result={result} />}
        </div>
      </section>
    </div>
  );
}

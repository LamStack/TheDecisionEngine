import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { DecisionResult } from "./types";

/**
 * Audit trail storage. In-memory first (always works, including on
 * serverless), with best-effort append-to-disk so a local `npm run dev`
 * session survives restarts. On Vercel the filesystem outside /tmp is
 * read-only, so we write to os.tmpdir() there instead of the repo — it's
 * ephemeral per-instance, which is a known, documented limitation for this
 * demo (see README "Limits"). Nothing about the decision logic depends on
 * disk persistence; losing the file only loses history, never correctness.
 */

const memoryLog: DecisionResult[] = [];

function logFilePath(): string {
  const dir = process.env.VERCEL ? path.join(os.tmpdir(), "decision-engine-audit") : path.join(process.cwd(), "data", "audit");
  return path.join(dir, "log.jsonl");
}

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

let hydrated = false;
function hydrateFromDisk() {
  if (hydrated) return;
  hydrated = true;
  try {
    const file = logFilePath();
    if (!fs.existsSync(file)) return;
    const lines = fs.readFileSync(file, "utf-8").split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        memoryLog.push(JSON.parse(line));
      } catch {
        // skip malformed line
      }
    }
  } catch {
    // filesystem not available (e.g. some serverless sandboxes) — memory-only is fine
  }
}

export function recordAudit(result: DecisionResult): DecisionResult {
  hydrateFromDisk();
  memoryLog.push(result);
  try {
    const file = logFilePath();
    ensureDir(file);
    fs.appendFileSync(file, JSON.stringify(result) + "\n");
  } catch {
    // best effort only
  }
  return result;
}

export function listAudit(opts: { domain?: string; decision?: string; limit?: number } = {}): DecisionResult[] {
  hydrateFromDisk();
  let results = [...memoryLog].reverse();
  if (opts.domain) results = results.filter((r) => r.domain === opts.domain);
  if (opts.decision) results = results.filter((r) => r.decision === opts.decision);
  if (opts.limit) results = results.slice(0, opts.limit);
  return results;
}

export function getAuditById(id: string): DecisionResult | undefined {
  hydrateFromDisk();
  return memoryLog.find((r) => r.id === id);
}

export function auditStats() {
  hydrateFromDisk();
  const byDecision: Record<string, number> = {};
  for (const r of memoryLog) byDecision[r.decision] = (byDecision[r.decision] ?? 0) + 1;
  return { total: memoryLog.length, byDecision };
}

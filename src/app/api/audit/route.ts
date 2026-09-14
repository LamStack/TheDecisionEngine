import { NextResponse } from "next/server";
import { auditStats, listAudit } from "@/lib/engine/audit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain") ?? undefined;
  const decisionParam = searchParams.get("decision") ?? undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  const entries = listAudit({ domain, decision: decisionParam, limit });
  return NextResponse.json({ entries, stats: auditStats() });
}

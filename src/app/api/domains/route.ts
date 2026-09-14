import { NextResponse } from "next/server";
import { domainList } from "@/lib/domains";

export const runtime = "nodejs";

export async function GET() {
  const payload = domainList.map((d) => ({
    key: d.policy.domain,
    label: d.policy.label,
    description: d.policy.description,
    thresholds: d.policy.thresholds,
    requiredEvidenceKeys: d.policy.requiredEvidenceKeys,
    scenarios: d.scenarios.map((s) => ({
      id: s.id,
      label: s.label,
      description: s.description,
      expectedHint: s.expectedHint,
      action: s.action,
      context: s.context,
    })),
  }));
  return NextResponse.json({ domains: payload });
}

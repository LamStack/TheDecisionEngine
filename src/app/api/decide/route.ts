import { NextResponse } from "next/server";
import { getDomain } from "@/lib/domains";
import { decide } from "@/lib/engine/decide";
import type { DecisionContext, DomainAction } from "@/lib/engine/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const { domain: domainKey, scenarioId, action, context } = body as {
    domain?: string;
    scenarioId?: string;
    action?: DomainAction;
    context?: DecisionContext;
  };

  if (!domainKey || typeof domainKey !== "string") {
    return NextResponse.json({ error: "Missing required field: domain." }, { status: 400 });
  }

  const domain = getDomain(domainKey);
  if (!domain) {
    return NextResponse.json({ error: `Unknown domain "${domainKey}".` }, { status: 404 });
  }

  let resolvedAction: DomainAction;
  let resolvedContext: DecisionContext;

  if (scenarioId) {
    const scenario = domain.scenarios.find((s) => s.id === scenarioId);
    if (!scenario) {
      return NextResponse.json({ error: `Unknown scenario "${scenarioId}" for domain "${domainKey}".` }, { status: 404 });
    }
    resolvedAction = scenario.action;
    resolvedContext = { ...scenario.context, timestamp: new Date().toISOString() };
  } else if (action && typeof action === "object") {
    resolvedAction = {
      domain: domainKey,
      actionType: typeof action.actionType === "string" ? action.actionType : domain.actionTypes[0],
      summary: typeof action.summary === "string" ? action.summary : `${domain.policy.label} request`,
      payload: typeof action.payload === "object" && action.payload !== null ? action.payload : {},
    };
    resolvedContext = {
      requestedBy: context?.requestedBy || "demo-user",
      timestamp: new Date().toISOString(),
      notes: context?.notes,
    };
  } else {
    return NextResponse.json({ error: "Provide either scenarioId or action." }, { status: 400 });
  }

  try {
    const result = await decide(domain, resolvedAction, resolvedContext);
    return NextResponse.json(result);
  } catch (err) {
    console.error("decide() failed", err);
    return NextResponse.json({ error: "The decision engine failed to evaluate this action." }, { status: 500 });
  }
}

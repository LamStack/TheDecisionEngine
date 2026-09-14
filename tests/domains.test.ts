import { describe, expect, it } from "vitest";
import { domainList } from "@/lib/domains";
import { decide } from "@/lib/engine/decide";
import type { DecisionOutcome } from "@/lib/engine/types";

const VALID_OUTCOMES: DecisionOutcome[] = ["execute", "ask", "defer", "escalate", "refuse"];

describe("every domain scenario produces a well-formed decision", () => {
  for (const domain of domainList) {
    for (const scenario of domain.scenarios) {
      it(`${domain.policy.domain} / ${scenario.id}`, async () => {
        const result = await decide(domain, scenario.action, scenario.context);

        expect(VALID_OUTCOMES).toContain(result.decision);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        expect(result.risk).toBeGreaterThanOrEqual(0);
        expect(result.risk).toBeLessThanOrEqual(1);
        expect(result.reversibility.score).toBeGreaterThanOrEqual(0);
        expect(result.reversibility.score).toBeLessThanOrEqual(1);
        expect(result.evidenceUsed.length).toBeGreaterThan(0);
        expect(result.reasoning.length).toBeGreaterThan(0);
        expect(result.signals.length).toBeGreaterThan(0);
        expect(result.id).toBeTruthy();
        expect(result.domain).toBe(domain.policy.domain);
      });
    }
  }
});

describe("refund_approval: hard-rule-driven scenarios", () => {
  const domain = domainList.find((d) => d.policy.domain === "refund_approval")!;

  it("clean small refund executes", async () => {
    const scenario = domain.scenarios.find((s) => s.id === "clean-small-refund")!;
    const result = await decide(domain, scenario.action, scenario.context);
    expect(result.decision).toBe("execute");
  });

  it("stale order (900 days) is refused despite otherwise-clean signals", async () => {
    const scenario = domain.scenarios.find((s) => s.id === "confidently-wrong-stale-order")!;
    const result = await decide(domain, scenario.action, scenario.context);
    expect(result.decision).toBe("refuse");
    expect(result.hardRuleHits.map((h) => h.rule)).toContain("return-window-hard-ceiling");
  });

  it("refund abuse pattern (6 refunds/90d) escalates", async () => {
    const scenario = domain.scenarios.find((s) => s.id === "abuse-pattern")!;
    const result = await decide(domain, scenario.action, scenario.context);
    expect(result.decision).toBe("escalate");
    expect(result.hardRuleHits.map((h) => h.rule)).toContain("refund-abuse-pattern");
  });
});

describe("ticket_triage: hard-rule-driven scenarios", () => {
  const domain = domainList.find((d) => d.policy.domain === "ticket_triage")!;

  it("routine password reset executes", async () => {
    const scenario = domain.scenarios.find((s) => s.id === "routine-password-reset")!;
    const result = await decide(domain, scenario.action, scenario.context);
    expect(result.decision).toBe("execute");
  });

  it("security report always escalates", async () => {
    const scenario = domain.scenarios.find((s) => s.id === "security-report")!;
    const result = await decide(domain, scenario.action, scenario.context);
    expect(result.decision).toBe("escalate");
    expect(result.hardRuleHits.map((h) => h.rule)).toContain("high-risk-category-human-only");
  });

  it("wellbeing-risk language always escalates, regardless of low-severity category", async () => {
    const scenario = domain.scenarios.find((s) => s.id === "wellbeing-flag")!;
    const result = await decide(domain, scenario.action, scenario.context);
    expect(result.decision).toBe("escalate");
    expect(result.hardRuleHits.map((h) => h.rule)).toContain("safety-escalation");
  });

  it("missing customer tier asks for the missing field", async () => {
    const scenario = domain.scenarios.find((s) => s.id === "missing-tier-info")!;
    const result = await decide(domain, scenario.action, scenario.context);
    expect(result.decision).toBe("ask");
    expect(result.missingInfo.length).toBeGreaterThan(0);
  });
});

describe("deploy_gate: hard-rule-driven scenarios", () => {
  const domain = domainList.find((d) => d.policy.domain === "deploy_gate")!;

  it("small flagged change executes", async () => {
    const scenario = domain.scenarios.find((s) => s.id === "flagged-small-change")!;
    const result = await decide(domain, scenario.action, scenario.context);
    expect(result.decision).toBe("execute");
  });

  it("failing tests are refused outright", async () => {
    const scenario = domain.scenarios.find((s) => s.id === "failing-tests")!;
    const result = await decide(domain, scenario.action, scenario.context);
    expect(result.decision).toBe("refuse");
    expect(result.hardRuleHits.map((h) => h.rule)).toContain("failing-tests");
  });

  it("payments change with one reviewer escalates", async () => {
    const scenario = domain.scenarios.find((s) => s.id === "payments-change-one-reviewer")!;
    const result = await decide(domain, scenario.action, scenario.context);
    expect(result.decision).toBe("escalate");
    expect(result.hardRuleHits.map((h) => h.rule)).toContain("sensitive-surface-needs-review");
  });
});

describe("content_moderation: hard-rule-driven scenarios", () => {
  const domain = domainList.find((d) => d.policy.domain === "content_moderation")!;

  it("clear spam executes", async () => {
    const scenario = domain.scenarios.find((s) => s.id === "clear-spam")!;
    const result = await decide(domain, scenario.action, scenario.context);
    expect(result.decision).toBe("execute");
  });

  it("severe/illegal category never auto-decides, always escalates to a human", async () => {
    const scenario = domain.scenarios.find((s) => s.id === "severe-illegal-flag")!;
    const result = await decide(domain, scenario.action, scenario.context);
    expect(result.decision).toBe("escalate");
    expect(result.hardRuleHits.map((h) => h.rule)).toContain("illegal-content-requires-legal-escalation");
  });

  it("mass-reported content with no policy match is refused, not removed", async () => {
    const scenario = domain.scenarios.find((s) => s.id === "brigading-no-category")!;
    const result = await decide(domain, scenario.action, scenario.context);
    expect(result.decision).toBe("refuse");
    expect(result.hardRuleHits.map((h) => h.rule)).toContain("no-policy-match-declined");
  });
});

import type { Domain, HardRuleHit, ReversibilityAssessment, Signal } from "@/lib/engine/types";
import { ev } from "./types";

const SELF_HARM_PATTERNS: RegExp[] = [
  /\b(kill|hurt|harm) (myself|me)\b/i,
  /end (it all|my life)/i,
  /don'?t want to (be here|live|exist)/i,
  /want to disappear/i,
  /nothing matters anymore/i,
];

const HIGH_RISK_CATEGORIES = new Set(["security", "legal_threat"]);
const CATEGORY_BASE_RISK: Record<string, number> = {
  technical: 0.1,
  general: 0.15,
  account: 0.3,
  billing: 0.3,
  security: 0.9,
  legal_threat: 0.95,
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const ticketTriage: Domain = {
  actionTypes: ["auto_respond_and_close"],
  policy: {
    domain: "ticket_triage",
    label: "Support Ticket Triage",
    description: "Decides whether to auto-respond and close an incoming support ticket, or route it to a human.",
    thresholds: {
      executeConfidenceMin: 0.65,
      executeRiskMax: 0.4,
      escalateRiskMin: 0.6,
      refuseRiskMin: 0.95,
      minEvidenceCompleteness: 0.75,
    },
    requiredEvidenceKeys: ["message", "category", "customerTier"],
    irreversibleActionTypes: [],
    costlyActionTypes: ["auto_respond_and_close"],
  },

  freeTextField: (action) => str(action.payload.message) || undefined,

  buildEvidence: (action) => {
    const p = action.payload;
    return [
      ev("message", "Ticket message", str(p.message) || null, { trust: 0.5 }),
      ev("category", "Category", str(p.category) || null, { trust: 0.9 }),
      ev("customerTier", "Customer tier", str(p.customerTier) || null, { trust: 0.95 }),
      ev("priorTicketsThisMonth", "Prior tickets this month", num(p.priorTicketsThisMonth), { trust: 0.9 }),
      ev("accountAgeDays", "Account age (days)", num(p.accountAgeDays), { trust: 0.9 }),
    ];
  },

  computeSignals: (action, _context, _evidence, textAnalysis): Signal[] => {
    const category = str(action.payload.category);
    const tier = str(action.payload.customerTier);
    const message = str(action.payload.message);
    const priorTickets = num(action.payload.priorTicketsThisMonth);
    const accountAgeDays = num(action.payload.accountAgeDays);
    const sentiment = textAnalysis?.sentiment ?? 0;
    const urgency = textAnalysis?.urgency ?? 0;

    return [
      {
        id: "confidence.category_known",
        label: "Category is well-defined",
        value: category && category !== "general" ? 0.85 : category === "general" ? 0.5 : 0.1,
        weight: 1,
        category: "confidence",
        rationale: `Category reported as "${category || "unknown"}".`,
      },
      {
        id: "confidence.message_specificity",
        label: "Message has enough detail",
        value: message.length >= 20 ? 0.85 : message.length >= 5 ? 0.45 : 0.1,
        weight: 1.5,
        category: "confidence",
        rationale: `Message is ${message.length} characters.`,
      },
      {
        id: "confidence.account_age",
        label: "Account history available",
        value: Math.min(1, accountAgeDays / 180),
        weight: 0.75,
        category: "confidence",
        rationale: `Account is ${accountAgeDays} day(s) old.`,
      },
      {
        id: "confidence.tier_known",
        label: "Customer tier known",
        value: tier ? 0.8 : 0.1,
        weight: 0.5,
        category: "confidence",
        rationale: tier ? `Tier: ${tier}.` : "Tier not supplied.",
      },
      {
        id: "risk.category_severity",
        label: "Category severity",
        value: CATEGORY_BASE_RISK[category] ?? 0.4,
        weight: 2,
        category: "risk",
        rationale: `Base risk for category "${category || "unspecified"}" is ${(CATEGORY_BASE_RISK[category] ?? 0.4).toFixed(2)}.`,
      },
      {
        id: "risk.sentiment",
        label: "Negative sentiment",
        value: Math.max(0, -sentiment),
        weight: 1,
        category: "risk",
        rationale: `Detected sentiment score ${sentiment.toFixed(2)} (-1 very negative, 1 very positive).`,
      },
      {
        id: "risk.urgency",
        label: "Urgency language",
        value: urgency,
        weight: 0.5,
        category: "risk",
        rationale: `Urgency signal ${urgency.toFixed(2)} from free text.`,
      },
      {
        id: "risk.repeat_contact",
        label: "Repeat contact volume",
        value: Math.min(1, priorTickets / 8),
        weight: 0.5,
        category: "risk",
        rationale: `${priorTickets} prior ticket(s) this month; a high count means either an unresolved issue or misuse, both worth caution.`,
      },
    ];
  },

  assessReversibility: (action): ReversibilityAssessment => {
    const category = str(action.payload.category);
    if (HIGH_RISK_CATEGORIES.has(category)) {
      return {
        score: 0.15,
        classification: "irreversible",
        rationale: "A wrong automated response to a security or legal matter can cause damage that a follow-up message can't undo.",
      };
    }
    if (category === "billing") {
      return {
        score: 0.55,
        classification: "costly-to-reverse",
        rationale: "A wrong billing response may promise money back that then has to be honored or awkwardly retracted.",
      };
    }
    return {
      score: 0.8,
      classification: "reversible",
      rationale: "The ticket can be reopened and a human can follow up; low lasting cost if the auto-response misses the mark.",
    };
  },

  hardRules: (action, _context, _evidence, textAnalysis): HardRuleHit[] => {
    const hits: HardRuleHit[] = [];
    const category = str(action.payload.category);
    const message = str(action.payload.message);

    if (HIGH_RISK_CATEGORIES.has(category)) {
      hits.push({
        rule: "high-risk-category-human-only",
        reason: `Category "${category}" is never auto-handled — security and legal matters always go to a trained human, regardless of confidence.`,
        forces: "escalate",
      });
    }

    if (SELF_HARM_PATTERNS.some((p) => p.test(message))) {
      hits.push({
        rule: "safety-escalation",
        reason: "Message contains language suggesting risk to the person's wellbeing. Routed to a trained human immediately; this is never auto-closed under any confidence score.",
        forces: "escalate",
      });
    }

    if (textAnalysis?.injectionSuspected) {
      hits.push({
        rule: "no-instruction-from-free-text",
        reason: "Message text appears to try to instruct the system directly; flagged for human review independent of the score.",
        forces: "escalate",
      });
    }

    return hits;
  },

  scenarios: [
    {
      id: "routine-password-reset",
      label: "Routine password reset",
      description: "Clear, low-stakes technical request from an established account.",
      expectedHint: "execute — well-understood, reversible, low risk.",
      action: {
        domain: "ticket_triage",
        actionType: "auto_respond_and_close",
        summary: "Auto-respond to ticket #T-4471",
        payload: {
          ticketId: "T-4471",
          category: "technical",
          message: "I can't log in, I think I forgot my password. Can you send a reset link?",
          customerTier: "free",
          priorTicketsThisMonth: 0,
          accountAgeDays: 220,
        },
      },
      context: { requestedBy: "helpdesk-bot", timestamp: new Date().toISOString() },
    },
    {
      id: "angry-billing-dispute",
      label: "Angry billing dispute",
      description: "Double-charge complaint with hostile tone and a lawyer mention, but not flagged as a legal category.",
      expectedHint: "escalate — sentiment + billing risk push past auto-execute even without a hard rule.",
      action: {
        domain: "ticket_triage",
        actionType: "auto_respond_and_close",
        summary: "Auto-respond to ticket #T-5820",
        payload: {
          ticketId: "T-5820",
          category: "billing",
          message:
            "This is unacceptable, you charged me twice and I want this fixed right now. This is basically fraud and I'm talking to my lawyer if it's not resolved today.",
          customerTier: "pro",
          priorTicketsThisMonth: 2,
          accountAgeDays: 400,
        },
      },
      context: { requestedBy: "helpdesk-bot", timestamp: new Date().toISOString() },
    },
    {
      id: "security-report",
      label: "Suspicious login report",
      description: "Customer reports unauthorized account access.",
      expectedHint: "escalate — security category is never auto-handled.",
      action: {
        domain: "ticket_triage",
        actionType: "auto_respond_and_close",
        summary: "Auto-respond to ticket #T-6003",
        payload: {
          ticketId: "T-6003",
          category: "security",
          message: "I think someone accessed my account without permission — I see a login from a device I don't recognize.",
          customerTier: "enterprise",
          priorTicketsThisMonth: 0,
          accountAgeDays: 900,
        },
      },
      context: { requestedBy: "helpdesk-bot", timestamp: new Date().toISOString() },
    },
    {
      id: "wellbeing-flag",
      label: "Wellbeing risk language",
      description: "Message includes language that should always reach a human.",
      expectedHint: "escalate — safety rule overrides everything else, including a low-severity category.",
      action: {
        domain: "ticket_triage",
        actionType: "auto_respond_and_close",
        summary: "Auto-respond to ticket #T-6110",
        payload: {
          ticketId: "T-6110",
          category: "general",
          message: "I don't really know why I'm messaging. Nothing matters anymore, I just want to disappear.",
          customerTier: "free",
          priorTicketsThisMonth: 0,
          accountAgeDays: 30,
        },
      },
      context: { requestedBy: "helpdesk-bot", timestamp: new Date().toISOString() },
    },
    {
      id: "missing-tier-info",
      label: "Missing customer tier",
      description: "A perfectly normal request, but the required customer-tier field never made it through.",
      expectedHint: "ask — required evidence is incomplete.",
      action: {
        domain: "ticket_triage",
        actionType: "auto_respond_and_close",
        summary: "Auto-respond to ticket #T-6244",
        payload: {
          ticketId: "T-6244",
          category: "billing",
          message: "I'd like a credit applied to my account please, I was charged for a plan I cancelled.",
          customerTier: "",
          priorTicketsThisMonth: 1,
          accountAgeDays: 60,
        },
      },
      context: { requestedBy: "helpdesk-bot", timestamp: new Date().toISOString() },
    },
  ],
};

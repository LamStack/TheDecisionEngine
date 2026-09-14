import type { Domain } from "@/lib/engine/types";
import { refundApproval } from "./refundApproval";
import { ticketTriage } from "./ticketTriage";
import { deployGate } from "./deployGate";
import { contentModeration } from "./contentModeration";

export const domains: Record<string, Domain> = {
  [refundApproval.policy.domain]: refundApproval,
  [ticketTriage.policy.domain]: ticketTriage,
  [deployGate.policy.domain]: deployGate,
  [contentModeration.policy.domain]: contentModeration,
};

export const domainList = Object.values(domains);

export function getDomain(key: string): Domain | undefined {
  return domains[key];
}

export { refundApproval, ticketTriage, deployGate, contentModeration };

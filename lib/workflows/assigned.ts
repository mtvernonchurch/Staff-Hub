import type { WorkflowCard } from "@/lib/data/types";
import { normalizeEmail } from "@/lib/domain/people";

export function assignedWorkflows(cards: WorkflowCard[], email: string): WorkflowCard[] {
  const mine = normalizeEmail(email);
  return cards.filter((card) => normalizeEmail(card.assigneeEmail) === mine);
}

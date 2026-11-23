import type { CardMonth, CardTransaction, Ministry, MinistryBudget, StaffMember } from "@/lib/data/types";
import { isAdmin } from "@/lib/domain/access";
import { namesMatch } from "@/lib/domain/people";

/** Share of the calendar year that has passed, from Jan 1 through today. */
export function yearProgress(today: Date): number {
  const start = Date.UTC(today.getUTCFullYear(), 0, 1);
  const end = Date.UTC(today.getUTCFullYear() + 1, 0, 1);
  return Math.min(1, Math.max(0, (today.getTime() - start) / (end - start)));
}

export function budgetTone(spent: number, annual: number, year: number): "ok" | "ahead" | "over" {
  if (annual <= 0) return "ok";
  const used = spent / annual;
  if (used >= 1 || used - year >= 0.15) return "over";
  if (used - year >= 0.05) return "ahead";
  return "ok";
}

export function monthKey(today: Date): string {
  return `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function ownedMinistries(actor: StaffMember, ministries: Ministry[], rows: MinistryBudget[]): MinistryBudget[] {
  if (isAdmin(actor)) return rows;
  const names = new Set(
    ministries.filter((row) => namesMatch(row.lead, actor.name)).map((row) => row.ministry.trim().toLowerCase()),
  );
  return rows.filter((row) => names.has(row.ministry.trim().toLowerCase()));
}

export function visibleCards(actor: StaffMember, cards: CardMonth[], month: string): CardMonth[] {
  const inMonth = cards.filter((row) => row.month === month);
  if (isAdmin(actor)) return [...inMonth].sort((a, b) => used(b) - used(a) || a.staff.localeCompare(b.staff));
  return inMonth.filter((row) => namesMatch(row.staff, actor.name));
}

export function visibleTransactions(actor: StaffMember, rows: CardTransaction[], month: string): CardTransaction[] {
  const inMonth = rows.filter((row) => row.month === month);
  if (isAdmin(actor)) return inMonth;
  return inMonth.filter((row) => namesMatch(row.staff, actor.name));
}

function used(card: CardMonth): number {
  return card.limit > 0 ? card.spent / card.limit : 0;
}

export function money(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

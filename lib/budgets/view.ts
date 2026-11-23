import type { HubStore, StaffMember } from "@/lib/data/types";
import { monthKey, ownedMinistries, visibleCards, visibleTransactions } from "@/lib/budgets/access";
import { getBudgetSource } from "@/lib/budgets/source";
import { HubError } from "@/lib/hub-error";

export async function loadBudgetView(actor: StaffMember, store: HubStore, month = monthKey(new Date())) {
  try {
    const source = await getBudgetSource();
    const [budgets, cards, transactions, ministries] = await Promise.all([
      source.listMinistryBudgets(),
      source.listCardMonths(),
      source.listCardTransactions(),
      store.listMinistries(),
    ]);
    return {
      ok: true as const,
      sample: source.kind === "mock",
      ministries: ownedMinistries(actor, ministries, budgets),
      cards: visibleCards(actor, cards, month),
      transactions: visibleTransactions(actor, transactions, month),
    };
  } catch (error) {
    const message = error instanceof HubError ? error.message : "Budgets could not be loaded.";
    return { ok: false as const, message };
  }
}

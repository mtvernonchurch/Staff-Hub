import type { BudgetSourceKind } from "@/lib/config";
import { budgetSourceKind, dataMode } from "@/lib/config";
import { getStore } from "@/lib/data";
import type { CardMonth, CardTransaction, HubStore, MinistryBudget } from "@/lib/data/types";
import { HubError } from "@/lib/hub-error";

/**
 * Where ministry budgets and staff-card spend come from.
 * A BILL Spend & Expense client can implement this later. It is not called today.
 */
export interface BudgetSource {
  kind: BudgetSourceKind;
  listMinistryBudgets(): Promise<MinistryBudget[]>;
  listCardMonths(): Promise<CardMonth[]>;
  listCardTransactions(): Promise<CardTransaction[]>;
}

export function storeBudgetSource(store: HubStore, kind: BudgetSourceKind): BudgetSource {
  return {
    kind,
    listMinistryBudgets: () => store.listMinistryBudgets(),
    listCardMonths: () => store.listCardMonths(),
    listCardTransactions: () => store.listCardTransactions(),
  };
}

/**
 * Stub only. Do not add a fetch here until Steven has finished BILL's API setup.
 *
 * BILL Spend & Expense (the product formerly called Divvy) documents these resources:
 * - Budgets: GET https://api.divvy.co/v1/budgets
 * - Cards: GET https://api.divvy.co/v1/cards
 * - Transactions: GET https://api.divvy.co/v1/transactions
 * Auth is an API token header (`apiToken`) from the BILL developer portal, scoped to the org.
 * Confirm the current paths at https://developer.bill.com before wiring them. BILL has been
 * moving these under gateway.prod.bill.com. Env: BILL_API_KEY, BILL_ORG_ID, and the user
 * the token acts as. DATA_SOURCE_BUDGET=bill selects this stub.
 */
export function billBudgetSource(): BudgetSource {
  const pending = async () => {
    throw new HubError("BILL is not connected yet. Use the Budgets and Card Spend sheet tabs until that API is wired.");
  };
  return {
    kind: "bill",
    listMinistryBudgets: pending,
    listCardMonths: pending,
    listCardTransactions: pending,
  };
}

export async function getBudgetSource(): Promise<BudgetSource> {
  const kind = budgetSourceKind();
  if (kind === "bill") return billBudgetSource();
  if (kind === "sheet") {
    if (dataMode() !== "sheets") {
      throw new HubError("DATA_SOURCE_BUDGET=sheet needs DATA_MODE=sheets and the Google service account.");
    }
    return storeBudgetSource(await getStore(), "sheet");
  }
  return storeBudgetSource(await getStore(), dataMode() === "sheets" ? "sheet" : "mock");
}

import { dataMode } from "@/lib/config";
import { getStore } from "@/lib/data";
import type { HubStore, WorkflowCard } from "@/lib/data/types";
import { assignedWorkflows } from "@/lib/workflows/assigned";
import { HubError } from "@/lib/hub-error";

export type WorkflowSourceKind = "mock" | "sheet" | "pco";

/**
 * Planning Center People workflow cards assigned to one person.
 * Not called yet. When wired, use the People API:
 * GET https://api.planningcenteronline.com/people/v2/workflows
 * GET https://api.planningcenteronline.com/people/v2/workflows/{id}/cards
 * Filter cards to the signed-in person. Auth is the same PCO_APP_ID and PCO_SECRET
 * as Check-Ins. DATA_SOURCE_WORKFLOWS=pco selects this stub.
 */
export interface WorkflowSource {
  kind: WorkflowSourceKind;
  listAssigned(email: string): Promise<WorkflowCard[]>;
}

export function storeWorkflowSource(store: HubStore, kind: WorkflowSourceKind): WorkflowSource {
  return {
    kind,
    async listAssigned(email: string) {
      return assignedWorkflows(await store.listWorkflowCards(), email);
    },
  };
}

export function pcoWorkflowSource(): WorkflowSource {
  return {
    kind: "pco",
    async listAssigned() {
      throw new HubError("Planning Center workflows are not connected yet. The Workflow Cards tab is the list until that API is wired.");
    },
  };
}

export function workflowSourceKind(): WorkflowSourceKind {
  const requested = process.env.DATA_SOURCE_WORKFLOWS?.trim().toLowerCase();
  if (requested === "pco" || requested === "sheet" || requested === "mock") return requested;
  return dataMode() === "sheets" ? "sheet" : "mock";
}

export async function getWorkflowSource(): Promise<WorkflowSource> {
  const kind = workflowSourceKind();
  if (kind === "pco") return pcoWorkflowSource();
  if (kind === "sheet" && dataMode() !== "sheets") {
    throw new HubError("DATA_SOURCE_WORKFLOWS=sheet needs DATA_MODE=sheets and the Google service account.");
  }
  return storeWorkflowSource(await getStore(), kind === "sheet" ? "sheet" : dataMode() === "sheets" ? "sheet" : "mock");
}

export async function loadMyWorkflows(email: string) {
  try {
    const source = await getWorkflowSource();
    const cards = await source.listAssigned(email);
    return { ok: true as const, cards };
  } catch (error) {
    const message = error instanceof HubError ? error.message : "Workflow cards could not be loaded.";
    return { ok: false as const, message };
  }
}

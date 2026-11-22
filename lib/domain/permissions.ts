import type { ActionItem, ChecklistItem, DeskRequest, MinistryUpdate, StaffMember } from "@/lib/data/types";
import { isAdmin } from "@/lib/domain/access";
import { namesMatch } from "@/lib/domain/people";

export function canAssignToOthers(actor: StaffMember): boolean {
  return isAdmin(actor);
}

export function canManageRecords(actor: StaffMember): boolean {
  return isAdmin(actor);
}

export function canEditActionItem(actor: StaffMember, item: Pick<ActionItem, "owner">): boolean {
  return isAdmin(actor) || namesMatch(actor.name, item.owner);
}

export function canEditChecklist(actor: StaffMember, item: Pick<ChecklistItem, "owner">): boolean {
  return isAdmin(actor) || namesMatch(actor.name, item.owner);
}

export function canEditMinistryUpdate(actor: StaffMember, update: Pick<MinistryUpdate, "submittedBy">): boolean {
  return isAdmin(actor) || namesMatch(actor.name, update.submittedBy);
}

export function canWithdrawRequest(actor: StaffMember, request: Pick<DeskRequest, "requestedBy" | "status">): boolean {
  if (!namesMatch(actor.name, request.requestedBy)) return false;
  return !["Done", "Declined", "Withdrawn"].includes(request.status);
}

const REQUEST_STATUSES = [
  "New",
  "In progress",
  "Ready for review",
  "Changes requested",
  "Approved",
  "Done",
  "Declined",
  "Withdrawn",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export function isRequestStatus(value: string): value is RequestStatus {
  return (REQUEST_STATUSES as readonly string[]).includes(value);
}

export function allowedRequestStatuses(actor: StaffMember, request: Pick<DeskRequest, "requestedBy" | "status">): RequestStatus[] {
  const mine = namesMatch(actor.name, request.requestedBy);
  const admin = isAdmin(actor);
  const next = new Set<RequestStatus>();
  if (admin) {
    if (request.status === "New" || request.status === "Changes requested") {
      next.add("In progress");
      next.add("Declined");
    }
    if (request.status === "In progress") {
      next.add("Ready for review");
      next.add("Declined");
    }
    if (request.status === "Ready for review") next.add("In progress");
    if (request.status === "Approved") next.add("Done");
  }
  if (mine && request.status === "Ready for review") {
    next.add("Approved");
    next.add("Changes requested");
  }
  if (mine && !["Done", "Declined", "Withdrawn"].includes(request.status)) next.add("Withdrawn");
  return [...next];
}

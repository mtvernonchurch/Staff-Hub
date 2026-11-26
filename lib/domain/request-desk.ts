import type { DeskRequest, GraphicsRequest, StaffMember, TimeAway } from "@/lib/data/types";
import { isAdmin } from "@/lib/domain/access";
import { formatFriendly, isClosedStatus, parseSheetDate } from "@/lib/domain/dates";
import { isShortNotice } from "@/lib/domain/desk";
import { namesMatch } from "@/lib/domain/people";

/** The general request form. Graphics and social posts have their own form. */
export const GENERAL_REQUEST_CHANNELS = ["Weekly email", "Text message", "Website", "Sunday announcement"] as const;

export type DeskKind = "request" | "graphics" | "away";

/** One row on the Requests page, whatever kind of request it is. */
export type DeskRow = {
  kind: DeskKind;
  id: string;
  title: string;
  href: string;
  status: string;
  requestedBy: string;
  /** Who has it now, in words. */
  handler: string;
  /** "needed Fri, Dec 4" or the dates away. */
  when: string;
  updated: string;
  shortNotice: boolean;
  finished: boolean;
  waitingOn: (person: StaffMember) => boolean;
};

export const KIND_LABEL: Record<DeskKind, string> = {
  request: "Email, text, web, or Sunday",
  graphics: "Graphics and social",
  away: "Time away",
};

const FINISHED = ["Done", "Declined", "Withdrawn", "Denied"];

function finished(status: string): boolean {
  return FINISHED.includes(status) || isClosedStatus(status);
}

export function waitingOnRequest(person: StaffMember, row: DeskRequest): boolean {
  if (finished(row.status)) return false;
  if (isAdmin(person) && ["New", "In progress", "Changes requested", "Approved"].includes(row.status)) return true;
  return namesMatch(person.name, row.requestedBy) && row.status === "Ready for review";
}

export function waitingOnGraphics(person: StaffMember, row: GraphicsRequest): boolean {
  if (finished(row.status)) return false;
  if (row.status === "Ready for review") return namesMatch(person.name, row.requestedBy);
  if (row.assignedTo) return namesMatch(person.name, row.assignedTo);
  return isAdmin(person);
}

function handlerName(assignedTo: string, status: string): string {
  if (finished(status)) return "";
  return assignedTo ? `${assignedTo} has it` : "Not assigned yet";
}

export function deskRows(requests: DeskRequest[], graphics: GraphicsRequest[], away: TimeAway[], today: Date): DeskRow[] {
  const rows: DeskRow[] = [
    ...requests.map((row) => ({
      kind: "request" as const,
      id: row.id,
      title: row.title,
      href: `/requests/${row.id}`,
      status: row.status,
      requestedBy: row.requestedBy,
      handler: row.status === "Ready for review" ? `Waiting on ${row.requestedBy} to review` : handlerName(row.assignedTo, row.status),
      when: row.neededBy ? `needed ${formatFriendly(row.neededBy)}` : "",
      updated: row.updated || row.created,
      shortNotice: !finished(row.status) && Boolean(row.neededBy) && isShortNotice(row.neededBy, today),
      finished: finished(row.status),
      waitingOn: (person: StaffMember) => waitingOnRequest(person, row),
    })),
    ...graphics.map((row) => ({
      kind: "graphics" as const,
      id: row.id,
      title: row.event,
      href: `/requests/graphics/${row.id}`,
      status: row.status,
      requestedBy: row.requestedBy,
      handler: row.status === "Ready for review" ? `Waiting on ${row.requestedBy} to review` : handlerName(row.assignedTo, row.status),
      when: row.neededBy ? `needed ${formatFriendly(row.neededBy)}` : "",
      updated: row.updated || row.created,
      shortNotice: !finished(row.status) && Boolean(row.neededBy) && isShortNotice(row.neededBy, today),
      finished: finished(row.status),
      waitingOn: (person: StaffMember) => waitingOnGraphics(person, row),
    })),
    ...away.map((row) => ({
      kind: "away" as const,
      id: row.id,
      title: `${row.kind}${row.halfDay ? " · half day" : ""}`,
      href: `/requests/away/${row.id}`,
      status: row.status,
      requestedBy: row.requestedBy,
      handler: row.status === "Pending" ? "Waiting on an admin" : "",
      when: `${formatFriendly(row.start)}${row.end && row.end !== row.start ? `–${formatFriendly(row.end)}` : ""}`,
      updated: row.updated || row.created,
      shortNotice: false,
      // Time away stays on the list until it is decided.
      finished: row.status !== "Pending",
      waitingOn: (person: StaffMember) => row.status === "Pending" && isAdmin(person),
    })),
  ];
  return rows.sort((a, b) => (parseSheetDate(b.updated)?.getTime() ?? 0) - (parseSheetDate(a.updated)?.getTime() ?? 0));
}

/** Colour for a status tag. Words always say the status too. */
export function statusTone(status: string): "new" | "working" | "review" | "changes" | "good" | "stopped" | "quiet" {
  switch (status) {
    case "New":
      return "new";
    case "In progress":
      return "working";
    case "Ready for review":
    case "Pending":
      return "review";
    case "Changes requested":
      return "changes";
    case "Approved":
    case "Done":
      return "good";
    case "Declined":
    case "Denied":
      return "stopped";
    default:
      return "quiet";
  }
}

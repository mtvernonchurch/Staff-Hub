import type { ActionItem, DeskRequest, GraphicsRequest, StaffMember, StaffPin, TimeAway } from "@/lib/data/types";
import { isAdmin } from "@/lib/domain/access";
import { formatFriendly } from "@/lib/domain/dates";
import { namesMatch, normalizeEmail } from "@/lib/domain/people";

/** Something happened in the hub that someone else should hear about. */
export type HubEvent =
  | { type: "request.created"; request: DeskRequest }
  | { type: "request.updated"; before: DeskRequest; after: DeskRequest }
  | { type: "graphics.created"; request: GraphicsRequest }
  | { type: "graphics.updated"; before: GraphicsRequest; after: GraphicsRequest }
  | { type: "away.created"; away: TimeAway }
  | { type: "away.decided"; away: TimeAway }
  | { type: "task.assigned"; item: ActionItem }
  | { type: "pin.posted"; pin: StaffPin };

/** One alert for one person. Email and phone push both use these words. */
export type Notice = {
  email: string;
  name: string;
  title: string;
  body: string;
  /** Where the alert opens, relative to the hub, such as /requests/req_123. */
  path: string;
  /** Alerts with the same tag replace each other on a phone. */
  tag: string;
  urgent?: boolean;
};

type Draft = Omit<Notice, "email" | "name">;

function active(staff: StaffMember[]): StaffMember[] {
  return staff.filter((person) => person.active && person.email.trim());
}

function byName(staff: StaffMember[], name: string): StaffMember[] {
  if (!name.trim()) return [];
  return active(staff).filter((person) => namesMatch(person.name, name));
}

function admins(staff: StaffMember[]): StaffMember[] {
  return active(staff).filter(isAdmin);
}

/** The person a request is assigned to, or every admin when no one has it yet. */
function handlers(staff: StaffMember[], assignedTo: string): StaffMember[] {
  const assigned = byName(staff, assignedTo);
  return assigned.length > 0 ? assigned : admins(staff);
}

function dates(start: string, end: string, halfDay: boolean): string {
  const from = formatFriendly(start);
  const range = end && end !== start ? `${from}–${formatFriendly(end)}` : from;
  return halfDay ? `${range} (half day)` : range;
}

function by(neededBy: string): string {
  return neededBy ? ` by ${formatFriendly(neededBy)}` : "";
}

function shorten(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

function to(people: StaffMember[], draft: Draft): Notice[] {
  return people.map((person) => ({ ...draft, email: normalizeEmail(person.email), name: person.name }));
}

function requestNotices(event: Extract<HubEvent, { type: "request.updated" }>, actor: StaffMember, staff: StaffMember[]): Notice[] {
  const { before, after } = event;
  const path = `/requests/${after.id}`;
  const tag = `request-${after.id}`;
  const notices: Notice[] = [];
  if (after.assignedTo && !namesMatch(after.assignedTo, before.assignedTo)) {
    notices.push(
      ...to(byName(staff, after.assignedTo), {
        title: `Request assigned to you: ${after.title}`,
        body: `From ${after.requestedBy}. Needs ${after.needed}${by(after.neededBy)}.`,
        path,
        tag,
      }),
    );
  }
  if (after.status === before.status) return notices;
  const fromRequester = namesMatch(actor.name, after.requestedBy);
  if (fromRequester) {
    const verb =
      after.status === "Approved"
        ? "approved the draft"
        : after.status === "Changes requested"
          ? "asked for changes"
          : after.status === "Withdrawn"
            ? "withdrew the request"
            : `moved it to ${after.status}`;
    notices.push(
      ...to(handlers(staff, after.assignedTo), {
        title: `${after.requestedBy} ${verb}: ${after.title}`,
        body: after.status === "Changes requested" ? "Open the request to see what to change." : `Status is now ${after.status}.`,
        path,
        tag,
      }),
    );
    return notices;
  }
  const requester = byName(staff, after.requestedBy);
  if (after.status === "Ready for review") {
    notices.push(
      ...to(requester, {
        title: `Ready for your review: ${after.title}`,
        body: "Open the draft, then approve it or ask for changes.",
        path,
        tag,
      }),
    );
  } else if (after.status === "Declined") {
    notices.push(
      ...to(requester, {
        title: `Request declined: ${after.title}`,
        body: "Ask the person handling it for the reason.",
        path,
        tag,
      }),
    );
  } else {
    notices.push(...to(requester, { title: `Request update: ${after.title}`, body: `Status is now ${after.status}.`, path, tag }));
  }
  return notices;
}

function graphicsNotices(event: Extract<HubEvent, { type: "graphics.updated" }>, actor: StaffMember, staff: StaffMember[]): Notice[] {
  const { before, after } = event;
  const path = `/requests/graphics/${after.id}`;
  const tag = `graphics-${after.id}`;
  const notices: Notice[] = [];
  if (after.assignedTo && !namesMatch(after.assignedTo, before.assignedTo)) {
    notices.push(
      ...to(byName(staff, after.assignedTo), {
        title: `Graphics request assigned to you: ${after.event}`,
        body: `From ${after.requestedBy} (${after.ministry}). Needed${by(after.neededBy)}.`,
        path,
        tag,
      }),
    );
  }
  if (after.status !== before.status && !namesMatch(actor.name, after.requestedBy)) {
    notices.push(
      ...to(byName(staff, after.requestedBy), {
        title: after.status === "Ready for review" ? `Graphic ready for your review: ${after.event}` : `Graphics update: ${after.event}`,
        body: after.status === "Ready for review" ? "Open it and let them know what you think." : `Status is now ${after.status}.`,
        path,
        tag,
      }),
    );
  }
  return notices;
}

function draftNotices(event: HubEvent, actor: StaffMember, staff: StaffMember[]): Notice[] {
  switch (event.type) {
    case "request.created": {
      const row = event.request;
      return to(handlers(staff, row.assignedTo), {
        title: `New request: ${row.title}`,
        body: `${row.requestedBy} needs ${row.needed}${by(row.neededBy)}.`,
        path: `/requests/${row.id}`,
        tag: `request-${row.id}`,
      });
    }
    case "request.updated":
      return requestNotices(event, actor, staff);
    case "graphics.created": {
      const row = event.request;
      return to(handlers(staff, row.assignedTo), {
        title: `New graphics request: ${row.event}`,
        body: `${row.requestedBy} (${row.ministry}) needs ${row.needed} for ${row.platforms}${by(row.neededBy)}.`,
        path: `/requests/graphics/${row.id}`,
        tag: `graphics-${row.id}`,
      });
    }
    case "graphics.updated":
      return graphicsNotices(event, actor, staff);
    case "away.created": {
      const row = event.away;
      return to(admins(staff), {
        title: `Time away request: ${row.requestedBy}`,
        body: `${row.kind}, ${dates(row.start, row.end, row.halfDay)}.${row.coverage ? ` Coverage: ${row.coverage}.` : ""}`,
        path: `/requests/away/${row.id}`,
        tag: `away-${row.id}`,
      });
    }
    case "away.decided": {
      const row = event.away;
      return to(byName(staff, row.requestedBy), {
        title: `Time away ${row.status === "Approved" ? "approved" : "denied"}`,
        body: `${row.kind}, ${dates(row.start, row.end, row.halfDay)}.`,
        path: `/requests/away/${row.id}`,
        tag: `away-${row.id}`,
      });
    }
    case "task.assigned": {
      const item = event.item;
      return to(byName(staff, item.owner), {
        title: "New action item for you",
        body: `${shorten(item.action, 160)}${item.due ? ` · due ${formatFriendly(item.due)}` : ""}`,
        path: "/action-items",
        tag: `task-${item.id}`,
      });
    }
    case "pin.posted": {
      const pin = event.pin;
      const urgent = pin.priority === "Urgent";
      return to(active(staff), {
        title: `${urgent ? "Urgent: " : ""}${pin.title}`,
        body: shorten(pin.message, 180),
        path: "/",
        tag: `pin-${pin.id}`,
        urgent,
      });
    }
  }
}

/**
 * Who hears about an event, and what they read. The person who did the
 * thing never gets an alert about it, and nobody gets the same alert twice.
 */
export function noticesFor(event: HubEvent, actor: StaffMember, staff: StaffMember[]): Notice[] {
  const self = normalizeEmail(actor.email);
  const seen = new Set<string>();
  return draftNotices(event, actor, staff).filter((notice) => {
    if (!notice.email || notice.email === self || seen.has(notice.email)) return false;
    seen.add(notice.email);
    return true;
  });
}

import type { ActionItem, DeskRequest, GraphicsRequest, StaffMember, TimeAway } from "@/lib/data/types";
import { isAdmin } from "@/lib/domain/access";
import { formatFriendly, isClosedStatus, isOverdue, sameDay, formatUsDate } from "@/lib/domain/dates";
import { graphicsOpen, pendingTimeAway } from "@/lib/domain/desk";
import { namesMatch, normalizeEmail } from "@/lib/domain/people";
import type { Notice } from "@/lib/notify/events";
import { requestWaitingOn } from "@/lib/services/hub";

export type DigestInput = {
  person: StaffMember;
  today: Date;
  items: ActionItem[];
  requests: DeskRequest[];
  graphics: GraphicsRequest[];
  away: TimeAway[];
};

function list(titles: string[], max = 3): string {
  const shown = titles.slice(0, max).join("; ");
  return titles.length > max ? `${shown}; and ${titles.length - max} more` : shown;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * The morning summary for one person: what is overdue, what is due today,
 * and what is waiting on them. Returns null when there is nothing to say,
 * so nobody gets an empty email.
 */
export function buildDigest(input: DigestInput): Notice | null {
  const { person, today } = input;
  const todayLabel = formatUsDate(today);
  const mine = input.items.filter((item) => namesMatch(item.owner, person.name) && !isClosedStatus(item.status));
  const overdue = mine.filter((item) => isOverdue(item.due, item.status, today));
  const dueToday = mine.filter((item) => sameDay(item.due, todayLabel));
  const waiting = input.requests.filter((request) => requestWaitingOn(person, request));
  const graphics = graphicsOpen(input.graphics).filter((row) => namesMatch(row.assignedTo, person.name));
  const away = isAdmin(person) ? pendingTimeAway(input.away) : [];

  const lines: string[] = [];
  if (overdue.length) lines.push(`Overdue: ${list(overdue.map((item) => `${item.action} (due ${formatFriendly(item.due)})`))}`);
  if (dueToday.length) lines.push(`Due today: ${list(dueToday.map((item) => item.action))}`);
  if (waiting.length) lines.push(`Requests waiting on you: ${list(waiting.map((row) => row.title))}`);
  if (graphics.length) lines.push(`Graphics assigned to you: ${list(graphics.map((row) => row.event))}`);
  if (away.length) lines.push(`Time away to approve: ${list(away.map((row) => `${row.requestedBy}, ${formatFriendly(row.start)}`))}`);
  if (lines.length === 0) return null;

  const count = overdue.length + dueToday.length + waiting.length + graphics.length + away.length;
  return {
    email: normalizeEmail(person.email),
    name: person.name,
    title: `Your Staff Hub today: ${plural(count, "thing", "things")} for you`,
    body: lines.join("\n"),
    path: "/",
    tag: `digest-${todayLabel}`,
  };
}

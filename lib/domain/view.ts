import type { ActionItem, Announcement, Meeting } from "@/lib/data/types";
import { chicagoToday, formatUsDate, isClosedStatus, isOverdue, parseSheetDate, sameDay, upcomingMonday } from "@/lib/domain/dates";

export function orderValue(value: string): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.MAX_SAFE_INTEGER;
}

export function sortByOrder<T extends { order: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => orderValue(a.order) - orderValue(b.order) || a.order.localeCompare(b.order));
}

export function sortActionItems(items: ActionItem[], today: Date): ActionItem[] {
  const rank = (item: ActionItem) => {
    if (isOverdue(item.due, item.status, today)) return 0;
    if (isClosedStatus(item.status)) return 2;
    return 1;
  };
  return [...items].sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    const left = parseSheetDate(a.due)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const right = parseSheetDate(b.due)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return left - right;
  });
}

export function sortAnnouncements(rows: Announcement[], today = chicagoToday()): Announcement[] {
  const time = (row: Announcement) => parseSheetDate(row.date)?.getTime() ?? 0;
  const upcoming = rows.filter((row) => time(row) >= today.getTime() || !parseSheetDate(row.date));
  const past = rows.filter((row) => {
    const parsed = parseSheetDate(row.date);
    return parsed && parsed.getTime() < today.getTime();
  });
  return [...upcoming.sort((a, b) => time(a) - time(b)), ...past.sort((a, b) => time(b) - time(a))];
}

export function pickMondayMeeting(meetings: Meeting[], today: Date): Meeting | null {
  const monday = formatUsDate(upcomingMonday(today));
  const onDay = meetings.filter((meeting) => sameDay(meeting.date, monday));
  return onDay.find((meeting) => /staff/i.test(meeting.title)) ?? onDay[0] ?? null;
}

export function thisWeekMeeting(meetings: Meeting[], today: Date): Meeting | null {
  return pickMondayMeeting(meetings, today) ?? latestPastMeeting(meetings, today);
}

export function latestPastMeeting(meetings: Meeting[], today: Date): Meeting | null {
  const past = meetings.filter((meeting) => {
    const date = parseSheetDate(meeting.date);
    return date && date.getTime() <= today.getTime();
  });
  past.sort((a, b) => (parseSheetDate(b.date)?.getTime() ?? 0) - (parseSheetDate(a.date)?.getTime() ?? 0));
  return past[0] ?? null;
}

export function announcementsForMeeting(announcements: Announcement[], meeting: Meeting): Announcement[] {
  return announcements.filter((row) => row.meetingId === meeting.id || (!row.meetingId && sameDay(row.date, meeting.date)));
}

export function mine(items: ActionItem[], name: string): ActionItem[] {
  return items.filter((item) => item.owner.trim().toLowerCase() === name.trim().toLowerCase());
}

export function myOpenItems(items: ActionItem[], name: string, today: Date): ActionItem[] {
  return sortActionItems(
    mine(items, name).filter((item) => !isClosedStatus(item.status)),
    today,
  );
}

import type { CalendarCheck, CalendarEvent } from "@/lib/data/types";
import { addUtcDays, formatUsDate, parseSheetDate, sameDay, weekStartMonday } from "@/lib/domain/dates";

/** Sunday that starts the church week containing today. */
export function churchWeekStart(today: Date): Date {
  return addUtcDays(today, -today.getUTCDay());
}

export type ChurchWeek = { start: Date; end: Date };

export function fourChurchWeeks(today: Date): ChurchWeek[] {
  const start = churchWeekStart(today);
  return [0, 1, 2, 3].map((index) => {
    const weekStart = addUtcDays(start, index * 7);
    return { start: weekStart, end: addUtcDays(weekStart, 6) };
  });
}

/** Monday through Sunday of the week that contains today. */
export function mondayWeek(today: Date): ChurchWeek {
  const start = weekStartMonday(today);
  return { start, end: addUtcDays(start, 6) };
}

export function eventsInMonth(events: CalendarEvent[], today: Date): CalendarEvent[] {
  return sortEvents(
    events.filter((event) => {
      const date = parseSheetDate(event.date);
      if (!date) return false;
      return date.getUTCFullYear() === today.getUTCFullYear() && date.getUTCMonth() === today.getUTCMonth();
    }),
  );
}

export function eventsInWeek(events: CalendarEvent[], week: ChurchWeek): CalendarEvent[] {
  return sortEvents(
    events.filter((event) => {
      const date = parseSheetDate(event.date);
      if (!date) return false;
      return date.getTime() >= week.start.getTime() && date.getTime() <= week.end.getTime();
    }),
  );
}

function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const left = parseSheetDate(a.date)?.getTime() ?? 0;
    const right = parseSheetDate(b.date)?.getTime() ?? 0;
    return left - right || a.time.localeCompare(b.time) || a.event.localeCompare(b.event);
  });
}

export function checkFor(checks: CalendarCheck[], eventId: string): CalendarCheck | undefined {
  return checks.find((row) => row.eventId === eventId);
}

export function needsPromotion(check: CalendarCheck | undefined): boolean {
  if (!check) return true;
  return !(check.promotedEmail || check.promotedSocials || check.promotedPlatform);
}

export function needsGraphics(check: CalendarCheck | undefined): boolean {
  return !check?.graphicsRequested;
}

/** This Sunday, or the coming Sunday when today is Monday–Saturday. */
export function upcomingSunday(today: Date): Date {
  const delta = today.getUTCDay() === 0 ? 0 : 7 - today.getUTCDay();
  return addUtcDays(today, delta);
}

export function sundayService(events: CalendarEvent[], today: Date): CalendarEvent | null {
  const label = formatUsDate(upcomingSunday(today));
  const onDay = events.filter((event) => sameDay(event.date, label));
  return onDay.find((event) => /worship|sunday|gathering/i.test(event.event)) ?? onDay[0] ?? null;
}

export function eventsToday(events: CalendarEvent[], today: Date): CalendarEvent[] {
  const label = formatUsDate(today);
  return events
    .filter((event) => sameDay(event.date, label))
    .sort((a, b) => a.time.localeCompare(b.time) || a.event.localeCompare(b.event));
}

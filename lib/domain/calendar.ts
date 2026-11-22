import type { CalendarCheck, CalendarEvent } from "@/lib/data/types";
import { addUtcDays, parseSheetDate } from "@/lib/domain/dates";

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

export function eventsInWeek(events: CalendarEvent[], week: ChurchWeek): CalendarEvent[] {
  return events
    .filter((event) => {
      const date = parseSheetDate(event.date);
      if (!date) return false;
      return date.getTime() >= week.start.getTime() && date.getTime() <= week.end.getTime();
    })
    .sort((a, b) => {
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

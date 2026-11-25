import type { CalendarEvent } from "@/lib/data/types";
import { chicagoTime } from "@/lib/pco/map";
import type { UpcomingEvent } from "@/lib/pco/types";

export type DayItemSource = "Event" | "Room" | "Group" | "Calendar";

export type DayItem = {
  id: string;
  name: string;
  day: string;
  time: string;
  location: string;
  source: DayItemSource;
};

const FROM_PCO = { event: "Event", room: "Room", group: "Group" } as const;

export function pcoDayItems(events: UpcomingEvent[]): DayItem[] {
  return events.map((event) => ({
    id: `pco-${event.source}-${event.id}`,
    name: event.name,
    day: event.day,
    time: event.allDay ? "All day" : chicagoTime(event.startsAt),
    location: event.location,
    source: FROM_PCO[event.source],
  }));
}

export function sheetDayItems(events: CalendarEvent[]): DayItem[] {
  return events.map((event) => ({
    id: `sheet-${event.id}`,
    name: event.event,
    day: event.date,
    time: event.time || "Time not set",
    location: event.location,
    source: "Calendar",
  }));
}

function minutes(time: string): number {
  if (/all day/i.test(time)) return -1;
  const match = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(time);
  if (!match) return 24 * 60;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const ampm = match[3]?.toUpperCase();
  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

export function itemsOnDay(items: DayItem[], day: string): DayItem[] {
  return items
    .filter((item) => item.day === day)
    .sort((a, b) => minutes(a.time) - minutes(b.time) || a.name.localeCompare(b.name) || a.source.localeCompare(b.source));
}

import type { EventAttendance, PcoDocument, PcoResource, UpcomingEvent, WeeklyCount } from "@/lib/pco/types";
import { addUtcDays, chicagoToday, formatUsDate, weekStartMonday } from "@/lib/domain/dates";

export function chicagoTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function attr(resource: PcoResource | undefined, name: string): string {
  const value = resource?.attributes?.[name];
  return value == null ? "" : String(value);
}

function related(resource: PcoResource | undefined, name: string): { type: string; id: string } | null {
  const data = resource?.relationships?.[name]?.data;
  if (!data?.id) return null;
  return { type: data.type ?? "", id: String(data.id) };
}

function indexIncluded(docs: PcoDocument[]): Map<string, PcoResource> {
  const index = new Map<string, PcoResource>();
  for (const doc of docs) {
    for (const row of doc.included ?? []) {
      if (row.type && row.id) index.set(`${row.type}:${row.id}`, row);
    }
    for (const row of doc.data ?? []) {
      if (row.type && row.id) index.set(`${row.type}:${row.id}`, row);
    }
  }
  return index;
}

function approved(status: string): boolean {
  const value = status.trim().toLowerCase();
  return value === "" || value === "a" || value === "approved";
}

/** Approved Calendar instances that fall on a Columbus day inside the window. */
export function mapEventInstances(docs: PcoDocument[], today: Date, days: number): UpcomingEvent[] {
  const included = indexIncluded(docs);
  const start = today.getTime();
  const end = addUtcDays(today, days).getTime();
  const events: UpcomingEvent[] = [];
  for (const doc of docs) {
    for (const row of doc.data ?? []) {
      if (row.type && row.type !== "EventInstance") continue;
      const startsAt = attr(row, "starts_at");
      const when = new Date(startsAt);
      if (!startsAt || Number.isNaN(when.getTime())) continue;
      const day = chicagoToday(when);
      if (day.getTime() < start || day.getTime() >= end) continue;
      const parentRef = related(row, "event");
      const parent = parentRef ? included.get(`${parentRef.type}:${parentRef.id}`) : undefined;
      const status = attr(parent, "approval_status") || attr(row, "approval_status");
      if (!approved(status)) continue;
      const kind = (attr(parent, "kind") || attr(row, "kind")).toLowerCase();
      if (kind === "blockout") continue;
      const name = attr(row, "name") || attr(parent, "name") || "Untitled event";
      events.push({
        id: String(row.id ?? `${name}-${startsAt}`),
        name,
        startsAt,
        endsAt: attr(row, "ends_at"),
        location: attr(row, "location"),
        allDay: row.attributes?.all_day_event === true || attr(row, "all_day_event").toLowerCase() === "true",
        day: formatUsDate(day),
      });
    }
  }
  return events.sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.name.localeCompare(b.name));
}

export function eventsWithinDays(events: UpcomingEvent[], today: Date, days: number): UpcomingEvent[] {
  const start = today.getTime();
  const end = addUtcDays(today, days).getTime();
  return events.filter((event) => {
    const [month, day, year] = event.day.split("/").map(Number);
    const time = Date.UTC(year, month - 1, day);
    return time >= start && time < end;
  });
}

export function groupEventsByDay(events: UpcomingEvent[]): { day: string; events: UpcomingEvent[] }[] {
  const groups: { day: string; events: UpcomingEvent[] }[] = [];
  for (const event of events) {
    const last = groups.at(-1);
    if (last?.day === event.day) last.events.push(event);
    else groups.push({ day: event.day, events: [event] });
  }
  return groups;
}

function weekKey(day: Date): string {
  return formatUsDate(weekStartMonday(day));
}

/** Sum Check-Ins headcounts by event, for the week containing today and the weeks before it. */
export function mapWeeklyAttendance(headcounts: PcoDocument[], events: PcoDocument[], today: Date, weeks = 6): EventAttendance[] {
  const included = indexIncluded([...headcounts, ...events]);
  const names = new Map<string, string>();
  for (const doc of events) {
    for (const row of doc.data ?? []) {
      if (!row.id) continue;
      names.set(String(row.id), attr(row, "name") || "Check-Ins event");
    }
  }
  const thisKey = weekKey(today);
  const lastKey = formatUsDate(addUtcDays(weekStartMonday(today), -7));
  const weekStarts = Array.from({ length: weeks }, (_, index) => addUtcDays(weekStartMonday(today), (index - (weeks - 1)) * 7));
  const allowed = new Set(weekStarts.map((day) => formatUsDate(day)));
  const totals = new Map<string, { name: string; byWeek: Map<string, number> }>();

  for (const doc of headcounts) {
    for (const row of doc.data ?? []) {
      if (row.type && row.type !== "Headcount") continue;
      const total = Number(row.attributes?.total);
      if (!Number.isFinite(total)) continue;
      const timeRef = related(row, "event_time");
      const time = timeRef ? included.get(`${timeRef.type || "EventTime"}:${timeRef.id}`) ?? included.get(`EventTime:${timeRef.id}`) : undefined;
      const startsAt = attr(time, "starts_at");
      const when = new Date(startsAt);
      if (!startsAt || Number.isNaN(when.getTime())) continue;
      const key = weekKey(chicagoToday(when));
      if (!allowed.has(key)) continue;
      const eventRef = related(time, "event");
      const id = eventRef?.id || timeRef?.id || "unknown";
      const name = names.get(id) || attr(time, "name") || "Check-Ins event";
      const bucket = totals.get(id) ?? { name, byWeek: new Map<string, number>() };
      bucket.byWeek.set(key, (bucket.byWeek.get(key) ?? 0) + total);
      totals.set(id, bucket);
    }
  }

  return [...totals.entries()]
    .map(([id, bucket]) => {
      const series: WeeklyCount[] = weekStarts.map((day) => {
        const week = formatUsDate(day);
        return { week, total: bucket.byWeek.get(week) ?? 0 };
      });
      const thisWeek = bucket.byWeek.get(thisKey) ?? 0;
      const lastWeek = bucket.byWeek.get(lastKey) ?? 0;
      return { id, name: bucket.name, thisWeek, lastWeek, change: thisWeek - lastWeek, weeks: series };
    })
    .sort((a, b) => b.thisWeek - a.thisWeek || a.name.localeCompare(b.name));
}

export function noonChicago(day: Date): string {
  let instant = new Date(day.getTime() + 17 * 60 * 60 * 1000);
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant).find((part) => part.type === "hour");
  const current = Number(hour?.value ?? "12");
  instant = new Date(instant.getTime() + (12 - current) * 60 * 60 * 1000);
  return instant.toISOString();
}

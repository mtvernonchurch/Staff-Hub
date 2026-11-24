import type { CountSource, PcoDocument, PcoRef, PcoResource, RecentAttendance, SundayAttendance, SundayCount, UpcomingEvent } from "@/lib/pco/types";
import { addUtcDays, chicagoToday, formatUsDate } from "@/lib/domain/dates";

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

function refsOf(data: PcoRef | PcoRef[] | null | undefined): PcoRef[] {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

function related(resource: PcoResource | undefined, name: string): { type: string; id: string } | null {
  const ref = refsOf(resource?.relationships?.[name]?.data).find((item) => item?.id);
  if (!ref?.id) return null;
  return { type: ref.type ?? "", id: String(ref.id) };
}

function relatedAll(resource: PcoResource | undefined, name: string): { type: string; id: string }[] {
  return refsOf(resource?.relationships?.[name]?.data)
    .filter((item) => item?.id)
    .map((item) => ({ type: item.type ?? "", id: String(item.id) }));
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

export function comingSunday(today: Date): Date {
  const delta = today.getUTCDay() === 0 ? 0 : 7 - today.getUTCDay();
  return addUtcDays(today, delta);
}

export function isSundayServicesName(name: string): boolean {
  return /sunday services?/i.test(name);
}

/** A separate kids event, not the Sunday Services event kids rooms live on. */
export function isKidsEventName(name: string): boolean {
  return /mv\s*kids|kid\s*zone|kidzone|discovery\s*zone|children/i.test(name);
}

function numberAttr(resource: PcoResource | undefined, name: string): number | null {
  const value = resource?.attributes?.[name];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function sundayKey(instant: Date): string | null {
  const day = chicagoToday(instant);
  if (day.getUTCDay() !== 0) return null;
  return formatUsDate(day);
}

function lookup(index: Map<string, PcoResource>, ref: { type: string; id: string } | null): PcoResource | undefined {
  if (!ref) return undefined;
  return index.get(`${ref.type || "EventTime"}:${ref.id}`) ?? index.get(`EventTime:${ref.id}`) ?? index.get(`Location:${ref.id}`) ?? index.get(`AttendanceType:${ref.id}`);
}

export function kidLocationIds(locations: PcoDocument[]): Set<string> {
  const index = indexIncluded(locations);
  const ids = new Set<string>();
  for (const doc of locations) {
    for (const row of doc.data ?? []) {
      if (row.type && row.type !== "Location") continue;
      if (!row.id) continue;
      const name = attr(row, "name");
      if (/volunteer/i.test(name) || attr(row, "child_or_adult").toUpperCase() === "A") continue;
      const parent = lookup(index, related(row, "parent"));
      const folder = attr(parent, "name");
      if (/discovery|kid\s*zone|kidzone|mv\s*kids/i.test(folder)) ids.add(String(row.id));
    }
  }
  return ids;
}

type Bucket = { total: number; headcount: number; checkIns: number };

function blankBuckets(sundays: string[]): Map<string, { worship: Bucket; kids: Bucket }> {
  return new Map(sundays.map((sunday) => [sunday, {
    worship: { total: 0, headcount: 0, checkIns: 0 },
    kids: { total: 0, headcount: 0, checkIns: 0 },
  }]));
}

function add(bucket: Bucket, total: number, source: "headcount" | "check-ins") {
  bucket.total += total;
  if (source === "headcount") bucket.headcount += total;
  else bucket.checkIns += total;
}

function sourceOf(bucket: Bucket): CountSource {
  if (bucket.checkIns > 0 && bucket.headcount > 0) return "mixed";
  if (bucket.checkIns > 0) return "check-ins";
  return "headcount";
}

function toCount(bucket: Bucket, kids: boolean): SundayCount {
  return { total: bucket.total, source: kids ? "check-ins" : sourceOf(bucket) };
}

/**
 * Worship comes from Worship headcounts on Sunday Services.
 * A service with no Worship headcount uses that event time's check-in total instead.
 * Kids are check-ins in Discovery Zone and KidZone rooms, plus any separate kids event that meets on Sunday.
 */
export function mapSundayAttendance(
  headcounts: PcoDocument[],
  events: PcoDocument[],
  eventTimes: PcoDocument[],
  locations: PcoDocument[],
  checkIns: PcoDocument[],
  today: Date,
  weeks = 6,
): RecentAttendance {
  const index = indexIncluded([...headcounts, ...events, ...eventTimes, ...locations, ...checkIns]);
  const names = new Map<string, string>();
  for (const row of index.values()) {
    if (row.type === "Event" && row.id) names.set(String(row.id), attr(row, "name") || "Check-Ins event");
  }
  const coming = comingSunday(today);
  const sundayList = Array.from({ length: weeks }, (_, index) => formatUsDate(addUtcDays(coming, -7 * (weeks - 1 - index))));
  const allowed = new Set(sundayList);
  const buckets = blankBuckets(sundayList);
  const worshipByTime = new Map<string, { total: number; present: boolean }>();

  for (const doc of headcounts) {
    for (const row of doc.data ?? []) {
      if (row.type && row.type !== "Headcount") continue;
      const typeRef = related(row, "attendance_type");
      const typeName = attr(lookup(index, typeRef), "name");
      if (!/^worship$/i.test(typeName)) continue;
      const timeRef = related(row, "event_time");
      if (!timeRef) continue;
      const total = numberAttr(row, "total") ?? 0;
      const current = worshipByTime.get(timeRef.id) ?? { total: 0, present: false };
      current.total += total;
      current.present = true;
      worshipByTime.set(timeRef.id, current);
    }
  }

  const times: PcoResource[] = [];
  const seenTimes = new Set<string>();
  for (const row of index.values()) {
    if (row.type !== "EventTime" || !row.id || seenTimes.has(String(row.id))) continue;
    seenTimes.add(String(row.id));
    times.push(row);
  }

  for (const time of times) {
    const startsAt = attr(time, "starts_at");
    const when = new Date(startsAt);
    if (!startsAt || Number.isNaN(when.getTime())) continue;
    const sunday = sundayKey(when);
    if (!sunday || !allowed.has(sunday)) continue;
    const eventRef = related(time, "event");
    const name = names.get(eventRef?.id ?? "") || attr(lookup(index, eventRef), "name");
    const row = buckets.get(sunday);
    if (!row || !time.id) continue;
    if (isSundayServicesName(name)) {
      const headcount = worshipByTime.get(String(time.id));
      if (headcount?.present) add(row.worship, headcount.total, "headcount");
      else {
        const total = numberAttr(time, "total_count");
        if (total != null) add(row.worship, total, "check-ins");
      }
      continue;
    }
    if (!isKidsEventName(name)) continue;
    const regular = numberAttr(time, "regular_count");
    const guests = numberAttr(time, "guest_count");
    const volunteers = numberAttr(time, "volunteer_count");
    const kids = regular != null || guests != null
      ? (regular ?? 0) + (guests ?? 0)
      : numberAttr(time, "total_count") != null
        ? Math.max(0, (numberAttr(time, "total_count") ?? 0) - (volunteers ?? 0))
        : null;
    if (kids != null) add(row.kids, kids, "check-ins");
  }

  const kidRooms = kidLocationIds(locations);
  for (const doc of checkIns) {
    for (const row of doc.data ?? []) {
      if (row.type && row.type !== "CheckIn") continue;
      if (/volunteer/i.test(attr(row, "kind"))) continue;
      const times = relatedAll(row, "check_in_times");
      for (const timeRef of times) {
        const time = lookup(index, timeRef.type ? timeRef : { type: "CheckInTime", id: timeRef.id });
        const checkInTime = time?.type === "CheckInTime" || !time?.type ? time : undefined;
        const located = related(checkInTime, "location");
        if (located && !kidRooms.has(located.id)) continue;
        if (!located && kidRooms.size > 0) continue;
        const eventTimeRef = related(checkInTime, "event_time");
        const eventTime = lookup(index, eventTimeRef);
        const startsAt = attr(eventTime, "starts_at");
        const when = new Date(startsAt);
        if (!startsAt || Number.isNaN(when.getTime())) continue;
        const sunday = sundayKey(when);
        const bucket = sunday ? buckets.get(sunday) : undefined;
        if (!bucket) continue;
        add(bucket.kids, 1, "check-ins");
      }
    }
  }

  const sundays: SundayAttendance[] = sundayList.map((sunday) => {
    const bucket = buckets.get(sunday)!;
    return { sunday, worship: toCount(bucket.worship, false), kids: toCount(bucket.kids, true) };
  });
  return {
    coming: sundays.at(-1)!,
    last: sundays.at(-2) ?? sundays.at(-1)!,
    sundays,
  };
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

import { resolveDataMode } from "@/lib/config";
import { addUtcDays } from "@/lib/domain/dates";
import { pcoList, type PcoDeps } from "@/lib/pco/client";
import { eventIdsOnFeeds, eventsWithinDays, groupsFeedIds, isSundayServicesName, kidLocationIds, mapEventInstances, mapGroupEvents, mapRoomBookings, mapSundayAttendance } from "@/lib/pco/map";
import { sampleAttendance, sampleUpcomingEvents } from "@/lib/pco/sample";
import type { CalendarSource, PcoDocument, RecentAttendance, UpcomingEvent } from "@/lib/pco/types";

type Env = Record<string, string | undefined>;

export type LoadResult<T> = { ok: true; sample: boolean; data: T; warning?: string } | { ok: false; message: string };

/** Today and the six days after it. Offsets 0 through 6. */
export const HOME_CALENDAR_DAYS = 7;

const PCO_TTL_MS = 15 * 60 * 1000;
const memoryCache = new Map<string, { at: number; value: LoadResult<unknown> }>();
const memoryInflight = new Map<string, Promise<LoadResult<unknown>>>();

async function remember<T>(key: string, load: () => Promise<LoadResult<T>>): Promise<LoadResult<T>> {
  const hit = memoryCache.get(key);
  if (hit && Date.now() - hit.at < PCO_TTL_MS) return hit.value as LoadResult<T>;
  const pending = memoryInflight.get(key);
  if (pending) return pending as Promise<LoadResult<T>>;
  const promise = load().then((value) => {
    if (value.ok) memoryCache.set(key, { at: Date.now(), value });
    memoryInflight.delete(key);
    return value;
  }).catch((error: unknown) => {
    memoryInflight.delete(key);
    throw error;
  });
  memoryInflight.set(key, promise as Promise<LoadResult<unknown>>);
  return promise;
}

export function shouldUseLivePco(env: Env): boolean {
  return resolveDataMode({
    DATA_MODE: env.DATA_MODE,
    GOOGLE_SHEET_ID: env.GOOGLE_SHEET_ID,
    GOOGLE_SERVICE_ACCOUNT_JSON: env.GOOGLE_SERVICE_ACCOUNT_JSON,
    GOOGLE_SERVICE_ACCOUNT_EMAIL: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  }) === "sheets" && Boolean(env.PCO_APP_ID?.trim() && env.PCO_SECRET?.trim());
}

function liveDeps(env: Env): PcoDeps {
  return { fetch, appId: env.PCO_APP_ID?.trim() ?? "", secret: env.PCO_SECRET?.trim() ?? "" };
}

/** Pad a day on each side so a Columbus evening still matches the UTC query. */
function windowQuery(start: Date, end: Date): Record<string, string> {
  return {
    "where[starts_at][gte]": addUtcDays(start, -1).toISOString(),
    "where[starts_at][lte]": addUtcDays(end, 1).toISOString(),
  };
}

function sampleWindow(today: Date, start: Date, end: Date, sources: readonly CalendarSource[]): UpcomingEvent[] {
  const allowed = new Set(sources);
  return sampleUpcomingEvents(today).filter((event) => {
    if (!allowed.has(event.source)) return false;
    const [month, day, year] = event.day.split("/").map(Number);
    const time = Date.UTC(year, month - 1, day);
    return time >= start.getTime() && time < end.getTime();
  });
}

async function loadChurchEvents(deps: PcoDeps, start: Date, end: Date): Promise<UpcomingEvent[]> {
  const query = windowQuery(start, end);
  const [instances, feeds] = await Promise.all([
    pcoList("/calendar/v2/event_instances", {
      filter: "approved",
      include: "event",
      order: "starts_at",
      per_page: "100",
      ...query,
    }, deps),
    pcoList("/calendar/v2/feeds", { "where[feed_type]": "groups", per_page: "100" }, deps),
  ]);
  const feedIds = groupsFeedIds(feeds);
  const linked = feedIds.size === 0 ? [] : (await Promise.all([...feedIds].map((id) => pcoList("/calendar/v2/events", {
    "where[feed_id]": id,
    include: "feed",
    per_page: "100",
  }, deps)))).flat();
  return mapEventInstances(instances, start, end, { eventIds: eventIdsOnFeeds(linked, feedIds), feedIds });
}

async function loadRoomReservations(deps: PcoDeps, start: Date, end: Date): Promise<UpcomingEvent[]> {
  const docs = await pcoList("/calendar/v2/resource_bookings", {
    filter: "approved",
    include: "resource,event",
    order: "starts_at",
    per_page: "100",
    ...windowQuery(start, end),
  }, deps);
  return mapRoomBookings(docs, start, end);
}

async function loadGroupsEvents(deps: PcoDeps, start: Date, end: Date): Promise<UpcomingEvent[]> {
  const docs = await pcoList("/groups/v2/events", {
    include: "group",
    order: "starts_at",
    per_page: "100",
    ...windowQuery(start, end),
  }, deps);
  return mapGroupEvents(docs, start, end);
}

const SOURCE_ERROR: Record<CalendarSource, string> = {
  event: "Couldn't load events.",
  room: "Couldn't load room reservations.",
  group: "Couldn't load Groups events.",
};

async function loadCalendarWindow(
  today: Date,
  start: Date,
  end: Date,
  sources: readonly CalendarSource[],
  env: Env,
  deps?: PcoDeps,
): Promise<LoadResult<UpcomingEvent[]>> {
  if (!shouldUseLivePco(env)) {
    return { ok: true, sample: true, data: sampleWindow(today, start, end, sources) };
  }
  const live = deps ?? liveDeps(env);
  const key = `calendar:${start.toISOString()}:${end.toISOString()}:${sources.join(",")}`;
  const run = async (): Promise<LoadResult<UpcomingEvent[]>> => {
    const jobs = sources.map(async (source) => {
      try {
        const data = source === "event"
          ? await loadChurchEvents(live, start, end)
          : source === "room"
            ? await loadRoomReservations(live, start, end)
            : await loadGroupsEvents(live, start, end);
        return { data, error: "" };
      } catch {
        return { data: [] as UpcomingEvent[], error: SOURCE_ERROR[source] };
      }
    });
    const parts = await Promise.all(jobs);
    const data = parts.flatMap((part) => part.data).sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.name.localeCompare(b.name));
    const errors = parts.map((part) => part.error).filter(Boolean);
    if (data.length === 0 && errors.length === parts.length) {
      return { ok: false, message: "Couldn't load upcoming events." };
    }
    return { ok: true, sample: false, data, warning: errors.length > 0 ? errors.join(" ") : undefined };
  };
  if (deps) return run();
  return remember(key, run);
}

/** Next 30 days of events and room reservations. Groups are not included. */
export async function loadUpcomingEvents(today: Date, env: Env = process.env, deps?: PcoDeps): Promise<LoadResult<UpcomingEvent[]>> {
  return loadCalendarWindow(today, today, addUtcDays(today, 30), ["event", "room"], env, deps);
}

/** Today through the next 7 days. Events and room reservations only. */
export async function loadHomeCalendar(today: Date, env: Env = process.env, deps?: PcoDeps): Promise<LoadResult<UpcomingEvent[]>> {
  const result = await loadCalendarWindow(today, today, addUtcDays(today, HOME_CALENDAR_DAYS), ["event", "room"], env, deps);
  if (!result.ok) return result;
  return { ...result, data: homeEvents(result.data, today) };
}

/** Every Planning Center source for the Columbus month that contains today. */
export async function loadMonthCalendar(today: Date, env: Env = process.env, deps?: PcoDeps): Promise<LoadResult<UpcomingEvent[]>> {
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
  return loadCalendarWindow(today, start, end, ["event", "room", "group"], env, deps);
}

function eventName(row: { attributes?: Record<string, unknown> }): string {
  const value = row.attributes?.name;
  return value == null ? "" : String(value);
}

function sundayServiceIds(docs: PcoDocument[]): string[] {
  const ids: string[] = [];
  for (const doc of docs) {
    for (const row of doc.data ?? []) {
      if (row.id && /^[0-9]+$/.test(String(row.id)) && isSundayServicesName(eventName(row))) ids.push(String(row.id));
    }
  }
  return ids;
}

async function fetchRecentAttendance(today: Date, deps: PcoDeps): Promise<RecentAttendance> {
  const since = addUtcDays(today, -70).toISOString();
  const until = addUtcDays(today, 14).toISOString();
  const headcountsP = pcoList("/check-ins/v2/headcounts", {
    include: "event_time,attendance_type",
    order: "created_at",
    per_page: "100",
    "where[created_at][gte]": since,
  }, deps);
  const eventsP = pcoList("/check-ins/v2/events", {
    filter: "not_archived",
    per_page: "100",
    order: "name",
  }, deps);
  const eventTimesP = pcoList("/check-ins/v2/event_times", {
    include: "event",
    order: "starts_at",
    per_page: "100",
    "where[starts_at][gte]": since,
    "where[starts_at][lte]": until,
  }, deps);
  const locationsP = eventsP.then((events) => Promise.all(sundayServiceIds(events).map((id) => pcoList(`/check-ins/v2/events/${id}/locations`, {
    include: "parent",
    per_page: "100",
  }, deps))).then((docs) => docs.flat()));
  const checkInsP = locationsP.then((locationDocs) => Promise.all([...kidLocationIds(locationDocs)].map((id) => {
    if (!/^[0-9]+$/.test(id)) return Promise.resolve([] as PcoDocument[]);
    return pcoList(`/check-ins/v2/locations/${id}/check_ins`, {
      include: "check_in_times",
      order: "created_at",
      per_page: "100",
      "where[created_at][gte]": since,
      "fields[CheckIn]": "kind,created_at",
    }, deps, 15);
  })).then((docs) => docs.flat()));
  const [headcounts, events, eventTimes, locationDocs, checkIns] = await Promise.all([
    headcountsP,
    eventsP,
    eventTimesP,
    locationsP,
    checkInsP,
  ]);
  return mapSundayAttendance(headcounts, events, eventTimes, locationDocs, checkIns, today);
}

export async function loadRecentAttendance(today: Date, env: Env = process.env, deps?: PcoDeps): Promise<LoadResult<RecentAttendance>> {
  if (!shouldUseLivePco(env)) return { ok: true, sample: true, data: sampleAttendance(today) };
  const live = deps ?? liveDeps(env);
  const key = `attendance:${today.toISOString()}`;
  const run = async (): Promise<LoadResult<RecentAttendance>> => {
    try {
      return { ok: true, sample: false, data: await fetchRecentAttendance(today, live) };
    } catch {
      return { ok: false, message: "Couldn't load recent attendance." };
    }
  };
  if (deps) return run();
  return remember(key, run);
}

export function homeEvents(events: UpcomingEvent[], today: Date): UpcomingEvent[] {
  return eventsWithinDays(events, today, HOME_CALENDAR_DAYS).filter((event) => event.source === "event" || event.source === "room");
}

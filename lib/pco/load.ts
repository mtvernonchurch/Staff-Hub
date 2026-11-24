import { resolveDataMode } from "@/lib/config";
import { addUtcDays } from "@/lib/domain/dates";
import { pcoList, type PcoDeps } from "@/lib/pco/client";
import { eventsWithinDays, mapEventInstances, mapWeeklyAttendance } from "@/lib/pco/map";
import { sampleAttendance, sampleUpcomingEvents } from "@/lib/pco/sample";
import type { EventAttendance, UpcomingEvent } from "@/lib/pco/types";

type Env = Record<string, string | undefined>;

export type LoadResult<T> = { ok: true; sample: boolean; data: T } | { ok: false; message: string };

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

function windowQuery(today: Date, days: number): Record<string, string> {
  return {
    "where[starts_at][gte]": today.toISOString(),
    "where[starts_at][lte]": addUtcDays(today, days).toISOString(),
  };
}

export async function loadUpcomingEvents(today: Date, env: Env = process.env): Promise<LoadResult<UpcomingEvent[]>> {
  if (!shouldUseLivePco(env)) return { ok: true, sample: true, data: sampleUpcomingEvents(today) };
  try {
    const docs = await pcoList("/calendar/v2/event_instances", {
      filter: "approved",
      include: "event",
      order: "starts_at",
      per_page: "100",
      ...windowQuery(today, 31),
    }, liveDeps(env));
    return { ok: true, sample: false, data: mapEventInstances(docs, today, 30) };
  } catch {
    return { ok: false, message: "Couldn't load upcoming events." };
  }
}

export async function loadRecentAttendance(today: Date, env: Env = process.env): Promise<LoadResult<EventAttendance[]>> {
  if (!shouldUseLivePco(env)) return { ok: true, sample: true, data: sampleAttendance(today) };
  try {
    const deps = liveDeps(env);
    const since = addUtcDays(today, -70).toISOString();
    const [headcounts, events] = await Promise.all([
      pcoList("/check-ins/v2/headcounts", {
        include: "event_time,attendance_type",
        order: "created_at",
        per_page: "100",
        "where[created_at][gte]": since,
      }, deps),
      pcoList("/check-ins/v2/events", {
        filter: "not_archived",
        per_page: "100",
        order: "name",
      }, deps),
    ]);
    return { ok: true, sample: false, data: mapWeeklyAttendance(headcounts, events, today) };
  } catch {
    return { ok: false, message: "Couldn't load recent attendance." };
  }
}

export function homeEvents(events: UpcomingEvent[], today: Date): UpcomingEvent[] {
  return eventsWithinDays(events, today, 14);
}

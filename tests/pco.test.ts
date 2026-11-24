import { describe, expect, it } from "vitest";
import { pcoList } from "@/lib/pco/client";
import { eventsWithinDays, mapEventInstances, mapWeeklyAttendance } from "@/lib/pco/map";
import { homeEvents, shouldUseLivePco } from "@/lib/pco/load";
import { sampleAttendance, sampleUpcomingEvents } from "@/lib/pco/sample";
import type { PcoDocument } from "@/lib/pco/types";

const today = new Date(Date.UTC(2026, 10, 23));
const secret = "super-secret-token";

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

describe("Planning Center event mapping", () => {
  const docs: PcoDocument[] = [{
    data: [
      {
        type: "EventInstance",
        id: "later",
        attributes: { starts_at: "2026-11-29T15:00:00Z", ends_at: "2026-11-29T16:00:00Z", location: "Worship room", all_day_event: false },
        relationships: { event: { data: { type: "Event", id: "sunday" } } },
      },
      {
        type: "EventInstance",
        id: "pending",
        attributes: { starts_at: "2026-11-24T18:00:00Z", location: "Office" },
        relationships: { event: { data: { type: "Event", id: "hold" } } },
      },
      {
        type: "EventInstance",
        id: "block",
        attributes: { starts_at: "2026-11-25T18:00:00Z", kind: "blockout" },
        relationships: { event: { data: { type: "Event", id: "away" } } },
      },
      {
        type: "EventInstance",
        id: "first",
        attributes: { starts_at: "2026-11-23T18:00:00Z", location: "" },
        relationships: { event: { data: { type: "Event", id: "lunch" } } },
      },
    ],
    included: [
      { type: "Event", id: "sunday", attributes: { name: "Sunday worship", approval_status: "A" } },
      { type: "Event", id: "hold", attributes: { name: "On hold", approval_status: "P" } },
      { type: "Event", id: "away", attributes: { name: "Block", approval_status: "A", kind: "blockout" } },
      { type: "Event", id: "lunch", attributes: { name: "Staff lunch", approval_status: "approved" } },
    ],
  }];

  it("keeps approved instances in start order and drops pending and blockouts", () => {
    const events = mapEventInstances(docs, today, 14);
    expect(events.map((event) => event.name)).toEqual(["Staff lunch", "Sunday worship"]);
    expect(events[1]?.location).toBe("Worship room");
    expect(events[1]?.day).toBe("11/29/2026");
    expect(eventsWithinDays(events, today, 1).map((event) => event.id)).toEqual(["first"]);
  });
});

describe("Planning Center headcounts", () => {
  it("sums each Check-Ins event for this week and last week", () => {
    const headcounts: PcoDocument[] = [{
      data: [
        { type: "Headcount", id: "h1", attributes: { total: 120 }, relationships: { event_time: { data: { type: "EventTime", id: "t1" } } } },
        { type: "Headcount", id: "h2", attributes: { total: 80 }, relationships: { event_time: { data: { type: "EventTime", id: "t2" } } } },
        { type: "Headcount", id: "h3", attributes: { total: 40 }, relationships: { event_time: { data: { type: "EventTime", id: "t3" } } } },
      ],
      included: [
        { type: "EventTime", id: "t1", attributes: { starts_at: "2026-11-29T15:00:00Z", name: "9:00" }, relationships: { event: { data: { type: "Event", id: "sun" } } } },
        { type: "EventTime", id: "t2", attributes: { starts_at: "2026-11-29T16:30:00Z", name: "10:30" }, relationships: { event: { data: { type: "Event", id: "sun" } } } },
        { type: "EventTime", id: "t3", attributes: { starts_at: "2026-11-22T15:00:00Z", name: "9:00" }, relationships: { event: { data: { type: "Event", id: "sun" } } } },
      ],
    }];
    const events: PcoDocument[] = [{ data: [{ type: "Event", id: "sun", attributes: { name: "Sunday Service" } }] }];
    const rows = mapWeeklyAttendance(headcounts, events, today);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "Sunday Service", thisWeek: 200, lastWeek: 40, change: 160 });
    expect(rows[0]?.weeks).toHaveLength(6);
    expect(rows[0]?.weeks.at(-1)?.total).toBe(200);
    expect(rows[0]?.weeks.at(-2)?.total).toBe(40);
  });
});

describe("Planning Center client", () => {
  it("uses live data only in sheets mode when both token values are set", () => {
    expect(shouldUseLivePco({ DATA_MODE: "mock", PCO_APP_ID: "app", PCO_SECRET: secret })).toBe(false);
    expect(shouldUseLivePco({ DATA_MODE: "sheets", PCO_APP_ID: "app", PCO_SECRET: "" })).toBe(false);
    expect(shouldUseLivePco({ DATA_MODE: "sheets", PCO_APP_ID: "app", PCO_SECRET: secret })).toBe(true);
  });

  it("follows the next page on the Planning Center host and retries a rate limit once", async () => {
    const calls: string[] = [];
    let hits = 0;
    const docs = await pcoList("/calendar/v2/event_instances", { per_page: "1" }, {
      appId: "app",
      secret,
      sleep: async () => {},
      fetch: async (url, init) => {
        calls.push(url);
        const header = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? "");
        expect(header.startsWith("Basic ")).toBe(true);
        expect(header).not.toContain(secret);
        expect(url).not.toContain(secret);
        hits += 1;
        if (hits === 1) return jsonResponse({}, 429, { "retry-after": "0" });
        if (url.includes("offset=1")) return jsonResponse({ data: [{ type: "EventInstance", id: "2" }], links: { next: "https://evil.example/steal" } });
        return jsonResponse({ data: [{ type: "EventInstance", id: "1" }], links: { next: "https://api.planningcenteronline.com/calendar/v2/event_instances?offset=1" } });
      },
    });
    expect(docs).toHaveLength(2);
    expect(calls.some((url) => url.includes("evil.example"))).toBe(false);
  });

  it("does not put the token in an error", async () => {
    await expect(pcoList("/check-ins/v2/headcounts", {}, {
      appId: "app",
      secret,
      fetch: async () => jsonResponse({ error: secret }, 401),
    })).rejects.toThrow(/Couldn't load Planning Center/);
    try {
      await pcoList("/check-ins/v2/headcounts", {}, {
        appId: "app",
        secret,
        fetch: async () => jsonResponse({ error: secret }, 401),
      });
    } catch (error) {
      expect((error as Error).message).not.toContain(secret);
    }
  });
});

describe("sample Planning Center data", () => {
  it("marks the farther sample event as outside the 14-day home window", () => {
    const events = sampleUpcomingEvents(today);
    expect(events.every((event) => event.name.startsWith("Sample "))).toBe(true);
    expect(homeEvents(events, today).map((event) => event.name)).not.toContain("Sample choir night");
    expect(eventsWithinDays(events, today, 30).map((event) => event.name)).toContain("Sample choir night");
    const attendance = sampleAttendance(today);
    expect(attendance[0]).toMatchObject({ name: "Sample Sunday worship", thisWeek: 210, lastWeek: 200, change: 10 });
    expect(attendance[1]?.change).toBe(-5);
  });
});

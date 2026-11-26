import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RecentAttendanceCard } from "@/components/recent-attendance";
import { pcoList } from "@/lib/pco/client";
import { addUtcDays } from "@/lib/domain/dates";
import { eventsWithinDays, groupsFeedIds, mapEventInstances, mapGroupEvents, mapRoomBookings, mapSundayAttendance } from "@/lib/pco/map";
import { homeEvents, loadRecentAttendance, shouldUseLivePco } from "@/lib/pco/load";
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

  it("keeps approved instances in start order and drops pending, blockouts, and Groups feeds", () => {
    const events = mapEventInstances(docs, today, addUtcDays(today, 14));
    expect(events.map((event) => event.name)).toEqual(["Staff lunch", "Sunday worship"]);
    expect(events.every((event) => event.source === "event")).toBe(true);
    expect(events[1]?.location).toBe("Worship room");
    expect(events[1]?.day).toBe("11/29/2026");
    expect(eventsWithinDays(events, today, 1).map((event) => event.id)).toEqual(["first"]);
    const withGroup = mapEventInstances([{
      data: [{
        type: "EventInstance",
        id: "group-instance",
        attributes: { starts_at: "2026-11-24T15:00:00Z" },
        relationships: { event: { data: { type: "Event", id: "mens" } } },
      }],
      included: [{
        type: "Event",
        id: "mens",
        attributes: { name: "Men's breakfast", approval_status: "A" },
        relationships: { feed: { data: { type: "Feed", id: "feed-groups" } } },
      }],
    }], today, addUtcDays(today, 14), { eventIds: new Set(["mens"]), feedIds: new Set(["feed-groups"]) });
    expect(withGroup).toEqual([]);
  });
});

describe("room reservations and Groups events", () => {
  it("keeps approved room bookings and drops equipment", () => {
    const rooms = mapRoomBookings([{
      data: [
        {
          type: "ResourceBooking",
          id: "b1",
          attributes: { starts_at: "2026-11-24T15:00:00Z", ends_at: "2026-11-24T16:00:00Z" },
          relationships: {
            event: { data: { type: "Event", id: "meet" } },
            resource: { data: { type: "Resource", id: "hall" } },
          },
        },
        {
          type: "ResourceBooking",
          id: "b2",
          attributes: { starts_at: "2026-11-24T18:00:00Z" },
          relationships: { resource: { data: { type: "Resource", id: "van" } } },
        },
      ],
      included: [
        { type: "Event", id: "meet", attributes: { name: "Staff meeting" } },
        { type: "Resource", id: "hall", attributes: { name: "Fellowship Hall", kind: "Room" } },
        { type: "Resource", id: "van", attributes: { name: "Van", kind: "Resource" } },
      ],
    }], today, addUtcDays(today, 7));
    expect(rooms.map((event) => event.name)).toEqual(["Staff meeting"]);
    expect(rooms[0]).toMatchObject({ location: "Fellowship Hall", source: "room", day: "11/24/2026" });
  });

  it("reads Groups events and skips canceled ones", () => {
    const feeds = groupsFeedIds([{ data: [{ type: "Feed", id: "9", attributes: { feed_type: "groups" } }, { type: "Feed", id: "8", attributes: { feed_type: "registrations" } }] }]);
    expect([...feeds]).toEqual(["9"]);
    const groups = mapGroupEvents([{
      data: [
        { type: "Event", id: "g1", attributes: { name: "Men's breakfast", starts_at: "2026-11-25T13:00:00Z", canceled: false }, relationships: { group: { data: { type: "Group", id: "men" } } } },
        { type: "Event", id: "g2", attributes: { name: "Canceled", starts_at: "2026-11-25T18:00:00Z", canceled: true }, relationships: { group: { data: { type: "Group", id: "men" } } } },
      ],
      included: [{ type: "Group", id: "men", attributes: { name: "Men's group" } }],
    }], today, addUtcDays(today, 7));
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ name: "Men's breakfast", location: "Men's group", source: "group" });
  });
});

describe("Sunday worship and kids attendance", () => {
  const events: PcoDocument[] = [{
    data: [{ type: "Event", id: "92682", attributes: { name: "Sunday Services | All Campus" } }],
  }];
  const eventTimes: PcoDocument[] = [{
    data: [
      { type: "EventTime", id: "t9", attributes: { starts_at: "2026-11-29T15:00:00Z", total_count: 500 }, relationships: { event: { data: { type: "Event", id: "92682" } } } },
      { type: "EventTime", id: "t1030", attributes: { starts_at: "2026-11-29T16:30:00Z", total_count: 400 }, relationships: { event: { data: { type: "Event", id: "92682" } } } },
      { type: "EventTime", id: "nov22a", attributes: { starts_at: "2026-11-22T15:00:00Z", total_count: 101 }, relationships: { event: { data: { type: "Event", id: "92682" } } } },
      { type: "EventTime", id: "nov22b", attributes: { starts_at: "2026-11-22T16:30:00Z", total_count: 36 }, relationships: { event: { data: { type: "Event", id: "92682" } } } },
    ],
  }];
  const headcounts: PcoDocument[] = [{
    data: [
      { type: "Headcount", id: "h1", attributes: { total: 120 }, relationships: { event_time: { data: { type: "EventTime", id: "t9" } }, attendance_type: { data: { type: "AttendanceType", id: "worship" } } } },
      { type: "Headcount", id: "h2", attributes: { total: 80 }, relationships: { event_time: { data: { type: "EventTime", id: "t1030" } }, attendance_type: { data: { type: "AttendanceType", id: "worship" } } } },
    ],
    included: [{ type: "AttendanceType", id: "worship", attributes: { name: "Worship" } }],
  }];
  const locations: PcoDocument[] = [{
    data: [
      { type: "Location", id: "babies", attributes: { name: "Babies" }, relationships: { parent: { data: { type: "Location", id: "dz" } } } },
      { type: "Location", id: "hosts", attributes: { name: "Host Team Volunteers", child_or_adult: "A" }, relationships: { parent: { data: { type: "Location", id: "dz" } } } },
    ],
    included: [{ type: "Location", id: "dz", attributes: { name: "DiscoveryZone", kind: "Folder" } }],
  }];
  const checkIns: PcoDocument[] = [{
    data: [
      { type: "CheckIn", id: "c1", attributes: { kind: "Regular" }, relationships: { check_in_times: { data: [{ type: "CheckInTime", id: "cit1" }] } } },
      { type: "CheckIn", id: "c2", attributes: { kind: "Guest" }, relationships: { check_in_times: { data: [{ type: "CheckInTime", id: "cit2" }] } } },
      { type: "CheckIn", id: "c3", attributes: { kind: "Volunteer" }, relationships: { check_in_times: { data: [{ type: "CheckInTime", id: "cit3" }] } } },
    ],
    included: [
      { type: "CheckInTime", id: "cit1", relationships: { location: { data: { type: "Location", id: "babies" } }, event_time: { data: { type: "EventTime", id: "nov22a" } } } },
      { type: "CheckInTime", id: "cit2", relationships: { location: { data: { type: "Location", id: "babies" } }, event_time: { data: { type: "EventTime", id: "nov22b" } } } },
      { type: "CheckInTime", id: "cit3", relationships: { location: { data: { type: "Location", id: "babies" } }, event_time: { data: { type: "EventTime", id: "nov22a" } } } },
    ],
  }];

  it("uses Worship headcounts when they exist and check-in totals when they do not", () => {
    const attendance = mapSundayAttendance(headcounts, events, eventTimes, locations, checkIns, today);
    expect(attendance.coming.sunday).toBe("11/29/2026");
    expect(attendance.coming.worship).toEqual({ total: 200, source: "headcount" });
    expect(attendance.last.sunday).toBe("11/22/2026");
    expect(attendance.last.worship).toEqual({ total: 137, source: "check-ins" });
    expect(attendance.last.kids).toEqual({ total: 2, source: "check-ins" });
    expect(attendance.sundays).toHaveLength(6);
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

  it("starts room and location reads before a slow headcount finishes", async () => {
    const env = {
      DATA_MODE: "sheets",
      GOOGLE_SHEET_ID: "sheet",
      GOOGLE_SERVICE_ACCOUNT_JSON: "{}",
      PCO_APP_ID: "app",
      PCO_SECRET: secret,
    };
    let releaseHeadcount: () => void = () => {};
    const headcountGate = new Promise<void>((resolve) => {
      releaseHeadcount = resolve;
    });
    const calls: string[] = [];
    const result = loadRecentAttendance(today, env, {
      appId: "app",
      secret,
      sleep: async () => {},
      fetch: async (url) => {
        calls.push(url);
        if (url.includes("/headcounts")) await headcountGate;
        if (url.includes("/check-ins/v2/events?") || url.endsWith("/events") || url.includes("/check-ins/v2/events?")) {
          return jsonResponse({ data: [{ type: "Event", id: "92682", attributes: { name: "Sunday Services" } }] });
        }
        return jsonResponse({ data: [] });
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(calls.some((url) => url.includes("/locations"))).toBe(true);
    expect(calls.some((url) => url.includes("/headcounts"))).toBe(true);
    releaseHeadcount();
    const attendance = await result;
    expect(attendance.ok).toBe(true);
  });
});

describe("sample Planning Center data", () => {
  it("shows the next 7 days of events and rooms, and leaves Groups off the home list", () => {
    const events = sampleUpcomingEvents(today);
    expect(events.every((event) => event.name.startsWith("Sample "))).toBe(true);
    expect(homeEvents(events, today).map((event) => event.name)).toEqual(["Sample staff lunch", "Sample staff meeting", "Sample Sunday worship"]);
    expect(homeEvents(events, today).map((event) => event.source)).toEqual(["event", "room", "event"]);
    expect(homeEvents(events, today).some((event) => event.source === "group")).toBe(false);
    expect(homeEvents(events, today).map((event) => event.name)).not.toContain("Sample choir night");
    expect(eventsWithinDays(events, today, 30).map((event) => event.name)).toContain("Sample choir night");
    expect(eventsWithinDays(events, today, 30).map((event) => event.name)).toContain("Sample men's breakfast");
    const attendance = sampleAttendance(today);
    expect(attendance.coming.worship).toEqual({ total: 210, source: "headcount" });
    expect(attendance.last.worship).toEqual({ total: 200, source: "check-ins" });
    expect(attendance.sundays).toHaveLength(6);
    const html = renderToStaticMarkup(createElement(RecentAttendanceCard, { attendance, sample: true }));
    expect(html).toContain("Coming Sunday");
    expect(html).toContain("Last Sunday");
    expect(html).toContain("Worship 200 from check-ins");
    expect(html).toContain("Kids 41");
    expect(html).not.toContain("This week");
  });
});

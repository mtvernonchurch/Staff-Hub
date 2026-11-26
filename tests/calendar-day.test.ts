import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MonthCalendar } from "@/components/month-calendar";
import { itemsOnDay, pcoDayItems, sheetDayItems } from "@/lib/calendar/items";
import type { CalendarEvent } from "@/lib/data/types";
import type { UpcomingEvent } from "@/lib/pco/types";

const today = "11/23/2026";

describe("day detail", () => {
  const pco: UpcomingEvent[] = [
    { id: "e1", name: "Staff lunch", startsAt: "2026-11-23T18:00:00Z", endsAt: "", location: "Office", allDay: false, day: "11/23/2026", source: "event" },
    { id: "r1", name: "Staff meeting", startsAt: "2026-11-23T19:00:00Z", endsAt: "", location: "Fellowship Hall", allDay: false, day: "11/23/2026", source: "room" },
    { id: "g1", name: "Men's breakfast", startsAt: "2026-11-25T13:00:00Z", endsAt: "", location: "Men's group", allDay: false, day: "11/25/2026", source: "group" },
  ];
  const sheet: CalendarEvent[] = [
    { id: "cal_comms", date: "11/23/2026", time: "2:00 PM", event: "Comms check-in", ministry: "Communications", location: "Office", owner: "Harper Diaz", plan: "", volunteersReady: "", volunteersNeeded: "" },
  ];

  it("lists time, room, and source for one day, including Groups", () => {
    const items = [...sheetDayItems(sheet), ...pcoDayItems(pco)];
    const day = itemsOnDay(items, "11/23/2026");
    expect(day.map((item) => item.source).sort()).toEqual(["Calendar", "Event", "Room"]);
    expect(day.find((item) => item.source === "Room")?.location).toBe("Fellowship Hall");
    expect(itemsOnDay(items, "11/25/2026").map((item) => item.name)).toEqual(["Men's breakfast"]);
    const html = renderToStaticMarkup(createElement(MonthCalendar, { items, todayLabel: today }));
    expect(html).toContain("Staff lunch");
    expect(html).toContain("+1");
    expect(html).toContain("Men&#x27;s breakfast");
    expect(html).toContain("Choose a day");
    expect(html).toContain("<button");
    expect(html).toContain("Nothing scheduled");
  });
});
import { describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/data/memory-store";
import { createSeed } from "@/lib/data/mock-data";
import { sheetCalendarSource } from "@/lib/calendar/source";
import { checkFor, eventsInWeek, fourChurchWeeks, needsGraphics, needsPromotion } from "@/lib/domain/calendar";
import { groupAnnouncements } from "@/lib/domain/channels";
import { chicagoToday } from "@/lib/domain/dates";
import { HubError } from "@/lib/hub-error";
import { createCalendarEvent, saveCalendarCheck } from "@/lib/services/calendar";

const now = new Date("2026-11-22T18:00:00Z");

describe("announcement channels", () => {
  it("keeps a blank channel in Unsorted and counts an item in each selected channel", async () => {
    const store = new MemoryStore(createSeed(now));
    const monday = (await store.listAnnouncements()).filter((row) => row.meetingId === "mtg_monday");
    const groups = groupAnnouncements(monday, true);
    expect(groups.find((group) => group.channel === "Email")?.rows).toHaveLength(2);
    expect(groups.find((group) => group.channel === "Socials")?.rows.map((row) => row.event)).toEqual(["Thanksgiving Eve service"]);
    expect(groups.find((group) => group.channel === "Platform")?.rows).toHaveLength(1);
    const older = (await store.listAnnouncements()).find((row) => row.id === "ann_last");
    expect(groupAnnouncements([older!]).some((group) => group.channel === "Unsorted")).toBe(true);
    expect(groupAnnouncements([older!]).some((group) => group.channel === "Platform" && group.rows.length > 0)).toBe(false);
  });
});

describe("four-week calendar", () => {
  it("groups six seeded events into four Sunday weeks and flags missing promotion or graphics", async () => {
    const store = new MemoryStore(createSeed(now));
    const today = chicagoToday(now);
    const events = await sheetCalendarSource(store).listEvents();
    const checks = await store.listCalendarChecks();
    const weeks = fourChurchWeeks(today);
    expect(weeks).toHaveLength(4);
    expect(weeks.flatMap((week) => eventsInWeek(events, week))).toHaveLength(7);
    expect(eventsInWeek(events, weeks[0]).map((event) => event.id).sort()).toEqual(["cal_comms", "cal_sunday", "cal_thanks"].sort());
    expect(eventsInWeek(events, weeks[3]).map((event) => event.event)).toEqual(["Kids Christmas rehearsal", "Choir night"]);
    const students = events.find((event) => event.id === "cal_students")!;
    expect(needsPromotion(checkFor(checks, students.id))).toBe(true);
    expect(needsGraphics(checkFor(checks, students.id))).toBe(true);
    expect(needsGraphics(checkFor(checks, "cal_sunday"))).toBe(false);
    expect(needsPromotion(checkFor(checks, "cal_thanks"))).toBe(false);
    expect(needsGraphics(checkFor(checks, "cal_thanks"))).toBe(true);
  });

  it("lets an admin save a check and refuses staff", async () => {
    const store = new MemoryStore(createSeed(now));
    const avery = (await store.listStaff()).find((person) => person.name === "Avery Quinn")!;
    const blake = (await store.listStaff()).find((person) => person.name === "Blake Nguyen")!;
    await expect(createCalendarEvent({ store, actor: blake }, { date: "12/1/2026", time: "7:00 PM", event: "Extra", ministry: "", location: "", owner: "" })).rejects.toBeInstanceOf(HubError);
    const saved = await saveCalendarCheck({ store, actor: avery }, "cal_students", { promotedPlatform: true, graphicsRequested: true });
    expect(saved.promotedPlatform).toBe(true);
    expect(saved.graphicsRequested).toBe(true);
    const again = await saveCalendarCheck({ store, actor: avery }, "cal_students", { notes: "Slides are in." });
    expect(again.id).toBe(saved.id);
    expect(again.promotedPlatform).toBe(true);
    expect((await store.listCalendarChecks()).filter((row) => row.eventId === "cal_students")).toHaveLength(1);
  });
});

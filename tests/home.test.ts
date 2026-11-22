import { describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/data/memory-store";
import { createSeed } from "@/lib/data/mock-data";
import { chicagoToday, greeting, isDueSoon, isOverdue } from "@/lib/domain/dates";
import { firstName } from "@/lib/domain/people";
import { myOpenItems } from "@/lib/domain/view";
import { requestWaitingOn } from "@/lib/services/hub";

const now = new Date("2026-11-22T18:00:00Z");

describe("personal home", () => {
  it("greets the signed-in person by first name", () => {
    expect(firstName("Heather Dodson")).toBe("Heather");
    expect(`Welcome, ${firstName("Avery Quinn")}`).toBe("Welcome, Avery");
    expect(["Good morning", "Good afternoon", "Good evening"]).toContain(greeting(now));
  });

  it("gives Avery and Blake different open lists, overdue first", async () => {
    const store = new MemoryStore(createSeed(now));
    const today = chicagoToday(now);
    const items = await store.listActionItems();
    const avery = myOpenItems(items, "Avery Quinn", today);
    const blake = myOpenItems(items, "Blake Nguyen", today);
    expect(avery.map((item) => item.id)).not.toEqual(blake.map((item) => item.id));
    expect(blake.some((item) => item.id === "ai_care_call")).toBe(true);
    expect(avery.some((item) => item.id === "ai_care_call")).toBe(false);
    expect(isOverdue(blake[0]?.due ?? "", blake[0]?.status ?? "", today)).toBe(true);
    const soon = avery.find((item) => isDueSoon(item.due, item.status, today));
    expect(soon).toBeTruthy();
    expect(avery.findIndex((item) => item.id === soon?.id)).toBeGreaterThan(avery.findIndex((item) => isOverdue(item.due, item.status, today)));
  });

  it("shows Blake the care note assigned to him and not Avery's requests", async () => {
    const store = new MemoryStore(createSeed(now));
    const blake = (await store.listStaff()).find((person) => person.name === "Blake Nguyen")!;
    const avery = (await store.listStaff()).find((person) => person.name === "Avery Quinn")!;
    const notes = await store.listCareNotes();
    expect(notes.filter((note) => note.assignee === blake.name).map((note) => note.id)).toEqual(["care_call"]);
    expect(notes.filter((note) => note.assignee === avery.name)).toHaveLength(0);
    const requests = await store.listRequests();
    expect(requests.filter((request) => requestWaitingOn(blake, request))).toHaveLength(0);
    expect(requests.filter((request) => requestWaitingOn(avery, request)).length).toBeGreaterThan(0);
  });
});

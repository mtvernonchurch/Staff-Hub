import { describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/data/memory-store";
import { createSeed } from "@/lib/data/mock-data";
import { chicagoToday, formatUsDate, addUtcDays } from "@/lib/domain/dates";
import { GRAPHICS_OWNER_SETTING, graphicsForPerson, timeAwayForPerson, whosOut, workForDay } from "@/lib/domain/desk";
import { createGraphicsRequest, createTimeAway, decideTimeAway, graphicsOwner, setGraphicsOwner, setWorkStatus } from "@/lib/services/desk";
import { HubError } from "@/lib/hub-error";

const now = new Date("2026-11-22T18:00:00Z");

async function people(store: MemoryStore) {
  const staff = await store.listStaff();
  return {
    avery: staff.find((person) => person.name === "Avery Quinn")!,
    blake: staff.find((person) => person.name === "Blake Nguyen")!,
    harper: staff.find((person) => person.name === "Harper Diaz")!,
  };
}

describe("request types", () => {
  it("assigns graphics requests from the Graphics Owner setting", async () => {
    const store = new MemoryStore(createSeed(now));
    const { avery, blake, harper } = await people(store);
    expect(await graphicsOwner({ store })).toBe("Avery Quinn");
    expect((await store.listSettings()).find((row) => row.key === GRAPHICS_OWNER_SETTING)?.value).toBe("Avery Quinn");
    const today = chicagoToday(now);
    const soon = formatUsDate(addUtcDays(today, 3));
    const created = await createGraphicsRequest(
      { store, actor: blake, today },
      {
        ministry: "Students",
        needed: ["Graphic"],
        platforms: ["Instagram"],
        event: "Parent meeting",
        eventDate: soon,
        neededBy: soon,
        description: "A square image with the date.",
        links: "",
      },
    );
    expect(created.assignedTo).toBe("Avery Quinn");
    await expect(setGraphicsOwner({ store, actor: blake }, "Harper Diaz")).rejects.toBeInstanceOf(HubError);
    await setGraphicsOwner({ store, actor: avery }, "Harper Diaz");
    const moved = await createGraphicsRequest(
      { store, actor: blake, today },
      {
        ministry: "Students",
        needed: ["Slide"],
        platforms: ["Slides"],
        event: "Sunday slide",
        eventDate: soon,
        neededBy: formatUsDate(addUtcDays(today, 10)),
        description: "One slide, the announcement text is in the description.",
        links: "https://mtvernon.church",
      },
    );
    expect(moved.assignedTo).toBe("Harper Diaz");
    expect(graphicsForPerson(await store.listGraphicsRequests(), "Blake Nguyen").map((row) => row.id)).toContain(created.id);
    expect(graphicsForPerson(await store.listGraphicsRequests(), harper.name).map((row) => row.id)).toContain(moved.id);
  });

  it("lets Avery approve Blake's time away and lists who is out today", async () => {
    const store = new MemoryStore(createSeed(now));
    const { avery, blake } = await people(store);
    const today = chicagoToday(now);
    await expect(decideTimeAway({ store, actor: blake }, "away_blake", "Approved")).rejects.toBeInstanceOf(HubError);
    await decideTimeAway({ store, actor: avery }, "away_blake", "Approved");
    const away = await store.listTimeAway();
    expect(away.find((row) => row.id === "away_blake")?.status).toBe("Approved");
    expect(whosOut(away, today).map((row) => row.id)).toEqual(["away_dana"]);
    expect(timeAwayForPerson(away, "Blake Nguyen", today).map((row) => row.id)).toContain("away_blake");
    const half = await createTimeAway(
      { store, actor: blake, today },
      { kind: "Sick", start: formatUsDate(today), end: formatUsDate(addUtcDays(today, 2)), halfDay: true, notes: "", coverage: "" },
    );
    expect(half.end).toBe(half.start);
    expect(half.halfDay).toBe(true);
  });

  it("keeps today's work status and drops yesterday", async () => {
    const store = new MemoryStore(createSeed(now));
    const { blake } = await people(store);
    const today = chicagoToday(now);
    const label = formatUsDate(today);
    expect(workForDay(await store.listWorkStatuses(), label).some((row) => row.staff === "Blake Nguyen")).toBe(false);
    await setWorkStatus({ store, actor: blake, today }, { place: "Working from home", note: "Writing Wednesday's talk." });
    const todayRows = workForDay(await store.listWorkStatuses(), label);
    expect(todayRows.find((row) => row.staff === "Blake Nguyen")?.place).toBe("Working from home");
    await setWorkStatus({ store, actor: blake, today }, { place: "In office", note: "" });
    const again = workForDay(await store.listWorkStatuses(), label).filter((row) => row.staff === "Blake Nguyen");
    expect(again).toHaveLength(1);
    expect(again[0]?.place).toBe("In office");
  });
});

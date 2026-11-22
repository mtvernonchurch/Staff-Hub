import { describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/data/memory-store";
import { createSeed } from "@/lib/data/mock-data";
import { chicagoToday } from "@/lib/domain/dates";
import { visibleStaffPins } from "@/lib/domain/pins";
import { acknowledgeStaffPin, createStaffPin, deleteStaffPin } from "@/lib/services/pins";
import { HubError } from "@/lib/hub-error";

const now = new Date("2026-11-22T18:00:00Z");

describe("pinned staff notes", () => {
  it("shows the seeded pin to everyone, newest first, and hides it after show-until", async () => {
    const store = new MemoryStore(createSeed(now));
    const today = chicagoToday(now);
    const pins = await store.listStaffPins();
    expect(visibleStaffPins(pins, today).map((pin) => pin.id)).toEqual(["pin_doors"]);
    await createStaffPin(
      { store, actor: (await store.listStaff()).find((person) => person.name === "Avery Quinn")!, today },
      { title: "Newer note", message: "This one is first.", link: "", priority: "Normal", showUntil: "" },
    );
    const newest = visibleStaffPins(await store.listStaffPins(), today);
    expect(newest[0]?.title).toBe("Newer note");
    expect(newest[1]?.id).toBe("pin_doors");
    const hidden = visibleStaffPins(
      [{ ...pins[0], showUntil: "11/21/2026" }],
      today,
    );
    expect(hidden).toHaveLength(0);
  });

  it("lets an admin post and a staff member only acknowledge", async () => {
    const store = new MemoryStore(createSeed(now));
    const people = await store.listStaff();
    const avery = people.find((person) => person.name === "Avery Quinn")!;
    const blake = people.find((person) => person.name === "Blake Nguyen")!;
    await expect(createStaffPin({ store, actor: blake }, { title: "No", message: "No", link: "", priority: "Normal", showUntil: "" })).rejects.toBeInstanceOf(HubError);
    const pin = await createStaffPin({ store, actor: avery, today: chicagoToday(now) }, { title: "Lunch", message: "In the kitchen.", link: "", priority: "Urgent", showUntil: "" });
    const first = await acknowledgeStaffPin({ store, actor: blake, today: chicagoToday(now) }, pin.id);
    const again = await acknowledgeStaffPin({ store, actor: blake, today: chicagoToday(now) }, pin.id);
    expect(again.id).toBe(first.id);
    const acks = await store.listStaffPinAcks();
    expect(acks.filter((row) => row.pinId === pin.id).map((row) => row.staff)).toEqual(["Blake Nguyen"]);
    await deleteStaffPin({ store, actor: avery }, pin.id);
    expect((await store.listStaffPins()).some((row) => row.id === pin.id)).toBe(false);
    expect((await store.listStaffPinAcks()).some((row) => row.pinId === pin.id)).toBe(false);
  });
});

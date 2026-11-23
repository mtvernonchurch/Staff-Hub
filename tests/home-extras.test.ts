import { describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/data/memory-store";
import { createSeed } from "@/lib/data/mock-data";
import { ownedMinistries, visibleCards, visibleTransactions, monthKey } from "@/lib/budgets/access";
import { attendanceSnapshot } from "@/lib/domain/attendance";
import { chicagoToday } from "@/lib/domain/dates";
import { visibleProgramLinks } from "@/lib/domain/programs";
import { assignedWorkflows } from "@/lib/workflows/assigned";

const now = new Date("2026-11-23T18:00:00Z");

describe("budgets stay private", () => {
  it("shows Avery every ministry and Blake only Students, plus only his card", async () => {
    const store = new MemoryStore(createSeed(now));
    const people = await store.listStaff();
    const avery = people.find((person) => person.name === "Avery Quinn")!;
    const blake = people.find((person) => person.name === "Blake Nguyen")!;
    const ministries = await store.listMinistries();
    const budgets = await store.listMinistryBudgets();
    const month = monthKey(chicagoToday(now));
    const cards = await store.listCardMonths();
    const txns = await store.listCardTransactions();
    expect(ownedMinistries(avery, ministries, budgets).map((row) => row.ministry)).toContain("Kids");
    expect(ownedMinistries(blake, ministries, budgets).map((row) => row.ministry)).toEqual(["Students"]);
    expect(visibleCards(blake, cards, month).map((row) => row.staff)).toEqual(["Blake Nguyen"]);
    expect(visibleTransactions(blake, txns, month).every((row) => row.staff === "Blake Nguyen")).toBe(true);
    expect(visibleCards(avery, cards, month).length).toBeGreaterThan(1);
  });
});

describe("program tiles", () => {
  it("hides admin-only links from Blake and keeps them for Avery", async () => {
    const store = new MemoryStore(createSeed(now));
    const people = await store.listStaff();
    const avery = people.find((person) => person.name === "Avery Quinn")!;
    const blake = people.find((person) => person.name === "Blake Nguyen")!;
    const links = await store.listQuickLinks();
    const ministries = await store.listMinistries();
    const blakeNames = visibleProgramLinks(blake, links, ministries).map((link) => link.name);
    const averyNames = visibleProgramLinks(avery, links, ministries).map((link) => link.name);
    expect(blakeNames).not.toContain("QuickBooks");
    expect(blakeNames).not.toContain("BILL");
    expect(averyNames).toContain("Planning Center");
    expect(averyNames).toContain("QuickBooks");
    expect(blakeNames.length).toBeGreaterThan(9);
  });
});

describe("workflow cards", () => {
  it("gives Avery his cards and Blake only the student card", async () => {
    const store = new MemoryStore(createSeed(now));
    const cards = await store.listWorkflowCards();
    const avery = assignedWorkflows(cards, "avery@mtvernon.church");
    const blake = assignedWorkflows(cards, "blake@mtvernon.church");
    expect(avery.map((card) => card.id).sort()).toEqual(["card_baptism", "card_guest"]);
    expect(blake.map((card) => card.workflow)).toEqual(["Student follow up"]);
  });
});

describe("attendance", () => {
  it("summarizes the previous Sunday and an 8-week trend", async () => {
    const store = new MemoryStore(createSeed(now));
    const today = chicagoToday(now);
    const snap = attendanceSnapshot(await store.listAttendance(), today);
    expect(snap.total).toBeGreaterThan(0);
    expect(snap.services.map((row) => row.service)).toEqual(["9:00", "10:30"]);
    expect(snap.areas.map((row) => row.area)).toContain("MV Kids");
    expect(snap.trend).toHaveLength(8);
    expect(snap.trend.every((value) => value > 0)).toBe(true);
    expect(snap.versusPrior).not.toBeNull();
    expect(snap.versusAverage).not.toBeNull();
  });
});

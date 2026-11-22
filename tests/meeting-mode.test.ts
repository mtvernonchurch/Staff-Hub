import { describe, expect, it } from "vitest";
import type { StaffChatEvent } from "@/lib/chat/notifier";
import { MemoryStore } from "@/lib/data/memory-store";
import { createSeed } from "@/lib/data/mock-data";
import { SheetsStore } from "@/lib/data/sheets-store";
import type { SheetsApi } from "@/lib/sheets/api";
import { chicagoToday } from "@/lib/domain/dates";
import { announcementsForMeeting, thisWeekMeeting } from "@/lib/domain/view";
import { HubError } from "@/lib/hub-error";
import { createCareNote, deleteActionItem, ensureMondayMeeting, finishMeeting } from "@/lib/services/hub";
import { COLUMNS } from "@/lib/sheets/schema";

const today = new Date("2026-11-22T18:00:00Z");

describe("this week", () => {
  it("shows this Monday's meeting to every staff member", async () => {
    const store = new MemoryStore(createSeed(today));
    const meetings = await store.listMeetings();
    const meeting = thisWeekMeeting(meetings, chicagoToday(today));
    expect(meeting?.id).toBe("mtg_monday");
    const news = announcementsForMeeting(await store.listAnnouncements(), meeting!);
    expect(news.map((row) => row.id).sort()).toEqual(["ann_office", "ann_thanks"]);
    const blakeItems = (await store.listActionItems()).filter((item) => item.meetingId === "mtg_monday" && item.owner === "Blake Nguyen");
    expect(blakeItems.length).toBeGreaterThan(0);
  });
});

describe("meeting mode rules", () => {
  it("refuses to let staff delete an action item", async () => {
    const store = new MemoryStore(createSeed(today));
    const blake = (await store.listStaff()).find((person) => person.name === "Blake Nguyen")!;
    await expect(deleteActionItem({ store, actor: blake }, "ai_students")).rejects.toBeInstanceOf(HubError);
    expect(await store.getActionItem("ai_students")).toBeTruthy();
  });

  it("opens this Monday's meeting instead of making a second one", async () => {
    const store = new MemoryStore(createSeed(today));
    const avery = (await store.listStaff()).find((person) => person.name === "Avery Quinn")!;
    const meeting = await ensureMondayMeeting({ store, actor: avery, today });
    expect(meeting.id).toBe("mtg_monday");
    expect(await store.listMeetings()).toHaveLength(2);
  });

  it("marks the meeting done and sends a recap through the staff chat hook", async () => {
    const store = new MemoryStore(createSeed(today));
    const avery = (await store.listStaff()).find((person) => person.name === "Avery Quinn")!;
    const events: StaffChatEvent[] = [];
    const finished = await finishMeeting(
      { store, actor: avery, today, chat: { async notify(event) { events.push(event); } } },
      "mtg_monday",
    );
    expect(finished.status).toBe("Done");
    expect((await store.getMeeting("mtg_monday"))?.status).toBe("Done");
    expect(events[0]?.type).toBe("meeting.finished");
    if (events[0]?.type === "meeting.finished") {
      expect(events[0].recap).toContain("Thanksgiving Eve service");
      expect(events[0].recap).toContain("Email (2)");
      expect(events[0].recap).toContain("Socials (1)");
      expect(events[0].recap).toContain("Platform (1)");
      expect(events[0].recap).toContain("Call for the Parker family");
    }
  });

  it("puts an assigned care note on that person's action items", async () => {
    const store = new MemoryStore(createSeed(today));
    const avery = (await store.listStaff()).find((person) => person.name === "Avery Quinn")!;
    const note = await createCareNote(
      { store, actor: avery, today },
      { meetingId: "mtg_monday", person: "Sam Ellis", action: "Meal", custom: "", details: "Dinner Thursday", assignee: "Dana Ruiz" },
    );
    const item = await store.getActionItem(note.actionItemId);
    expect(item?.owner).toBe("Dana Ruiz");
    expect(item?.action).toBe("Care note: Meal for Sam Ellis");
    expect(item?.meetingId).toBe("mtg_monday");
  });
});

describe("announcement sheet columns", () => {
  it("adds Meeting and Ministry headers without rewriting existing rows", async () => {
    const grid = [
      [...COLUMNS.announcements],
      ["ann_old", "11/16/2026", "Old news", "Sunday", "Avery Quinn", "Sunday", "Keep this", "", "Church"],
    ];
    const api: SheetsApi & { grids: Record<string, string[][]> } = {
      grids: { Announcements: grid },
      async get() {
        return this.grids.Announcements.map((row) => [...row]);
      },
      async appendRows(_tab, rows) {
        this.grids.Announcements.push(...rows.map((row) => [...row]));
      },
      async updateCells(updates) {
        for (const update of updates) {
          const match = /^'Announcements'!([A-Z]+)(\d+)$/.exec(update.range);
          if (!match) throw new Error(update.range);
          const index = match[1].charCodeAt(0) - 65;
          const row = this.grids.Announcements[Number(match[2]) - 1] ?? [];
          row[index] = update.value;
          this.grids.Announcements[Number(match[2]) - 1] = row;
        }
      },
      async deleteRow() {
        throw new Error("not used");
      },
      async ensureTab() {},
    };
    const store = new SheetsStore(api);
    await store.createAnnouncement({
      id: "ann_new",
      date: "11/23/2026",
      event: "Office closed",
      kind: "Staff meeting",
      owner: "Avery Quinn",
      announcedWhere: "Staff meeting",
      details: "Friday",
      link: "",
      audience: "Staff",
      meetingId: "mtg_monday",
      ministry: "Care",
      channels: "Email, Platform",
    });
    expect(api.grids.Announcements[0]).toContain("Meeting");
    expect(api.grids.Announcements[0]).toContain("Ministry");
    expect(api.grids.Announcements[0]).toContain("Channels");
    expect(api.grids.Announcements[1][0]).toBe("ann_old");
    expect(api.grids.Announcements[1][2]).toBe("Old news");
    const saved = (await store.listAnnouncements()).find((row) => row.id === "ann_new");
    expect(saved?.meetingId).toBe("mtg_monday");
    expect(saved?.ministry).toBe("Care");
    expect(saved?.channels).toBe("Email, Platform");
  });
});

import { describe, expect, it } from "vitest";
import { accessDecision, isAdmin } from "@/lib/domain/access";
import type { StaffMember } from "@/lib/data/types";
import { canEditActionItem, allowedRequestStatuses } from "@/lib/domain/permissions";
import { createActionItem, updateActionItem, updateMeeting, updateRequest } from "@/lib/services/hub";
import { MemoryStore } from "@/lib/data/memory-store";
import { createSeed } from "@/lib/data/mock-data";
import { HubError } from "@/lib/hub-error";
import type { StaffChatEvent } from "@/lib/chat/notifier";

const admin: StaffMember = {
  name: "Avery Quinn",
  email: "avery@mtvernon.church",
  title: "Executive Pastor",
  role: "Admin",
  photo: "",
  active: true,
};
const staff: StaffMember = {
  name: "Blake Nguyen",
  email: "blake@mtvernon.church",
  title: "Student Pastor",
  role: "Staff",
  photo: "",
  active: true,
};
const inactive: StaffMember = { ...staff, name: "Riley Chen", email: "riley@mtvernon.church", active: false };

describe("who may sign in", () => {
  it("accepts an active staff member on the church domain", () => {
    expect(accessDecision({ email: "Avery@mtvernon.church", domain: "mtvernon.church", staff: admin, provider: "google", hostDomain: "mtvernon.church", emailVerified: true }).ok).toBe(true);
  });

  it("refuses a personal Gmail account, even if the sheet listed it", () => {
    const decision = accessDecision({ email: "avery@gmail.com", domain: "mtvernon.church", staff: { ...admin, email: "avery@gmail.com" }, provider: "google" });
    expect(decision).toEqual({ ok: false, reason: "outside-domain" });
  });

  it("refuses a Google account whose hosted domain is not the church", () => {
    const decision = accessDecision({
      email: "avery@mtvernon.church",
      domain: "mtvernon.church",
      hostDomain: "gmail.com",
      staff: admin,
      provider: "google",
      emailVerified: true,
    });
    expect(decision).toEqual({ ok: false, reason: "outside-domain" });
  });

  it("refuses an unverified Google email", () => {
    const decision = accessDecision({ email: admin.email, domain: "mtvernon.church", staff: admin, provider: "google", emailVerified: false });
    expect(decision).toEqual({ ok: false, reason: "unverified" });
  });

  it("refuses someone who is not on the Staff tab", () => {
    const decision = accessDecision({ email: "new@mtvernon.church", domain: "mtvernon.church", staff: null, provider: "preview" });
    expect(decision).toEqual({ ok: false, reason: "unknown" });
  });

  it("refuses an inactive staff member", () => {
    const decision = accessDecision({ email: inactive.email, domain: "mtvernon.church", staff: inactive, provider: "preview" });
    expect(decision).toEqual({ ok: false, reason: "inactive" });
  });

  it("treats only the Admin role as an admin", () => {
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin(staff)).toBe(false);
    expect(isAdmin({ role: "Administrator" })).toBe(false);
  });
});

describe("who may change records", () => {
  it("lets staff complete their own item and blocks someone else's", async () => {
    const store = new MemoryStore(createSeed(new Date("2026-11-22T18:00:00Z")));
    const own = (await store.listActionItems()).find((item) => item.owner === staff.name && item.status !== "Done");
    expect(own).toBeTruthy();
    expect(canEditActionItem(staff, own!)).toBe(true);
    await updateActionItem({ store, actor: staff, today: new Date("2026-11-22T18:00:00Z") }, own!.id, { status: "Done" });
    expect((await store.getActionItem(own!.id))?.status).toBe("Done");
    expect((await store.getActionItem(own!.id))?.completedOn).toBe("11/22/2026");

    const other = (await store.listActionItems()).find((item) => item.owner === admin.name && item.status !== "Done");
    await expect(updateActionItem({ store, actor: staff }, other!.id, { status: "Done" })).rejects.toBeInstanceOf(HubError);
    expect((await store.getActionItem(other!.id))?.status).not.toBe("Done");
  });

  it("stops staff from assigning work to someone else", async () => {
    const store = new MemoryStore(createSeed());
    const before = (await store.listActionItems()).length;
    await expect(
      createActionItem({ store, actor: staff }, { action: "Do this", owner: admin.name, due: "", meetingId: "", update: "" }),
    ).rejects.toThrow(/admin can assign/);
    expect(await store.listActionItems()).toHaveLength(before);
  });

  it("lets an admin assign an item and tells the staff chat hook", async () => {
    const store = new MemoryStore(createSeed());
    const events: StaffChatEvent[] = [];
    const item = await createActionItem(
      { store, actor: admin, chat: { async notify(event) { events.push(event); } }, today: new Date("2026-11-22T18:00:00Z") },
      { action: "Order the candles", owner: "harper diaz", due: "2026-11-30", meetingId: "mtg_monday", update: "" },
    );
    expect(item.owner).toBe("Harper Diaz");
    expect(item.due).toBe("11/30/2026");
    expect(item.meetingId).toBe("mtg_monday");
    expect(events[0]?.type).toBe("action_item.created");
    const saved = await store.getActionItem(item.id);
    expect(saved?.action).toBe("Order the candles");
  });

  it("keeps a chat failure from blocking the save", async () => {
    const store = new MemoryStore(createSeed());
    const item = await createActionItem(
      { store, actor: staff, chat: { async notify() { throw new Error("chat down"); } } },
      { action: "My own item", owner: "", due: "", meetingId: "", update: "" },
    );
    expect(item.owner).toBe(staff.name);
    expect(await store.getActionItem(item.id)).toBeTruthy();
  });

  it("stops staff from editing the meeting", async () => {
    const store = new MemoryStore(createSeed());
    await expect(updateMeeting({ store, actor: staff }, "mtg_monday", { notes: "changed" })).rejects.toBeInstanceOf(HubError);
    expect((await store.getMeeting("mtg_monday"))?.notes).not.toBe("changed");
  });

  it("lets the requester approve a draft and stops them from assigning it", async () => {
    const store = new MemoryStore(createSeed());
    const jordan = (await store.listStaff()).find((person) => person.name === "Jordan Blake")!;
    expect(allowedRequestStatuses(jordan, (await store.getRequest("req_slide"))!)).toContain("Approved");
    await updateRequest({ store, actor: jordan }, "req_slide", { status: "Approved" });
    expect((await store.getRequest("req_slide"))?.status).toBe("Approved");
    await expect(updateRequest({ store, actor: jordan }, "req_slide", { assignedTo: "Blake Nguyen" })).rejects.toThrow(/admin/);
  });

  it("requires a draft link before an admin asks for review", async () => {
    const store = new MemoryStore(createSeed());
    await updateRequest({ store, actor: admin }, "req_graphic", { status: "In progress" });
    await expect(updateRequest({ store, actor: admin }, "req_graphic", { status: "Ready for review" })).rejects.toThrow(/draft link/);
    expect((await store.getRequest("req_graphic"))?.status).toBe("In progress");
    await updateRequest({ store, actor: admin }, "req_graphic", {
      status: "Ready for review",
      draftLink: "https://docs.google.com/document/d/example",
    });
    expect((await store.getRequest("req_graphic"))?.status).toBe("Ready for review");
  });
});

import { describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/data/memory-store";
import { createSeed } from "@/lib/data/mock-data";
import type { DeskRequest, StaffMember } from "@/lib/data/types";
import { buildRawEmail, emailParts } from "@/lib/notify/email";
import { isPushEndpoint } from "@/lib/notify/endpoints";
import { buildDigest } from "@/lib/notify/digest";
import { deliver, previewOutbox } from "@/lib/notify/deliver";
import { noticesFor, type HubEvent } from "@/lib/notify/events";
import { sendMorningDigests } from "@/lib/notify/run-digest";
import { createActionItem, createRequest, updateRequest } from "@/lib/services/hub";
import { createTimeAway, decideTimeAway } from "@/lib/services/desk";

const seed = createSeed(new Date("2026-11-26T15:00:00Z"));
const staff = seed.staff;
const avery = staff.find((person) => person.name === "Avery Quinn")!; // admin
const blake = staff.find((person) => person.name === "Blake Nguyen")!; // staff

const request: DeskRequest = {
  id: "req_1",
  title: "Easter mailer",
  requestedBy: "Blake Nguyen",
  neededBy: "12/10/2026",
  details: "Details",
  needed: "Graphic, Weekly email",
  link: "",
  status: "New",
  assignedTo: "",
  draftLink: "",
  created: "11/26/2026",
};

function recipients(event: HubEvent, actor: StaffMember) {
  return noticesFor(event, actor, staff).map((notice) => notice.name).sort();
}

describe("who hears about what", () => {
  it("sends a new request to every admin, not the person who sent it", () => {
    expect(recipients({ type: "request.created", request }, blake)).toEqual(["Avery Quinn", "Harper Diaz"]);
  });

  it("sends a new request only to the assigned person when someone has it", () => {
    expect(recipients({ type: "request.created", request: { ...request, assignedTo: "Ellis Park" } }, blake)).toEqual(["Ellis Park"]);
  });

  it("tells the requester when a draft is ready for review", () => {
    const notices = noticesFor(
      { type: "request.updated", before: request, after: { ...request, status: "Ready for review", draftLink: "https://x.test" } },
      avery,
      staff,
    );
    expect(notices.map((notice) => notice.name)).toEqual(["Blake Nguyen"]);
    expect(notices[0].title).toBe("Ready for your review: Easter mailer");
    expect(notices[0].path).toBe("/requests/req_1");
  });

  it("tells the handlers when the requester approves", () => {
    const before = { ...request, status: "Ready for review", assignedTo: "Avery Quinn" };
    const notices = noticesFor({ type: "request.updated", before, after: { ...before, status: "Approved" } }, blake, staff);
    expect(notices.map((notice) => notice.name)).toEqual(["Avery Quinn"]);
    expect(notices[0].title).toBe("Blake Nguyen approved the draft: Easter mailer");
  });

  it("never alerts the person who made the change", () => {
    expect(recipients({ type: "request.created", request: { ...request, requestedBy: "Avery Quinn" } }, avery)).toEqual(["Harper Diaz"]);
  });

  it("sends a pinned note to every active staff member except the author", () => {
    const pin = { id: "pin_1", title: "Doors at 8:15", message: "Be early.", link: "", priority: "Urgent" as const, showUntil: "", author: "Avery Quinn", posted: "" };
    const names = recipients({ type: "pin.posted", pin }, avery);
    expect(names).not.toContain("Avery Quinn");
    expect(names).not.toContain("Riley Chen");
    expect(names).toHaveLength(7);
    expect(noticesFor({ type: "pin.posted", pin }, avery, staff)[0].title).toBe("Urgent: Doors at 8:15");
  });
});

describe("saves fire the right alerts", () => {
  it("fires on a new request and on a status change", async () => {
    const store = new MemoryStore(createSeed());
    const events: HubEvent[] = [];
    const notify = (event: HubEvent) => {
      events.push(event);
    };
    const row = await createRequest(
      { store, actor: blake, notify },
      { title: "Lobby slide", details: "Sunday", neededBy: "2026-12-06", link: "", channels: ["Sunday announcement"] },
    );
    await updateRequest({ store, actor: avery, notify }, row.id, { status: "In progress" });
    expect(events.map((event) => event.type)).toEqual(["request.created", "request.updated"]);
  });

  it("fires a task alert only when someone else gets the task", async () => {
    const store = new MemoryStore(createSeed());
    const events: HubEvent[] = [];
    const notify = (event: HubEvent) => {
      events.push(event);
    };
    await createActionItem({ store, actor: avery, notify }, { action: "My own item", owner: "Avery Quinn", due: "", meetingId: "", update: "" });
    expect(events).toHaveLength(0);
    await createActionItem({ store, actor: avery, notify }, { action: "Call the printer", owner: "Blake Nguyen", due: "", meetingId: "", update: "" });
    expect(events.map((event) => event.type)).toEqual(["task.assigned"]);
  });

  it("fires on time away sent and decided", async () => {
    const store = new MemoryStore(createSeed());
    const events: HubEvent[] = [];
    const notify = (event: HubEvent) => {
      events.push(event);
    };
    const away = await createTimeAway(
      { store, actor: blake, notify },
      { kind: "PTO/vacation", start: "2026-12-14", end: "2026-12-15", halfDay: false, notes: "", coverage: "" },
    );
    await decideTimeAway({ store, actor: avery, notify }, away.id, "Approved");
    expect(events.map((event) => event.type)).toEqual(["away.created", "away.decided"]);
  });
});

describe("morning summary", () => {
  const today = new Date(Date.UTC(2026, 10, 30));

  it("lists overdue items and requests waiting on the person", () => {
    const notice = buildDigest({
      person: avery,
      today,
      items: [
        { id: "a", action: "Send the note", owner: "Avery Quinn", due: "11/20/2026", status: "Open", meetingId: "", update: "", created: "", completedOn: "", ministry: "" },
        { id: "b", action: "Finished", owner: "Avery Quinn", due: "11/20/2026", status: "Done", meetingId: "", update: "", created: "", completedOn: "", ministry: "" },
      ],
      requests: [request],
      graphics: [],
      away: [],
    });
    expect(notice?.title).toBe("Your Staff Hub today: 2 things for you");
    expect(notice?.body).toContain("Overdue: Send the note");
    expect(notice?.body).not.toContain("Finished");
    expect(notice?.body).toContain("Requests waiting on you: Easter mailer");
  });

  it("sends nothing when nothing needs the person", () => {
    expect(buildDigest({ person: blake, today, items: [], requests: [], graphics: [], away: [] })).toBeNull();
  });

  it("runs only once per day", async () => {
    const store = new MemoryStore(createSeed());
    const first = await sendMorningDigests(store, today);
    const second = await sendMorningDigests(store, today);
    expect(first.skipped).toBeUndefined();
    expect(second.skipped).toMatch(/Already sent/);
  });
});

describe("delivery in preview mode", () => {
  it("never emails sample people, and respects turned-off email", async () => {
    const store = new MemoryStore(createSeed());
    await store.saveNotificationPrefs({ email: "blake@mtvernon.church", emailOn: false, pushOn: false, digestOn: true, updated: "" });
    const report = await deliver(store, [
      { email: "avery@mtvernon.church", name: "Avery Quinn", title: "One", body: "b", path: "/", tag: "t1" },
      { email: "blake@mtvernon.church", name: "Blake Nguyen", title: "Two", body: "b", path: "/", tag: "t2" },
    ]);
    expect(report.emailed).toBe(0);
    expect(report.previewed).toBe(2);
    const [two, one] = previewOutbox();
    expect(one.channels).toEqual(["email (preview only)"]);
    expect(two.channels).toEqual(["none (turned off)"]);
  });
});

describe("phone alert addresses", () => {
  it("accepts the real browser push services", () => {
    expect(isPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(isPushEndpoint("https://web.push.apple.com/QK1abc")).toBe(true);
    expect(isPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc")).toBe(true);
  });

  it("refuses anything else", () => {
    expect(isPushEndpoint("http://fcm.googleapis.com/fcm/send/abc")).toBe(false);
    expect(isPushEndpoint("https://fcm.googleapis.com:8443/x")).toBe(false);
    expect(isPushEndpoint("https://example.com/push")).toBe(false);
    expect(isPushEndpoint("https://push.apple.com.evil.test/x")).toBe(false);
    expect(isPushEndpoint("not a url")).toBe(false);
  });
});

describe("email", () => {
  it("builds a message Gmail accepts, with no header injection", () => {
    const parts = emailParts({ email: "blake@mtvernon.church", name: "Blake", title: "Ready: Café night\r\nBcc: x@y.z", body: "Line one", path: "/requests/req_1", tag: "t" }, "https://staff.mtvernon.church");
    const raw = buildRawEmail({ from: "hub@mtvernon.church", fromName: "MV Staff Hub", to: "blake@mtvernon.church", ...parts });
    const text = Buffer.from(raw, "base64url").toString("utf8");
    expect(text).toContain("From: MV Staff Hub <hub@mtvernon.church>");
    expect(text).toContain("To: <blake@mtvernon.church>");
    expect(text).toMatch(/^Subject: =\?UTF-8\?B\?/m);
    expect(text).not.toMatch(/^Bcc:/m);
    expect(parts.text).toContain("https://staff.mtvernon.church/requests/req_1");
  });
});

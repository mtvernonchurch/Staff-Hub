import type { StaffChatNotifier } from "@/lib/chat/notifier";
import { createStaffChat } from "@/lib/chat/notifier";
import type {
  ActionItem,
  Announcement,
  DeskRequest,
  HubStore,
  MinistryUpdate,
  OpenIssue,
  PinnedDocument,
  StaffMember,
} from "@/lib/data/types";
import { isAdmin } from "@/lib/domain/access";
import { canonicalActionStatus, chicagoToday, formatUsDate, isClosedStatus, toSheetDate, upcomingMonday } from "@/lib/domain/dates";
import { pickMondayMeeting } from "@/lib/domain/view";
import { CARE_ACTIONS, careActionLabel, careTaskText } from "@/lib/domain/care";
import { announcementRecap, formatChannels } from "@/lib/domain/channels";
import { ATTENDANCE_AREAS, ATTENDANCE_SERVICES } from "@/lib/domain/attendance";
import { newId } from "@/lib/domain/ids";
import { safeHttps } from "@/lib/domain/links";
import { namesMatch } from "@/lib/domain/people";
import {
  allowedRequestStatuses,
  canEditActionItem,
  canEditChecklist,
  canEditMinistryUpdate,
  canManageRecords,
  isRequestStatus,
} from "@/lib/domain/permissions";
import { HubError } from "@/lib/hub-error";
import { announce, type Notify } from "@/lib/notify";

export type Deps = {
  store: HubStore;
  actor: StaffMember;
  chat?: StaffChatNotifier;
  /** Tests pass this to see which alerts fired. The hub sends real ones. */
  notify?: Notify;
  today?: Date;
};

function assertActive(actor: StaffMember) {
  if (!actor.active) throw new HubError("Your staff record is inactive. Ask an admin to turn it back on.");
}

function day(deps: Deps): string {
  return formatUsDate(deps.today ?? chicagoToday());
}

async function activeOwner(store: HubStore, name: string): Promise<string> {
  const staff = await store.listStaff();
  const match = staff.filter((person) => person.active).find((person) => namesMatch(person.name, name));
  if (!match) throw new HubError("Choose an active staff member.");
  return match.name;
}

function requireHttps(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new HubError(`Add an https link for the ${label}.`);
  const safe = safeHttps(trimmed);
  if (!safe) throw new HubError(`${label} needs a link that starts with https://`);
  return safe;
}

function optionalHttps(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const safe = safeHttps(trimmed);
  if (!safe) throw new HubError(`${label} needs to be blank or start with https://`);
  return safe;
}

export async function createActionItem(
  deps: Deps,
  input: { action: string; owner: string; due: string; meetingId: string; update: string; ministry?: string },
): Promise<ActionItem> {
  assertActive(deps.actor);
  const action = input.action.trim();
  if (!action) throw new HubError("Write what needs to be done.");
  if (action.length > 300) throw new HubError("Keep the action item under 300 characters.");
  let owner = input.owner.trim();
  if (!isAdmin(deps.actor)) {
    if (owner && !namesMatch(owner, deps.actor.name)) {
      throw new HubError("You can add items for yourself. An admin can assign an item to someone else.");
    }
    owner = deps.actor.name;
  }
  owner = await activeOwner(deps.store, owner);
  const due = input.due.trim() ? toSheetDate(input.due) : "";
  const meetingId = input.meetingId.trim();
  if (meetingId && !(await deps.store.getMeeting(meetingId))) {
    throw new HubError("That meeting is not on the list.");
  }
  const update = input.update.trim();
  if (update.length > 1000) throw new HubError("Keep the update under 1,000 characters.");
  const item: ActionItem = {
    id: newId("ai"),
    action,
    owner,
    due,
    status: "Open",
    meetingId,
    update,
    created: day(deps),
    completedOn: "",
    ministry: input.ministry?.trim() ?? "",
  };
  await deps.store.createActionItem(item);
  try {
    await (deps.chat ?? createStaffChat()).notify({ type: "action_item.created", item, actorName: deps.actor.name });
  } catch (error) {
    console.error("staff chat hook failed", error instanceof Error ? error.message : "unknown");
  }
  if (!namesMatch(item.owner, deps.actor.name)) await announce(deps, { type: "task.assigned", item });
  return item;
}

export async function updateActionItem(
  deps: Deps,
  id: string,
  changes: { action?: string; owner?: string; due?: string; status?: string; update?: string; meetingId?: string; ministry?: string },
): Promise<void> {
  assertActive(deps.actor);
  const existing = await deps.store.getActionItem(id);
  if (!existing) throw new HubError("That action item is no longer on the list.");
  if (!canEditActionItem(deps.actor, existing)) {
    throw new HubError("You can update your own items. An admin can update anyone's.");
  }
  const next: Partial<ActionItem> = {};
  if (changes.action !== undefined) {
    const action = changes.action.trim();
    if (!action) throw new HubError("The action item needs words.");
    if (action.length > 300) throw new HubError("Keep the action item under 300 characters.");
    next.action = action;
  }
  if (changes.update !== undefined) {
    if (changes.update.trim().length > 1000) throw new HubError("Keep the update under 1,000 characters.");
    next.update = changes.update.trim();
  }
  if (changes.due !== undefined) next.due = changes.due.trim() ? toSheetDate(changes.due) : "";
  if (changes.owner !== undefined && !namesMatch(changes.owner, existing.owner)) {
    if (!isAdmin(deps.actor)) throw new HubError("Only an admin can change who owns an item.");
    next.owner = await activeOwner(deps.store, changes.owner);
  }
  if (changes.meetingId !== undefined && changes.meetingId.trim() !== existing.meetingId) {
    if (!isAdmin(deps.actor)) throw new HubError("Only an admin can move an item to another meeting.");
    const meetingId = changes.meetingId.trim();
    if (meetingId && !(await deps.store.getMeeting(meetingId))) throw new HubError("That meeting is not on the list.");
    next.meetingId = meetingId;
  }
  if (changes.ministry !== undefined) next.ministry = changes.ministry.trim();
  if (changes.status !== undefined) {
    const status = canonicalActionStatus(changes.status);
    if (!status) throw new HubError("Status must be Open, In progress, or Done.");
    next.status = status;
    next.completedOn = status === "Done" ? day(deps) : "";
  }
  await deps.store.updateActionItem(id, next);
  if (next.owner && !namesMatch(next.owner, deps.actor.name)) {
    await announce(deps, { type: "task.assigned", item: { ...existing, ...next } });
  }
  if (next.status) {
    const linked = (await deps.store.listCareNotes()).find((note) => note.actionItemId === id);
    if (linked && linked.done !== (next.status === "Done")) {
      await deps.store.updateCareNote(linked.id, { done: next.status === "Done" });
    }
  }
}

export async function createMeeting(
  deps: Deps,
  input: { date: string; title: string; attendees: string; status?: string },
) {
  assertActive(deps.actor);
  if (!canManageRecords(deps.actor)) throw new HubError("Only an admin can add a meeting.");
  const title = input.title.trim();
  if (!title) throw new HubError("Give the meeting a title.");
  const status = input.status?.trim() || "Upcoming";
  if (!["Upcoming", "Done"].includes(status)) throw new HubError("Meeting status is Upcoming or Done.");
  await deps.store.createMeeting({
    id: newId("mtg"),
    date: toSheetDate(input.date),
    title,
    status,
    attendees: normalizeList(input.attendees),
    notesBy: deps.actor.name,
    prayer: "",
    wins: "",
    lookahead: "",
    care: "",
    notes: "",
  });
}

export async function updateMeeting(
  deps: Deps,
  id: string,
  changes: Partial<Pick<MeetingFields, "date" | "title" | "status" | "attendees" | "prayer" | "wins" | "lookahead" | "care" | "notes">>,
) {
  assertActive(deps.actor);
  if (!canManageRecords(deps.actor)) throw new HubError("Only an admin can edit the meeting.");
  const existing = await deps.store.getMeeting(id);
  if (!existing) throw new HubError("That meeting is no longer on the list.");
  const next: Partial<typeof existing> = {};
  if (changes.date !== undefined) next.date = toSheetDate(changes.date);
  if (changes.title !== undefined) {
    if (!changes.title.trim()) throw new HubError("The meeting needs a title.");
    next.title = changes.title.trim();
  }
  if (changes.status !== undefined) {
    if (!["Upcoming", "Done"].includes(changes.status)) throw new HubError("Meeting status is Upcoming or Done.");
    next.status = changes.status;
  }
  if (changes.attendees !== undefined) next.attendees = normalizeList(changes.attendees);
  if (changes.prayer !== undefined) next.prayer = limit(changes.prayer, 5000, "Prayer");
  if (changes.wins !== undefined) next.wins = limit(changes.wins, 5000, "Wins");
  if (changes.lookahead !== undefined) next.lookahead = limit(changes.lookahead, 5000, "Calendar look-ahead");
  if (changes.care !== undefined) next.care = limit(changes.care, 5000, "Care update");
  if (changes.notes !== undefined) {
    next.notes = limit(changes.notes, 8000, "Discussion");
    next.notesBy = deps.actor.name;
  }
  await deps.store.updateMeeting(id, next);
}

type MeetingFields = {
  date: string;
  title: string;
  status: string;
  attendees: string;
  prayer: string;
  wins: string;
  lookahead: string;
  care: string;
  notes: string;
};

export async function createMinistryUpdate(
  deps: Deps,
  input: { meetingId: string; ministry: string; update: string; comingUp: string; need: string },
) {
  assertActive(deps.actor);
  const meeting = await deps.store.getMeeting(input.meetingId);
  if (!meeting) throw new HubError("That meeting is no longer on the list.");
  const ministryName = input.ministry.trim();
  if (!ministryName) throw new HubError("Choose a ministry.");
  const update = input.update.trim();
  const comingUp = input.comingUp.trim();
  const need = input.need.trim();
  if (!update && !comingUp && !need) throw new HubError("Write an update, what is coming up, or what you need.");
  const ministries = await deps.store.listMinistries();
  const known = ministries.find((row) => namesMatch(row.ministry, ministryName));
  const row: MinistryUpdate = {
    id: newId("upd"),
    meetingId: meeting.id,
    ministry: known?.ministry || ministryName,
    lead: known?.lead || "",
    update: limit(update, 2000, "Update"),
    comingUp: limit(comingUp, 2000, "Coming up"),
    need: limit(need, 2000, "Need"),
    submittedBy: deps.actor.name,
    submittedOn: day(deps),
  };
  await deps.store.createMinistryUpdate(row);
}

export async function updateMinistryUpdate(
  deps: Deps,
  id: string,
  input: { update: string; comingUp: string; need: string },
) {
  assertActive(deps.actor);
  const existing = (await deps.store.listMinistryUpdates()).find((row) => row.id === id);
  if (!existing) throw new HubError("That update is no longer on the list.");
  if (!canEditMinistryUpdate(deps.actor, existing)) {
    throw new HubError("You can edit an update you submitted. An admin can edit any of them.");
  }
  await deps.store.updateMinistryUpdate(id, {
    update: limit(input.update, 2000, "Update"),
    comingUp: limit(input.comingUp, 2000, "Coming up"),
    need: limit(input.need, 2000, "Need"),
  });
}

export async function createAnnouncement(
  deps: Deps,
  input: {
    date: string;
    event: string;
    kind: string;
    announcedWhere: string;
    details: string;
    link: string;
    audience: string;
    meetingId?: string;
    ministry?: string;
    channels?: string[];
  },
) {
  assertActive(deps.actor);
  if (!canManageRecords(deps.actor)) throw new HubError("Only an admin can post an announcement.");
  const event = input.event.trim();
  if (!event) throw new HubError("What is the announcement about?");
  const row: Announcement = {
    id: newId("ann"),
    date: toSheetDate(input.date),
    event,
    kind: input.kind.trim(),
    owner: deps.actor.name,
    announcedWhere: input.announcedWhere.trim(),
    details: limit(input.details, 2000, "Details"),
    link: optionalHttps(input.link, "The link"),
    audience: input.audience.trim(),
    meetingId: input.meetingId?.trim() ?? "",
    ministry: input.ministry?.trim() ?? "",
    channels: formatChannels(input.channels ?? []),
  };
  await deps.store.createAnnouncement(row);
  return row;
}

export async function updateAnnouncement(deps: Deps, id: string, input: Partial<Announcement>) {
  assertActive(deps.actor);
  if (!canManageRecords(deps.actor)) throw new HubError("Only an admin can edit an announcement.");
  const next: Partial<Announcement> = {};
  if (input.date !== undefined) next.date = toSheetDate(input.date);
  if (input.event !== undefined) {
    if (!input.event.trim()) throw new HubError("The announcement needs a title.");
    next.event = input.event.trim();
  }
  if (input.kind !== undefined) next.kind = input.kind.trim();
  if (input.announcedWhere !== undefined) next.announcedWhere = input.announcedWhere.trim();
  if (input.details !== undefined) next.details = limit(input.details, 2000, "Details");
  if (input.link !== undefined) next.link = optionalHttps(input.link, "The link");
  if (input.audience !== undefined) next.audience = input.audience.trim();
  if (input.meetingId !== undefined) next.meetingId = input.meetingId.trim();
  if (input.ministry !== undefined) next.ministry = input.ministry.trim();
  if (input.channels !== undefined) next.channels = formatChannels(input.channels.split(","));
  await deps.store.updateAnnouncement(id, next);
}

export async function deleteActionItem(deps: Deps, id: string) {
  assertActive(deps.actor);
  if (!isAdmin(deps.actor)) throw new HubError("Only an admin can remove an action item.");
  const existing = await deps.store.getActionItem(id);
  if (!existing) throw new HubError("That action item is no longer on the list.");
  const linked = (await deps.store.listCareNotes()).find((note) => note.actionItemId === id);
  await deps.store.deleteActionItem(id);
  if (linked) await deps.store.updateCareNote(linked.id, { actionItemId: "", assignee: "" });
}

export async function createCareNote(
  deps: Deps,
  input: { meetingId: string; person: string; action: string; custom: string; details: string; assignee: string },
) {
  assertActive(deps.actor);
  if (!canManageRecords(deps.actor)) throw new HubError("Only an admin can add a care note.");
  const meeting = await deps.store.getMeeting(input.meetingId);
  if (!meeting) throw new HubError("That meeting is no longer on the list.");
  const person = input.person.trim();
  if (!person) throw new HubError("Who needs care?");
  if (!(CARE_ACTIONS as readonly string[]).includes(input.action)) throw new HubError("Choose Visit, Card, Flowers, Call, Meal, or Other.");
  const custom = input.action === "Other" ? input.custom.trim() : "";
  if (input.action === "Other" && !custom) throw new HubError("Say what the other help is.");
  const details = limit(input.details, 300, "Details");
  const assignee = input.assignee.trim() ? await activeOwner(deps.store, input.assignee) : "";
  let actionItemId = "";
  if (assignee) {
    const item = await createActionItem(deps, {
      action: careTaskText({ person, action: input.action, custom }),
      owner: assignee,
      due: "",
      meetingId: meeting.id,
      update: details,
      ministry: "",
    });
    actionItemId = item.id;
  }
  const note = {
    id: newId("care"),
    meetingId: meeting.id,
    person,
    action: input.action,
    custom,
    details,
    assignee,
    done: false,
    actionItemId,
  };
  await deps.store.createCareNote(note);
  return note;
}

export async function updateCareNote(
  deps: Deps,
  id: string,
  input: { person?: string; action?: string; custom?: string; details?: string; assignee?: string; done?: boolean },
) {
  assertActive(deps.actor);
  if (!canManageRecords(deps.actor)) throw new HubError("Only an admin can edit a care note.");
  const existing = (await deps.store.listCareNotes()).find((note) => note.id === id);
  if (!existing) throw new HubError("That care note is no longer on the list.");
  const next = { ...existing };
  if (input.person !== undefined) {
    if (!input.person.trim()) throw new HubError("Who needs care?");
    next.person = input.person.trim();
  }
  if (input.action !== undefined) {
    if (!(CARE_ACTIONS as readonly string[]).includes(input.action)) throw new HubError("Choose Visit, Card, Flowers, Call, Meal, or Other.");
    next.action = input.action;
  }
  if (input.custom !== undefined || input.action !== undefined) {
    next.custom = next.action === "Other" ? (input.custom ?? existing.custom).trim() : "";
    if (next.action === "Other" && !next.custom) throw new HubError("Say what the other help is.");
  }
  if (input.details !== undefined) next.details = limit(input.details, 300, "Details");
  if (input.assignee !== undefined) next.assignee = input.assignee.trim() ? await activeOwner(deps.store, input.assignee) : "";
  if (input.done !== undefined) next.done = input.done;

  if (next.assignee && !existing.actionItemId) {
    const item = await createActionItem(deps, {
      action: careTaskText(next),
      owner: next.assignee,
      due: "",
      meetingId: existing.meetingId,
      update: next.details,
      ministry: "",
    });
    next.actionItemId = item.id;
    if (next.done) await updateActionItem(deps, item.id, { status: "Done" });
  } else if (next.assignee && existing.actionItemId) {
    await updateActionItem(deps, existing.actionItemId, {
      action: careTaskText(next),
      owner: next.assignee,
      update: next.details,
      status: next.done ? "Done" : "Open",
    });
  } else if (!next.assignee && existing.actionItemId) {
    await deps.store.deleteActionItem(existing.actionItemId);
    next.actionItemId = "";
  }

  await deps.store.updateCareNote(id, next);
  return next;
}

export async function deleteCareNote(deps: Deps, id: string) {
  assertActive(deps.actor);
  if (!canManageRecords(deps.actor)) throw new HubError("Only an admin can remove a care note.");
  const existing = (await deps.store.listCareNotes()).find((note) => note.id === id);
  if (!existing) throw new HubError("That care note is no longer on the list.");
  if (existing.actionItemId) await deps.store.deleteActionItem(existing.actionItemId);
  await deps.store.deleteCareNote(id);
}

export async function deleteAnnouncement(deps: Deps, id: string) {
  assertActive(deps.actor);
  if (!isAdmin(deps.actor)) throw new HubError("Only an admin can remove an announcement.");
  const existing = (await deps.store.listAnnouncements()).find((row) => row.id === id);
  if (!existing) throw new HubError("That announcement is no longer on the list.");
  await deps.store.deleteAnnouncement(id);
}

export async function ensureMondayMeeting(deps: Deps) {
  assertActive(deps.actor);
  if (!canManageRecords(deps.actor)) throw new HubError("Only an admin can open the staff meeting.");
  const today = deps.today ?? chicagoToday();
  const existing = pickMondayMeeting(await deps.store.listMeetings(), today);
  if (existing) return existing;
  const people = (await deps.store.listStaff()).filter((person) => person.active);
  const meeting = {
    id: newId("mtg"),
    date: formatUsDate(upcomingMonday(today)),
    title: "Weekly Staff Meeting",
    status: "Upcoming",
    attendees: people.map((person) => person.name).join(", "),
    notesBy: deps.actor.name,
    prayer: "",
    wins: "",
    lookahead: "",
    care: "",
    notes: "",
  };
  await deps.store.createMeeting(meeting);
  return meeting;
}

export async function finishMeeting(deps: Deps, id: string) {
  assertActive(deps.actor);
  if (!canManageRecords(deps.actor)) throw new HubError("Only an admin can finish the meeting.");
  const meeting = await deps.store.getMeeting(id);
  if (!meeting) throw new HubError("That meeting is no longer on the list.");
  await deps.store.updateMeeting(id, { status: "Done", notesBy: deps.actor.name });
  const careNotes = (await deps.store.listCareNotes()).filter((note) => note.meetingId === id);
  const linkedIds = new Set(careNotes.map((note) => note.actionItemId).filter(Boolean));
  const items = (await deps.store.listActionItems()).filter((item) => item.meetingId === id && !linkedIds.has(item.id));
  const announcements = (await deps.store.listAnnouncements()).filter((row) => row.meetingId === id);
  const recap = [
    `${meeting.title} · ${meeting.date}`,
    meeting.prayer ? `Prayer: ${meeting.prayer}` : "",
    meeting.wins ? `Celebrations: ${meeting.wins}` : "",
    announcementRecap(announcements),
    careNotes.length
      ? `Care notes:\n${careNotes.map((note) => `- ${careActionLabel(note)} for ${note.person}${note.assignee ? ` (${note.assignee})` : ""}${note.done ? " — done" : ""}`).join("\n")}`
      : "",
    items.length ? `Action items:\n${items.map((item) => `- ${item.action} (${item.owner}${item.due ? `, due ${item.due}` : ""})`).join("\n")}` : "",
    meeting.notes ? `Notes: ${meeting.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  const finished = { ...meeting, status: "Done", notesBy: deps.actor.name };
  try {
    await (deps.chat ?? createStaffChat()).notify({ type: "meeting.finished", meeting: finished, actorName: deps.actor.name, recap });
  } catch (error) {
    console.error("staff chat hook failed", error instanceof Error ? error.message : "unknown");
  }
  return finished;
}

export const REQUEST_CHANNELS = [
  "Graphic",
  "Weekly email",
  "Text message",
  "Social post",
  "Website",
  "Sunday announcement",
] as const;

export async function createRequest(
  deps: Deps,
  input: { title: string; details: string; neededBy: string; link: string; channels: string[] },
) {
  assertActive(deps.actor);
  const title = input.title.trim();
  if (!title) throw new HubError("What is this request about?");
  if (title.length > 200) throw new HubError("Keep the title under 200 characters.");
  const details = input.details.trim();
  if (!details) throw new HubError("Add the details: date, place, audience, and the exact wording.");
  if (details.length > 2000) throw new HubError("Keep the details under 2,000 characters.");
  const channels = REQUEST_CHANNELS.filter((channel) => input.channels.includes(channel));
  if (channels.length === 0) throw new HubError("Choose at least one thing you need.");
  const row: DeskRequest = {
    id: newId("req"),
    title,
    requestedBy: deps.actor.name,
    neededBy: toSheetDate(input.neededBy),
    details,
    needed: channels.join(", "),
    link: optionalHttps(input.link, "The link"),
    status: "New",
    assignedTo: "",
    draftLink: "",
    created: day(deps),
  };
  await deps.store.createRequest(row);
  await announce(deps, { type: "request.created", request: row });
  return row;
}

export async function updateRequest(
  deps: Deps,
  id: string,
  input: { status?: string; assignedTo?: string; draftLink?: string },
) {
  assertActive(deps.actor);
  const existing = await deps.store.getRequest(id);
  if (!existing) throw new HubError("That request is no longer on the list.");
  const next: Partial<DeskRequest> = {};
  if (input.assignedTo !== undefined && !namesMatch(input.assignedTo, existing.assignedTo)) {
    if (!isAdmin(deps.actor)) throw new HubError("Only an admin can assign a request.");
    next.assignedTo = input.assignedTo.trim() ? await activeOwner(deps.store, input.assignedTo) : "";
  }
  if (input.draftLink !== undefined && input.draftLink.trim() !== existing.draftLink.trim()) {
    if (!isAdmin(deps.actor)) throw new HubError("Only an admin can attach a draft link.");
    next.draftLink = optionalHttps(input.draftLink, "The draft link");
  }
  if (input.status !== undefined && input.status !== existing.status) {
    if (!isRequestStatus(input.status)) throw new HubError("That is not a request status.");
    const allowed = allowedRequestStatuses(deps.actor, existing);
    if (!allowed.includes(input.status)) throw new HubError("That status change isn't yours to make.");
    next.status = input.status;
  }
  const draft = next.draftLink ?? existing.draftLink;
  const status = next.status ?? existing.status;
  if (status === "Ready for review" && !safeHttps(draft)) {
    throw new HubError("Add an https draft link before asking for review.");
  }
  await deps.store.updateRequest(id, next);
  if (Object.keys(next).length > 0) await announce(deps, { type: "request.updated", before: existing, after: { ...existing, ...next } });
}

export async function startChecklist(deps: Deps, meetingId: string) {
  assertActive(deps.actor);
  const meeting = await deps.store.getMeeting(meetingId);
  if (!meeting) throw new HubError("Create the meeting before starting its checklist.");
  const existing = (await deps.store.listChecklist()).filter((row) => row.meetingId === meetingId);
  if (existing.length > 0) throw new HubError("This meeting already has a checklist.");
  const template = await deps.store.listChecklistTemplate();
  if (template.length === 0) throw new HubError("The checklist template is empty. Add rows on the Checklist Template tab.");
  await deps.store.createChecklistItems(
    template.map((row) => ({
      id: newId("chk"),
      meetingId,
      order: row.order,
      area: row.area,
      owner: row.owner,
      covered: row.covered,
      ready: false,
      notes: "",
    })),
  );
}

export async function updateChecklist(deps: Deps, id: string, input: { ready?: boolean; notes?: string }) {
  assertActive(deps.actor);
  const existing = await deps.store.getChecklistItem(id);
  if (!existing) throw new HubError("That checklist row is no longer on the list.");
  if (!canEditChecklist(deps.actor, existing)) {
    throw new HubError("You can check off your own area. An admin can update any area.");
  }
  const next: Partial<typeof existing> = {};
  if (input.ready !== undefined) next.ready = input.ready;
  if (input.notes !== undefined) next.notes = limit(input.notes, 1000, "Notes");
  await deps.store.updateChecklistItem(id, next);
}

export async function createIssue(deps: Deps, input: { issue: string; owner: string; nextStep: string; due: string }) {
  assertActive(deps.actor);
  const issue = input.issue.trim();
  if (!issue) throw new HubError("Describe the issue.");
  let owner = input.owner.trim();
  if (!isAdmin(deps.actor)) owner = deps.actor.name;
  owner = await activeOwner(deps.store, owner || deps.actor.name);
  const row: OpenIssue = {
    id: newId("iss"),
    issue,
    owner,
    nextStep: limit(input.nextStep, 500, "Next step"),
    due: input.due.trim() ? toSheetDate(input.due) : "",
    status: "Open",
    created: day(deps),
  };
  await deps.store.createOpenIssue(row);
}

export async function updateIssue(
  deps: Deps,
  id: string,
  input: { nextStep?: string; status?: string; owner?: string; due?: string },
) {
  assertActive(deps.actor);
  const existing = (await deps.store.listOpenIssues()).find((row) => row.id === id);
  if (!existing) throw new HubError("That issue is no longer on the list.");
  if (!isAdmin(deps.actor) && !namesMatch(deps.actor.name, existing.owner)) {
    throw new HubError("You can update an issue you own. An admin can update any of them.");
  }
  const next: Partial<OpenIssue> = {};
  if (input.nextStep !== undefined) next.nextStep = limit(input.nextStep, 500, "Next step");
  if (input.due !== undefined) next.due = input.due.trim() ? toSheetDate(input.due) : "";
  if (input.owner !== undefined && !namesMatch(input.owner, existing.owner)) {
    if (!isAdmin(deps.actor)) throw new HubError("Only an admin can reassign an issue.");
    next.owner = await activeOwner(deps.store, input.owner);
  }
  if (input.status !== undefined) {
    const status = canonicalActionStatus(input.status);
    if (!status || status === "In progress") throw new HubError("Mark the issue Open or Done.");
    next.status = status;
  }
  await deps.store.updateOpenIssue(id, next);
}

export async function createDocument(deps: Deps, input: { title: string; group: string; link: string; notes: string }) {
  assertActive(deps.actor);
  if (!canManageRecords(deps.actor)) throw new HubError("Only an admin can pin a document.");
  const title = input.title.trim();
  if (!title) throw new HubError("Give the document a title.");
  const row: PinnedDocument = {
    id: newId("doc"),
    title,
    group: input.group.trim() || "General",
    link: requireHttps(input.link, "document"),
    notes: limit(input.notes, 500, "Notes"),
  };
  await deps.store.createDocument(row);
}

export async function updateDocument(deps: Deps, id: string, input: Partial<PinnedDocument>) {
  assertActive(deps.actor);
  if (!canManageRecords(deps.actor)) throw new HubError("Only an admin can edit a pinned document.");
  const next: Partial<PinnedDocument> = {};
  if (input.title !== undefined) {
    if (!input.title.trim()) throw new HubError("The document needs a title.");
    next.title = input.title.trim();
  }
  if (input.group !== undefined) next.group = input.group.trim() || "General";
  if (input.link !== undefined) next.link = requireHttps(input.link, "document");
  if (input.notes !== undefined) next.notes = limit(input.notes, 500, "Notes");
  await deps.store.updateDocument(id, next);
}

export async function saveAttendanceGrid(
  deps: Deps,
  input: { date: string; notes: string; counts: { service: string; area: string; count: string }[] },
) {
  assertActive(deps.actor);
  if (!canManageRecords(deps.actor)) throw new HubError("Only an admin can edit attendance.");
  const date = toSheetDate(input.date);
  const notes = limit(input.notes, 500, "Notes");
  const existing = await deps.store.listAttendance();
  for (const service of ATTENDANCE_SERVICES) {
    for (const area of ATTENDANCE_AREAS) {
      const raw = input.counts.find((row) => row.service === service && row.area === area);
      if (!raw || raw.count.trim() === "") continue;
      const count = Number(raw.count);
      if (!Number.isInteger(count) || count < 0 || count > 10000) throw new HubError(`Enter a whole number for ${area} at ${service}.`);
      const match = existing.find((row) => row.date === date && row.service === service && row.area === area);
      const rowNotes = service === "9:00" && area === "Adults/Worship" ? notes : match?.notes ?? "";
      if (match) await deps.store.updateAttendance(match.id, { count, notes: rowNotes });
      else {
        await deps.store.createAttendance({ id: newId("att"), date, service, area, count, notes: rowNotes });
      }
    }
  }
}

export async function createQuickLink(
  deps: Deps,
  input: { name: string; url: string; icon: string; order: string; initials?: string; color?: string; visibleTo?: string; hidden?: boolean },
) {
  assertActive(deps.actor);
  if (!canManageRecords(deps.actor)) throw new HubError("Only an admin can add a quick link.");
  const name = input.name.trim();
  if (!name) throw new HubError("Name the link.");
  const words = name.split(/\s+/).filter(Boolean);
  await deps.store.createQuickLink({
    id: newId("lnk"),
    name,
    url: requireHttps(input.url, "link"),
    icon: input.icon.trim() || "link",
    order: input.order.trim() || "99",
    initials: (input.initials ?? "").trim() || words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "").join(""),
    color: (input.color ?? "").trim() || "navy",
    visibleTo: (input.visibleTo ?? "").trim() || "All",
    hidden: Boolean(input.hidden),
  });
}

export async function updateQuickLink(
  deps: Deps,
  id: string,
  input: Partial<{ name: string; url: string; icon: string; order: string; initials: string; color: string; visibleTo: string; hidden: boolean }>,
) {
  assertActive(deps.actor);
  if (!canManageRecords(deps.actor)) throw new HubError("Only an admin can edit a quick link.");
  const next: Partial<{ name: string; url: string; icon: string; order: string; initials: string; color: string; visibleTo: string; hidden: boolean }> = {};
  if (input.name !== undefined) {
    if (!input.name.trim()) throw new HubError("Name the link.");
    next.name = input.name.trim();
  }
  if (input.url !== undefined) next.url = requireHttps(input.url, "link");
  if (input.icon !== undefined) next.icon = input.icon.trim() || "link";
  if (input.order !== undefined) next.order = input.order.trim() || "99";
  if (input.initials !== undefined) next.initials = input.initials.trim();
  if (input.color !== undefined) next.color = input.color.trim() || "navy";
  if (input.visibleTo !== undefined) next.visibleTo = input.visibleTo.trim() || "All";
  if (input.hidden !== undefined) next.hidden = input.hidden;
  await deps.store.updateQuickLink(id, next);
}

export async function createFolder(deps: Deps, input: { name: string; url: string; order: string }) {
  assertActive(deps.actor);
  if (!canManageRecords(deps.actor)) throw new HubError("Only an admin can add a folder.");
  const name = input.name.trim();
  if (!name) throw new HubError("Name the folder.");
  await deps.store.createFolder({
    id: newId("fld"),
    name,
    url: requireHttps(input.url, "folder"),
    icon: "folder",
    order: input.order.trim() || "99",
  });
}

export async function updateFolder(deps: Deps, id: string, input: Partial<{ name: string; url: string; order: string }>) {
  assertActive(deps.actor);
  if (!canManageRecords(deps.actor)) throw new HubError("Only an admin can edit a folder.");
  const next: Partial<{ name: string; url: string; order: string }> = {};
  if (input.name !== undefined) {
    if (!input.name.trim()) throw new HubError("Name the folder.");
    next.name = input.name.trim();
  }
  if (input.url !== undefined) next.url = requireHttps(input.url, "folder");
  if (input.order !== undefined) next.order = input.order.trim() || "99";
  await deps.store.updateFolder(id, next);
}

export function requestWaitingOn(actor: StaffMember, request: DeskRequest): boolean {
  const mine = namesMatch(actor.name, request.requestedBy);
  if (isClosedStatus(request.status) || ["Declined", "Withdrawn", "Done"].includes(request.status)) return false;
  if (isAdmin(actor) && ["New", "In progress", "Changes requested", "Approved"].includes(request.status)) return true;
  return mine && request.status === "Ready for review";
}

function limit(value: string, max: number, label: string): string {
  const trimmed = value.trim();
  if (trimmed.length > max) throw new HubError(`${label} needs to stay under ${max.toLocaleString("en-US")} characters.`);
  return trimmed;
}

function normalizeList(value: string): string {
  return value
    .split(/[\n,]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

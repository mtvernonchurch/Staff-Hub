"use server";

import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/session";
import { isFrameworkError } from "@/lib/framework";
import { safeReturnTo, withQuery } from "@/lib/domain/links";
import { HubError } from "@/lib/hub-error";
import {
  createActionItem,
  createAnnouncement,
  createDocument,
  createFolder,
  createIssue,
  createMeeting,
  createMinistryUpdate,
  createQuickLink,
  createRequest,
  startChecklist,
  updateActionItem,
  updateAnnouncement,
  updateChecklist,
  updateDocument,
  updateFolder,
  updateIssue,
  updateMeeting,
  updateMinistryUpdate,
  updateQuickLink,
  updateRequest,
} from "@/lib/services/hub";

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

async function run(returnTo: string, notice: string, work: () => Promise<void>) {
  try {
    await work();
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    const message = error instanceof HubError ? error.message : "Something went wrong. Please try again.";
    if (!(error instanceof HubError)) console.error(error instanceof Error ? error.message : error);
    redirect(withQuery(returnTo, "error", message));
  }
  redirect(withQuery(returnTo, "notice", notice));
}

export async function createActionItemAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/action-items");
  await run(returnTo, "Saved.", async () => {
    const { staff, store } = await requireStaff();
    await createActionItem(
      { store, actor: staff },
      {
        action: field(formData, "action"),
        owner: field(formData, "owner"),
        due: field(formData, "due"),
        meetingId: field(formData, "meetingId"),
        update: field(formData, "update"),
      },
    );
  });
}

export async function setActionStatusAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/action-items");
  const status = field(formData, "status");
  await run(returnTo, status === "Done" ? "Marked done." : "Updated.", async () => {
    const { staff, store } = await requireStaff();
    await updateActionItem({ store, actor: staff }, field(formData, "id"), { status });
  });
}

export async function editActionItemAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/action-items");
  await run(returnTo, "Saved.", async () => {
    const { staff, store } = await requireStaff();
    await updateActionItem({ store, actor: staff }, field(formData, "id"), {
      action: field(formData, "action"),
      due: field(formData, "due"),
      update: field(formData, "update"),
      owner: field(formData, "owner") || undefined,
    });
  });
}

export async function createMeetingAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/meetings");
  await run(returnTo, "Meeting added.", async () => {
    const { staff, store } = await requireStaff();
    await createMeeting(
      { store, actor: staff },
      { date: field(formData, "date"), title: field(formData, "title"), attendees: field(formData, "attendees") },
    );
  });
}

export async function saveMeetingSectionAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/meetings");
  const section = field(formData, "section");
  const value = field(formData, "value");
  await run(returnTo, "Saved.", async () => {
    const { staff, store } = await requireStaff();
    const changes: Record<string, string> = {};
    if (
      ["date", "title", "status", "attendees", "prayer", "wins", "lookahead", "care", "notes"].includes(section)
    ) {
      changes[section] = value;
    } else {
      throw new HubError("That part of the meeting cannot be saved.");
    }
    await updateMeeting({ store, actor: staff }, field(formData, "id"), changes);
  });
}

export async function createMinistryUpdateAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/meetings");
  await run(returnTo, "Update added.", async () => {
    const { staff, store } = await requireStaff();
    await createMinistryUpdate(
      { store, actor: staff },
      {
        meetingId: field(formData, "meetingId"),
        ministry: field(formData, "ministry"),
        update: field(formData, "update"),
        comingUp: field(formData, "comingUp"),
        need: field(formData, "need"),
      },
    );
  });
}

export async function editMinistryUpdateAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/meetings");
  await run(returnTo, "Saved.", async () => {
    const { staff, store } = await requireStaff();
    await updateMinistryUpdate({ store, actor: staff }, field(formData, "id"), {
      update: field(formData, "update"),
      comingUp: field(formData, "comingUp"),
      need: field(formData, "need"),
    });
  });
}

export async function createAnnouncementAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/announcements");
  await run(returnTo, "Announcement posted.", async () => {
    const { staff, store } = await requireStaff();
    await createAnnouncement(
      { store, actor: staff },
      {
        date: field(formData, "date"),
        event: field(formData, "event"),
        kind: field(formData, "kind"),
        announcedWhere: field(formData, "announcedWhere"),
        details: field(formData, "details"),
        link: field(formData, "link"),
        audience: field(formData, "audience"),
      },
    );
  });
}

export async function editAnnouncementAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/announcements");
  await run(returnTo, "Saved.", async () => {
    const { staff, store } = await requireStaff();
    await updateAnnouncement({ store, actor: staff }, field(formData, "id"), {
      date: field(formData, "date"),
      event: field(formData, "event"),
      kind: field(formData, "kind"),
      announcedWhere: field(formData, "announcedWhere"),
      details: field(formData, "details"),
      link: field(formData, "link"),
      audience: field(formData, "audience"),
    });
  });
}

export async function createRequestAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/requests");
  await run(returnTo, "Request sent.", async () => {
    const { staff, store } = await requireStaff();
    await createRequest(
      { store, actor: staff },
      {
        title: field(formData, "title"),
        details: field(formData, "details"),
        neededBy: field(formData, "neededBy"),
        link: field(formData, "link"),
        channels: formData.getAll("channels").map(String),
      },
    );
  });
}

export async function updateRequestAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/requests");
  await run(returnTo, "Saved.", async () => {
    const { staff, store } = await requireStaff();
    const assigned = formData.has("assignedTo") ? field(formData, "assignedTo") : undefined;
    const draft = formData.has("draftLink") ? field(formData, "draftLink") : undefined;
    await updateRequest({ store, actor: staff }, field(formData, "id"), {
      status: field(formData, "status"),
      assignedTo: assigned,
      draftLink: draft,
    });
  });
}

export async function startChecklistAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/checklist");
  await run(returnTo, "Checklist started.", async () => {
    const { staff, store } = await requireStaff();
    await startChecklist({ store, actor: staff }, field(formData, "meetingId"));
  });
}

export async function updateChecklistAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/checklist");
  await run(returnTo, "Saved.", async () => {
    const { staff, store } = await requireStaff();
    await updateChecklist({ store, actor: staff }, field(formData, "id"), {
      ready: field(formData, "ready") === "true",
      notes: field(formData, "notes"),
    });
  });
}

export async function createIssueAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/action-items");
  await run(returnTo, "Issue added.", async () => {
    const { staff, store } = await requireStaff();
    await createIssue(
      { store, actor: staff },
      {
        issue: field(formData, "issue"),
        owner: field(formData, "owner"),
        nextStep: field(formData, "nextStep"),
        due: field(formData, "due"),
      },
    );
  });
}

export async function updateIssueAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/action-items");
  await run(returnTo, "Saved.", async () => {
    const { staff, store } = await requireStaff();
    await updateIssue({ store, actor: staff }, field(formData, "id"), {
      nextStep: field(formData, "nextStep"),
      status: field(formData, "status"),
      owner: formData.has("owner") ? field(formData, "owner") : undefined,
      due: field(formData, "due"),
    });
  });
}

export async function createDocumentAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/documents");
  await run(returnTo, "Document pinned.", async () => {
    const { staff, store } = await requireStaff();
    await createDocument(
      { store, actor: staff },
      { title: field(formData, "title"), group: field(formData, "group"), link: field(formData, "link"), notes: field(formData, "notes") },
    );
  });
}

export async function editDocumentAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/documents");
  await run(returnTo, "Saved.", async () => {
    const { staff, store } = await requireStaff();
    await updateDocument({ store, actor: staff }, field(formData, "id"), {
      title: field(formData, "title"),
      group: field(formData, "group"),
      link: field(formData, "link"),
      notes: field(formData, "notes"),
    });
  });
}

export async function createQuickLinkAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/documents");
  await run(returnTo, "Link added.", async () => {
    const { staff, store } = await requireStaff();
    await createQuickLink(
      { store, actor: staff },
      { name: field(formData, "name"), url: field(formData, "url"), icon: field(formData, "icon"), order: field(formData, "order") },
    );
  });
}

export async function editQuickLinkAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/documents");
  await run(returnTo, "Saved.", async () => {
    const { staff, store } = await requireStaff();
    await updateQuickLink({ store, actor: staff }, field(formData, "id"), {
      name: field(formData, "name"),
      url: field(formData, "url"),
      icon: field(formData, "icon"),
      order: field(formData, "order"),
    });
  });
}

export async function createFolderAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/documents");
  await run(returnTo, "Folder added.", async () => {
    const { staff, store } = await requireStaff();
    await createFolder({ store, actor: staff }, { name: field(formData, "name"), url: field(formData, "url"), order: field(formData, "order") });
  });
}

export async function editFolderAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/documents");
  await run(returnTo, "Saved.", async () => {
    const { staff, store } = await requireStaff();
    await updateFolder({ store, actor: staff }, field(formData, "id"), {
      name: field(formData, "name"),
      url: field(formData, "url"),
      order: field(formData, "order"),
    });
  });
}

"use server";

import { isAdmin } from "@/lib/domain/access";
import { isFrameworkError } from "@/lib/framework";
import { HubError } from "@/lib/hub-error";
import { requireStaff } from "@/lib/session";
import {
  createActionItem,
  createAnnouncement,
  createCareNote,
  deleteActionItem,
  deleteAnnouncement,
  deleteCareNote,
  finishMeeting,
  updateActionItem,
  updateAnnouncement,
  updateCareNote,
  updateMeeting,
} from "@/lib/services/hub";
import type { ActionItem, Announcement, CareNote, Meeting } from "@/lib/data/types";

export type LiveResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function asAdmin<T>(work: (deps: { store: Awaited<ReturnType<typeof requireStaff>>["store"]; actor: Awaited<ReturnType<typeof requireStaff>>["staff"] }) => Promise<T>): Promise<LiveResult<T>> {
  try {
    const { staff, store } = await requireStaff();
    if (!isAdmin(staff)) return { ok: false, error: "Only an admin can run the staff meeting." };
    return { ok: true, data: await work({ store, actor: staff }) };
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    const message = error instanceof HubError ? error.message : "Something went wrong. Please try again.";
    if (!(error instanceof HubError)) console.error(error instanceof Error ? error.message : error);
    return { ok: false, error: message };
  }
}

export async function saveMeetingText(id: string, fields: { prayer?: string; wins?: string; notes?: string }): Promise<LiveResult<boolean>> {
  return asAdmin(async (deps) => {
    await updateMeeting(deps, id, fields);
    return true;
  });
}

export async function addLiveAction(input: {
  meetingId: string;
  action: string;
  owner: string;
  due: string;
  ministry: string;
}): Promise<LiveResult<ActionItem>> {
  return asAdmin((deps) =>
    createActionItem(deps, {
      action: input.action,
      owner: input.owner,
      due: input.due,
      meetingId: input.meetingId,
      update: "",
      ministry: input.ministry,
    }),
  );
}

export async function editLiveAction(
  id: string,
  input: { action: string; owner: string; due: string; ministry: string },
): Promise<LiveResult<boolean>> {
  return asAdmin(async (deps) => {
    await updateActionItem(deps, id, input);
    return true;
  });
}

export async function removeLiveAction(id: string): Promise<LiveResult<boolean>> {
  return asAdmin(async (deps) => {
    await deleteActionItem(deps, id);
    return true;
  });
}

export async function addLiveAnnouncement(input: {
  meetingId: string;
  meetingDate: string;
  event: string;
  details: string;
  date: string;
  ministry: string;
}): Promise<LiveResult<Announcement>> {
  return asAdmin((deps) =>
    createAnnouncement(deps, {
      date: input.date || input.meetingDate,
      event: input.event,
      kind: "Staff meeting",
      announcedWhere: "Staff meeting",
      details: input.details,
      link: "",
      audience: "Staff",
      meetingId: input.meetingId,
      ministry: input.ministry,
    }),
  );
}

export async function editLiveAnnouncement(
  id: string,
  input: { event: string; details: string; date: string; ministry: string },
): Promise<LiveResult<boolean>> {
  return asAdmin(async (deps) => {
    await updateAnnouncement(deps, id, input);
    return true;
  });
}

export async function removeLiveAnnouncement(id: string): Promise<LiveResult<boolean>> {
  return asAdmin(async (deps) => {
    await deleteAnnouncement(deps, id);
    return true;
  });
}

export async function addLiveCareNote(input: {
  meetingId: string;
  person: string;
  action: string;
  custom: string;
  details: string;
  assignee: string;
}): Promise<LiveResult<CareNote>> {
  return asAdmin((deps) => createCareNote(deps, input));
}

export async function editLiveCareNote(
  id: string,
  input: { person: string; action: string; custom: string; details: string; assignee: string; done: boolean },
): Promise<LiveResult<CareNote>> {
  return asAdmin((deps) => updateCareNote(deps, id, input));
}

export async function removeLiveCareNote(id: string): Promise<LiveResult<boolean>> {
  return asAdmin(async (deps) => {
    await deleteCareNote(deps, id);
    return true;
  });
}

export async function finishLiveMeeting(id: string): Promise<LiveResult<Meeting>> {
  return asAdmin((deps) => finishMeeting(deps, id));
}

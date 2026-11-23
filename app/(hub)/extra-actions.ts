"use server";

import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/session";
import { isFrameworkError } from "@/lib/framework";
import { safeReturnTo, withQuery } from "@/lib/domain/links";
import { HubError } from "@/lib/hub-error";
import { acknowledgeStaffPin, createStaffPin, deleteStaffPin, updateStaffPin } from "@/lib/services/pins";
import { ATTENDANCE_AREAS, ATTENDANCE_SERVICES } from "@/lib/domain/attendance";
import { saveAttendanceGrid } from "@/lib/services/hub";
import {
  createGraphicsRequest,
  createTimeAway,
  decideTimeAway,
  setGraphicsOwner,
  setWorkStatus,
  updateGraphicsRequest,
} from "@/lib/services/desk";

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

function fields(formData: FormData, name: string): string[] {
  return formData.getAll(name).map((value) => String(value));
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

export async function createStaffPinAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/");
  await run(returnTo, "Pinned for everyone.", async () => {
    const { staff, store } = await requireStaff();
    await createStaffPin(
      { store, actor: staff },
      {
        title: field(formData, "title"),
        message: field(formData, "message"),
        link: field(formData, "link"),
        priority: field(formData, "priority"),
        showUntil: field(formData, "showUntil"),
      },
    );
  });
}

export async function editStaffPinAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/");
  await run(returnTo, "Saved.", async () => {
    const { staff, store } = await requireStaff();
    await updateStaffPin({ store, actor: staff }, field(formData, "id"), {
      title: field(formData, "title"),
      message: field(formData, "message"),
      link: field(formData, "link"),
      priority: field(formData, "priority"),
      showUntil: field(formData, "showUntil"),
    });
  });
}

export async function deleteStaffPinAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/");
  await run(returnTo, "Removed.", async () => {
    const { staff, store } = await requireStaff();
    await deleteStaffPin({ store, actor: staff }, field(formData, "id"));
  });
}

export async function acknowledgeStaffPinAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/");
  await run(returnTo, "Got it.", async () => {
    const { staff, store } = await requireStaff();
    await acknowledgeStaffPin({ store, actor: staff }, field(formData, "id"));
  });
}

export async function setGraphicsOwnerAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/requests");
  await run(returnTo, "Graphics requests will go to that person.", async () => {
    const { staff, store } = await requireStaff();
    await setGraphicsOwner({ store, actor: staff }, field(formData, "owner"));
  });
}

export async function createGraphicsRequestAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/requests");
  await run(returnTo, "Graphics request sent.", async () => {
    const { staff, store } = await requireStaff();
    await createGraphicsRequest(
      { store, actor: staff },
      {
        ministry: field(formData, "ministry"),
        needed: fields(formData, "needed"),
        platforms: fields(formData, "platforms"),
        event: field(formData, "event"),
        eventDate: field(formData, "eventDate"),
        neededBy: field(formData, "neededBy"),
        description: field(formData, "description"),
        links: field(formData, "links"),
      },
    );
  });
}

export async function updateGraphicsRequestAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/requests");
  await run(returnTo, "Updated.", async () => {
    const { staff, store } = await requireStaff();
    await updateGraphicsRequest({ store, actor: staff }, field(formData, "id"), {
      status: field(formData, "status") || undefined,
      assignedTo: formData.has("assignedTo") ? field(formData, "assignedTo") : undefined,
    });
  });
}

export async function createTimeAwayAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/requests");
  await run(returnTo, "Time away sent for approval.", async () => {
    const { staff, store } = await requireStaff();
    await createTimeAway(
      { store, actor: staff },
      {
        kind: field(formData, "kind"),
        start: field(formData, "start"),
        end: field(formData, "end"),
        halfDay: formData.get("halfDay") === "yes",
        notes: field(formData, "notes"),
        coverage: field(formData, "coverage"),
      },
    );
  });
}

export async function decideTimeAwayAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/requests");
  const status = field(formData, "status");
  await run(returnTo, status === "Approved" ? "Approved." : "Denied.", async () => {
    const { staff, store } = await requireStaff();
    await decideTimeAway({ store, actor: staff }, field(formData, "id"), status);
  });
}

export async function saveAttendanceAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/");
  await run(returnTo, "Attendance saved.", async () => {
    const { staff, store } = await requireStaff();
    const counts = ATTENDANCE_SERVICES.flatMap((service) =>
      ATTENDANCE_AREAS.map((area) => ({ service, area, count: field(formData, `count_${service}_${area}`) })),
    );
    await saveAttendanceGrid({ store, actor: staff }, { date: field(formData, "date"), notes: field(formData, "notes"), counts });
  });
}

export async function setWorkStatusAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/");
  await run(returnTo, "Saved where you're working today.", async () => {
    const { staff, store } = await requireStaff();
    await setWorkStatus({ store, actor: staff }, { place: field(formData, "place"), note: field(formData, "note") });
  });
}

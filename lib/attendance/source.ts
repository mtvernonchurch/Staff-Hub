import { dataMode } from "@/lib/config";
import { getStore } from "@/lib/data";
import type { AttendanceCount, HubStore } from "@/lib/data/types";
import { HubError } from "@/lib/hub-error";

export type AttendanceSourceKind = "mock" | "sheet" | "pco";

/**
 * Previous Sunday's counts. Planning Center Check-Ins can implement this later.
 * Headcounts: GET https://api.planningcenteronline.com/check-ins/v2/headcounts
 * Check-ins: GET https://api.planningcenteronline.com/check-ins/v2/check_ins
 * Event times: GET https://api.planningcenteronline.com/check-ins/v2/event_times
 * Auth is HTTP Basic with PCO_APP_ID and PCO_SECRET. Do not call these yet.
 */
export interface AttendanceSource {
  kind: AttendanceSourceKind;
  listCounts(): Promise<AttendanceCount[]>;
}

export function storeAttendanceSource(store: HubStore, kind: AttendanceSourceKind): AttendanceSource {
  return { kind, listCounts: () => store.listAttendance() };
}

export function pcoAttendanceSource(): AttendanceSource {
  return {
    kind: "pco",
    async listCounts() {
      throw new HubError("Planning Center Check-Ins is not connected yet. Enter counts on the Attendance tab until that API is wired.");
    },
  };
}

export function attendanceSourceKind(): AttendanceSourceKind {
  const requested = process.env.DATA_SOURCE_ATTENDANCE?.trim().toLowerCase();
  if (requested === "pco" || requested === "sheet" || requested === "mock") return requested;
  return dataMode() === "sheets" ? "sheet" : "mock";
}

export async function getAttendanceSource(): Promise<AttendanceSource> {
  const kind = attendanceSourceKind();
  if (kind === "pco") return pcoAttendanceSource();
  if (kind === "sheet" && dataMode() !== "sheets") {
    throw new HubError("DATA_SOURCE_ATTENDANCE=sheet needs DATA_MODE=sheets and the Google service account.");
  }
  return storeAttendanceSource(await getStore(), kind === "sheet" ? "sheet" : dataMode() === "sheets" ? "sheet" : "mock");
}

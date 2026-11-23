import type { AttendanceCount } from "@/lib/data/types";
import { addUtcDays, formatUsDate, parseSheetDate, sameDay } from "@/lib/domain/dates";

export const ATTENDANCE_SERVICES = ["9:00", "10:30"] as const;
export const ATTENDANCE_AREAS = ["Adults/Worship", "MV Kids", "Students", "Volunteers", "First-time guests"] as const;
/** People in the room. Volunteers and first-time guests are counted apart so they are not added twice. */
export const HEADCOUNT_AREAS = ["Adults/Worship", "MV Kids", "Students"] as const;

export function mostRecentSunday(today: Date): Date {
  return addUtcDays(today, -today.getUTCDay());
}

export function previousSunday(sunday: Date): Date {
  return addUtcDays(sunday, -7);
}

function onDate(rows: AttendanceCount[], sunday: Date): AttendanceCount[] {
  const label = formatUsDate(sunday);
  return rows.filter((row) => sameDay(row.date, label));
}

export function headcount(rows: AttendanceCount[]): number {
  return rows
    .filter((row) => (HEADCOUNT_AREAS as readonly string[]).includes(row.area))
    .reduce((sum, row) => sum + row.count, 0);
}

export function serviceTotal(rows: AttendanceCount[], service: string): number {
  return headcount(rows.filter((row) => row.service === service));
}

export function areaTotal(rows: AttendanceCount[], area: string): number {
  return rows.filter((row) => row.area === area).reduce((sum, row) => sum + row.count, 0);
}

export type AttendanceSnapshot = {
  sunday: Date;
  rows: AttendanceCount[];
  total: number;
  services: { service: string; total: number }[];
  areas: { area: string; total: number }[];
  versusPrior: number | null;
  versusAverage: number | null;
  average: number | null;
  trend: number[];
  notes: string;
};

export function attendanceSnapshot(rows: AttendanceCount[], today: Date): AttendanceSnapshot {
  const sunday = mostRecentSunday(today);
  const current = onDate(rows, sunday);
  const priorRows = onDate(rows, previousSunday(sunday));
  const priorTotal = headcount(priorRows);
  const total = headcount(current);
  const earlier = [1, 2, 3, 4].map((weeks) => headcount(onDate(rows, addUtcDays(sunday, -7 * weeks))));
  const present = earlier.filter((_, index) => onDate(rows, addUtcDays(sunday, -7 * (index + 1))).length > 0);
  const average = present.length ? Math.round(present.reduce((sum, value) => sum + value, 0) / present.length) : null;
  const trend = [7, 6, 5, 4, 3, 2, 1, 0].map((weeks) => headcount(onDate(rows, addUtcDays(sunday, -7 * weeks))));
  const notes = current.find((row) => row.notes.trim())?.notes ?? "";
  return {
    sunday,
    rows: current,
    total,
    services: ATTENDANCE_SERVICES.map((service) => ({ service, total: serviceTotal(current, service) })),
    areas: ATTENDANCE_AREAS.map((area) => ({ area, total: areaTotal(current, area) })),
    versusPrior: priorRows.length ? total - priorTotal : null,
    versusAverage: average === null ? null : total - average,
    average,
    trend,
    notes,
  };
}

export function sundayLabel(date: Date): string {
  const parsed = parseSheetDate(formatUsDate(date));
  return parsed ? formatUsDate(parsed) : formatUsDate(date);
}

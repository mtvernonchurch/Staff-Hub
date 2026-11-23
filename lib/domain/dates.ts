import { HubError } from "@/lib/hub-error";

const SHEET_EPOCH = Date.UTC(1899, 11, 30);
const DAY_MS = 86_400_000;

export function chicagoParts(now: Date): { year: number; month: number; day: number; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: read("year"), month: read("month"), day: read("day"), hour: read("hour") };
}

/** Calendar date in Columbus, stored as UTC midnight so comparisons ignore clock time. */
export function chicagoToday(now = new Date()): Date {
  const { year, month, day } = chicagoParts(now);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function upcomingMonday(today: Date): Date {
  const day = today.getUTCDay();
  const delta = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  return addUtcDays(today, delta);
}

export function weekStartMonday(today: Date): Date {
  const day = today.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  return addUtcDays(today, delta);
}

export function workWeek(today: Date): Date[] {
  const day = today.getUTCDay();
  const start = day === 0 || day === 6 ? upcomingMonday(today) : weekStartMonday(today);
  return [0, 1, 2, 3, 4].map((offset) => addUtcDays(start, offset));
}

export function parseSheetDate(value: string | null | undefined): Date | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;

  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (us) return utcDate(Number(us[3]), Number(us[1]), Number(us[2]));

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) return utcDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const serial = Math.floor(Number(trimmed));
    if (serial > 20000 && serial < 80000) {
      const date = new Date(SHEET_EPOCH + serial * DAY_MS);
      return utcDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
    }
  }

  return null;
}

function utcDate(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
}

export function formatUsDate(date: Date): string {
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`;
}

export function toSheetDate(value: string): string {
  const parsed = parseSheetDate(value);
  if (!parsed) throw new HubError("Use a real date.");
  return formatUsDate(parsed);
}

export function toInputDate(value: string): string {
  const parsed = parseSheetDate(value);
  if (!parsed) return "";
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${parsed.getUTCFullYear()}-${month}-${day}`;
}

export function sameDay(a: string, b: string): boolean {
  const left = parseSheetDate(a);
  const right = parseSheetDate(b);
  return Boolean(left && right && left.getTime() === right.getTime());
}

export function formatFriendly(value: string): string {
  const parsed = parseSheetDate(value);
  if (!parsed) return value.trim();
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

export function formatLong(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function greeting(now = new Date()): string {
  const { hour } = chicagoParts(now);
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function isClosedStatus(status: string): boolean {
  return /^(done|complete|completed|cancelled|canceled)$/i.test(status.trim());
}

export function isOverdue(due: string, status: string, today: Date): boolean {
  if (isClosedStatus(status)) return false;
  const parsed = parseSheetDate(due);
  if (!parsed) return false;
  return parsed.getTime() < today.getTime();
}

/** Open items due today through the next week, after overdue items. */
export function isDueSoon(due: string, status: string, today: Date, withinDays = 7): boolean {
  if (isClosedStatus(status) || isOverdue(due, status, today)) return false;
  const parsed = parseSheetDate(due);
  if (!parsed) return false;
  return parsed.getTime() <= addUtcDays(today, withinDays).getTime();
}

export function canonicalActionStatus(status: string): "Open" | "In progress" | "Done" | null {
  const value = status.trim().toLowerCase();
  if (value === "open") return "Open";
  if (value === "in progress" || value === "in-progress" || value === "doing") return "In progress";
  if (value === "done" || value === "complete" || value === "completed") return "Done";
  return null;
}

export type Dated = { date: string; status?: string };

export function sortMeetings<T extends Dated>(meetings: T[], today: Date): T[] {
  const upcoming: T[] = [];
  const past: T[] = [];
  for (const meeting of meetings) {
    const parsed = parseSheetDate(meeting.date);
    if (parsed && parsed.getTime() < today.getTime()) past.push(meeting);
    else upcoming.push(meeting);
  }
  const byDate = (direction: 1 | -1) => (a: T, b: T) => {
    const left = parseSheetDate(a.date)?.getTime() ?? 0;
    const right = parseSheetDate(b.date)?.getTime() ?? 0;
    return (left - right) * direction;
  };
  return [...upcoming.sort(byDate(1)), ...past.sort(byDate(-1))];
}

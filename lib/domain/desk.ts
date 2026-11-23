import type { GraphicsRequest, TimeAway, WorkStatus } from "@/lib/data/types";
import { addUtcDays, parseSheetDate, sameDay } from "@/lib/domain/dates";
import { namesMatch } from "@/lib/domain/people";

/** The Hub Settings row that names who new graphics requests are assigned to. */
export const GRAPHICS_OWNER_SETTING = "Graphics Owner";

export const GRAPHICS_NEEDS = ["Graphic", "Social post", "Video/reel", "Slide", "Print"] as const;
export const GRAPHICS_PLATFORMS = ["Facebook", "Instagram", "TikTok", "YouTube", "Website", "Slides", "Print"] as const;
export const GRAPHICS_STATUSES = ["New", "In progress", "Ready for review", "Done"] as const;

export const AWAY_KINDS = ["PTO/vacation", "Sick", "Personal", "Conference/training", "Other"] as const;
export const AWAY_STATUSES = ["Pending", "Approved", "Denied"] as const;

export const WORK_PLACES = ["In office", "Working from home", "Out", "Off-site/visiting"] as const;

/** Labels on the home pills. Stored values stay the same so older sheet rows still match. */
export const WORK_PILLS: { value: (typeof WORK_PLACES)[number]; label: string }[] = [
  { value: "In office", label: "In office" },
  { value: "Working from home", label: "Working from home" },
  { value: "Off-site/visiting", label: "Visiting" },
  { value: "Out", label: "Out today" },
];

export function workPlaceLabel(value: string): string {
  return WORK_PILLS.find((pill) => pill.value === value)?.label ?? value;
}

export function isShortNotice(neededBy: string, today: Date): boolean {
  const due = parseSheetDate(neededBy);
  if (!due) return false;
  return due.getTime() < addUtcDays(today, 7).getTime();
}

export function splitList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function graphicsOpen(rows: GraphicsRequest[]): GraphicsRequest[] {
  return rows.filter((row) => row.status !== "Done");
}

export function graphicsForPerson(rows: GraphicsRequest[], name: string): GraphicsRequest[] {
  return graphicsOpen(rows).filter((row) => namesMatch(row.requestedBy, name) || namesMatch(row.assignedTo, name));
}

export function awayCovers(row: Pick<TimeAway, "start" | "end">, today: Date): boolean {
  const start = parseSheetDate(row.start);
  const end = parseSheetDate(row.end) ?? start;
  if (!start || !end) return false;
  return start.getTime() <= today.getTime() && end.getTime() >= today.getTime();
}

export function whosOut(rows: TimeAway[], today: Date): TimeAway[] {
  return rows.filter((row) => row.status === "Approved" && awayCovers(row, today));
}

export function timeAwayForPerson(rows: TimeAway[], name: string, today: Date): TimeAway[] {
  return rows.filter((row) => {
    if (!namesMatch(row.requestedBy, name) || row.status === "Denied") return false;
    if (row.status === "Pending") return true;
    const end = parseSheetDate(row.end) ?? parseSheetDate(row.start);
    return Boolean(end && end.getTime() >= today.getTime());
  });
}

export function pendingTimeAway(rows: TimeAway[]): TimeAway[] {
  return rows.filter((row) => row.status === "Pending");
}

export function workForDay(rows: WorkStatus[], todayLabel: string): WorkStatus[] {
  return rows.filter((row) => sameDay(row.date, todayLabel));
}

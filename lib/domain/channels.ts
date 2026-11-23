import type { Announcement } from "@/lib/data/types";
import { parseSheetDate } from "@/lib/domain/dates";

/** Where a meeting announcement goes out. Blank rows stay Unsorted so old sheet rows are not treated as stage announcements. */
export const ANNOUNCE_CHANNELS = ["Platform", "The Weekly", "Social"] as const;
export type AnnounceChannel = (typeof ANNOUNCE_CHANNELS)[number];

/** Sheet values from before the rename still map onto the current labels. */
const LABELS: Record<string, AnnounceChannel> = {
  platform: "Platform",
  stage: "Platform",
  sunday: "Platform",
  email: "The Weekly",
  "the weekly": "The Weekly",
  weekly: "The Weekly",
  social: "Social",
  socials: "Social",
};

export function parseChannels(value: string): AnnounceChannel[] {
  const found = new Set<AnnounceChannel>();
  for (const part of value.split(/[,|/]/)) {
    const channel = LABELS[part.trim().toLowerCase()];
    if (channel) found.add(channel);
  }
  return ANNOUNCE_CHANNELS.filter((channel) => found.has(channel));
}

export function formatChannels(values: string[]): string {
  return parseChannels(values.join(", ")).join(", ");
}

export type ChannelGroup = { channel: AnnounceChannel | "Unsorted"; rows: Announcement[] };

export function groupAnnouncements(rows: Announcement[], includeEmpty = false): ChannelGroup[] {
  const groups: ChannelGroup[] = ANNOUNCE_CHANNELS.map((channel) => ({
    channel,
    rows: rows.filter((row) => parseChannels(row.channels).includes(channel)),
  }));
  const unsorted = rows.filter((row) => parseChannels(row.channels).length === 0);
  if (includeEmpty || unsorted.length > 0) groups.push({ channel: "Unsorted", rows: unsorted });
  return includeEmpty ? groups : groups.filter((group) => group.rows.length > 0 || group.channel !== "Unsorted");
}

/** Soonest dated item, preferring one that is still ahead. */
export function nextAnnouncement(rows: Announcement[], today: Date): Announcement | null {
  const dated = rows.flatMap((row) => {
    const time = parseSheetDate(row.date)?.getTime();
    return time === undefined ? [] : [{ row, time }];
  });
  const upcoming = dated.filter((item) => item.time >= today.getTime()).sort((a, b) => a.time - b.time);
  if (upcoming[0]) return upcoming[0].row;
  const any = [...dated].sort((a, b) => a.time - b.time);
  return any[0]?.row ?? rows[0] ?? null;
}

export function channelBlurb(rows: Announcement[], today: Date): string {
  if (rows.length === 0) return "Nothing this week";
  const next = nextAnnouncement(rows, today);
  const day = next ? parseSheetDate(next.date) : null;
  const when = day
    ? new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(day)
    : "";
  const noun = rows.length === 1 ? "item" : "items";
  return `${rows.length} ${noun} this week${next ? ` · next: ${next.event}${when ? ` (${when})` : ""}` : ""}`;
}

export function announcementRecap(rows: Announcement[]): string {
  const groups = groupAnnouncements(rows).filter((group) => group.rows.length > 0);
  if (groups.length === 0) return "";
  return `Announcements:\n${groups
    .map((group) => `${group.channel} (${group.rows.length}):\n${group.rows.map((row) => `- ${row.event}`).join("\n")}`)
    .join("\n")}`;
}

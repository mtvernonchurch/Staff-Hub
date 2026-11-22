import type { Announcement } from "@/lib/data/types";

/** Where a meeting announcement goes out. Blank rows stay Unsorted so old sheet rows are not treated as stage announcements. */
export const ANNOUNCE_CHANNELS = ["Email", "Socials", "Platform"] as const;
export type AnnounceChannel = (typeof ANNOUNCE_CHANNELS)[number];

const LABELS: Record<string, AnnounceChannel> = {
  email: "Email",
  social: "Socials",
  socials: "Socials",
  platform: "Platform",
  stage: "Platform",
  sunday: "Platform",
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

export function announcementRecap(rows: Announcement[]): string {
  const groups = groupAnnouncements(rows).filter((group) => group.rows.length > 0);
  if (groups.length === 0) return "";
  return `Announcements:\n${groups
    .map((group) => `${group.channel} (${group.rows.length}):\n${group.rows.map((row) => `- ${row.event}`).join("\n")}`)
    .join("\n")}`;
}

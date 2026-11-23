"use client";

import { useState } from "react";
import { Mail, Monitor, Share2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Announcement } from "@/lib/data/types";
import { channelBlurb, groupAnnouncements, parseChannels, type AnnounceChannel } from "@/lib/domain/channels";
import { formatFriendly, parseSheetDate } from "@/lib/domain/dates";

const ICONS: Record<AnnounceChannel, LucideIcon> = {
  Platform: Monitor,
  "The Weekly": Mail,
  Social: Share2,
};

export function HomeAnnouncements({ rows, todayLabel }: { rows: Announcement[]; todayLabel: string }) {
  const today = parseSheetDate(todayLabel) ?? new Date();
  const groups = groupAnnouncements(rows, true).filter((group) => group.channel !== "Unsorted");
  return (
    <div className="stack">
      {groups.map((group) => {
        const channel = group.channel as AnnounceChannel;
        const Icon = ICONS[channel];
        return (
          <section key={channel}>
            <h3 className="with-icon">
              <Icon aria-hidden size={16} strokeWidth={2} />
              <span>{channel}</span>
            </h3>
            <p className="hint">{channelBlurb(group.rows, today)}</p>
            <ChannelItems rows={group.rows} />
          </section>
        );
      })}
    </div>
  );
}

function ChannelItems({ rows }: { rows: Announcement[] }) {
  const [open, setOpen] = useState(false);
  if (rows.length === 0) return null;
  const shown = open ? rows : rows.slice(0, 3);
  return (
    <>
      {shown.map((row) => (
        <article key={row.id} className="announce-row">
          <h3>{row.event}</h3>
          <p className="meta">
            {row.date ? <span>{formatFriendly(row.date)}</span> : null}
            {parseChannels(row.channels).length > 1 ? <span>{parseChannels(row.channels).join(" · ")}</span> : null}
          </p>
          {row.details ? <p>{row.details}</p> : null}
        </article>
      ))}
      {rows.length > 3 ? (
        <button className="btn btn-small" type="button" onClick={() => setOpen((value) => !value)}>
          {open ? "Show less" : `Show more (${rows.length - 3})`}
        </button>
      ) : null}
    </>
  );
}

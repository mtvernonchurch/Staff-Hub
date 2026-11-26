"use client";

import { useState } from "react";
import { Mail, Monitor, Share2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Announcement } from "@/lib/data/types";
import { parseChannels, type AnnounceChannel } from "@/lib/domain/channels";
import { formatFriendly, parseSheetDate } from "@/lib/domain/dates";

const ICONS: Record<AnnounceChannel, LucideIcon> = {
  Platform: Monitor,
  "The Weekly": Mail,
  Social: Share2,
};

const SHOWN = 4;

/** Each announcement once, soonest first, with the channels it runs on. */
export function HomeAnnouncements({ rows }: { rows: Announcement[] }) {
  const [open, setOpen] = useState(false);
  const sorted = [...rows].sort((a, b) => (parseSheetDate(a.date)?.getTime() ?? 0) - (parseSheetDate(b.date)?.getTime() ?? 0));
  if (sorted.length === 0) return <p className="empty">No announcements for this week yet.</p>;
  const shown = open ? sorted : sorted.slice(0, SHOWN);
  return (
    <div className="stack">
      {shown.map((row) => (
        <article key={row.id} className="announce-row">
          <h3>{row.event}</h3>
          <p className="meta">
            {row.date ? <span>{formatFriendly(row.date)}</span> : null}
            {parseChannels(row.channels).map((channel) => {
              const Icon = ICONS[channel];
              return (
                <span key={channel} className="chip channel-chip">
                  <Icon aria-hidden size={13} strokeWidth={2} />
                  {channel}
                </span>
              );
            })}
          </p>
          {row.details ? <p>{row.details}</p> : null}
        </article>
      ))}
      {sorted.length > SHOWN ? (
        <button className="btn btn-small" type="button" onClick={() => setOpen((value) => !value)}>
          {open ? "Show less" : `Show ${sorted.length - SHOWN} more`}
        </button>
      ) : null}
    </div>
  );
}

import type { Announcement } from "@/lib/data/types";
import { groupAnnouncements, parseChannels } from "@/lib/domain/channels";
import { formatFriendly } from "@/lib/domain/dates";

export function AnnouncementGroups({ rows }: { rows: Announcement[] }) {
  const groups = groupAnnouncements(rows, true).filter((group) => group.channel !== "Unsorted" || group.rows.length > 0);
  if (rows.length === 0) return <p className="empty">None from this meeting.</p>;
  return (
    <div className="stack">
      {groups.map((group) => (
        <section key={group.channel}>
          <h3>{group.channel} · {group.rows.length}</h3>
          {group.rows.length === 0 ? <p className="empty">Nothing for {group.channel.toLowerCase()} yet.</p> : group.rows.map((row) => (
            <article key={`${group.channel}-${row.id}`} className="item">
              <div>
                <h3>{row.event}</h3>
                <p className="meta">
                  {row.date ? <span>{formatFriendly(row.date)}</span> : null}
                  {row.ministry ? <span>{row.ministry}</span> : null}
                  {row.owner ? <span>{row.owner}</span> : null}
                  {parseChannels(row.channels).length > 1 ? <span>{parseChannels(row.channels).join(" · ")}</span> : null}
                </p>
                {row.details ? <p className="note">{row.details}</p> : null}
              </div>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}

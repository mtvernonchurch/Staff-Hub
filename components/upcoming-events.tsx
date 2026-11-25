import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Heading } from "@/components/heading";
import { chicagoTime, groupEventsByDay } from "@/lib/pco/map";
import type { UpcomingEvent } from "@/lib/pco/types";
import { formatFriendly } from "@/lib/domain/dates";

const SOURCE_LABEL = { event: "Event", room: "Room", group: "Group" } as const;

export function UpcomingEventsCard({
  events,
  sample,
  moreHref,
  heading = "The week ahead",
  hint,
}: {
  events: UpcomingEvent[];
  sample: boolean;
  moreHref?: string;
  heading?: string;
  hint?: string;
}) {
  const groups = groupEventsByDay(events.filter((event) => event.source !== "group"));
  const note = hint ?? (sample
    ? "The next 7 days. Sample events and room reservations, not the live church calendar."
    : "The next 7 days. Events and room reservations.");
  return (
    <section className="card">
      <div className="card-head">
        <Heading icon={CalendarDays}>{heading}</Heading>
        {sample ? <span className="sample-chip">Sample</span> : null}
      </div>
      <p className="hint">{note}</p>
      {groups.length === 0 ? <p className="empty">Nothing in this window.</p> : groups.map((group) => (
        <section key={group.day}>
          <h3>{formatFriendly(group.day)}</h3>
          {group.events.map((event) => (
            <article key={event.id} className="item">
              <div>
                <h3>{event.name}</h3>
                <p className="meta">
                  <span>{event.allDay ? "All day" : chicagoTime(event.startsAt)}</span>
                  {event.location ? <span>{event.location}</span> : null}
                  <span className={`chip source-${event.source}`}>{SOURCE_LABEL[event.source]}</span>
                </p>
              </div>
            </article>
          ))}
        </section>
      ))}
      {moreHref ? <p className="hint"><Link href={moreHref}>Next 30 days</Link></p> : null}
    </section>
  );
}

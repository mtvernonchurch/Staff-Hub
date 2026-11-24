import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Heading } from "@/components/heading";
import { chicagoTime, groupEventsByDay } from "@/lib/pco/map";
import type { UpcomingEvent } from "@/lib/pco/types";
import { formatFriendly } from "@/lib/domain/dates";

export function UpcomingEventsCard({
  events,
  sample,
  moreHref,
}: {
  events: UpcomingEvent[];
  sample: boolean;
  moreHref?: string;
}) {
  const groups = groupEventsByDay(events);
  return (
    <section className="card">
      <div className="card-head">
        <Heading icon={CalendarDays}>Upcoming events</Heading>
        {sample ? <span className="sample-chip">Sample</span> : null}
      </div>
      <p className="hint">{sample ? "Sample events, not the live church calendar." : "Approved events from Planning Center."}</p>
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

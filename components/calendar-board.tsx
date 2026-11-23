import type { CalendarEvent } from "@/lib/data/types";
import { formatFriendly, parseSheetDate } from "@/lib/domain/dates";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeekEvents({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) return <p className="empty">Nothing on the calendar this week.</p>;
  return (
    <div className="stack">
      {events.map((event) => (
        <article key={event.id} className="item">
          <div>
            <h3>{event.event}</h3>
            <p className="meta">
              <span>{formatFriendly(event.date)}{event.time ? ` · ${event.time}` : ""}</span>
              {event.location ? <span>{event.location}</span> : null}
              {event.ministry ? <span>{event.ministry}</span> : null}
              {event.owner ? <span>{event.owner}</span> : null}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

export function MonthBoard({ events, todayLabel }: { events: CalendarEvent[]; todayLabel: string }) {
  const today = parseSheetDate(todayLabel) ?? new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = Math.ceil((lead + days) / 7) * 7;
  const byDay = new Map<number, CalendarEvent[]>();
  for (const event of events) {
    const date = parseSheetDate(event.date);
    if (!date || date.getUTCFullYear() !== year || date.getUTCMonth() !== month) continue;
    const list = byDay.get(date.getUTCDate()) ?? [];
    list.push(event);
    byDay.set(date.getUTCDate(), list);
  }
  const label = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" }).format(first);

  return (
    <div>
      <p className="hint">{label}</p>
      <div className="month-grid" role="grid" aria-label={label}>
        {WEEKDAYS.map((day) => (
          <div key={day} className="month-dow" role="columnheader">{day}</div>
        ))}
        {Array.from({ length: cells }, (_, index) => {
          const day = index - lead + 1;
          if (day < 1 || day > days) return <div key={index} className="month-day is-out" aria-hidden />;
          const date = new Date(Date.UTC(year, month, day));
          const isToday = date.getTime() === today.getTime();
          const rows = byDay.get(day) ?? [];
          return (
            <div key={index} className={isToday ? "month-day is-today" : "month-day"} role="gridcell" aria-current={isToday ? "date" : undefined}>
              <strong>{day}</strong>
              {rows.map((event) => (
                <span key={event.id} className="month-event" title={event.event}>{event.event}</span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

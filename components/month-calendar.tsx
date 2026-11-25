"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { DayItem } from "@/lib/calendar/items";
import { itemsOnDay } from "@/lib/calendar/items";
import { formatFriendly, formatUsDate, parseSheetDate } from "@/lib/domain/dates";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthCalendar({ items, todayLabel }: { items: DayItem[]; todayLabel: string }) {
  const today = parseSheetDate(todayLabel) ?? new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = Math.ceil((lead + days) / 7) * 7;
  const label = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" }).format(first);
  const [selected, setSelected] = useState<number | null>(null);
  const titleId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const byDay = new Map<number, DayItem[]>();
  for (let day = 1; day <= days; day += 1) {
    const key = formatUsDate(new Date(Date.UTC(year, month, day)));
    byDay.set(day, itemsOnDay(items, key));
  }
  const selectedKey = selected == null ? "" : formatUsDate(new Date(Date.UTC(year, month, selected)));
  const selectedItems = selected == null ? [] : byDay.get(selected) ?? [];

  useEffect(() => {
    if (selected == null) return;
    headingRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <div className="month-layout">
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
            const friendly = formatFriendly(formatUsDate(date));
            const names = rows.slice(0, 2).map((row) => row.name).join(", ");
            const summary = rows.length === 0 ? "Nothing scheduled" : `${rows.length} scheduled${names ? `: ${names}` : ""}`;
            return (
              <button
                key={index}
                type="button"
                className={["month-day", isToday ? "is-today" : "", selected === day ? "is-selected" : ""].filter(Boolean).join(" ")}
                role="gridcell"
                aria-current={isToday ? "date" : undefined}
                aria-selected={selected === day}
                aria-label={`${friendly}. ${summary}`}
                onClick={() => setSelected(day)}
              >
                <strong>{day}</strong>
                {rows.slice(0, 2).map((row) => (
                  <span key={row.id} className={`month-event source-${row.source.toLowerCase()}`}>{row.name}</span>
                ))}
                {rows.length > 2 ? <span className="month-more">+{rows.length - 2}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
      {selected != null ? <button type="button" className="day-backdrop" aria-label="Close day" onClick={() => setSelected(null)} /> : null}
      <section
        className={selected == null ? "day-panel" : "day-panel is-open"}
        role="region"
        aria-labelledby={titleId}
      >
        <div className="card-head">
          <h3 id={titleId} tabIndex={-1} ref={headingRef}>{selected == null ? "Choose a day" : formatFriendly(selectedKey)}</h3>
          {selected != null ? <button type="button" className="btn btn-small" onClick={() => setSelected(null)}>Close</button> : null}
        </div>
        {selected == null ? <p className="empty">Tap a day to see everything happening, with the time, room, and where it came from.</p> : selectedItems.length === 0 ? <p className="empty">Nothing scheduled.</p> : (
          <div className="stack">
            {selectedItems.map((item) => (
              <article key={item.id} className="item">
                <div>
                  <h3>{item.name}</h3>
                  <p className="meta">
                    <span>{item.time}</span>
                    {item.location ? <span>{item.location}</span> : null}
                    <span className={`chip source-${item.source.toLowerCase()}`}>{item.source}</span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

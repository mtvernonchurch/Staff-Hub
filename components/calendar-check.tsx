"use client";

import { useState } from "react";
import { addLiveEvent, editLiveEvent, saveLiveCheck } from "@/app/(hub)/meeting/live-actions";
import type { CalendarCheck, CalendarEvent, Ministry, StaffMember } from "@/lib/data/types";
import { checkFor, eventsInWeek, fourChurchWeeks, needsGraphics, needsPromotion } from "@/lib/domain/calendar";
import { formatFriendly, formatUsDate, parseSheetDate, toInputDate } from "@/lib/domain/dates";

export function CalendarCheckBoard({
  events,
  checks,
  todayLabel,
  editable,
  staff,
  ministries,
  onMessage,
}: {
  events: CalendarEvent[];
  checks: CalendarCheck[];
  todayLabel: string;
  editable: boolean;
  staff: StaffMember[];
  ministries: Ministry[];
  onMessage?: (label: string, error?: string) => void;
}) {
  const today = parseSheetDate(todayLabel) ?? new Date();
  const weeks = fourChurchWeeks(today);
  const [rows, setRows] = useState(events);
  const [marks, setMarks] = useState(checks);
  const people = staff.filter((person) => person.active);

  async function remember(label: string, error?: string) {
    onMessage?.(label, error);
  }

  return (
    <div className="stack">
      <p className="hint">The next four weeks, starting this Sunday. Promotion is email, socials, and what is said from the platform.</p>
      {editable ? (
        <form
          className="live-grid calendar"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const result = await addLiveEvent({
              date: String(form.get("date") ?? ""),
              time: String(form.get("time") ?? ""),
              event: String(form.get("event") ?? ""),
              ministry: String(form.get("ministry") ?? ""),
              location: String(form.get("location") ?? ""),
              owner: String(form.get("owner") ?? ""),
            });
            if (!result.ok) return remember("", result.error);
            setRows((current) => [...current, result.data]);
            event.currentTarget.reset();
            remember("Event added.");
          }}
        >
          <input name="event" required placeholder="Event" aria-label="Event name" />
          <input name="date" type="date" required aria-label="Event date" />
          <input name="time" placeholder="6:00 PM" aria-label="Event time" />
          <input name="location" placeholder="Where" aria-label="Location" />
          <select name="ministry" aria-label="Ministry" defaultValue="">
            <option value="">Ministry</option>
            {ministries.map((row) => <option key={row.ministry} value={row.ministry}>{row.ministry}</option>)}
          </select>
          <select name="owner" aria-label="Owner" defaultValue="">
            <option value="">Owner</option>
            {people.map((person) => <option key={person.email} value={person.name}>{person.name}</option>)}
          </select>
          <button className="btn btn-primary" type="submit">Add event</button>
        </form>
      ) : null}
      {weeks.map((week) => {
        const inWeek = eventsInWeek(rows, week);
        return (
          <section key={formatUsDate(week.start)}>
            <h3>{formatFriendly(formatUsDate(week.start))} – {formatFriendly(formatUsDate(week.end))}</h3>
            {inWeek.length === 0 ? <p className="empty">Nothing on the calendar this week.</p> : inWeek.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                check={checkFor(marks, event.id)}
                editable={editable}
                people={people}
                ministries={ministries}
                onEvent={(next) => setRows((current) => current.map((row) => (row.id === next.id ? next : row)))}
                onCheck={(next) => setMarks((current) => {
                  const rest = current.filter((row) => row.eventId !== next.eventId);
                  return [...rest, next];
                })}
                onError={(error) => remember("", error)}
                onSaved={(label) => remember(label)}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
}

function EventRow({
  event,
  check,
  editable,
  people,
  ministries,
  onEvent,
  onCheck,
  onError,
  onSaved,
}: {
  event: CalendarEvent;
  check: CalendarCheck | undefined;
  editable: boolean;
  people: StaffMember[];
  ministries: Ministry[];
  onEvent: (event: CalendarEvent) => void;
  onCheck: (check: CalendarCheck) => void;
  onError: (error: string) => void;
  onSaved: (label: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const promotion = needsPromotion(check);
  const graphics = needsGraphics(check);

  async function toggle(patch: Partial<Omit<CalendarCheck, "id" | "eventId">>) {
    const result = await saveLiveCheck(event.id, patch);
    if (!result.ok) return onError(result.error);
    onCheck(result.data);
    onSaved("Saved.");
  }

  return (
    <article className="item">
      <div>
        <h3>{event.event}</h3>
        <p className="meta">
          <span>{formatFriendly(event.date)}{event.time ? ` · ${event.time}` : ""}</span>
          {event.location ? <span>{event.location}</span> : null}
          {event.ministry ? <span>{event.ministry}</span> : null}
          {event.owner ? <span>{event.owner}</span> : null}
          {promotion ? <span className="chip chip-overdue">No promotion yet</span> : null}
          {graphics ? <span className="chip chip-overdue">No graphics request</span> : null}
        </p>
        {editable ? (
          <div className="checks">
            <Check label="Email" checked={Boolean(check?.promotedEmail)} onChange={(value) => toggle({ promotedEmail: value })} />
            <Check label="Socials" checked={Boolean(check?.promotedSocials)} onChange={(value) => toggle({ promotedSocials: value })} />
            <Check label="Platform" checked={Boolean(check?.promotedPlatform)} onChange={(value) => toggle({ promotedPlatform: value })} />
            <Check label="Volunteers set" checked={Boolean(check?.volunteersSet)} onChange={(value) => toggle({ volunteersSet: value })} />
            <Check label="Graphics requested" checked={Boolean(check?.graphicsRequested)} onChange={(value) => toggle({ graphicsRequested: value })} />
          </div>
        ) : (
          <p className="note">
            {[
              check?.promotedEmail ? "Email" : "",
              check?.promotedSocials ? "Socials" : "",
              check?.promotedPlatform ? "Platform" : "",
              check?.volunteersSet ? "Volunteers set" : "",
              check?.graphicsRequested ? "Graphics requested" : "",
            ].filter(Boolean).join(" · ") || "Nothing checked yet."}
          </p>
        )}
        {editable ? (
          <label className="field">Notes
            <input
              defaultValue={check?.notes ?? ""}
              aria-label={`Notes for ${event.event}`}
              onBlur={async (blur) => {
                if ((check?.notes ?? "") === blur.currentTarget.value) return;
                const result = await saveLiveCheck(event.id, { notes: blur.currentTarget.value });
                if (!result.ok) return onError(result.error);
                onCheck(result.data);
                onSaved("Notes saved.");
              }}
            />
          </label>
        ) : check?.notes ? <p className="note">{check.notes}</p> : null}
      </div>
      {editable ? (
        <div className="button-row">
          <button className="btn btn-small" type="button" onClick={() => setEditing((value) => !value)}>{editing ? "Close" : "Edit"}</button>
        </div>
      ) : null}
      {editing ? (
        <form
          className="live-grid calendar"
          onSubmit={async (submit) => {
            submit.preventDefault();
            const form = new FormData(submit.currentTarget);
            const result = await editLiveEvent(event.id, {
              event: String(form.get("event") ?? ""),
              date: String(form.get("date") ?? ""),
              time: String(form.get("time") ?? ""),
              location: String(form.get("location") ?? ""),
              ministry: String(form.get("ministry") ?? ""),
              owner: String(form.get("owner") ?? ""),
            });
            if (!result.ok) return onError(result.error);
            onEvent(result.data);
            setEditing(false);
            onSaved("Event updated.");
          }}
        >
          <input name="event" required defaultValue={event.event} aria-label="Event name" />
          <input name="date" type="date" required defaultValue={toInputDate(event.date)} aria-label="Event date" />
          <input name="time" defaultValue={event.time} aria-label="Event time" />
          <input name="location" defaultValue={event.location} aria-label="Location" />
          <select name="ministry" defaultValue={event.ministry} aria-label="Ministry">
            <option value="">Ministry</option>
            {ministries.map((row) => <option key={row.ministry} value={row.ministry}>{row.ministry}</option>)}
          </select>
          <select name="owner" defaultValue={event.owner} aria-label="Owner">
            <option value="">Owner</option>
            {people.map((person) => <option key={person.email} value={person.name}>{person.name}</option>)}
          </select>
          <button className="btn btn-primary" type="submit">Save event</button>
        </form>
      ) : null}
    </article>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

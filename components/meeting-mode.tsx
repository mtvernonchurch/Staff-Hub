"use client";

import { useRef, useState } from "react";
import { CalendarDays, ClipboardList, Heart, Megaphone, SquareCheck } from "lucide-react";
import { Heading } from "@/components/heading";
import {
  addLiveAction,
  addLiveAnnouncement,
  addLiveCareNote,
  editLiveAction,
  editLiveAnnouncement,
  editLiveCareNote,
  finishLiveMeeting,
  removeLiveAction,
  removeLiveAnnouncement,
  removeLiveCareNote,
  saveMeetingText,
} from "@/app/(hub)/meeting/live-actions";
import { CalendarCheckBoard } from "@/components/calendar-check";
import type { ActionItem, Announcement, CalendarCheck, CalendarEvent, CareNote, Meeting, Ministry, StaffMember } from "@/lib/data/types";
import { ANNOUNCE_CHANNELS, groupAnnouncements, parseChannels } from "@/lib/domain/channels";
import { formatFriendly, toInputDate } from "@/lib/domain/dates";
import { CARE_ACTIONS, careActionLabel } from "@/lib/domain/care";

export function MeetingMode({
  meeting,
  initialItems,
  initialAnnouncements,
  initialCareNotes,
  staff,
  ministries,
  calendarEvents,
  calendarChecks,
  todayLabel,
}: {
  meeting: Meeting;
  initialItems: ActionItem[];
  initialAnnouncements: Announcement[];
  initialCareNotes: CareNote[];
  staff: StaffMember[];
  ministries: Ministry[];
  calendarEvents: CalendarEvent[];
  calendarChecks: CalendarCheck[];
  todayLabel: string;
}) {
  const [prayer, setPrayer] = useState(meeting.prayer);
  const [wins, setWins] = useState(meeting.wins);
  const [notes, setNotes] = useState(meeting.notes);
  const [items, setItems] = useState(initialItems);
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [careNotes, setCareNotes] = useState(initialCareNotes);
  const [careAction, setCareAction] = useState<string>("Call");
  const [channels, setChannels] = useState<string[]>(() => {
    const latest = [...initialAnnouncements].reverse().find((row) => parseChannels(row.channels).length > 0);
    return latest ? parseChannels(latest.channels) : ["Platform"];
  });
  const [status, setStatus] = useState(meeting.status);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState("");
  const taskRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const people = staff.filter((person) => person.active);

  async function remember(label: string, ok: boolean, error?: string) {
    if (!ok) {
      setMessage(error || "Could not save.");
      setSaved("");
      return;
    }
    setMessage("");
    setSaved(label);
  }

  return (
    <div className="stack">
      {message ? <p className="banner banner-error" role="alert">{message}</p> : null}
      {saved ? <p className="banner banner-ok" role="status">{saved}</p> : null}
      <section className="card tone-meeting">
        <div className="card-head">
          <Heading icon={ClipboardList}>{meeting.title}</Heading>
          <span>{formatFriendly(meeting.date)} · {status || "Upcoming"}</span>
        </div>
        <p className="hint">Monday at 1:00 PM. Enter a row and press Enter. It shows up for the whole staff right away.</p>
      </section>

      <section className="card">
        <Heading icon={Megaphone}>Announcements</Heading>
        <form
          className="live-grid news"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const result = await addLiveAnnouncement({
              meetingId: meeting.id,
              meetingDate: toInputDate(meeting.date),
              event: String(form.get("event") ?? ""),
              details: String(form.get("details") ?? ""),
              date: String(form.get("date") ?? ""),
              ministry: String(form.get("ministry") ?? ""),
              channels,
            });
            if (!result.ok) return remember("", false, result.error);
            setAnnouncements((current) => [result.data, ...current]);
            event.currentTarget.reset();
            titleRef.current?.focus();
            remember("Announcement added.", true);
          }}
        >
          <input ref={titleRef} name="event" required placeholder="Announcement" aria-label="Announcement" />
          <input name="details" placeholder="Details" aria-label="Announcement details" />
          <input name="date" type="date" aria-label="Announcement date" />
          <MinistryField ministries={ministries} />
          <button className="btn btn-primary" type="submit">Add</button>
        </form>
        <div className="channel-row" role="group" aria-label="Channels">
          {ANNOUNCE_CHANNELS.map((channel) => {
            const on = channels.includes(channel);
            return (
              <button
                key={channel}
                type="button"
                className={on ? "chip chip-on" : "chip"}
                aria-pressed={on}
                onClick={() => setChannels((current) => current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel])}
              >
                {channel}
              </button>
            );
          })}
        </div>
        {groupAnnouncements(announcements, true)
          .filter((group) => group.channel !== "Unsorted" || group.rows.length > 0)
          .map((group) => (
            <section key={group.channel}>
              <h3>{group.channel} · {group.rows.length}</h3>
              {group.rows.length === 0 ? <p className="empty">Nothing for {group.channel.toLowerCase()} yet.</p> : group.rows.map((row) => (
                <article key={`${group.channel}-${row.id}`} className="item">
                  <div>
                    <h3>{row.event}</h3>
                    <p className="meta">
                      {row.date ? <span>{formatFriendly(row.date)}</span> : null}
                      {row.ministry ? <span>{row.ministry}</span> : null}
                    </p>
                    {row.details ? <p className="note">{row.details}</p> : null}
                    <div className="channel-row">
                      {ANNOUNCE_CHANNELS.map((channel) => {
                        const selected = parseChannels(row.channels);
                        const on = selected.includes(channel);
                        return (
                          <button
                            key={channel}
                            type="button"
                            className={on ? "chip chip-on" : "chip"}
                            aria-pressed={on}
                            onClick={async () => {
                              const next = on ? selected.filter((item) => item !== channel) : [...selected, channel];
                              const result = await editLiveAnnouncement(row.id, {
                                event: row.event,
                                details: row.details,
                                date: row.date,
                                ministry: row.ministry,
                                channels: next.join(", "),
                              });
                              if (!result.ok) return remember("", false, result.error);
                              setAnnouncements((current) => current.map((item) => item.id === row.id ? { ...item, channels: next.join(", ") } : item));
                              setChannels(next.length ? next : channels);
                              remember("Channels saved.", true);
                            }}
                          >
                            {channel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="button-row">
                    <button
                      className="btn btn-small"
                      type="button"
                      onClick={async () => {
                        const result = await removeLiveAnnouncement(row.id);
                        if (!result.ok) return remember("", false, result.error);
                        setAnnouncements((current) => current.filter((item) => item.id !== row.id));
                        remember("Announcement removed.", true);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </section>
          ))}
      </section>

      <section className="card">
        <Heading icon={CalendarDays}>Next 4 weeks</Heading>
        <CalendarCheckBoard
          events={calendarEvents}
          checks={calendarChecks}
          todayLabel={todayLabel}
          editable
          staff={staff}
          ministries={ministries}
          onMessage={(label, error) => remember(label, !error, error)}
        />
      </section>

      <section className="card tone-action">
        <Heading icon={SquareCheck}>Action items</Heading>
        <form
          className="live-grid tasks"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const result = await addLiveAction({
              meetingId: meeting.id,
              action: String(form.get("action") ?? ""),
              owner: String(form.get("owner") ?? ""),
              due: String(form.get("due") ?? ""),
              ministry: String(form.get("ministry") ?? ""),
            });
            if (!result.ok) return remember("", false, result.error);
            setItems((current) => [result.data, ...current]);
            event.currentTarget.reset();
            taskRef.current?.focus();
            remember("Action item added.", true);
          }}
        >
          <input ref={taskRef} name="action" required placeholder="What needs doing" aria-label="Action item" />
          <select name="owner" aria-label="Assignee" defaultValue={people[0]?.name ?? ""}>
            {people.map((person) => (
              <option key={person.email} value={person.name}>{person.name}</option>
            ))}
          </select>
          <input name="due" type="date" aria-label="Due date" />
          <MinistryField ministries={ministries} />
          <button className="btn btn-primary" type="submit">Add</button>
        </form>
        {items.map((item) => (
          <LiveItem
            key={item.id}
            item={item}
            people={people}
            ministries={ministries}
            onChange={(next) => setItems((current) => current.map((row) => (row.id === next.id ? next : row)))}
            onRemove={() => setItems((current) => current.filter((row) => row.id !== item.id))}
            onError={(error) => remember("", false, error)}
            onSaved={(label) => remember(label, true)}
          />
        ))}
      </section>

      <section className="card">
        <Heading icon={Heart}>Care notes</Heading>
        <p className="hint">Everyone on staff can see these. Keep them to a name and the practical help.</p>
        <form
          className="live-grid care"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const result = await addLiveCareNote({
              meetingId: meeting.id,
              person: String(form.get("person") ?? ""),
              action: String(form.get("action") ?? ""),
              custom: String(form.get("custom") ?? ""),
              details: String(form.get("details") ?? ""),
              assignee: String(form.get("assignee") ?? ""),
            });
            if (!result.ok) return remember("", false, result.error);
            setCareNotes((current) => [result.data, ...current]);
            event.currentTarget.reset();
            setCareAction("Call");
            remember("Care note added.", true);
          }}
        >
          <input name="person" required placeholder="Name" aria-label="Person needing care" />
          <select name="action" aria-label="Care action" value={careAction} onChange={(event) => setCareAction(event.target.value)}>
            {CARE_ACTIONS.map((action) => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
          {careAction === "Other" ? <input name="custom" required placeholder="What kind of help" aria-label="Other care action" /> : <input name="custom" type="hidden" value="" />}
          <input name="details" placeholder="Details" aria-label="Care details" />
          <select name="assignee" aria-label="Assigned staff" defaultValue="">
            <option value="">Unassigned</option>
            {people.map((person) => (
              <option key={person.email} value={person.name}>{person.name}</option>
            ))}
          </select>
          <button className="btn btn-primary" type="submit">Add</button>
        </form>
        {careNotes.map((note) => (
          <article key={note.id} className="item">
            <div>
              <h3>{note.person}</h3>
              <p className="meta">
                <span>{careActionLabel(note)}</span>
                {note.assignee ? <span>{note.assignee}</span> : <span>Unassigned</span>}
                <span className={note.done ? "chip chip-done" : "chip"}>{note.done ? "Done" : "Open"}</span>
              </p>
              {note.details ? <p className="note">{note.details}</p> : null}
            </div>
            <div className="button-row">
              <label className="checks">
                <input
                  type="checkbox"
                  checked={note.done}
                  onChange={async (event) => {
                    const done = event.target.checked;
                    const result = await editLiveCareNote(note.id, {
                      person: note.person,
                      action: note.action,
                      custom: note.custom,
                      details: note.details,
                      assignee: note.assignee,
                      done,
                    });
                    if (!result.ok) return remember("", false, result.error);
                    setCareNotes((current) => current.map((row) => (row.id === note.id ? result.data : row)));
                  }}
                  aria-label={`Done for ${note.person}`}
                />
                Done
              </label>
              <button
                className="btn btn-small"
                type="button"
                onClick={async () => {
                  const result = await removeLiveCareNote(note.id);
                  if (!result.ok) return remember("", false, result.error);
                  setCareNotes((current) => current.filter((row) => row.id !== note.id));
                  remember("Care note removed.", true);
                }}
              >
                Remove
              </button>
            </div>
          </article>
        ))}
      </section>

      <TextBlock
        title="Prayer"
        value={prayer}
        onChange={setPrayer}
        onSave={async () => {
          const result = await saveMeetingText(meeting.id, { prayer });
          remember(result.ok ? "Prayer saved." : "", result.ok, result.ok ? undefined : result.error);
        }}
      />
      <TextBlock
        title="Celebrations"
        value={wins}
        onChange={setWins}
        onSave={async () => {
          const result = await saveMeetingText(meeting.id, { wins });
          remember(result.ok ? "Celebrations saved." : "", result.ok, result.ok ? undefined : result.error);
        }}
      />
      <TextBlock
        title="Notes"
        value={notes}
        onChange={setNotes}
        onSave={async () => {
          const result = await saveMeetingText(meeting.id, { notes });
          remember(result.ok ? "Notes saved." : "", result.ok, result.ok ? undefined : result.error);
        }}
      />

      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const result = await finishLiveMeeting(meeting.id);
          if (!result.ok) return remember("", false, result.error);
          setStatus(result.data.status);
          remember("Meeting finished. The recap is ready for staff chat when that is connected.", true);
        }}
      >
        <button className="btn btn-primary" type="submit" disabled={status === "Done"}>
          {status === "Done" ? "Meeting finished" : "Finish meeting"}
        </button>
      </form>
    </div>
  );
}

function MinistryField({ ministries }: { ministries: Ministry[] }) {
  if (ministries.length === 0) return <input name="ministry" placeholder="Ministry" aria-label="Ministry" />;
  return (
    <select name="ministry" aria-label="Ministry" defaultValue="">
      <option value="">Ministry</option>
      {ministries.map((row) => (
        <option key={row.ministry} value={row.ministry}>{row.ministry}</option>
      ))}
    </select>
  );
}

function TextBlock({
  title,
  value,
  onChange,
  onSave,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <div className="stack-form">
        <textarea aria-label={title} rows={4} value={value} onChange={(event) => onChange(event.target.value)} />
        <button className="btn" type="button" onClick={onSave}>Save {title.toLowerCase()}</button>
      </div>
    </section>
  );
}

function LiveItem({
  item,
  people,
  ministries,
  onChange,
  onRemove,
  onError,
  onSaved,
}: {
  item: ActionItem;
  people: StaffMember[];
  ministries: Ministry[];
  onChange: (item: ActionItem) => void;
  onRemove: () => void;
  onError: (error: string) => void;
  onSaved: (label: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [action, setAction] = useState(item.action);
  const [owner, setOwner] = useState(item.owner);
  const [due, setDue] = useState(toInputDate(item.due));
  const [ministry, setMinistry] = useState(item.ministry);

  if (!editing) {
    return (
      <article className="item">
        <div>
          <h3>{item.action}</h3>
          <p className="meta">
            <span>{item.owner}</span>
            {item.due ? <span>Due {formatFriendly(item.due)}</span> : null}
            {item.ministry ? <span>{item.ministry}</span> : null}
            <span>{item.status}</span>
          </p>
        </div>
        <div className="button-row">
          <button className="btn btn-small" type="button" onClick={() => setEditing(true)}>Edit</button>
          <button
            className="btn btn-small"
            type="button"
            onClick={async () => {
              const result = await removeLiveAction(item.id);
              if (!result.ok) return onError(result.error);
              onRemove();
              onSaved("Action item removed.");
            }}
          >
            Remove
          </button>
        </div>
      </article>
    );
  }

  return (
    <form
      className="live-grid tasks"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await editLiveAction(item.id, { action, owner, due, ministry });
        if (!result.ok) return onError(result.error);
        onChange({ ...item, action, owner, due, ministry });
        setEditing(false);
        onSaved("Action item updated.");
      }}
    >
      <input aria-label="Action item" value={action} onChange={(event) => setAction(event.target.value)} required />
      <select aria-label="Assignee" value={owner} onChange={(event) => setOwner(event.target.value)}>
        {people.map((person) => (
          <option key={person.email} value={person.name}>{person.name}</option>
        ))}
      </select>
      <input aria-label="Due date" type="date" value={due} onChange={(event) => setDue(event.target.value)} />
      {ministries.length === 0 ? (
        <input aria-label="Ministry" value={ministry} onChange={(event) => setMinistry(event.target.value)} />
      ) : (
        <select aria-label="Ministry" value={ministry} onChange={(event) => setMinistry(event.target.value)}>
          <option value="">Ministry</option>
          {ministries.map((row) => (
            <option key={row.ministry} value={row.ministry}>{row.ministry}</option>
          ))}
        </select>
      )}
      <button className="btn btn-primary" type="submit">Save</button>
    </form>
  );
}

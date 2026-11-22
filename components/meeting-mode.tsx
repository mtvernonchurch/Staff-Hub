"use client";

import { useRef, useState } from "react";
import {
  addLiveAction,
  addLiveAnnouncement,
  editLiveAction,
  editLiveAnnouncement,
  finishLiveMeeting,
  removeLiveAction,
  removeLiveAnnouncement,
  saveMeetingText,
} from "@/app/(hub)/meeting/live-actions";
import type { ActionItem, Announcement, Meeting, Ministry, StaffMember } from "@/lib/data/types";
import { formatFriendly, toInputDate } from "@/lib/domain/dates";

export function MeetingMode({
  meeting,
  initialItems,
  initialAnnouncements,
  staff,
  ministries,
}: {
  meeting: Meeting;
  initialItems: ActionItem[];
  initialAnnouncements: Announcement[];
  staff: StaffMember[];
  ministries: Ministry[];
}) {
  const [prayer, setPrayer] = useState(meeting.prayer);
  const [wins, setWins] = useState(meeting.wins);
  const [notes, setNotes] = useState(meeting.notes);
  const [items, setItems] = useState(initialItems);
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
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
          <h2>{meeting.title}</h2>
          <span>{formatFriendly(meeting.date)} · {status || "Upcoming"}</span>
        </div>
        <p className="hint">Monday at 1:00 PM. Enter a row and press Enter. It shows up for the whole staff right away.</p>
      </section>

      <section className="card">
        <h2>Announcements</h2>
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
        {announcements.map((row) => (
          <article key={row.id} className="item">
            <div>
              <h3>{row.event}</h3>
              <p className="meta">
                {row.date ? <span>{formatFriendly(row.date)}</span> : null}
                {row.ministry ? <span>{row.ministry}</span> : null}
              </p>
              {row.details ? <p className="note">{row.details}</p> : null}
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

      <section className="card tone-action">
        <h2>Action items</h2>
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

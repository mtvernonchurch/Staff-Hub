import Link from "next/link";
import { CalendarDays, Heart, Megaphone, SquareCheck, StickyNote } from "lucide-react";
import { Heading } from "@/components/heading";
import { AnnouncementGroups } from "@/components/announcement-groups";
import { CalendarCheckBoard } from "@/components/calendar-check";
import type { ActionItem, Announcement, CalendarCheck, CalendarEvent, CareNote, Meeting, Ministry, StaffMember } from "@/lib/data/types";
import { formatFriendly, isClosedStatus } from "@/lib/domain/dates";
import { careActionLabel } from "@/lib/domain/care";

export function ThisWeekView({
  meeting,
  announcements,
  items,
  careNotes,
  archive,
  calendar,
}: {
  meeting: Meeting | null;
  announcements: Announcement[];
  items: ActionItem[];
  careNotes: CareNote[];
  archive: Meeting[];
  calendar?: {
    events: CalendarEvent[];
    checks: CalendarCheck[];
    todayLabel: string;
    staff: StaffMember[];
    ministries: Ministry[];
  };
}) {
  if (!meeting) {
    return <p className="empty">No staff meeting is posted yet.</p>;
  }
  return (
    <div className="stack">
      <section className="card tone-meeting">
        <div className="card-head">
          <h2>{meeting.title}</h2>
          <span>{formatFriendly(meeting.date)} · {meeting.status || "Upcoming"}</span>
        </div>
        {meeting.prayer ? (
          <>
            <h3>Prayer</h3>
            <p className="prose">{meeting.prayer}</p>
          </>
        ) : null}
        {meeting.wins ? (
          <>
            <h3>Celebrations</h3>
            <p className="prose">{meeting.wins}</p>
          </>
        ) : null}
      </section>
      <section className="card tone-news">
        <Heading icon={Megaphone}>Announcements</Heading>
        <AnnouncementGroups rows={announcements} />
      </section>
      {calendar ? (
        <section className="card">
          <Heading icon={CalendarDays}>Next 4 weeks</Heading>
          <CalendarCheckBoard
            events={calendar.events}
            checks={calendar.checks}
            todayLabel={calendar.todayLabel}
            editable={false}
            staff={calendar.staff}
            ministries={calendar.ministries}
          />
        </section>
      ) : null}
      <section className="card">
        <Heading icon={Heart}>Care notes</Heading>
        {careNotes.length === 0 ? <p className="empty">None from this meeting.</p> : careNotes.map((note) => (
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
          </article>
        ))}
      </section>
      <section className="card tone-action">
        <Heading icon={SquareCheck}>Tasks</Heading>
        {items.length === 0 ? <p className="empty">None from this meeting.</p> : items.map((item) => (
          <article key={item.id} className="item">
            <div>
              <h3>{item.action}</h3>
              <p className="meta">
                <span>{item.owner}</span>
                {item.due ? <span>Due {formatFriendly(item.due)}</span> : null}
                {item.ministry ? <span>{item.ministry}</span> : null}
                <span className={isClosedStatus(item.status) ? "chip chip-done" : "chip"}>{item.status}</span>
              </p>
            </div>
          </article>
        ))}
      </section>
      <section className="card">
        <Heading icon={StickyNote}>Notes</Heading>
        <p className="prose">{meeting.notes || "No notes yet."}</p>
        {meeting.lookahead ? <p className="note"><strong>Look-ahead. </strong>{meeting.lookahead}</p> : null}
      </section>
      {archive.length > 0 ? (
        <section className="card">
          <Heading icon={CalendarDays}>Earlier meetings</Heading>
          {archive.map((row) => (
            <Link key={row.id} className="meeting-link" href={`/this-week/${row.id}`}>
              <strong>{row.title}</strong>
              <span>{formatFriendly(row.date)} · {row.status || "Upcoming"}</span>
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}

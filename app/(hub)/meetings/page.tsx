import Link from "next/link";
import { createMeetingAction } from "@/app/(hub)/actions";
import { CalendarDays } from "lucide-react";
import { Heading } from "@/components/heading";
import { Flash, PageHeader } from "@/components/ui";
import { isAdmin } from "@/lib/domain/access";
import { chicagoToday, formatFriendly, formatUsDate, sortMeetings, toInputDate, upcomingMonday } from "@/lib/domain/dates";
import { pickMondayMeeting } from "@/lib/domain/view";
import { requireStaff } from "@/lib/session";

export const metadata = { title: "Meetings" };

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const { staff, store } = await requireStaff();
  const today = chicagoToday();
  const [meetings, people] = await Promise.all([store.listMeetings(), store.listStaff()]);
  const monday = pickMondayMeeting(meetings, today);
  const mondayDate = toInputDate(formatUsDate(upcomingMonday(today)));
  const names = people.filter((person) => person.active).map((person) => person.name).join(", ");

  return (
    <>
      <PageHeader
        kicker="Mondays at 1:00 PM"
        icon={CalendarDays}
        title="Staff meetings"
        lede="Prayer, wins, the week ahead, ministry updates, and the decisions that become tasks."
      />
      <Flash error={query.error} notice={query.notice} />
      {isAdmin(staff) ? (
        <p className="button-row" style={{ marginBottom: 16 }}>
          <Link className="btn btn-primary" href="/meeting">Meeting mode</Link>
        </p>
      ) : null}
      <section className="card tone-meeting">
        <Heading icon={CalendarDays}>This Monday</Heading>
        {monday ? (
          <Link className="meeting-link" href={`/meetings/${monday.id}`}>
            <strong>{monday.title}</strong>
            <span>{formatFriendly(monday.date)} · {monday.status || "Upcoming"}</span>
          </Link>
        ) : isAdmin(staff) ? (
          <form action={createMeetingAction} className="stack-form">
            <input type="hidden" name="returnTo" value="/meetings" />
            <p className="hint">The agenda is not opened yet. Create it and the team can fill it in.</p>
            <label className="field">Date<input type="date" name="date" required defaultValue={mondayDate} /></label>
            <label className="field">Title<input name="title" required defaultValue="Weekly Staff Meeting" /></label>
            <label className="field">Attendees<textarea name="attendees" defaultValue={names} rows={3} /></label>
            <button className="btn btn-primary" type="submit">Open Monday&apos;s meeting</button>
          </form>
        ) : (
          <p className="empty">The agenda is not opened yet. An admin will post it before Monday.</p>
        )}
      </section>
      <section className="card" style={{ marginTop: 16 }}>
        <Heading icon={CalendarDays}>All meetings</Heading>
        {sortMeetings(meetings, today).map((meeting) => (
          <Link key={meeting.id} className="meeting-link" href={`/meetings/${meeting.id}`}>
            <strong>{meeting.title || "Staff meeting"}</strong>
            <span>{formatFriendly(meeting.date)} · {meeting.status || "Upcoming"}</span>
          </Link>
        ))}
        {isAdmin(staff) ? (
          <details>
            <summary>Add another meeting</summary>
            <form action={createMeetingAction} className="stack-form">
              <input type="hidden" name="returnTo" value="/meetings" />
              <label className="field">Date<input type="date" name="date" required /></label>
              <label className="field">Title<input name="title" required /></label>
              <label className="field">Attendees<textarea name="attendees" rows={3} /></label>
              <button className="btn" type="submit">Add meeting</button>
            </form>
          </details>
        ) : null}
      </section>
    </>
  );
}

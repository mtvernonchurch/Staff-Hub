import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createMinistryUpdateAction,
  editMinistryUpdateAction,
  saveMeetingSectionAction,
} from "@/app/(hub)/actions";
import { CalendarDays, SquareCheck, Users } from "lucide-react";
import { Heading } from "@/components/heading";
import { ActionItemForm, ActionList } from "@/components/records";
import { Flash, PageHeader } from "@/components/ui";
import { isAdmin } from "@/lib/domain/access";
import { chicagoToday, formatFriendly, isClosedStatus, toInputDate } from "@/lib/domain/dates";
import { namesMatch } from "@/lib/domain/people";
import { sortActionItems } from "@/lib/domain/view";
import { requireStaff } from "@/lib/session";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: id === "mtg_monday" ? "Monday staff meeting" : "Meeting" };
}

export default async function MeetingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { staff, store } = await requireStaff();
  const today = chicagoToday();
  const [meeting, items, people, updates, ministries] = await Promise.all([
    store.getMeeting(id),
    store.listActionItems(),
    store.listStaff(),
    store.listMinistryUpdates(),
    store.listMinistries(),
  ]);
  if (!meeting) notFound();
  const linked = sortActionItems(items.filter((item) => item.meetingId === meeting.id), today);
  const openLinked = linked.filter((item) => !isClosedStatus(item.status));
  const meetingUpdates = updates.filter((update) => update.meetingId === meeting.id);
  const returnTo = `/meetings/${meeting.id}`;
  const admin = isAdmin(staff);

  return (
    <>
      <PageHeader
        kicker="Mondays at 1:00 PM"
        title={meeting.title || "Staff meeting"}
        lede={`${formatFriendly(meeting.date)} · ${meeting.status || "Upcoming"}`}
      />
      <Flash error={query.error} notice={query.notice} />
      <p className="hint"><Link href="/meetings">All meetings</Link></p>
      <div className="stack">
        <Section title="Attendees" section="attendees" value={meeting.attendees} canEdit={admin} meetingId={meeting.id} returnTo={returnTo} rows={3} />
        <div className="button-row">
          {admin && meeting.status !== "Done" ? (
            <StatusButton meetingId={meeting.id} returnTo={returnTo} status="Done" label="Mark meeting done" />
          ) : null}
          {admin && meeting.status === "Done" ? (
            <StatusButton meetingId={meeting.id} returnTo={returnTo} status="Upcoming" label="Mark upcoming" />
          ) : null}
          {admin ? <DateTitle meeting={meeting} returnTo={returnTo} /> : null}
        </div>
        <Section title="Prayer" section="prayer" value={meeting.prayer} canEdit={admin} meetingId={meeting.id} returnTo={returnTo} />
        <Section title="Wins" section="wins" value={meeting.wins} canEdit={admin} meetingId={meeting.id} returnTo={returnTo} />
        <Section title="Calendar look-ahead" section="lookahead" value={meeting.lookahead} canEdit={admin} meetingId={meeting.id} returnTo={returnTo} hint="Staff meeting, deadlines, days off, and office closures. Room booking stays in Planning Center." />
        <section className="card">
          <Heading icon={Users}>Ministry updates</Heading>
          {meetingUpdates.length === 0 ? <p className="empty">No updates for this meeting yet.</p> : meetingUpdates.map((update) => (
            <article key={update.id} className="item">
              <div>
                <h3>{update.ministry}</h3>
                <p className="meta"><span>{update.submittedBy}</span>{update.lead ? <span>Lead {update.lead}</span> : null}</p>
                {update.update ? <p className="note">{update.update}</p> : null}
                {update.comingUp ? <p className="note"><strong>Coming up. </strong>{update.comingUp}</p> : null}
                {update.need ? <p className="note"><strong>Need from the team. </strong>{update.need}</p> : null}
              </div>
              {isAdmin(staff) || namesMatch(staff.name, update.submittedBy) ? (
                <details>
                  <summary>Edit</summary>
                  <form action={editMinistryUpdateAction} className="stack-form">
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <input type="hidden" name="id" value={update.id} />
                    <label className="field">Update<textarea name="update" defaultValue={update.update} /></label>
                    <label className="field">Coming up<textarea name="comingUp" defaultValue={update.comingUp} /></label>
                    <label className="field">Need from the team<textarea name="need" defaultValue={update.need} /></label>
                    <button className="btn btn-small" type="submit">Save</button>
                  </form>
                </details>
              ) : null}
            </article>
          ))}
          <details>
            <summary>Add a ministry update</summary>
            <form action={createMinistryUpdateAction} className="stack-form">
              <input type="hidden" name="returnTo" value={returnTo} />
              <input type="hidden" name="meetingId" value={meeting.id} />
              <label className="field">Ministry
                {ministries.length > 0 ? (
                  <select name="ministry" defaultValue={ministries[0]?.ministry}>
                    {ministries.map((row) => <option key={row.ministry}>{row.ministry}</option>)}
                  </select>
                ) : <input name="ministry" required />}
              </label>
              <label className="field">Update<textarea name="update" /></label>
              <label className="field">Coming up<textarea name="comingUp" /></label>
              <label className="field">Need from the team<textarea name="need" /></label>
              <button className="btn btn-primary" type="submit">Add update</button>
            </form>
          </details>
        </section>
        <Section title="Discussion and decisions" section="notes" value={meeting.notes} canEdit={admin} meetingId={meeting.id} returnTo={returnTo} hint="What you talked about, and what you decided. Leave pastoral care and personnel details out." />
        <Section title="Care update" section="care" value={meeting.care} canEdit={admin} meetingId={meeting.id} returnTo={returnTo} hint="Keep this general. Everyone on staff can read it." />
        <section className="card tone-action">
          <Heading icon={SquareCheck}>Action items from this meeting</Heading>
          <p className="hint">{openLinked.length} still open.</p>
          <ActionList items={linked} actor={staff} staff={people} meetings={[meeting]} today={today} returnTo={returnTo} />
          <details>
            <summary>{admin ? "Add an item from this meeting" : "Add one for me"}</summary>
            <ActionItemForm actor={staff} staff={people} meetings={[meeting]} returnTo={returnTo} meetingId={meeting.id} />
          </details>
        </section>
      </div>
    </>
  );
}

function Section({
  title,
  section,
  value,
  canEdit,
  meetingId,
  returnTo,
  hint,
  rows = 5,
}: {
  title: string;
  section: string;
  value: string;
  canEdit: boolean;
  meetingId: string;
  returnTo: string;
  hint?: string;
  rows?: number;
}) {
  return (
    <section className="card">
      <Heading icon={CalendarDays}>{title}</Heading>
      {hint ? <p className="hint">{hint}</p> : null}
      {canEdit ? (
        <form action={saveMeetingSectionAction} className="stack-form">
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="id" value={meetingId} />
          <input type="hidden" name="section" value={section} />
          <textarea name="value" rows={rows} defaultValue={value} />
          <button className="btn" type="submit">Save {title.toLowerCase()}</button>
        </form>
      ) : (
        <p className="prose">{value || "Nothing here yet."}</p>
      )}
    </section>
  );
}

function StatusButton({ meetingId, returnTo, status, label }: { meetingId: string; returnTo: string; status: string; label: string }) {
  return (
    <form action={saveMeetingSectionAction}>
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="id" value={meetingId} />
      <input type="hidden" name="section" value="status" />
      <input type="hidden" name="value" value={status} />
      <button className="btn btn-small" type="submit">{label}</button>
    </form>
  );
}

function DateTitle({ meeting, returnTo }: { meeting: { id: string; date: string; title: string }; returnTo: string }) {
  return (
    <details>
      <summary>Edit title or date</summary>
      <form action={saveMeetingSectionAction} className="stack-form">
        <input type="hidden" name="returnTo" value={returnTo} />
        <input type="hidden" name="id" value={meeting.id} />
        <input type="hidden" name="section" value="title" />
        <label className="field">Title<input name="value" defaultValue={meeting.title} /></label>
        <button className="btn btn-small" type="submit">Save title</button>
      </form>
      <form action={saveMeetingSectionAction} className="stack-form">
        <input type="hidden" name="returnTo" value={returnTo} />
        <input type="hidden" name="id" value={meeting.id} />
        <input type="hidden" name="section" value="date" />
        <label className="field">Date<input type="date" name="value" defaultValue={toInputDate(meeting.date)} /></label>
        <button className="btn btn-small" type="submit">Save date</button>
      </form>
    </details>
  );
}

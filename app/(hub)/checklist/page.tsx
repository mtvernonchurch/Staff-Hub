import Link from "next/link";
import { startChecklistAction, updateChecklistAction } from "@/app/(hub)/actions";
import { ListChecks } from "lucide-react";
import { Flash, PageHeader } from "@/components/ui";
import { chicagoToday, formatFriendly, formatUsDate, sortMeetings, upcomingMonday } from "@/lib/domain/dates";
import { namesMatch } from "@/lib/domain/people";
import { canEditChecklist } from "@/lib/domain/permissions";
import { orderValue, pickMondayMeeting, sortByOrder } from "@/lib/domain/view";
import { requireStaff } from "@/lib/session";

export const metadata = { title: "Sunday checklist" };

export default async function ChecklistPage({
  searchParams,
}: {
  searchParams: Promise<{ meeting?: string; error?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const { staff, store } = await requireStaff();
  const today = chicagoToday();
  const [meetings, checklist] = await Promise.all([store.listMeetings(), store.listChecklist()]);
  const monday = pickMondayMeeting(meetings, today);
  const selected = meetings.find((meeting) => meeting.id === query.meeting) ?? monday ?? sortMeetings(meetings, today)[0] ?? null;
  const rows = sortByOrder(checklist.filter((row) => selected && row.meetingId === selected.id).map((row) => ({ ...row, order: row.order })));
  const ready = rows.filter((row) => row.ready).length;
  const returnTo = selected ? `/checklist?meeting=${selected.id}` : "/checklist";

  return (
    <>
      <PageHeader
        kicker="Before Sunday"
        icon={ListChecks}
        title="Sunday checklist"
        lede="Each area owner marks their part ready. The list is copied from the template for one meeting."
      />
      <Flash error={query.error} notice={query.notice} />
      {meetings.length > 1 ? (
        <div className="filters">
          {sortMeetings(meetings, today).slice(0, 8).map((meeting) => (
            <Link key={meeting.id} className={selected?.id === meeting.id ? "btn btn-primary btn-small" : "btn btn-small"} href={`/checklist?meeting=${meeting.id}`}>
              {formatFriendly(meeting.date)}
            </Link>
          ))}
        </div>
      ) : null}
      {!selected ? (
        <section className="card">
          <p className="empty">Create a staff meeting first. The checklist hangs on that meeting.</p>
          <Link className="btn btn-primary" href="/meetings">Go to meetings</Link>
        </section>
      ) : (
        <section className="card">
          <div className="card-head">
            <h2>{selected.title}</h2>
            <span>{formatFriendly(selected.date)}</span>
          </div>
          {rows.length === 0 ? (
            <>
              <p className="empty">No checklist for this meeting yet.</p>
              <form action={startChecklistAction}>
                <input type="hidden" name="returnTo" value={returnTo} />
                <input type="hidden" name="meetingId" value={selected.id} />
                <button className="btn btn-primary" type="submit">Copy this week&apos;s checklist</button>
              </form>
              <p className="hint">Next Monday on the calendar is {formatFriendly(formatUsDate(upcomingMonday(today)))}.</p>
            </>
          ) : (
            <>
              <p className="progress-label">{ready} of {rows.length} ready</p>
              {rows.sort((a, b) => orderValue(a.order) - orderValue(b.order)).map((row) => {
                const editable = canEditChecklist(staff, row);
                return (
                  <article key={row.id} className={row.ready ? "item" : "item item-overdue"}>
                    <div>
                      <h3>{row.area}</h3>
                      <p className="meta">
                        <span>{namesMatch(staff.name, row.owner) ? "Yours" : row.owner}</span>
                        <span>{row.ready ? "Ready" : "Not yet"}</span>
                      </p>
                      <p className="note">{row.covered}</p>
                    </div>
                    {editable ? (
                      <form action={updateChecklistAction} className="stack-form">
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <input type="hidden" name="id" value={row.id} />
                        <label className="field">Notes<textarea name="notes" rows={2} defaultValue={row.notes} /></label>
                        <div className="button-row">
                          <button className="btn btn-primary btn-small" name="ready" value="true" type="submit">Ready</button>
                          <button className="btn btn-small" name="ready" value="false" type="submit">Not yet</button>
                        </div>
                      </form>
                    ) : row.notes ? <p className="note">{row.notes}</p> : null}
                  </article>
                );
              })}
            </>
          )}
        </section>
      )}
    </>
  );
}

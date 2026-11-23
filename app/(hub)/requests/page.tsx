import Link from "next/link";
import { createRequestAction } from "@/app/(hub)/actions";
import { createGraphicsRequestAction, createTimeAwayAction, setGraphicsOwnerAction } from "@/app/(hub)/extra-actions";
import { NeededByField } from "@/components/needed-by-field";
import { StaffOptions } from "@/components/records";
import { Inbox } from "lucide-react";
import { Heading } from "@/components/heading";
import { Flash, PageHeader } from "@/components/ui";
import { isAdmin } from "@/lib/domain/access";
import { AWAY_KINDS, GRAPHICS_NEEDS, GRAPHICS_PLATFORMS, isShortNotice } from "@/lib/domain/desk";
import { chicagoToday, formatFriendly, formatUsDate, isClosedStatus, toInputDate } from "@/lib/domain/dates";
import { namesMatch } from "@/lib/domain/people";
import { requireStaff } from "@/lib/session";
import { graphicsOwner } from "@/lib/services/desk";
import { REQUEST_CHANNELS, requestWaitingOn } from "@/lib/services/hub";

export const metadata = { title: "Request Desk" };

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const { staff, store } = await requireStaff();
  const today = chicagoToday();
  const [requests, graphics, away, people, ministries, owner] = await Promise.all([
    store.listRequests(),
    store.listGraphicsRequests(),
    store.listTimeAway(),
    store.listStaff(),
    store.listMinistries(),
    graphicsOwner({ store }),
  ]);
  const waiting = requests.filter((request) => requestWaitingOn(staff, request));
  const open = requests.filter((request) => !isClosedStatus(request.status) && !["Declined", "Withdrawn", "Done"].includes(request.status) && !waiting.includes(request));
  const finished = requests.filter((request) => ["Done", "Declined", "Withdrawn"].includes(request.status) || isClosedStatus(request.status)).slice(0, 10);

  return (
    <>
      <PageHeader
        kicker="Request Desk"
        icon={Inbox}
        title="Ask for help"
        lede="Graphics, time away, the weekly email, a text, a social post, the website, or a Sunday announcement. One place, instead of a crowded inbox."
      />
      <Flash error={query.error} notice={query.notice} />
      <section className="card">
        <Heading icon={Inbox}>Needs you</Heading>
        <RequestRows rows={waiting} empty="Nothing is waiting on you." viewer={staff.name} />
      </section>
      <section className="card" style={{ marginTop: 16 }}>
        <Heading icon={Inbox}>Open requests</Heading>
        <RequestRows rows={open} empty="No other open requests." viewer={staff.name} />
        <details>
          <summary>New request</summary>
          <form action={createRequestAction} className="stack-form">
            <input type="hidden" name="returnTo" value="/requests" />
            <label className="field">What is this about<input name="title" required maxLength={200} /></label>
            <label className="field">The details
              <textarea name="details" required maxLength={2000} placeholder="Date, time, place, audience, and the exact wording." />
            </label>
            <label className="field">Needed by<input type="date" name="neededBy" required /></label>
            <label className="field">Link <span>optional, https</span><input name="link" placeholder="https://" /></label>
            <fieldset className="field">
              <legend>What do you need</legend>
              <div className="checks">
                {REQUEST_CHANNELS.map((channel) => (
                  <label key={channel}><input type="checkbox" name="channels" value={channel} />{channel}</label>
                ))}
              </div>
            </fieldset>
            <button className="btn btn-primary" type="submit">Send request</button>
          </form>
        </details>
      </section>
      <section className="card" style={{ marginTop: 16 }}>
        <Heading icon={Inbox}>Recently finished</Heading>
        <RequestRows rows={finished} empty="None yet." viewer={staff.name} />
      </section>
      <section className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <Heading icon={Inbox}>Graphics and social</Heading>
        </div>
        <p className="hint">
          {owner ? `New requests go to ${owner}.` : "No one is set to receive these yet."}
          {isAdmin(staff) ? " Change that below. The name lives in Hub Settings, not in the app." : ""}
        </p>
        {isAdmin(staff) ? (
          <form action={setGraphicsOwnerAction} className="stack-form">
            <input type="hidden" name="returnTo" value="/requests" />
            <label className="field">Graphics owner
              <select name="owner" defaultValue={owner}>
                <StaffOptions staff={people} />
              </select>
            </label>
            <button className="btn" type="submit">Save owner</button>
          </form>
        ) : null}
        {graphics.length === 0 ? <p className="empty">No graphics requests yet.</p> : graphics.map((row) => (
          <Link key={row.id} href={`/requests/graphics/${row.id}`} className="meeting-link">
            <strong>{row.event}</strong>
            <span>
              {row.status} · {namesMatch(staff.name, row.requestedBy) ? "You asked" : row.requestedBy}
              {row.assignedTo ? ` · ${row.assignedTo}` : ""} · needed {formatFriendly(row.neededBy)}
              {isShortNotice(row.neededBy, today) && row.status !== "Done" ? " · short notice" : ""}
            </span>
          </Link>
        ))}
        <details>
          <summary>Graphics and social request</summary>
          <form action={createGraphicsRequestAction} className="stack-form">
            <input type="hidden" name="returnTo" value="/requests" />
            <label className="field">Ministry
              <select name="ministry" required defaultValue="">
                <option value="" disabled>Choose</option>
                {ministries.map((row) => <option key={row.ministry}>{row.ministry}</option>)}
              </select>
            </label>
            <fieldset className="field">
              <legend>What&apos;s needed</legend>
              <div className="checks">
                {GRAPHICS_NEEDS.map((item) => <label key={item}><input type="checkbox" name="needed" value={item} />{item}</label>)}
              </div>
            </fieldset>
            <fieldset className="field">
              <legend>Platforms</legend>
              <div className="checks">
                {GRAPHICS_PLATFORMS.map((item) => <label key={item}><input type="checkbox" name="platforms" value={item} />{item}</label>)}
              </div>
            </fieldset>
            <label className="field">Event name<input name="event" required maxLength={160} /></label>
            <label className="field">Event date<input type="date" name="eventDate" required /></label>
            <NeededByField today={toInputDate(formatUsDate(today))} />
            <label className="field">Description and copy<textarea name="description" required maxLength={2000} /></label>
            <label className="field">Links <span>optional, one https link per line</span><textarea name="links" placeholder="https://" /></label>
            <button className="btn btn-primary" type="submit">Send graphics request</button>
          </form>
        </details>
      </section>
      <section className="card" style={{ marginTop: 16 }}>
        <Heading icon={Inbox}>Time away</Heading>
        {away.length === 0 ? <p className="empty">No time away requests yet.</p> : away.map((row) => (
          <Link key={row.id} href={`/requests/away/${row.id}`} className="meeting-link">
            <strong>{row.kind}{row.halfDay ? " · half day" : ""}</strong>
            <span>
              {row.status} · {namesMatch(staff.name, row.requestedBy) ? "You asked" : row.requestedBy}
              {" · "}{formatFriendly(row.start)}{row.end && row.end !== row.start ? `–${formatFriendly(row.end)}` : ""}
            </span>
          </Link>
        ))}
        <details>
          <summary>Request time away</summary>
          <form action={createTimeAwayAction} className="stack-form">
            <input type="hidden" name="returnTo" value="/requests" />
            <label className="field">Type
              <select name="kind" required defaultValue="PTO/vacation">
                {AWAY_KINDS.map((kind) => <option key={kind}>{kind}</option>)}
              </select>
            </label>
            <label className="field">Start<input type="date" name="start" required /></label>
            <label className="field">End<input type="date" name="end" required /></label>
            <label className="checks"><input type="checkbox" name="halfDay" value="yes" /> Half day (uses the start date)</label>
            <label className="field">Who&apos;s covering <span>optional</span>
              <select name="coverage" defaultValue="">
                <option value="">No one named</option>
                <StaffOptions staff={people} />
              </select>
            </label>
            <label className="field">Notes <span>optional</span><textarea name="notes" maxLength={1000} /></label>
            <button className="btn btn-primary" type="submit">Send for approval</button>
          </form>
        </details>
      </section>
    </>
  );
}

function RequestRows({ rows, empty, viewer }: { rows: { id: string; title: string; status: string; requestedBy: string; neededBy: string; needed: string }[]; empty: string; viewer: string }) {
  if (rows.length === 0) return <p className="empty">{empty}</p>;
  return (
    <div>
      {rows.map((request) => (
        <Link key={request.id} href={`/requests/${request.id}`} className="meeting-link">
          <strong>{request.title}</strong>
          <span>
            {request.status} · {namesMatch(viewer, request.requestedBy) ? "You asked" : request.requestedBy}
            {request.neededBy ? ` · needed ${formatFriendly(request.neededBy)}` : ""} · {request.needed}
          </span>
        </Link>
      ))}
    </div>
  );
}

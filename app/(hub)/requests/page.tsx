import Link from "next/link";
import { createRequestAction } from "@/app/(hub)/actions";
import { Flash, PageHeader } from "@/components/ui";
import { formatFriendly, isClosedStatus } from "@/lib/domain/dates";
import { namesMatch } from "@/lib/domain/people";
import { requireStaff } from "@/lib/session";
import { REQUEST_CHANNELS, requestWaitingOn } from "@/lib/services/hub";

export const metadata = { title: "Request Desk" };

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const { staff, store } = await requireStaff();
  const requests = await store.listRequests();
  const waiting = requests.filter((request) => requestWaitingOn(staff, request));
  const open = requests.filter((request) => !isClosedStatus(request.status) && !["Declined", "Withdrawn", "Done"].includes(request.status) && !waiting.includes(request));
  const finished = requests.filter((request) => ["Done", "Declined", "Withdrawn"].includes(request.status) || isClosedStatus(request.status)).slice(0, 10);

  return (
    <>
      <PageHeader
        kicker="Request Desk"
        title="Ask for help"
        lede="Graphics, the weekly email, a text, a social post, the website, or a Sunday announcement. One place, instead of a crowded inbox."
      />
      <Flash error={query.error} notice={query.notice} />
      <section className="card">
        <h2>Needs you</h2>
        <RequestRows rows={waiting} empty="Nothing is waiting on you." viewer={staff.name} />
      </section>
      <section className="card" style={{ marginTop: 16 }}>
        <h2>Open requests</h2>
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
        <h2>Recently finished</h2>
        <RequestRows rows={finished} empty="None yet." viewer={staff.name} />
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

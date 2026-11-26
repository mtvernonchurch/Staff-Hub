import Link from "next/link";
import { notFound } from "next/navigation";
import { updateGraphicsRequestAction } from "@/app/(hub)/extra-actions";
import { StaffOptions } from "@/components/records";
import { Flash, OutLink, PageHeader } from "@/components/ui";
import { isAdmin } from "@/lib/domain/access";
import { GRAPHICS_STATUSES, isShortNotice, splitList } from "@/lib/domain/desk";
import { chicagoToday, formatFriendly } from "@/lib/domain/dates";
import { namesMatch } from "@/lib/domain/people";
import { requireStaff } from "@/lib/session";

export const metadata = { title: "Graphics request" };

export default async function GraphicsRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { staff, store } = await requireStaff();
  const [rows, people] = await Promise.all([store.listGraphicsRequests(), store.listStaff()]);
  const request = rows.find((row) => row.id === id);
  if (!request) notFound();
  const today = chicagoToday();
  const admin = isAdmin(staff);
  const canUpdate = admin || namesMatch(staff.name, request.assignedTo);
  const short = isShortNotice(request.neededBy, today) && request.status !== "Done";

  return (
    <>
      <PageHeader kicker="Graphics and social" title={request.event} lede={`${request.status} · asked by ${request.requestedBy}`} />
      <Flash error={query.error} notice={query.notice} />
      <p className="hint"><Link href="/requests">Requests</Link></p>
      <section className="card">
        {short ? <p className="banner banner-error">Needed in less than 7 days.</p> : null}
        <p className="meta">
          <span>{request.ministry}</span>
          <span>Event {formatFriendly(request.eventDate)}</span>
          <span>Needed {formatFriendly(request.neededBy)}</span>
          <span>{request.assignedTo ? `Assigned to ${request.assignedTo}` : "Not assigned"}</span>
        </p>
        <p><strong>What&apos;s needed. </strong>{request.needed}</p>
        <p><strong>Platforms. </strong>{request.platforms}</p>
        <p className="prose">{request.description}</p>
        {splitList(request.links).map((link) => <p key={link}><OutLink href={link}>{link}</OutLink></p>)}
        {canUpdate ? (
          <form action={updateGraphicsRequestAction} className="stack-form">
            <input type="hidden" name="returnTo" value={`/requests/graphics/${request.id}`} />
            <input type="hidden" name="id" value={request.id} />
            {admin ? (
              <label className="field">Assign to
                <select name="assignedTo" defaultValue={request.assignedTo}>
                  <option value="">Unassigned</option>
                  <StaffOptions staff={people} />
                </select>
              </label>
            ) : null}
            <label className="field">Status
              <select name="status" defaultValue={request.status}>
                {GRAPHICS_STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <button className="btn btn-primary" type="submit">Save</button>
          </form>
        ) : (
          <p className="hint">You can see the status here. The assigned person updates it.</p>
        )}
      </section>
    </>
  );
}

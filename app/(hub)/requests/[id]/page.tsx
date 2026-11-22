import Link from "next/link";
import { notFound } from "next/navigation";
import { updateRequestAction } from "@/app/(hub)/actions";
import { Flash, OutLink, PageHeader } from "@/components/ui";
import { StaffOptions } from "@/components/records";
import { isAdmin } from "@/lib/domain/access";
import { formatFriendly } from "@/lib/domain/dates";
import { allowedRequestStatuses } from "@/lib/domain/permissions";
import { requireStaff } from "@/lib/session";

export const metadata = { title: "Request" };

export default async function RequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { staff, store } = await requireStaff();
  const [request, people] = await Promise.all([store.getRequest(id), store.listStaff()]);
  if (!request) notFound();
  const options = allowedRequestStatuses(staff, request);
  const admin = isAdmin(staff);
  const returnTo = `/requests/${request.id}`;

  return (
    <>
      <PageHeader kicker="Request Desk" title={request.title} lede={`${request.status} · asked by ${request.requestedBy}`} />
      <Flash error={query.error} notice={query.notice} />
      <p className="hint"><Link href="/requests">All requests</Link></p>
      <section className="card">
        <p className="meta">
          <span>Needed {formatFriendly(request.neededBy)}</span>
          {request.assignedTo ? <span>Assigned to {request.assignedTo}</span> : <span>Not assigned</span>}
        </p>
        <p className="prose">{request.details}</p>
        <p><strong>What&apos;s needed. </strong>{request.needed}</p>
        {request.link ? <p><OutLink href={request.link}>Reference link</OutLink></p> : null}
        {request.draftLink ? <p><OutLink href={request.draftLink}>Draft</OutLink></p> : null}
        {options.length > 0 ? (
          <form action={updateRequestAction} className="stack-form">
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="id" value={request.id} />
            {admin ? (
              <>
                <label className="field">Assign to
                  <select name="assignedTo" defaultValue={request.assignedTo}>
                    <option value="">Unassigned</option>
                    <StaffOptions staff={people} />
                  </select>
                </label>
                <label className="field">Draft link <span>https, required before review</span>
                  <input name="draftLink" defaultValue={request.draftLink} placeholder="https://" />
                </label>
              </>
            ) : null}
            <label className="field">Move it to
              <select name="status" defaultValue={request.status}>
                <option value={request.status}>{request.status}</option>
                {options.filter((status) => status !== request.status).map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <p className="hint">A new request waits on an admin. Ready for review waits on the person who asked. Their yes applies to the draft link that is saved.</p>
            <button className="btn btn-primary" type="submit">Save</button>
          </form>
        ) : (
          <p className="hint">This request is finished.</p>
        )}
      </section>
    </>
  );
}

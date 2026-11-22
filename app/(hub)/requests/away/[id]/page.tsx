import Link from "next/link";
import { notFound } from "next/navigation";
import { decideTimeAwayAction } from "@/app/(hub)/extra-actions";
import { Flash, PageHeader } from "@/components/ui";
import { isAdmin } from "@/lib/domain/access";
import { formatFriendly } from "@/lib/domain/dates";
import { requireStaff } from "@/lib/session";

export const metadata = { title: "Time away" };

export default async function TimeAwayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { staff, store } = await requireStaff();
  const request = (await store.listTimeAway()).find((row) => row.id === id);
  if (!request) notFound();
  const admin = isAdmin(staff);

  return (
    <>
      <PageHeader
        kicker="Time away"
        title={`${request.kind}${request.halfDay ? " · half day" : ""}`}
        lede={`${request.status} · asked by ${request.requestedBy}`}
      />
      <Flash error={query.error} notice={query.notice} />
      <p className="hint"><Link href="/requests">Request Desk</Link></p>
      <section className="card">
        <p className="meta">
          <span>{formatFriendly(request.start)}{request.end !== request.start ? ` – ${formatFriendly(request.end)}` : ""}</span>
          {request.coverage ? <span>Covered by {request.coverage}</span> : <span>No coverage named</span>}
        </p>
        {request.notes ? <p className="prose">{request.notes}</p> : null}
        <p><strong>Status. </strong>{request.status}</p>
        {admin && request.status === "Pending" ? (
          <div className="button-row">
            <form action={decideTimeAwayAction}>
              <input type="hidden" name="returnTo" value={`/requests/away/${request.id}`} />
              <input type="hidden" name="id" value={request.id} />
              <input type="hidden" name="status" value="Approved" />
              <button className="btn btn-primary" type="submit">Approve</button>
            </form>
            <form action={decideTimeAwayAction}>
              <input type="hidden" name="returnTo" value={`/requests/away/${request.id}`} />
              <input type="hidden" name="id" value={request.id} />
              <input type="hidden" name="status" value="Denied" />
              <button className="btn" type="submit">Deny</button>
            </form>
          </div>
        ) : null}
      </section>
    </>
  );
}

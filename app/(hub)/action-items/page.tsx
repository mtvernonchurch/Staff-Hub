import Link from "next/link";
import { createIssueAction, updateIssueAction } from "@/app/(hub)/actions";
import { CircleAlert, SquareCheck } from "lucide-react";
import { Heading } from "@/components/heading";
import { ActionItemForm, ActionList, StaffOptions } from "@/components/records";
import { Flash, PageHeader, cleanQuery } from "@/components/ui";
import { isAdmin } from "@/lib/domain/access";
import { chicagoToday, formatFriendly, isClosedStatus, toInputDate } from "@/lib/domain/dates";
import { namesMatch } from "@/lib/domain/people";
import { mine, sortActionItems } from "@/lib/domain/view";
import { requireStaff } from "@/lib/session";

export const metadata = { title: "Action items" };

export default async function ActionItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; status?: string; error?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const { staff, store } = await requireStaff();
  const today = chicagoToday();
  const [items, meetings, people, issues] = await Promise.all([
    store.listActionItems(),
    store.listMeetings(),
    store.listStaff(),
    store.listOpenIssues(),
  ]);
  const scope = query.scope === "all" ? "all" : "mine";
  const status = query.status === "done" ? "done" : query.status === "all" ? "all" : "open";
  const scoped = scope === "mine" ? mine(items, staff.name) : items;
  const filtered = scoped.filter((item) => {
    if (status === "all") return true;
    if (status === "done") return isClosedStatus(item.status);
    return !isClosedStatus(item.status);
  });
  const returnTo = cleanQuery("/action-items", { scope, status });
  const openIssues = issues.filter((issue) => !isClosedStatus(issue.status));

  return (
    <>
      <PageHeader
        kicker="The one shared list"
        icon={SquareCheck}
        title="Action items"
        lede="Everyone can see the list. You update what you own. An admin can assign work to someone else."
      />
      <Flash error={query.error} notice={query.notice} />
      <div className="filters" aria-label="Filters">
        <Filter href={cleanQuery("/action-items", { scope: "mine", status })} current={scope === "mine"}>Mine</Filter>
        <Filter href={cleanQuery("/action-items", { scope: "all", status })} current={scope === "all"}>Everyone</Filter>
        <Filter href={cleanQuery("/action-items", { scope, status: "open" })} current={status === "open"}>Open</Filter>
        <Filter href={cleanQuery("/action-items", { scope, status: "done" })} current={status === "done"}>Done</Filter>
        <Filter href={cleanQuery("/action-items", { scope, status: "all" })} current={status === "all"}>Any status</Filter>
      </div>
      <section className="card tone-action">
        <ActionList items={sortActionItems(filtered, today)} actor={staff} staff={people} meetings={meetings} today={today} returnTo={returnTo} />
        <details>
          <summary>{isAdmin(staff) ? "Add or assign an item" : "Add an item for me"}</summary>
          <ActionItemForm actor={staff} staff={people} meetings={meetings} returnTo={returnTo} />
        </details>
      </section>
      <section className="card" style={{ marginTop: 16 }}>
        <Heading icon={CircleAlert}>Open issues</Heading>
        <p className="hint">Things that are stuck, not a person&apos;s to-do. Keep private details out.</p>
        {openIssues.length === 0 ? <p className="empty">No open issues.</p> : openIssues.map((issue) => {
          const canEdit = isAdmin(staff) || namesMatch(staff.name, issue.owner);
          return (
            <article key={issue.id} className="item">
              <div>
                <h3>{issue.issue}</h3>
                <p className="meta">
                  <span>{issue.owner}</span>
                  {issue.due ? <span>Due {formatFriendly(issue.due)}</span> : null}
                  {issue.nextStep ? <span>{issue.nextStep}</span> : null}
                </p>
              </div>
              {canEdit ? (
                <details>
                  <summary>Update</summary>
                  <form action={updateIssueAction} className="stack-form">
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <input type="hidden" name="id" value={issue.id} />
                    <label className="field">Next step<textarea name="nextStep" defaultValue={issue.nextStep} rows={2} /></label>
                    <label className="field">Due<input name="due" type="date" defaultValue={toInputDate(issue.due)} /></label>
                    {isAdmin(staff) ? (
                      <label className="field">Owner
                        <select name="owner" defaultValue={issue.owner}><StaffOptions staff={people} /></select>
                      </label>
                    ) : null}
                    <label className="field">Status
                      <select name="status" defaultValue={isClosedStatus(issue.status) ? "Done" : "Open"}>
                        <option>Open</option>
                        <option>Done</option>
                      </select>
                    </label>
                    <button className="btn btn-small" type="submit">Save</button>
                  </form>
                </details>
              ) : null}
            </article>
          );
        })}
        <details>
          <summary>Raise an issue</summary>
          <form action={createIssueAction} className="stack-form">
            <input type="hidden" name="returnTo" value={returnTo} />
            {!isAdmin(staff) ? <input type="hidden" name="owner" value={staff.name} /> : null}
            <label className="field">Issue<input name="issue" required /></label>
            {isAdmin(staff) ? (
              <label className="field">Owner
                <select name="owner" defaultValue={staff.name}><StaffOptions staff={people} /></select>
              </label>
            ) : null}
            <label className="field">Next step<input name="nextStep" /></label>
            <label className="field">Due<input name="due" type="date" /></label>
            <button className="btn btn-primary" type="submit">Add issue</button>
          </form>
        </details>
      </section>
    </>
  );
}

function Filter({ href, current, children }: { href: string; current: boolean; children: React.ReactNode }) {
  return <Link className={current ? "btn btn-primary btn-small" : "btn btn-small"} href={href} aria-current={current ? "true" : undefined}>{children}</Link>;
}

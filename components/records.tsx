import {
  createActionItemAction,
  editActionItemAction,
  setActionStatusAction,
} from "@/app/(hub)/actions";
import type { ActionItem, Meeting, StaffMember } from "@/lib/data/types";
import { isAdmin } from "@/lib/domain/access";
import { formatFriendly, isClosedStatus, isOverdue, toInputDate } from "@/lib/domain/dates";
import { namesMatch } from "@/lib/domain/people";

export function StaffOptions({ staff }: { staff: StaffMember[] }) {
  return (
    <>
      {staff.filter((person) => person.active).map((person) => (
        <option key={person.email} value={person.name}>
          {person.name}
        </option>
      ))}
    </>
  );
}

export function ActionItemForm({
  actor,
  staff,
  meetings,
  returnTo,
  meetingId,
}: {
  actor: StaffMember;
  staff: StaffMember[];
  meetings: Meeting[];
  returnTo: string;
  meetingId?: string;
}) {
  const admin = isAdmin(actor);
  return (
    <form action={createActionItemAction} className="stack-form">
      <input type="hidden" name="returnTo" value={returnTo} />
      {meetingId ? <input type="hidden" name="meetingId" value={meetingId} /> : null}
      {!admin ? <input type="hidden" name="owner" value={actor.name} /> : null}
      <label className="field">
        What needs doing
        <input name="action" required maxLength={300} placeholder="Send the volunteer note" />
      </label>
      <label className="field">
        Due date <span>optional</span>
        <input name="due" type="date" />
      </label>
      {admin ? (
        <label className="field">
          Owner
          <select name="owner" defaultValue={actor.name}>
            <StaffOptions staff={staff} />
          </select>
        </label>
      ) : null}
      {!meetingId ? (
        <label className="field">
          From a meeting <span>optional</span>
          <select name="meetingId" defaultValue="">
            <option value="">Not from a meeting</option>
            {meetings.map((meeting) => (
              <option key={meeting.id} value={meeting.id}>{meeting.title} · {formatFriendly(meeting.date)}</option>
            ))}
          </select>
        </label>
      ) : null}
      <button className="btn btn-primary" type="submit">{admin ? "Save item" : "Add to my list"}</button>
    </form>
  );
}

export function ActionList({
  items,
  actor,
  staff,
  meetings,
  today,
  returnTo,
}: {
  items: ActionItem[];
  actor: StaffMember;
  staff: StaffMember[];
  meetings: Meeting[];
  today: Date;
  returnTo: string;
}) {
  if (items.length === 0) return <p className="empty">Nothing on this list.</p>;
  return (
    <div>
      {items.map((item) => {
        const overdue = isOverdue(item.due, item.status, today);
        const meeting = meetings.find((row) => row.id === item.meetingId);
        const mine = namesMatch(actor.name, item.owner);
        const canEdit = isAdmin(actor) || mine;
        return (
          <article key={item.id} className={overdue ? "item item-overdue" : "item"}>
            <div>
              <h3>{item.action}</h3>
              <div className="meta">
                <span>{mine ? "Yours" : item.owner}</span>
                {item.due ? <span>Due {formatFriendly(item.due)}</span> : <span>No due date</span>}
                {overdue ? <span className="chip chip-overdue">Overdue</span> : null}
                {item.status === "In progress" ? <span className="chip chip-progress">In progress</span> : null}
                {isClosedStatus(item.status) ? <span className="chip chip-done">Done</span> : null}
                {meeting ? <span>From {meeting.title}</span> : null}
              </div>
              {item.update ? <p className="note">{item.update}</p> : null}
            </div>
            {canEdit ? (
              <div className="item-actions">
                {!isClosedStatus(item.status) && item.status !== "In progress" ? (
                  <form action={setActionStatusAction}>
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="status" value="In progress" />
                    <button className="btn btn-small" type="submit">Start</button>
                  </form>
                ) : null}
                {!isClosedStatus(item.status) ? (
                  <form action={setActionStatusAction}>
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="status" value="Done" />
                    <button className="btn btn-primary btn-small" type="submit">Mark done</button>
                  </form>
                ) : (
                  <form action={setActionStatusAction}>
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="status" value="Open" />
                    <button className="btn btn-small" type="submit">Reopen</button>
                  </form>
                )}
                <details>
                  <summary>Edit</summary>
                  <form action={editActionItemAction} className="stack-form">
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <input type="hidden" name="id" value={item.id} />
                    <label className="field">
                      Action
                      <input name="action" required maxLength={300} defaultValue={item.action} />
                    </label>
                    <label className="field">
                      Due date
                      <input name="due" type="date" defaultValue={toInputDate(item.due)} />
                    </label>
                    <label className="field">
                      Update
                      <textarea name="update" defaultValue={item.update} rows={3} />
                    </label>
                    {isAdmin(actor) ? (
                      <label className="field">
                        Owner
                        <select name="owner" defaultValue={item.owner}>
                          <StaffOptions staff={staff} />
                        </select>
                      </label>
                    ) : (
                      <input type="hidden" name="owner" value={item.owner} />
                    )}
                    <button className="btn btn-small" type="submit">Save changes</button>
                  </form>
                </details>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

import { acknowledgeStaffPinAction, createStaffPinAction, deleteStaffPinAction, editStaffPinAction } from "@/app/(hub)/extra-actions";
import type { StaffMember, StaffPin, StaffPinAck } from "@/lib/data/types";
import { isAdmin } from "@/lib/domain/access";
import { formatFriendly, toInputDate } from "@/lib/domain/dates";
import { hiddenStaffPins, isUrgentPin, visibleStaffPins } from "@/lib/domain/pins";
import { namesMatch } from "@/lib/domain/people";
import { OutLink } from "@/components/ui";

export function StaffPinBoard({
  pins,
  acks,
  actor,
  today,
  returnTo,
}: {
  pins: StaffPin[];
  acks: StaffPinAck[];
  actor: StaffMember;
  today: Date;
  returnTo: string;
}) {
  const admin = isAdmin(actor);
  const visible = visibleStaffPins(pins, today);
  const hidden = admin ? hiddenStaffPins(pins, today) : [];
  if (!admin && visible.length === 0) return null;

  return (
    <section className="pin-board" aria-label="Pinned for everyone">
      <p className="kicker">For everyone</p>
      {visible.map((pin) => (
        <PinCard key={pin.id} pin={pin} acks={acks} actor={actor} returnTo={returnTo} />
      ))}
      {hidden.length > 0 ? (
        <>
          <p className="hint">No longer showing. The show-until date has passed.</p>
          {hidden.map((pin) => (
            <PinCard key={pin.id} pin={pin} acks={acks} actor={actor} returnTo={returnTo} quiet />
          ))}
        </>
      ) : null}
      {admin ? (
        <details className="pin">
          <summary>Pin something for everyone</summary>
          <PinFields action={createStaffPinAction} returnTo={returnTo} />
        </details>
      ) : null}
    </section>
  );
}

function PinCard({
  pin,
  acks,
  actor,
  returnTo,
  quiet = false,
}: {
  pin: StaffPin;
  acks: StaffPinAck[];
  actor: StaffMember;
  returnTo: string;
  quiet?: boolean;
}) {
  const admin = isAdmin(actor);
  const urgent = isUrgentPin(pin.priority);
  const people = acks.filter((row) => row.pinId === pin.id).map((row) => row.staff);
  const mine = people.some((name) => namesMatch(name, actor.name));
  return (
    <article className={urgent && !quiet ? "pin pin-urgent" : quiet ? "pin pin-quiet" : "pin"}>
      <p className="meta">
        {urgent ? <span className="chip chip-overdue">Urgent</span> : <span className="chip">Normal</span>}
        <span>{pin.author}</span>
        <span>{formatFriendly(pin.posted)}</span>
        {pin.showUntil ? <span>Until {formatFriendly(pin.showUntil)}</span> : null}
      </p>
      <h2>{pin.title}</h2>
      <p className="note">{pin.message}</p>
      {pin.link ? <p><OutLink href={pin.link}>Open link</OutLink></p> : null}
      <div className="button-row">
        {mine ? <span className="hint">You marked this.</span> : (
          <form action={acknowledgeStaffPinAction}>
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="id" value={pin.id} />
            <button className="btn btn-small" type="submit">Got it</button>
          </form>
        )}
      </div>
      {admin ? <p className="hint">{people.length > 0 ? `Got it: ${people.join(", ")}` : "No one has marked this yet."}</p> : null}
      {admin ? (
        <details>
          <summary>Edit</summary>
          <PinFields action={editStaffPinAction} returnTo={returnTo} pin={pin} />
          <form action={deleteStaffPinAction}>
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="id" value={pin.id} />
            <button className="btn" type="submit">Remove</button>
          </form>
        </details>
      ) : null}
    </article>
  );
}

function PinFields({
  action,
  returnTo,
  pin,
}: {
  action: (formData: FormData) => Promise<void>;
  returnTo: string;
  pin?: StaffPin;
}) {
  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="returnTo" value={returnTo} />
      {pin ? <input type="hidden" name="id" value={pin.id} /> : null}
      <label className="field">Title<input name="title" required maxLength={140} defaultValue={pin?.title} /></label>
      <label className="field">Message<textarea name="message" required maxLength={1000} defaultValue={pin?.message} /></label>
      <label className="field">Link <span>optional, https</span><input name="link" defaultValue={pin?.link} placeholder="https://" /></label>
      <label className="field">Priority
        <select name="priority" defaultValue={pin?.priority || "Normal"}>
          <option>Normal</option>
          <option>Urgent</option>
        </select>
      </label>
      <label className="field">Show until <span>optional</span>
        <input type="date" name="showUntil" defaultValue={toInputDate(pin?.showUntil ?? "")} />
      </label>
      <button className="btn btn-primary" type="submit">{pin ? "Save" : "Pin it"}</button>
    </form>
  );
}

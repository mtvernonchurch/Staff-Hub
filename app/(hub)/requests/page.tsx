import Link from "next/link";
import { CalendarOff, Inbox, Megaphone, Palette, Settings } from "lucide-react";
import { createRequestAction } from "@/app/(hub)/actions";
import { createGraphicsRequestAction, createTimeAwayAction, setGraphicsOwnerAction } from "@/app/(hub)/extra-actions";
import { Heading } from "@/components/heading";
import { NeededByField } from "@/components/needed-by-field";
import { StaffOptions } from "@/components/records";
import { StatusChip } from "@/components/status-chip";
import { Flash, PageHeader } from "@/components/ui";
import type { Ministry, StaffMember } from "@/lib/data/types";
import { isAdmin } from "@/lib/domain/access";
import { chicagoToday, formatFriendly, formatUsDate, toInputDate } from "@/lib/domain/dates";
import { AWAY_KINDS, GRAPHICS_NEEDS, GRAPHICS_PLATFORMS } from "@/lib/domain/desk";
import { namesMatch } from "@/lib/domain/people";
import { GENERAL_REQUEST_CHANNELS, KIND_LABEL, deskRows, type DeskRow } from "@/lib/domain/request-desk";
import { requireStaff } from "@/lib/session";
import { graphicsOwner } from "@/lib/services/desk";

export const metadata = { title: "Requests" };

type FormKind = "graphics" | "general" | "away";

const CHOICES: { kind: FormKind; label: string; hint: string; icon: typeof Palette }[] = [
  { kind: "graphics", label: "Graphics or social post", hint: "Graphic, slide, video, print, Facebook or Instagram", icon: Palette },
  { kind: "general", label: "Email, text, website, or Sunday", hint: "The Weekly, a text blast, a web update, an announcement", icon: Megaphone },
  { kind: "away", label: "Time away", hint: "PTO, sick, personal, conference", icon: CalendarOff },
];

function formKind(value: string | undefined): FormKind | null {
  return value === "graphics" || value === "general" || value === "away" ? value : null;
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; new?: string }>;
}) {
  const query = await searchParams;
  // After a successful send, close the form; after an error, keep it open.
  const chosen = query.notice ? null : formKind(query.new);
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
  const rows = deskRows(requests, graphics, away, today);
  const waiting = rows.filter((row) => row.waitingOn(staff));
  const mine = rows.filter((row) => !row.finished && namesMatch(row.requestedBy, staff.name) && !waiting.includes(row));
  const others = rows.filter((row) => !row.finished && !namesMatch(row.requestedBy, staff.name) && !waiting.includes(row));
  const finished = rows.filter((row) => row.finished).slice(0, 10);

  return (
    <>
      <PageHeader
        kicker="Requests"
        icon={Inbox}
        title="Ask for help"
        lede="Graphics, time away, the weekly email, a text, the website, or a Sunday announcement. One place, instead of a crowded inbox."
      />
      <Flash error={query.error} notice={query.notice} />

      <section className="card" aria-labelledby="make-request">
        <h2 id="make-request" className="with-icon">
          <Inbox aria-hidden size={18} strokeWidth={2} />
          <span>Make a request</span>
        </h2>
        <p className="hint">Pick what you need. You&apos;ll get an alert when it moves.</p>
        <div className="choice-grid">
          {CHOICES.map((choice) => (
            <Link
              key={choice.kind}
              href={`/requests?new=${choice.kind}#new-request`}
              className={chosen === choice.kind ? "choice is-chosen" : "choice"}
              aria-current={chosen === choice.kind ? "true" : undefined}
            >
              <choice.icon aria-hidden size={22} />
              <strong>{choice.label}</strong>
              <span>{choice.hint}</span>
            </Link>
          ))}
        </div>
      </section>

      {chosen ? (
        <section className="card" id="new-request" style={{ marginTop: 16 }}>
          <div className="card-head">
            <h2>{CHOICES.find((choice) => choice.kind === chosen)?.label}</h2>
            <Link href="/requests">Cancel</Link>
          </div>
          {chosen === "general" ? <GeneralForm /> : null}
          {chosen === "graphics" ? <GraphicsForm ministries={ministries} owner={owner} today={today} /> : null}
          {chosen === "away" ? <AwayForm people={people} /> : null}
        </section>
      ) : null}

      <section className="card" style={{ marginTop: 16 }}>
        <Heading icon={Inbox}>Needs you</Heading>
        <DeskList rows={waiting} viewer={staff} empty="Nothing is waiting on you." />
      </section>
      <section className="card" style={{ marginTop: 16 }}>
        <Heading icon={Inbox}>Your requests</Heading>
        <DeskList rows={mine} viewer={staff} empty="You have no open requests." />
      </section>
      <section className="card" style={{ marginTop: 16 }}>
        <Heading icon={Inbox}>Everyone else&apos;s open requests</Heading>
        <DeskList rows={others} viewer={staff} empty="No other open requests." />
      </section>
      <section className="card" style={{ marginTop: 16 }}>
        <Heading icon={Inbox}>Recently finished</Heading>
        <DeskList rows={finished} viewer={staff} empty="None yet." />
      </section>

      {isAdmin(staff) ? (
        <section className="card" style={{ marginTop: 16 }}>
          <Heading icon={Settings}>Who gets graphics requests</Heading>
          <p className="hint">
            {owner ? `New graphics requests go to ${owner}.` : "No one is set to receive these yet, so they go to every admin."} The name
            lives in Hub Settings, not in the app.
          </p>
          <form action={setGraphicsOwnerAction} className="stack-form">
            <input type="hidden" name="returnTo" value="/requests" />
            <label className="field">Graphics owner
              <select name="owner" defaultValue={owner}>
                <StaffOptions staff={people} />
              </select>
            </label>
            <button className="btn" type="submit">Save owner</button>
          </form>
        </section>
      ) : null}
    </>
  );
}

function DeskList({ rows, viewer, empty }: { rows: DeskRow[]; viewer: StaffMember; empty: string }) {
  if (rows.length === 0) return <p className="empty">{empty}</p>;
  return (
    <div>
      {rows.map((row) => (
        <Link key={`${row.kind}-${row.id}`} href={row.href} className="meeting-link desk-row">
          <span className="desk-row-top">
            <strong>{row.title}</strong>
            <StatusChip status={row.status} />
          </span>
          <span>
            {KIND_LABEL[row.kind]} · {namesMatch(viewer.name, row.requestedBy) ? "You asked" : row.requestedBy}
            {row.when ? ` · ${row.when}` : ""}
            {row.shortNotice ? " · short notice" : ""}
          </span>
          <span className="desk-row-sub">
            {row.handler ? `${row.handler} · ` : ""}
            {row.updated ? `Updated ${formatFriendly(row.updated)}` : ""}
          </span>
        </Link>
      ))}
    </div>
  );
}

function GeneralForm() {
  return (
    <form action={createRequestAction} className="stack-form">
      <input type="hidden" name="returnTo" value="/requests?new=general" />
      <p className="hint">
        Need a graphic or a social post? <Link href="/requests?new=graphics#new-request">Use Graphics or social post</Link> instead.
      </p>
      <label className="field">What is this about<input name="title" required maxLength={200} /></label>
      <label className="field">The details
        <textarea name="details" required maxLength={2000} placeholder="Date, time, place, audience, and the exact wording." />
      </label>
      <label className="field">Needed by<input type="date" name="neededBy" required /></label>
      <label className="field">Link <span>optional, https</span><input name="link" placeholder="https://" /></label>
      <fieldset className="field">
        <legend>What do you need</legend>
        <div className="checks">
          {GENERAL_REQUEST_CHANNELS.map((channel) => (
            <label key={channel}><input type="checkbox" name="channels" value={channel} />{channel}</label>
          ))}
        </div>
      </fieldset>
      <button className="btn btn-primary" type="submit">Send request</button>
    </form>
  );
}

function GraphicsForm({ ministries, owner, today }: { ministries: Ministry[]; owner: string; today: Date }) {
  return (
    <form action={createGraphicsRequestAction} className="stack-form">
      <input type="hidden" name="returnTo" value="/requests?new=graphics" />
      <p className="hint">{owner ? `This goes to ${owner}.` : "This goes to the admins."}</p>
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
  );
}

function AwayForm({ people }: { people: StaffMember[] }) {
  return (
    <form action={createTimeAwayAction} className="stack-form">
      <input type="hidden" name="returnTo" value="/requests?new=away" />
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
  );
}

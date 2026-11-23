import { createAnnouncementAction, editAnnouncementAction } from "@/app/(hub)/actions";
import { Megaphone } from "lucide-react";
import { Flash, OutLink, PageHeader } from "@/components/ui";
import { isAdmin } from "@/lib/domain/access";
import { ANNOUNCE_CHANNELS, parseChannels } from "@/lib/domain/channels";
import { chicagoToday, formatFriendly, formatUsDate, toInputDate } from "@/lib/domain/dates";
import { sortAnnouncements } from "@/lib/domain/view";
import { requireStaff } from "@/lib/session";

export const metadata = { title: "Announcements" };

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const { staff, store } = await requireStaff();
  const rows = sortAnnouncements(await store.listAnnouncements());
  const today = toInputDate(formatUsDate(chicagoToday()));

  return (
    <>
      <PageHeader
        kicker="What the church needs to hear"
        icon={Megaphone}
        title="Announcements"
        lede="Sunday, email, and staff notes live here. Conversation stays in staff chat."
      />
      <Flash error={query.error} notice={query.notice} />
      <section className="card tone-news">
        {rows.length === 0 ? <p className="empty">No announcements yet.</p> : rows.map((row) => (
          <article key={row.id} className="item">
            <div>
              <h3>{row.event}</h3>
              <p className="meta">
                <span>{formatFriendly(row.date)}</span>
                {row.kind ? <span>{row.kind}</span> : null}
                {parseChannels(row.channels).length > 0 ? <span>{parseChannels(row.channels).join(", ")}</span> : <span>Unsorted</span>}
                {row.audience && row.audience.trim().toLowerCase() !== row.kind.trim().toLowerCase() ? <span>{row.audience}</span> : null}
                {row.announcedWhere ? <span>{row.announcedWhere}</span> : null}
                <span>{row.owner}</span>
              </p>
              {row.details ? <p className="note">{row.details}</p> : null}
              {row.link ? <p className="note"><OutLink href={row.link}>Open link</OutLink></p> : null}
            </div>
            {isAdmin(staff) ? (
              <details>
                <summary>Edit</summary>
                <AnnouncementFields action={editAnnouncementAction} id={row.id} defaults={row} />
              </details>
            ) : null}
          </article>
        ))}
        {isAdmin(staff) ? (
          <details>
            <summary>Post an announcement</summary>
            <AnnouncementFields action={createAnnouncementAction} defaults={{ date: today }} />
          </details>
        ) : null}
      </section>
    </>
  );
}

function AnnouncementFields({
  action,
  id,
  defaults,
}: {
  action: (formData: FormData) => Promise<void>;
  id?: string;
  defaults: Partial<{ date: string; event: string; kind: string; announcedWhere: string; details: string; link: string; audience: string; channels: string }>;
}) {
  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="returnTo" value="/announcements" />
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <label className="field">Date<input type="date" name="date" required defaultValue={defaults.date?.includes("-") ? defaults.date : toInputDate(defaults.date ?? "")} /></label>
      <label className="field">What<input name="event" required defaultValue={defaults.event} /></label>
      <label className="field">Kind<input name="kind" placeholder="Sunday, email, staff" defaultValue={defaults.kind} /></label>
      <label className="field">Announced where<input name="announcedWhere" defaultValue={defaults.announcedWhere} /></label>
      <label className="field">Audience<input name="audience" defaultValue={defaults.audience} /></label>
      <label className="field">Details<textarea name="details" defaultValue={defaults.details} /></label>
      <label className="field">Link <span>optional, https</span><input name="link" defaultValue={defaults.link} placeholder="https://" /></label>
      <fieldset className="field">
        <legend>Channels</legend>
        <div className="checks">
          {ANNOUNCE_CHANNELS.map((channel) => (
            <label key={channel}>
              <input type="checkbox" name="channels" value={channel} defaultChecked={parseChannels(defaults.channels ?? "").includes(channel)} />
              {channel}
            </label>
          ))}
        </div>
      </fieldset>
      <button className="btn btn-primary" type="submit">{id ? "Save" : "Post"}</button>
    </form>
  );
}

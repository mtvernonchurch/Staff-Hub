import { Bell, Mail, Smartphone, Sunrise } from "lucide-react";
import { saveAlertSettingsAction, sendMySummaryAction, sendTestAlertAction } from "@/app/(hub)/notifications/actions";
import { Heading } from "@/components/heading";
import { PushSetup } from "@/components/push-setup";
import { Flash, PageHeader } from "@/components/ui";
import { dataMode } from "@/lib/config";
import { normalizeEmail } from "@/lib/domain/people";
import { emailReady, pushPublicKey, pushReady } from "@/lib/notify/config";
import { prefsFor, previewOutbox } from "@/lib/notify/deliver";
import { requireStaff } from "@/lib/session";

export const metadata = { title: "Alerts" };

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const { staff, store } = await requireStaff();
  const email = normalizeEmail(staff.email);
  const [allPrefs, subscriptions] = await Promise.all([store.listNotificationPrefs(), store.listPushSubscriptions()]);
  const prefs = prefsFor(allPrefs, email);
  const devices = subscriptions.filter((row) => row.email === email);
  const preview = dataMode() === "mock";
  const outbox = preview ? previewOutbox().slice(0, 12) : [];
  const canEmail = emailReady();
  const canPush = pushReady();

  return (
    <>
      <PageHeader
        kicker="Alerts"
        icon={Bell}
        title="How the hub reaches you"
        lede="Get a heads-up when a request comes in, a draft is ready for you, time away is decided, or someone gives you a task."
      />
      <Flash error={query.error} notice={query.notice} />

      <section className="card">
        <Heading icon={Bell}>Your settings</Heading>
        <form action={saveAlertSettingsAction} className="stack-form">
          <label className="toggle-row">
            <input type="checkbox" name="emailOn" defaultChecked={prefs.emailOn} />
            <span>
              <strong><Mail aria-hidden size={16} /> Email me</strong>
              <span className="hint">
                Sent to {staff.email}.
                {preview ? " Preview mode never sends real email." : canEmail ? "" : " Email isn't set up on the hub yet, so nothing goes out until an admin finishes setup."}
              </span>
            </span>
          </label>
          <label className="toggle-row">
            <input type="checkbox" name="pushOn" defaultChecked={prefs.pushOn} />
            <span>
              <strong><Smartphone aria-hidden size={16} /> Phone alerts</strong>
              <span className="hint">
                On each phone or computer where you turn them on below.{" "}
                {devices.length ? `On for ${devices.length === 1 ? "1 device" : `${devices.length} devices`}: ${devices.map((row) => row.device).join(", ")}.` : "No devices yet."}
              </span>
            </span>
          </label>
          <label className="toggle-row">
            <input type="checkbox" name="digestOn" defaultChecked={prefs.digestOn} />
            <span>
              <strong><Sunrise aria-hidden size={16} /> Morning summary</strong>
              <span className="hint">Weekdays at 7:00 AM: what&apos;s overdue, due today, or waiting on you. Skipped when there&apos;s nothing.</span>
            </span>
          </label>
          <button className="btn btn-primary" type="submit">Save my settings</button>
        </form>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <Heading icon={Smartphone}>This phone or computer</Heading>
        {canPush ? (
          <PushSetup publicKey={pushPublicKey()} />
        ) : (
          <p>Phone alerts aren&apos;t set up on the hub yet. Use email for now. The setup steps are in the README.</p>
        )}
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <Heading icon={Bell}>Try it</Heading>
        <p className="hint">Sends only to you, using the settings above.</p>
        <div className="button-row">
          <form action={sendTestAlertAction}>
            <button className="btn" type="submit">Send me a test</button>
          </form>
          <form action={sendMySummaryAction}>
            <button className="btn" type="submit">Send my summary now</button>
          </form>
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <Heading icon={Bell}>What you&apos;ll hear about</Heading>
        <ul className="plain-list">
          <li>A new request or graphics request that comes to you</li>
          <li>Your request changes status, or a draft is ready for your review</li>
          <li>Your time away is approved or denied (admins: a new time away request)</li>
          <li>Someone gives you a task</li>
          <li>A note pinned for everyone on Home</li>
        </ul>
        <p className="hint">You never get an alert about something you did yourself.</p>
      </section>

      {preview ? (
        <section className="card" style={{ marginTop: 16 }}>
          <Heading icon={Bell}>Recent alerts (preview only)</Heading>
          {outbox.length === 0 ? (
            <p className="empty">Nothing yet. Send a request or switch to Blake and send one to Avery, then come back.</p>
          ) : (
            outbox.map((entry, index) => (
              <div key={`${entry.title}-${index}`} className="meeting-link">
                <strong>To {entry.name}: {entry.title}</strong>
                <span>{entry.body} · {entry.channels.join(", ")}</span>
              </div>
            ))
          )}
        </section>
      ) : null}
    </>
  );
}

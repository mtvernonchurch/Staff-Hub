import type { HubStore, StaffMember } from "@/lib/data/types";
import { chicagoToday, formatUsDate } from "@/lib/domain/dates";
import { normalizeEmail } from "@/lib/domain/people";
import { buildDigest } from "@/lib/notify/digest";
import { deliver, prefsFor, type DeliveryReport } from "@/lib/notify/deliver";
import type { Notice } from "@/lib/notify/events";

export const LAST_DIGEST_SETTING = "Last Morning Summary";

export type DigestRun = { skipped?: string; people: number; report: DeliveryReport };

async function gather(store: HubStore) {
  const [staff, prefs, items, requests, graphics, away] = await Promise.all([
    store.listStaff(),
    store.listNotificationPrefs(),
    store.listActionItems(),
    store.listRequests(),
    store.listGraphicsRequests(),
    store.listTimeAway(),
  ]);
  return { staff, prefs, items, requests, graphics, away };
}

function digestFor(person: StaffMember, today: Date, data: Awaited<ReturnType<typeof gather>>): Notice | null {
  return buildDigest({ person, today, items: data.items, requests: data.requests, graphics: data.graphics, away: data.away });
}

/**
 * Sends each active staff member who wants it their morning summary.
 * Runs once a day: a second run on the same day does nothing, so a repeated
 * schedule delivery never sends two emails.
 */
export async function sendMorningDigests(store: HubStore, today = chicagoToday()): Promise<DigestRun> {
  const label = formatUsDate(today);
  const settings = await store.listSettings();
  if (settings.find((row) => row.key === LAST_DIGEST_SETTING)?.value === label) {
    return { skipped: `Already sent for ${label}.`, people: 0, report: { emailed: 0, pushed: 0, previewed: 0, failed: 0 } };
  }
  await store.setSetting(LAST_DIGEST_SETTING, label);
  const data = await gather(store);
  const notices = data.staff
    .filter((person) => person.active && person.email.trim())
    .filter((person) => prefsFor(data.prefs, normalizeEmail(person.email)).digestOn)
    .map((person) => digestFor(person, today, data))
    .filter((notice): notice is Notice => notice !== null);
  const report = await deliver(store, notices);
  return { people: notices.length, report };
}

/** One person's summary right now, for the "send me my summary" button. */
export async function sendMyDigest(store: HubStore, person: StaffMember, today = chicagoToday()): Promise<{ empty: boolean; report: DeliveryReport }> {
  const data = await gather(store);
  const notice = digestFor(person, today, data);
  if (!notice) return { empty: true, report: { emailed: 0, pushed: 0, previewed: 0, failed: 0 } };
  return { empty: false, report: await deliver(store, [notice]) };
}

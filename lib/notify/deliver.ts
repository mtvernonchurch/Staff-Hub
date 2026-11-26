import { dataMode } from "@/lib/config";
import type { HubStore, NotificationPrefs, PushSubscriptionRow } from "@/lib/data/types";
import { formatUsDate, chicagoToday } from "@/lib/domain/dates";
import { emailReady, pushReady } from "@/lib/notify/config";
import { sendEmail } from "@/lib/notify/email";
import type { Notice } from "@/lib/notify/events";
import { sendPush } from "@/lib/notify/push";

export type DeliveryReport = {
  emailed: number;
  pushed: number;
  /** Sample mode records alerts here instead of emailing fictional people. */
  previewed: number;
  failed: number;
};

export type OutboxEntry = {
  at: string;
  name: string;
  title: string;
  body: string;
  path: string;
  channels: string[];
};

const OUTBOX_LIMIT = 30;
const box = globalThis as typeof globalThis & { __mvHubOutbox?: OutboxEntry[] };

/** Recent alerts in sample mode, newest first. Empty with the real sheet. */
export function previewOutbox(): OutboxEntry[] {
  return [...(box.__mvHubOutbox ?? [])];
}

function record(entry: OutboxEntry) {
  box.__mvHubOutbox = [entry, ...(box.__mvHubOutbox ?? [])].slice(0, OUTBOX_LIMIT);
}

export function defaultPrefs(email: string): NotificationPrefs {
  return { email, emailOn: true, pushOn: true, digestOn: true, updated: "" };
}

export function prefsFor(rows: NotificationPrefs[], email: string): NotificationPrefs {
  const key = email.trim().toLowerCase();
  return rows.find((row) => row.email === key) ?? defaultPrefs(key);
}

/**
 * Sends each alert by email and to each phone the person turned on, as
 * their settings allow. Never throws: a failed alert must not undo a save.
 */
export async function deliver(store: HubStore, notices: Notice[]): Promise<DeliveryReport> {
  const report: DeliveryReport = { emailed: 0, pushed: 0, previewed: 0, failed: 0 };
  if (notices.length === 0) return report;
  const preview = dataMode() === "mock";
  const canEmail = !preview && emailReady();
  const canPush = pushReady();
  let prefs: NotificationPrefs[] = [];
  let subscriptions: PushSubscriptionRow[] = [];
  try {
    prefs = await store.listNotificationPrefs();
    if (canPush) subscriptions = await store.listPushSubscriptions();
  } catch (error) {
    console.error("could not read alert settings", error instanceof Error ? error.message : "unknown");
  }
  for (const notice of notices) {
    const settings = prefsFor(prefs, notice.email);
    const channels: string[] = [];
    if (settings.emailOn && canEmail) {
      try {
        await sendEmail(notice);
        report.emailed += 1;
        channels.push("email");
      } catch (error) {
        report.failed += 1;
        console.error("email failed", error instanceof Error ? error.message.slice(0, 300) : "unknown");
      }
    } else if (settings.emailOn && preview) {
      channels.push("email (preview only)");
    }
    if (settings.pushOn && canPush) {
      for (const row of subscriptions.filter((item) => item.email === notice.email)) {
        const outcome = await sendPush(row, notice);
        if (outcome === "sent") {
          report.pushed += 1;
          channels.push("phone");
        } else if (outcome === "gone") {
          await store.deletePushSubscription(row.id).catch(() => undefined);
        } else {
          report.failed += 1;
        }
      }
    }
    if (preview) {
      report.previewed += 1;
      record({
        at: formatUsDate(chicagoToday()),
        name: notice.name,
        title: notice.title,
        body: notice.body,
        path: notice.path,
        channels: channels.length ? channels : ["none (turned off)"],
      });
    }
  }
  return report;
}

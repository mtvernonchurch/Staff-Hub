import { sendNotification } from "web-push";
import type { PushSubscriptionRow } from "@/lib/data/types";
import { pushPrivateKey, pushPublicKey, pushSubject } from "@/lib/notify/config";
import type { Notice } from "@/lib/notify/events";

export type PushOutcome = "sent" | "gone" | "failed";

/** What the service worker in public/sw.js reads. */
export function pushPayload(notice: Notice): string {
  return JSON.stringify({ title: notice.title, body: notice.body, url: notice.path, tag: notice.tag });
}

/**
 * Sends one alert to one phone or browser. "gone" means the device turned
 * alerts off or was reset, so the caller should forget that subscription.
 */
export async function sendPush(row: PushSubscriptionRow, notice: Notice): Promise<PushOutcome> {
  try {
    await sendNotification(
      { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
      pushPayload(notice),
      {
        vapidDetails: { subject: pushSubject(), publicKey: pushPublicKey(), privateKey: pushPrivateKey() },
        TTL: 60 * 60 * 24,
        urgency: notice.urgent ? "high" : "normal",
        timeout: 10_000,
      },
    );
    return "sent";
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone";
    console.error("push failed", status ?? "", error instanceof Error ? error.message.slice(0, 200) : "unknown");
    return "failed";
  }
}

"use server";

import { redirect } from "next/navigation";
import { isFrameworkError } from "@/lib/framework";
import { chicagoToday, formatUsDate } from "@/lib/domain/dates";
import { newId } from "@/lib/domain/ids";
import { withQuery } from "@/lib/domain/links";
import { normalizeEmail } from "@/lib/domain/people";
import { HubError } from "@/lib/hub-error";
import { deliver, prefsFor, type DeliveryReport } from "@/lib/notify/deliver";
import { isPushEndpoint } from "@/lib/notify/endpoints";
import { sendMyDigest } from "@/lib/notify/run-digest";
import { requireStaff } from "@/lib/session";

const PAGE = "/notifications";

async function run(work: () => Promise<string>) {
  let notice = "Saved.";
  try {
    notice = await work();
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    const message = error instanceof HubError ? error.message : "Something went wrong. Please try again.";
    if (!(error instanceof HubError)) console.error(error instanceof Error ? error.message : error);
    redirect(withQuery(PAGE, "error", message));
  }
  redirect(withQuery(PAGE, "notice", notice));
}

function describe(report: DeliveryReport): string {
  const parts: string[] = [];
  if (report.emailed) parts.push("emailed you");
  if (report.pushed) parts.push(`sent it to ${report.pushed === 1 ? "1 device" : `${report.pushed} devices`}`);
  if (parts.length) return `Done. The hub ${parts.join(" and ")}.`;
  if (report.previewed) return "Preview mode: nothing was emailed. It's listed under Recent alerts below.";
  if (report.failed) return "That didn't go through. Check the email and phone setup in the README.";
  return "Nothing was sent. Turn on email or phone alerts first, or finish the setup in the README.";
}

export async function saveAlertSettingsAction(formData: FormData) {
  await run(async () => {
    const { staff, store } = await requireStaff();
    await store.saveNotificationPrefs({
      email: normalizeEmail(staff.email),
      emailOn: formData.get("emailOn") === "on",
      pushOn: formData.get("pushOn") === "on",
      digestOn: formData.get("digestOn") === "on",
      updated: formatUsDate(chicagoToday()),
    });
    return "Your alert settings are saved.";
  });
}

export async function sendTestAlertAction() {
  await run(async () => {
    const { staff, store } = await requireStaff();
    const report = await deliver(store, [
      {
        email: normalizeEmail(staff.email),
        name: staff.name,
        title: "Test alert from the Staff Hub",
        body: "If you can read this, alerts reach you here.",
        path: PAGE,
        tag: "test",
      },
    ]);
    return describe(report);
  });
}

export async function sendMySummaryAction() {
  await run(async () => {
    const { staff, store } = await requireStaff();
    const result = await sendMyDigest(store, staff);
    if (result.empty) return "Nothing is overdue or waiting on you, so there's no summary to send today.";
    return describe(result.report);
  });
}

type BrowserSubscription = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };

/** Called by the "Turn on alerts" button after the phone says yes. */
export async function savePushSubscriptionAction(input: { subscription: BrowserSubscription; device: string }): Promise<{ ok: boolean; message?: string }> {
  try {
    const { staff, store } = await requireStaff();
    const endpoint = typeof input.subscription?.endpoint === "string" ? input.subscription.endpoint : "";
    const p256dh = typeof input.subscription?.keys?.p256dh === "string" ? input.subscription.keys.p256dh : "";
    const auth = typeof input.subscription?.keys?.auth === "string" ? input.subscription.keys.auth : "";
    if (!isPushEndpoint(endpoint) || !p256dh || !auth) return { ok: false, message: "This browser sent an alert address the hub doesn't recognize." };
    const email = normalizeEmail(staff.email);
    await store.savePushSubscription({
      id: newId("push"),
      email,
      endpoint,
      p256dh: p256dh.slice(0, 200),
      auth: auth.slice(0, 100),
      device: input.device.replace(/[^\w .-]/g, "").slice(0, 40) || "Browser",
      created: formatUsDate(chicagoToday()),
    });
    const prefs = prefsFor(await store.listNotificationPrefs(), email);
    if (!prefs.pushOn) await store.saveNotificationPrefs({ ...prefs, pushOn: true, updated: formatUsDate(chicagoToday()) });
    return { ok: true };
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    console.error("save push subscription failed", error instanceof Error ? error.message : "unknown");
    return { ok: false, message: "The hub couldn't save this device. Try again." };
  }
}

/** Called by "Turn off on this device". Only removes the signed-in person's own device. */
export async function removePushSubscriptionAction(endpoint: string): Promise<{ ok: boolean }> {
  try {
    const { staff, store } = await requireStaff();
    const email = normalizeEmail(staff.email);
    const rows = (await store.listPushSubscriptions()).filter((row) => row.endpoint === endpoint && row.email === email);
    for (const row of rows) await store.deletePushSubscription(row.id);
    return { ok: true };
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return { ok: false };
  }
}

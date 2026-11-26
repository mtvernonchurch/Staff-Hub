import { after } from "next/server";
import type { HubStore, StaffMember } from "@/lib/data/types";
import { deliver } from "@/lib/notify/deliver";
import { noticesFor, type HubEvent } from "@/lib/notify/events";

export type { HubEvent } from "@/lib/notify/events";

export type Notify = (event: HubEvent) => void | Promise<void>;

/** Runs after the page answers, so a slow email never makes a save feel slow. */
function later(task: () => Promise<unknown>): Promise<void> {
  try {
    after(task);
    return Promise.resolve();
  } catch {
    // Outside a request (tests, scripts) there is no "after"; run it now.
    return task().then(() => undefined);
  }
}

/**
 * Tells the right people about something that just happened. Services call
 * this after a save. It never throws, so an alert problem cannot undo a save.
 * Tests pass their own `notify` to see which events fired.
 */
export async function announce(
  deps: { store: HubStore; actor: StaffMember; notify?: Notify },
  event: HubEvent,
): Promise<void> {
  try {
    if (deps.notify) {
      await deps.notify(event);
      return;
    }
    const staff = await deps.store.listStaff();
    const notices = noticesFor(event, deps.actor, staff);
    if (notices.length === 0) return;
    await later(() => deliver(deps.store, notices));
  } catch (error) {
    console.error("alert failed", error instanceof Error ? error.message : "unknown");
  }
}

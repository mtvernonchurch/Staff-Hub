import type { ActionItem } from "@/lib/data/types";

/**
 * Hook for a later staff-chat integration.
 *
 * The church's conversation lives in staff chat. This hub keeps the records.
 * A future notifier can post when an action item is created or overdue.
 * Nothing is sent today: `NoopStaffChat` is the only implementation.
 *
 * Wire a real notifier by replacing `createStaffChat()` once a chat app is
 * allowed in the Workspace admin console. Keep failures inside the notifier
 * so a chat outage never blocks saving a record. The on-screen copy says
 * "staff chat" and does not name a product.
 */
export type StaffChatEvent =
  | { type: "action_item.created"; item: ActionItem; actorName: string }
  | { type: "action_item.overdue"; items: ActionItem[] };

export interface StaffChatNotifier {
  notify(event: StaffChatEvent): Promise<void>;
}

export class NoopStaffChat implements StaffChatNotifier {
  async notify(): Promise<void> {}
}

export function createStaffChat(): StaffChatNotifier {
  return new NoopStaffChat();
}

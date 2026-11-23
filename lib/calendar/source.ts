import type { CalendarEvent, HubStore } from "@/lib/data/types";

/**
 * Events for the 4-week check. The sheet is the source today.
 * A Planning Center Calendar or Google Calendar feed can implement this later
 * and leave the readiness checks on the Calendar Checks tab.
 */
export interface CalendarSource {
  listEvents(): Promise<CalendarEvent[]>;
}

export function sheetCalendarSource(store: HubStore): CalendarSource {
  return {
    listEvents: () => store.listCalendarEvents(),
  };
}

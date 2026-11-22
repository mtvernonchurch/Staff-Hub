import type { CalendarCheck, CalendarEvent } from "@/lib/data/types";
import type { Deps } from "@/lib/services/hub";
import { isAdmin } from "@/lib/domain/access";
import { toSheetDate } from "@/lib/domain/dates";
import { newId } from "@/lib/domain/ids";
import { namesMatch } from "@/lib/domain/people";
import { HubError } from "@/lib/hub-error";

function assertAdmin(deps: Deps) {
  if (!deps.actor.active) throw new HubError("Your staff record is inactive. Ask an admin to turn it back on.");
  if (!isAdmin(deps.actor)) throw new HubError("Only an admin can edit the calendar.");
}

export async function createCalendarEvent(
  deps: Deps,
  input: { date: string; time: string; event: string; ministry: string; location: string; owner: string },
): Promise<CalendarEvent> {
  assertAdmin(deps);
  const event = input.event.trim();
  if (!event) throw new HubError("Name the event.");
  let owner = input.owner.trim();
  if (owner) {
    const staff = await deps.store.listStaff();
    const match = staff.find((person) => person.active && namesMatch(person.name, owner));
    if (!match) throw new HubError("Choose an active staff member.");
    owner = match.name;
  }
  const row: CalendarEvent = {
    id: newId("cal"),
    date: toSheetDate(input.date),
    time: input.time.trim(),
    event,
    ministry: input.ministry.trim(),
    location: input.location.trim(),
    owner,
  };
  await deps.store.createCalendarEvent(row);
  return row;
}

export async function updateCalendarEvent(
  deps: Deps,
  id: string,
  input: { date: string; time: string; event: string; ministry: string; location: string; owner: string },
): Promise<CalendarEvent> {
  assertAdmin(deps);
  const existing = (await deps.store.listCalendarEvents()).find((row) => row.id === id);
  if (!existing) throw new HubError("That event is no longer on the calendar.");
  const event = input.event.trim();
  if (!event) throw new HubError("Name the event.");
  let owner = input.owner.trim();
  if (owner) {
    const staff = await deps.store.listStaff();
    const match = staff.find((person) => person.active && namesMatch(person.name, owner));
    if (!match) throw new HubError("Choose an active staff member.");
    owner = match.name;
  }
  const next: CalendarEvent = {
    ...existing,
    date: toSheetDate(input.date),
    time: input.time.trim(),
    event,
    ministry: input.ministry.trim(),
    location: input.location.trim(),
    owner,
  };
  await deps.store.updateCalendarEvent(id, next);
  return next;
}

export async function saveCalendarCheck(
  deps: Deps,
  eventId: string,
  input: Partial<Omit<CalendarCheck, "id" | "eventId">>,
): Promise<CalendarCheck> {
  assertAdmin(deps);
  const event = (await deps.store.listCalendarEvents()).find((row) => row.id === eventId);
  if (!event) throw new HubError("That event is no longer on the calendar.");
  const existing = (await deps.store.listCalendarChecks()).find((row) => row.eventId === eventId);
  const notes = input.notes !== undefined ? input.notes.trim() : existing?.notes ?? "";
  if (notes.length > 500) throw new HubError("Notes need to stay under 500 characters.");
  const next: CalendarCheck = {
    id: existing?.id ?? newId("chkcal"),
    eventId,
    promotedEmail: input.promotedEmail ?? existing?.promotedEmail ?? false,
    promotedSocials: input.promotedSocials ?? existing?.promotedSocials ?? false,
    promotedPlatform: input.promotedPlatform ?? existing?.promotedPlatform ?? false,
    volunteersSet: input.volunteersSet ?? existing?.volunteersSet ?? false,
    graphicsRequested: input.graphicsRequested ?? existing?.graphicsRequested ?? false,
    notes,
  };
  if (existing) await deps.store.updateCalendarCheck(existing.id, next);
  else await deps.store.createCalendarCheck(next);
  return next;
}

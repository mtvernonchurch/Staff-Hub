import type { StaffMember, StaffPin, StaffPinAck } from "@/lib/data/types";
import type { Deps } from "@/lib/services/hub";
import { chicagoToday, formatUsDate, toSheetDate } from "@/lib/domain/dates";
import { newId } from "@/lib/domain/ids";
import { safeHttps } from "@/lib/domain/links";
import { namesMatch } from "@/lib/domain/people";
import { canManageRecords } from "@/lib/domain/permissions";
import { HubError } from "@/lib/hub-error";

function assertActive(actor: StaffMember) {
  if (!actor.active) throw new HubError("Your staff record is inactive. Ask an admin to turn it back on.");
}

function day(deps: Deps): string {
  return formatUsDate(deps.today ?? chicagoToday());
}

function optionalHttps(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const safe = safeHttps(trimmed);
  if (!safe) throw new HubError(`${label} needs to be blank or start with https://`);
  return safe;
}

function limit(value: string, max: number, label: string): string {
  const trimmed = value.trim();
  if (trimmed.length > max) throw new HubError(`${label} needs to stay under ${max.toLocaleString("en-US")} characters.`);
  return trimmed;
}

function priority(value: string): "Normal" | "Urgent" {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed === "normal") return "Normal";
  if (trimmed === "urgent") return "Urgent";
  throw new HubError("Priority is Normal or Urgent.");
}

function optionalDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return toSheetDate(trimmed);
}

export async function createStaffPin(
  deps: Deps,
  input: { title: string; message: string; link: string; priority: string; showUntil: string },
): Promise<StaffPin> {
  assertActive(deps.actor);
  if (!canManageRecords(deps.actor)) throw new HubError("Only an admin can pin a note for the staff.");
  const title = limit(input.title, 140, "Title");
  if (!title) throw new HubError("Give the note a title.");
  const message = limit(input.message, 1000, "Message");
  if (!message) throw new HubError("Write the message.");
  const row: StaffPin = {
    id: newId("pin"),
    title,
    message,
    link: optionalHttps(input.link, "The link"),
    priority: priority(input.priority),
    showUntil: optionalDate(input.showUntil),
    author: deps.actor.name,
    posted: day(deps),
  };
  await deps.store.createStaffPin(row);
  return row;
}

export async function updateStaffPin(
  deps: Deps,
  id: string,
  input: { title: string; message: string; link: string; priority: string; showUntil: string },
): Promise<void> {
  assertActive(deps.actor);
  if (!canManageRecords(deps.actor)) throw new HubError("Only an admin can edit a pinned note.");
  const existing = (await deps.store.listStaffPins()).find((row) => row.id === id);
  if (!existing) throw new HubError("That pinned post is no longer on the list. Refresh and try again.");
  const title = limit(input.title, 140, "Title");
  if (!title) throw new HubError("Give the note a title.");
  const message = limit(input.message, 1000, "Message");
  if (!message) throw new HubError("Write the message.");
  await deps.store.updateStaffPin(id, {
    title,
    message,
    link: optionalHttps(input.link, "The link"),
    priority: priority(input.priority),
    showUntil: optionalDate(input.showUntil),
  });
}

export async function deleteStaffPin(deps: Deps, id: string): Promise<void> {
  assertActive(deps.actor);
  if (!canManageRecords(deps.actor)) throw new HubError("Only an admin can remove a pinned note.");
  await deps.store.deleteStaffPin(id);
}

export async function acknowledgeStaffPin(deps: Deps, id: string): Promise<StaffPinAck> {
  assertActive(deps.actor);
  const pin = (await deps.store.listStaffPins()).find((row) => row.id === id);
  if (!pin) throw new HubError("That pinned post is no longer on the list. Refresh and try again.");
  const existing = (await deps.store.listStaffPinAcks()).find(
    (row) => row.pinId === id && namesMatch(row.staff, deps.actor.name),
  );
  if (existing) return existing;
  const row: StaffPinAck = {
    id: newId("ack"),
    pinId: id,
    staff: deps.actor.name,
    acknowledgedOn: day(deps),
  };
  await deps.store.createStaffPinAck(row);
  return row;
}

export function pinAcknowledgedBy(acks: StaffPinAck[], pinId: string): string[] {
  return acks.filter((row) => row.pinId === pinId).map((row) => row.staff);
}

export function actorAcknowledged(acks: StaffPinAck[], pinId: string, actor: { name: string }): boolean {
  return acks.some((row) => row.pinId === pinId && namesMatch(row.staff, actor.name));
}

import type { GraphicsRequest, StaffMember, TimeAway, WorkStatus } from "@/lib/data/types";
import type { Deps } from "@/lib/services/hub";
import { isAdmin } from "@/lib/domain/access";
import {
  AWAY_KINDS,
  GRAPHICS_NEEDS,
  GRAPHICS_OWNER_SETTING,
  GRAPHICS_PLATFORMS,
  GRAPHICS_STATUSES,
  WORK_PLACES,
  splitList,
} from "@/lib/domain/desk";
import { chicagoToday, formatUsDate, parseSheetDate, sameDay, toSheetDate } from "@/lib/domain/dates";
import { newId } from "@/lib/domain/ids";
import { safeHttps } from "@/lib/domain/links";
import { namesMatch } from "@/lib/domain/people";
import { HubError } from "@/lib/hub-error";

function assertActive(actor: StaffMember) {
  if (!actor.active) throw new HubError("Your staff record is inactive. Ask an admin to turn it back on.");
}

function day(deps: Deps): string {
  return formatUsDate(deps.today ?? chicagoToday());
}

function limit(value: string, max: number, label: string): string {
  const trimmed = value.trim();
  if (trimmed.length > max) throw new HubError(`${label} needs to stay under ${max.toLocaleString("en-US")} characters.`);
  return trimmed;
}

async function activeOwner(deps: Deps, name: string): Promise<string> {
  const staff = await deps.store.listStaff();
  const match = staff.filter((person) => person.active).find((person) => namesMatch(person.name, name));
  if (!match) throw new HubError("Choose an active staff member.");
  return match.name;
}

function picked<T extends string>(chosen: string[], allowed: readonly T[], label: string): string {
  const values = allowed.filter((item) => chosen.includes(item));
  if (values.length === 0) throw new HubError(`Choose at least one ${label}.`);
  return values.join(", ");
}

function httpsList(value: string): string {
  const links = splitList(value);
  return links
    .map((link) => {
      const safe = safeHttps(link);
      if (!safe) throw new HubError("Each link needs to start with https://");
      return safe;
    })
    .join("\n");
}

export async function graphicsOwner(deps: Pick<Deps, "store">): Promise<string> {
  const settings = await deps.store.listSettings();
  return settings.find((row) => row.key === GRAPHICS_OWNER_SETTING)?.value.trim() ?? "";
}

export async function setGraphicsOwner(deps: Deps, name: string): Promise<void> {
  assertActive(deps.actor);
  if (!isAdmin(deps.actor)) throw new HubError("Only an admin can choose who receives graphics requests.");
  const owner = await activeOwner(deps, name);
  await deps.store.setSetting(GRAPHICS_OWNER_SETTING, owner);
}

export async function createGraphicsRequest(
  deps: Deps,
  input: {
    ministry: string;
    needed: string[];
    platforms: string[];
    event: string;
    eventDate: string;
    neededBy: string;
    description: string;
    links: string;
  },
): Promise<GraphicsRequest> {
  assertActive(deps.actor);
  const ministry = input.ministry.trim();
  if (!ministry) throw new HubError("Choose a ministry.");
  const ministries = await deps.store.listMinistries();
  if (ministries.length > 0 && !ministries.some((row) => namesMatch(row.ministry, ministry))) {
    throw new HubError("Choose a ministry from the list.");
  }
  const event = limit(input.event, 160, "Event name");
  if (!event) throw new HubError("Name the event.");
  const description = limit(input.description, 2000, "Description");
  if (!description) throw new HubError("Add the copy or a description of what you need.");
  const configured = await graphicsOwner(deps);
  let assignedTo = "";
  if (configured) {
    const staff = await deps.store.listStaff();
    assignedTo = staff.find((person) => person.active && namesMatch(person.name, configured))?.name ?? "";
  }
  const row: GraphicsRequest = {
    id: newId("gfx"),
    requestedBy: deps.actor.name,
    ministry,
    needed: picked(input.needed, GRAPHICS_NEEDS, "thing you need"),
    platforms: picked(input.platforms, GRAPHICS_PLATFORMS, "platform"),
    event,
    eventDate: toSheetDate(input.eventDate),
    neededBy: toSheetDate(input.neededBy),
    description,
    links: httpsList(input.links),
    status: "New",
    assignedTo,
    created: day(deps),
  };
  await deps.store.createGraphicsRequest(row);
  return row;
}

export async function updateGraphicsRequest(
  deps: Deps,
  id: string,
  input: { status?: string; assignedTo?: string },
): Promise<void> {
  assertActive(deps.actor);
  const existing = (await deps.store.listGraphicsRequests()).find((row) => row.id === id);
  if (!existing) throw new HubError("That graphics request is no longer on the list.");
  const next: Partial<GraphicsRequest> = {};
  if (input.assignedTo !== undefined && !namesMatch(input.assignedTo, existing.assignedTo)) {
    if (!isAdmin(deps.actor)) throw new HubError("Only an admin can reassign a graphics request.");
    next.assignedTo = input.assignedTo.trim() ? await activeOwner(deps, input.assignedTo) : "";
  }
  if (input.status !== undefined && input.status !== existing.status) {
    if (!(GRAPHICS_STATUSES as readonly string[]).includes(input.status)) throw new HubError("That is not a graphics status.");
    const canMove = isAdmin(deps.actor) || namesMatch(deps.actor.name, existing.assignedTo);
    if (!canMove) throw new HubError("The person assigned to graphics requests can update the status.");
    next.status = input.status;
  }
  await deps.store.updateGraphicsRequest(id, next);
}

export async function createTimeAway(
  deps: Deps,
  input: { kind: string; start: string; end: string; halfDay: boolean; notes: string; coverage: string },
): Promise<TimeAway> {
  assertActive(deps.actor);
  if (!(AWAY_KINDS as readonly string[]).includes(input.kind)) throw new HubError("Choose a type of time away.");
  const start = toSheetDate(input.start);
  const end = input.halfDay ? start : toSheetDate(input.end);
  const startAt = parseSheetDate(start);
  const endAt = parseSheetDate(end);
  if (!startAt || !endAt || endAt.getTime() < startAt.getTime()) {
    throw new HubError("The end date needs to be on or after the start date.");
  }
  let coverage = input.coverage.trim();
  if (coverage) coverage = await activeOwner(deps, coverage);
  const row: TimeAway = {
    id: newId("away"),
    requestedBy: deps.actor.name,
    kind: input.kind,
    start,
    end,
    halfDay: input.halfDay,
    notes: limit(input.notes, 1000, "Notes"),
    coverage,
    status: "Pending",
    created: day(deps),
  };
  await deps.store.createTimeAway(row);
  return row;
}

export async function decideTimeAway(deps: Deps, id: string, status: string): Promise<void> {
  assertActive(deps.actor);
  if (!isAdmin(deps.actor)) throw new HubError("Only an admin can approve or deny time away.");
  if (status !== "Approved" && status !== "Denied") throw new HubError("Approve or deny the request.");
  const existing = (await deps.store.listTimeAway()).find((row) => row.id === id);
  if (!existing) throw new HubError("That time away request is no longer on the list.");
  if (existing.status !== "Pending") throw new HubError("This request has already been decided.");
  await deps.store.updateTimeAway(id, { status });
}

export async function setWorkStatus(deps: Deps, input: { place: string; note: string }): Promise<WorkStatus> {
  assertActive(deps.actor);
  if (!(WORK_PLACES as readonly string[]).includes(input.place)) throw new HubError("Choose where you are working.");
  const date = day(deps);
  const note = limit(input.note, 200, "Note");
  const existing = (await deps.store.listWorkStatuses()).find(
    (row) => namesMatch(row.staff, deps.actor.name) && sameDay(row.date, date),
  );
  if (existing) {
    await deps.store.updateWorkStatus(existing.id, { place: input.place, note });
    return { ...existing, place: input.place, note };
  }
  const row: WorkStatus = {
    id: newId("work"),
    date,
    staff: deps.actor.name,
    place: input.place,
    note,
  };
  await deps.store.createWorkStatus(row);
  return row;
}

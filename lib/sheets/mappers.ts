import type {
  ActionItem,
  Announcement,
  CardAction,
  CareNote,
  ChecklistItem,
  ChecklistTemplateRow,
  DeskRequest,
  FolderLink,
  GraphicsRequest,
  HubSetting,
  Meeting,
  Ministry,
  MinistryUpdate,
  OpenIssue,
  PinnedDocument,
  QuickLink,
  StaffMember,
  StaffPin,
  StaffPinAck,
  TimeAway,
  WorkflowCard,
  WorkStatus,
} from "@/lib/data/types";
import { cell, formatBool, parseBool } from "@/lib/sheets/codec";

export function toStaff(record: Record<string, string>): StaffMember | null {
  const name = cell(record, "Name");
  const email = cell(record, "Email");
  if (!name && !email) return null;
  return {
    name,
    email,
    title: cell(record, "Title"),
    role: cell(record, "Role"),
    photo: cell(record, "Photo"),
    active: parseBool(cell(record, "Active")),
  };
}

export function meetingCells(meeting: Partial<Meeting>): Record<string, string> {
  const cells: Record<string, string> = {};
  if (meeting.id !== undefined) cells["Meeting ID"] = meeting.id;
  if (meeting.date !== undefined) cells.Date = meeting.date;
  if (meeting.title !== undefined) cells.Title = meeting.title;
  if (meeting.status !== undefined) cells.Status = meeting.status;
  if (meeting.attendees !== undefined) cells.Attendees = meeting.attendees;
  if (meeting.notesBy !== undefined) cells["Notes By"] = meeting.notesBy;
  if (meeting.prayer !== undefined) cells["Prayer Requests"] = meeting.prayer;
  if (meeting.wins !== undefined) cells.Wins = meeting.wins;
  if (meeting.lookahead !== undefined) cells["Calendar Look-ahead"] = meeting.lookahead;
  if (meeting.care !== undefined) cells["Care Update"] = meeting.care;
  if (meeting.notes !== undefined) cells.Notes = meeting.notes;
  return cells;
}

export function toMeeting(record: Record<string, string>): Meeting | null {
  const id = cell(record, "Meeting ID");
  if (!id) return null;
  return {
    id,
    date: cell(record, "Date"),
    title: cell(record, "Title"),
    status: cell(record, "Status"),
    attendees: cell(record, "Attendees"),
    notesBy: cell(record, "Notes By"),
    prayer: cell(record, "Prayer Requests"),
    wins: cell(record, "Wins"),
    lookahead: cell(record, "Calendar Look-ahead"),
    care: cell(record, "Care Update"),
    notes: cell(record, "Notes"),
  };
}

export function actionCells(item: Partial<ActionItem>): Record<string, string> {
  const cells: Record<string, string> = {};
  if (item.id !== undefined) cells["Item ID"] = item.id;
  if (item.action !== undefined) cells.Action = item.action;
  if (item.owner !== undefined) cells.Owner = item.owner;
  if (item.due !== undefined) cells.Due = item.due;
  if (item.status !== undefined) cells.Status = item.status;
  if (item.meetingId !== undefined) cells.Meeting = item.meetingId;
  if (item.update !== undefined) cells.Update = item.update;
  if (item.created !== undefined) cells.Created = item.created;
  if (item.completedOn !== undefined) cells["Completed On"] = item.completedOn;
  if (item.ministry !== undefined) cells.Ministry = item.ministry;
  return cells;
}

export function toActionItem(record: Record<string, string>): ActionItem | null {
  const id = cell(record, "Item ID");
  if (!id) return null;
  return {
    id,
    action: cell(record, "Action"),
    owner: cell(record, "Owner"),
    due: cell(record, "Due"),
    status: cell(record, "Status") || "Open",
    meetingId: cell(record, "Meeting"),
    update: cell(record, "Update"),
    created: cell(record, "Created"),
    completedOn: cell(record, "Completed On"),
    ministry: cell(record, "Ministry"),
  };
}

export function checklistCells(item: Partial<ChecklistItem>): Record<string, string> {
  const cells: Record<string, string> = {};
  if (item.id !== undefined) cells["Check ID"] = item.id;
  if (item.meetingId !== undefined) cells.Meeting = item.meetingId;
  if (item.order !== undefined) cells.Order = item.order;
  if (item.area !== undefined) cells.Area = item.area;
  if (item.owner !== undefined) cells.Owner = item.owner;
  if (item.covered !== undefined) cells["What's Covered"] = item.covered;
  if (item.ready !== undefined) cells.Ready = formatBool(item.ready);
  if (item.notes !== undefined) cells.Notes = item.notes;
  return cells;
}

export function toChecklist(record: Record<string, string>): ChecklistItem | null {
  const id = cell(record, "Check ID");
  if (!id) return null;
  return {
    id,
    meetingId: cell(record, "Meeting"),
    order: cell(record, "Order"),
    area: cell(record, "Area"),
    owner: cell(record, "Owner"),
    covered: cell(record, "What's Covered"),
    ready: parseBool(cell(record, "Ready")),
    notes: cell(record, "Notes"),
  };
}

export function toTemplate(record: Record<string, string>): ChecklistTemplateRow | null {
  const area = cell(record, "Area");
  if (!area && !cell(record, "Order")) return null;
  return {
    order: cell(record, "Order"),
    area,
    owner: cell(record, "Owner"),
    covered: cell(record, "What's Covered"),
  };
}

export function ministryUpdateCells(update: Partial<MinistryUpdate>): Record<string, string> {
  const cells: Record<string, string> = {};
  if (update.id !== undefined) cells["Update ID"] = update.id;
  if (update.meetingId !== undefined) cells.Meeting = update.meetingId;
  if (update.ministry !== undefined) cells.Ministry = update.ministry;
  if (update.lead !== undefined) cells.Lead = update.lead;
  if (update.update !== undefined) cells.Update = update.update;
  if (update.comingUp !== undefined) cells["Coming Up"] = update.comingUp;
  if (update.need !== undefined) cells["Need From Team"] = update.need;
  if (update.submittedBy !== undefined) cells["Submitted By"] = update.submittedBy;
  if (update.submittedOn !== undefined) cells["Submitted On"] = update.submittedOn;
  return cells;
}

export function toMinistryUpdate(record: Record<string, string>): MinistryUpdate | null {
  const id = cell(record, "Update ID");
  if (!id) return null;
  return {
    id,
    meetingId: cell(record, "Meeting"),
    ministry: cell(record, "Ministry"),
    lead: cell(record, "Lead"),
    update: cell(record, "Update"),
    comingUp: cell(record, "Coming Up"),
    need: cell(record, "Need From Team"),
    submittedBy: cell(record, "Submitted By"),
    submittedOn: cell(record, "Submitted On"),
  };
}

export function toMinistry(record: Record<string, string>): Ministry | null {
  const ministry = cell(record, "Ministry");
  if (!ministry) return null;
  return { ministry, lead: cell(record, "Lead"), order: cell(record, "Order") };
}

export function announcementCells(row: Partial<Announcement>): Record<string, string> {
  const cells: Record<string, string> = {};
  if (row.id !== undefined) cells["Announcement ID"] = row.id;
  if (row.date !== undefined) cells.Date = row.date;
  if (row.event !== undefined) cells.Event = row.event;
  if (row.kind !== undefined) cells.Kind = row.kind;
  if (row.owner !== undefined) cells.Owner = row.owner;
  if (row.announcedWhere !== undefined) cells["Announced Where"] = row.announcedWhere;
  if (row.details !== undefined) cells.Details = row.details;
  if (row.link !== undefined) cells.Link = row.link;
  if (row.audience !== undefined) cells.Audience = row.audience;
  if (row.meetingId !== undefined) cells.Meeting = row.meetingId;
  if (row.ministry !== undefined) cells.Ministry = row.ministry;
  return cells;
}

export function toAnnouncement(record: Record<string, string>): Announcement | null {
  const id = cell(record, "Announcement ID");
  if (!id) return null;
  return {
    id,
    date: cell(record, "Date"),
    event: cell(record, "Event"),
    kind: cell(record, "Kind"),
    owner: cell(record, "Owner"),
    announcedWhere: cell(record, "Announced Where"),
    details: cell(record, "Details"),
    link: cell(record, "Link"),
    audience: cell(record, "Audience"),
    meetingId: cell(record, "Meeting"),
    ministry: cell(record, "Ministry"),
  };
}

export function staffPinCells(row: Partial<StaffPin>): Record<string, string> {
  const cells: Record<string, string> = {};
  if (row.id !== undefined) cells["Pin ID"] = row.id;
  if (row.title !== undefined) cells.Title = row.title;
  if (row.message !== undefined) cells.Message = row.message;
  if (row.link !== undefined) cells.Link = row.link;
  if (row.priority !== undefined) cells.Priority = row.priority;
  if (row.showUntil !== undefined) cells["Show Until"] = row.showUntil;
  if (row.author !== undefined) cells.Author = row.author;
  if (row.posted !== undefined) cells.Posted = row.posted;
  return cells;
}

export function toStaffPin(record: Record<string, string>): StaffPin | null {
  const id = cell(record, "Pin ID");
  if (!id) return null;
  return {
    id,
    title: cell(record, "Title"),
    message: cell(record, "Message"),
    link: cell(record, "Link"),
    priority: cell(record, "Priority") || "Normal",
    showUntil: cell(record, "Show Until"),
    author: cell(record, "Author"),
    posted: cell(record, "Posted"),
  };
}

export function staffPinAckCells(row: Partial<StaffPinAck>): Record<string, string> {
  const cells: Record<string, string> = {};
  if (row.id !== undefined) cells["Ack ID"] = row.id;
  if (row.pinId !== undefined) cells["Pin ID"] = row.pinId;
  if (row.staff !== undefined) cells.Staff = row.staff;
  if (row.acknowledgedOn !== undefined) cells["Acknowledged On"] = row.acknowledgedOn;
  return cells;
}

export function toStaffPinAck(record: Record<string, string>): StaffPinAck | null {
  const id = cell(record, "Ack ID");
  if (!id) return null;
  return {
    id,
    pinId: cell(record, "Pin ID"),
    staff: cell(record, "Staff"),
    acknowledgedOn: cell(record, "Acknowledged On"),
  };
}

export function toSetting(record: Record<string, string>): HubSetting | null {
  const key = cell(record, "Setting");
  if (!key) return null;
  return { key, value: cell(record, "Value") };
}

export function graphicsCells(row: Partial<GraphicsRequest>): Record<string, string> {
  const cells: Record<string, string> = {};
  if (row.id !== undefined) cells["Request ID"] = row.id;
  if (row.requestedBy !== undefined) cells["Requested By"] = row.requestedBy;
  if (row.ministry !== undefined) cells.Ministry = row.ministry;
  if (row.needed !== undefined) cells["What's Needed"] = row.needed;
  if (row.platforms !== undefined) cells.Platforms = row.platforms;
  if (row.event !== undefined) cells.Event = row.event;
  if (row.eventDate !== undefined) cells["Event Date"] = row.eventDate;
  if (row.neededBy !== undefined) cells["Needed By"] = row.neededBy;
  if (row.description !== undefined) cells.Description = row.description;
  if (row.links !== undefined) cells.Links = row.links;
  if (row.status !== undefined) cells.Status = row.status;
  if (row.assignedTo !== undefined) cells["Assigned To"] = row.assignedTo;
  if (row.created !== undefined) cells.Created = row.created;
  return cells;
}

export function toGraphicsRequest(record: Record<string, string>): GraphicsRequest | null {
  const id = cell(record, "Request ID");
  if (!id) return null;
  return {
    id,
    requestedBy: cell(record, "Requested By"),
    ministry: cell(record, "Ministry"),
    needed: cell(record, "What's Needed"),
    platforms: cell(record, "Platforms"),
    event: cell(record, "Event"),
    eventDate: cell(record, "Event Date"),
    neededBy: cell(record, "Needed By"),
    description: cell(record, "Description"),
    links: cell(record, "Links"),
    status: cell(record, "Status") || "New",
    assignedTo: cell(record, "Assigned To"),
    created: cell(record, "Created"),
  };
}

export function timeAwayCells(row: Partial<TimeAway>): Record<string, string> {
  const cells: Record<string, string> = {};
  if (row.id !== undefined) cells["Away ID"] = row.id;
  if (row.requestedBy !== undefined) cells["Requested By"] = row.requestedBy;
  if (row.kind !== undefined) cells.Type = row.kind;
  if (row.start !== undefined) cells.Start = row.start;
  if (row.end !== undefined) cells.End = row.end;
  if (row.halfDay !== undefined) cells["Half Day"] = formatBool(row.halfDay);
  if (row.notes !== undefined) cells.Notes = row.notes;
  if (row.coverage !== undefined) cells.Coverage = row.coverage;
  if (row.status !== undefined) cells.Status = row.status;
  if (row.created !== undefined) cells.Created = row.created;
  return cells;
}

export function toTimeAway(record: Record<string, string>): TimeAway | null {
  const id = cell(record, "Away ID");
  if (!id) return null;
  return {
    id,
    requestedBy: cell(record, "Requested By"),
    kind: cell(record, "Type"),
    start: cell(record, "Start"),
    end: cell(record, "End"),
    halfDay: parseBool(cell(record, "Half Day")),
    notes: cell(record, "Notes"),
    coverage: cell(record, "Coverage"),
    status: cell(record, "Status") || "Pending",
    created: cell(record, "Created"),
  };
}

export function workStatusCells(row: Partial<WorkStatus>): Record<string, string> {
  const cells: Record<string, string> = {};
  if (row.id !== undefined) cells["Status ID"] = row.id;
  if (row.date !== undefined) cells.Date = row.date;
  if (row.staff !== undefined) cells.Staff = row.staff;
  if (row.place !== undefined) cells.Place = row.place;
  if (row.note !== undefined) cells.Note = row.note;
  return cells;
}

export function toWorkStatus(record: Record<string, string>): WorkStatus | null {
  const id = cell(record, "Status ID");
  if (!id) return null;
  return {
    id,
    date: cell(record, "Date"),
    staff: cell(record, "Staff"),
    place: cell(record, "Place"),
    note: cell(record, "Note"),
  };
}

export function issueCells(row: Partial<OpenIssue>): Record<string, string> {
  const cells: Record<string, string> = {};
  if (row.id !== undefined) cells["Issue ID"] = row.id;
  if (row.issue !== undefined) cells.Issue = row.issue;
  if (row.owner !== undefined) cells.Owner = row.owner;
  if (row.nextStep !== undefined) cells["Next Step"] = row.nextStep;
  if (row.due !== undefined) cells.Due = row.due;
  if (row.status !== undefined) cells.Status = row.status;
  if (row.created !== undefined) cells.Created = row.created;
  return cells;
}

export function toIssue(record: Record<string, string>): OpenIssue | null {
  const id = cell(record, "Issue ID");
  if (!id) return null;
  return {
    id,
    issue: cell(record, "Issue"),
    owner: cell(record, "Owner"),
    nextStep: cell(record, "Next Step"),
    due: cell(record, "Due"),
    status: cell(record, "Status") || "Open",
    created: cell(record, "Created"),
  };
}

export function requestCells(row: Partial<DeskRequest>): Record<string, string> {
  const cells: Record<string, string> = {};
  if (row.id !== undefined) cells["Request ID"] = row.id;
  if (row.title !== undefined) cells.Title = row.title;
  if (row.requestedBy !== undefined) cells["Requested By"] = row.requestedBy;
  if (row.neededBy !== undefined) cells["Needed By"] = row.neededBy;
  if (row.details !== undefined) cells.Details = row.details;
  if (row.needed !== undefined) cells["What's Needed"] = row.needed;
  if (row.link !== undefined) cells.Link = row.link;
  if (row.status !== undefined) cells.Status = row.status;
  if (row.assignedTo !== undefined) cells["Assigned To"] = row.assignedTo;
  if (row.draftLink !== undefined) cells["Draft Link"] = row.draftLink;
  if (row.created !== undefined) cells.Created = row.created;
  return cells;
}

export function toRequest(record: Record<string, string>): DeskRequest | null {
  const id = cell(record, "Request ID");
  if (!id) return null;
  return {
    id,
    title: cell(record, "Title"),
    requestedBy: cell(record, "Requested By"),
    neededBy: cell(record, "Needed By"),
    details: cell(record, "Details"),
    needed: cell(record, "What's Needed"),
    link: cell(record, "Link"),
    status: cell(record, "Status") || "New",
    assignedTo: cell(record, "Assigned To"),
    draftLink: cell(record, "Draft Link"),
    created: cell(record, "Created"),
  };
}

export function documentCells(row: Partial<PinnedDocument>): Record<string, string> {
  const cells: Record<string, string> = {};
  if (row.id !== undefined) cells["Doc ID"] = row.id;
  if (row.title !== undefined) cells.Title = row.title;
  if (row.group !== undefined) cells.Group = row.group;
  if (row.link !== undefined) cells.Link = row.link;
  if (row.notes !== undefined) cells.Notes = row.notes;
  return cells;
}

export function toDocument(record: Record<string, string>): PinnedDocument | null {
  const id = cell(record, "Doc ID");
  if (!id) return null;
  return {
    id,
    title: cell(record, "Title"),
    group: cell(record, "Group"),
    link: cell(record, "Link"),
    notes: cell(record, "Notes"),
  };
}

export function quickLinkCells(row: Partial<QuickLink>): Record<string, string> {
  const cells: Record<string, string> = {};
  if (row.id !== undefined) cells["Link ID"] = row.id;
  if (row.name !== undefined) cells.Name = row.name;
  if (row.url !== undefined) cells.URL = row.url;
  if (row.icon !== undefined) cells.Icon = row.icon;
  if (row.order !== undefined) cells.Order = row.order;
  return cells;
}

export function toQuickLink(record: Record<string, string>): QuickLink | null {
  const id = cell(record, "Link ID");
  if (!id) return null;
  return {
    id,
    name: cell(record, "Name"),
    url: cell(record, "URL"),
    icon: cell(record, "Icon"),
    order: cell(record, "Order"),
  };
}

export function folderCells(row: Partial<FolderLink>): Record<string, string> {
  const cells: Record<string, string> = {};
  if (row.id !== undefined) cells["Folder ID"] = row.id;
  if (row.name !== undefined) cells.Name = row.name;
  if (row.url !== undefined) cells.URL = row.url;
  if (row.icon !== undefined) cells.Icon = row.icon;
  if (row.order !== undefined) cells.Order = row.order;
  return cells;
}

export function toFolder(record: Record<string, string>): FolderLink | null {
  const id = cell(record, "Folder ID");
  if (!id) return null;
  return {
    id,
    name: cell(record, "Name"),
    url: cell(record, "URL"),
    icon: cell(record, "Icon"),
    order: cell(record, "Order"),
  };
}

export function careNoteCells(row: Partial<CareNote>): Record<string, string> {
  const cells: Record<string, string> = {};
  if (row.id !== undefined) cells["Care Note ID"] = row.id;
  if (row.meetingId !== undefined) cells.Meeting = row.meetingId;
  if (row.person !== undefined) cells.Name = row.person;
  if (row.action !== undefined) cells.Action = row.action;
  if (row.custom !== undefined) cells.Custom = row.custom;
  if (row.details !== undefined) cells.Details = row.details;
  if (row.assignee !== undefined) cells.Assignee = row.assignee;
  if (row.done !== undefined) cells.Done = formatBool(row.done);
  if (row.actionItemId !== undefined) cells["Action Item"] = row.actionItemId;
  return cells;
}

export function toCareNote(record: Record<string, string>): CareNote | null {
  const id = cell(record, "Care Note ID");
  if (!id) return null;
  return {
    id,
    meetingId: cell(record, "Meeting"),
    person: cell(record, "Name"),
    action: cell(record, "Action"),
    custom: cell(record, "Custom"),
    details: cell(record, "Details"),
    assignee: cell(record, "Assignee"),
    done: parseBool(cell(record, "Done")),
    actionItemId: cell(record, "Action Item"),
  };
}

export function toWorkflowCard(record: Record<string, string>): WorkflowCard | null {
  const id = cell(record, "Card ID");
  if (!id) return null;
  return {
    id,
    workflow: cell(record, "Workflow"),
    step: cell(record, "Step"),
    forPerson: cell(record, "For Person"),
    assignee: cell(record, "Assignee"),
    assigneeEmail: cell(record, "Assignee Email"),
    overdue: cell(record, "Overdue"),
    movedToStep: cell(record, "Moved To Step"),
    link: cell(record, "Link"),
    firstSeen: cell(record, "First Seen"),
    lastSynced: cell(record, "Last Synced"),
    personId: cell(record, "Person ID"),
    workflowId: cell(record, "Workflow ID"),
    assigneeId: cell(record, "Assignee ID"),
  };
}

export function toCardAction(record: Record<string, string>): CardAction | null {
  const id = cell(record, "Action ID");
  if (!id) return null;
  return {
    id,
    cardId: cell(record, "Card ID"),
    action: cell(record, "Action"),
    note: cell(record, "Note"),
    snoozeDays: cell(record, "Snooze Days"),
    newAssignee: cell(record, "New Assignee"),
    requestedBy: cell(record, "Requested By"),
    requestedAt: cell(record, "Requested At"),
    status: cell(record, "Status"),
    result: cell(record, "Result"),
    doneAt: cell(record, "Done At"),
  };
}

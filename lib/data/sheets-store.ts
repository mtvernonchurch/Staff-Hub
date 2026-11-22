import type {
  ActionItem,
  Announcement,
  CareNote,
  ChecklistItem,
  DeskRequest,
  FolderLink,
  GraphicsRequest,
  HubStore,
  Meeting,
  MinistryUpdate,
  OpenIssue,
  PinnedDocument,
  QuickLink,
  StaffPin,
  StaffPinAck,
  TimeAway,
  WorkStatus,
} from "@/lib/data/types";
import { HubError } from "@/lib/hub-error";
import type { SheetsApi } from "@/lib/sheets/api";
import { assertColumns, assertWritable, columnLetter, findDataRow, gridToRecords, headersOf, planCellUpdates, quoteTab, recordToAppendRow } from "@/lib/sheets/codec";
import {
  actionCells,
  announcementCells,
  careNoteCells,
  checklistCells,
  documentCells,
  folderCells,
  graphicsCells,
  issueCells,
  meetingCells,
  ministryUpdateCells,
  quickLinkCells,
  requestCells,
  staffPinAckCells,
  staffPinCells,
  toActionItem,
  toAnnouncement,
  toCareNote,
  toCardAction,
  toChecklist,
  toDocument,
  toFolder,
  toGraphicsRequest,
  toIssue,
  toMeeting,
  toMinistry,
  toMinistryUpdate,
  toQuickLink,
  toRequest,
  toStaff,
  toSetting,
  toStaffPin,
  toStaffPinAck,
  toTimeAway,
  toTemplate,
  toWorkflowCard,
  toWorkStatus,
  timeAwayCells,
  workStatusCells,
} from "@/lib/sheets/mappers";
import { COLUMNS, normalizeHeader } from "@/lib/sheets/schema";

/**
 * Reads a tab, then writes only the cells that changed (or appends a new row).
 * The full tab is never rewritten. Workflow Cards, Card Actions, Staff,
 * Ministries, and Checklist Template have no write path.
 */
export class SheetsStore implements HubStore {
  private cache = new Map<string, string[][]>();

  constructor(private api: SheetsApi) {}

  private async grid(tab: string): Promise<string[][]> {
    const hit = this.cache.get(tab);
    if (hit) return hit;
    const value = await this.api.get(tab);
    this.cache.set(tab, value);
    return value;
  }

  private async records(tab: string, required: readonly string[]) {
    const grid = await this.grid(tab);
    const headers = headersOf(grid);
    if (headers.every((header) => !header)) {
      throw new HubError(`${tab} has no header row. The hub left it unchanged.`);
    }
    assertColumns(headers, required, tab);
    return gridToRecords(grid);
  }

  private async append(tab: string, required: readonly string[], record: Record<string, string>) {
    assertWritable(tab);
    const grid = await this.grid(tab);
    const headers = headersOf(grid);
    assertColumns(headers, required, tab);
    const row = recordToAppendRow(headers, record);
    await this.api.appendRows(tab, [row]);
    this.cache.delete(tab);
  }

  private async appendMany(tab: string, required: readonly string[], records: Record<string, string>[]) {
    assertWritable(tab);
    if (records.length === 0) return;
    const grid = await this.grid(tab);
    const headers = headersOf(grid);
    assertColumns(headers, required, tab);
    await this.api.appendRows(tab, records.map((record) => recordToAppendRow(headers, record)));
    this.cache.delete(tab);
  }

  private async ensureHeaders(tab: string, names: readonly string[]) {
    const grid = await this.grid(tab);
    const headers = headersOf(grid);
    const missing = names.filter((name) => !headers.some((header) => normalizeHeader(header) === normalizeHeader(name)));
    if (missing.length === 0) return;
    let column = headers.findIndex((header) => header.trim() === "");
    if (column < 0) column = headers.length;
    const updates = missing.map((name) => {
      const update = { range: `${quoteTab(tab)}!${columnLetter(column)}1`, value: name };
      headers[column] = name;
      column += 1;
      return update;
    });
    await this.api.updateCells(updates);
    const next = grid.map((row) => [...row]);
    next[0] = headers;
    this.cache.set(tab, next);
  }

  private async remove(tab: string, idColumn: string, id: string) {
    assertWritable(tab);
    const grid = await this.grid(tab);
    const rowNumber = findDataRow(grid, idColumn, id);
    await this.api.deleteRow(tab, rowNumber);
    this.cache.delete(tab);
  }

  private async patch(tab: string, idColumn: string, id: string, changes: Record<string, string>) {
    assertWritable(tab);
    const keys = Object.keys(changes);
    if (keys.length === 0) return;
    const grid = await this.grid(tab);
    const headers = headersOf(grid);
    const rowNumber = findDataRow(grid, idColumn, id);
    const updates = planCellUpdates(tab, headers, rowNumber, changes);
    await this.api.updateCells(updates);
    this.cache.delete(tab);
  }

  async listStaff() {
    return (await this.records("Staff", COLUMNS.staff)).map(toStaff).filter((row) => row !== null);
  }
  async listMeetings() {
    return (await this.records("Meetings", COLUMNS.meetings)).map(toMeeting).filter((row) => row !== null);
  }
  async getMeeting(id: string) {
    return (await this.listMeetings()).find((row) => row.id === id) ?? null;
  }
  async createMeeting(meeting: Meeting) {
    await this.append("Meetings", COLUMNS.meetings, meetingCells(meeting));
  }
  async updateMeeting(id: string, changes: Partial<Meeting>) {
    const cells = meetingCells(changes);
    delete cells["Meeting ID"];
    await this.patch("Meetings", "Meeting ID", id, cells);
  }
  async listActionItems() {
    return (await this.records("Action Items", COLUMNS.actionItems)).map(toActionItem).filter((row) => row !== null);
  }
  async getActionItem(id: string) {
    return (await this.listActionItems()).find((row) => row.id === id) ?? null;
  }
  async createActionItem(item: ActionItem) {
    await this.ensureHeaders("Action Items", ["Ministry"]);
    await this.append("Action Items", COLUMNS.actionItems, actionCells(item));
  }
  async updateActionItem(id: string, changes: Partial<ActionItem>) {
    if (changes.ministry !== undefined) await this.ensureHeaders("Action Items", ["Ministry"]);
    const cells = actionCells(changes);
    delete cells["Item ID"];
    await this.patch("Action Items", "Item ID", id, cells);
  }
  async deleteActionItem(id: string) {
    await this.remove("Action Items", "Item ID", id);
  }
  async listChecklist() {
    return (await this.records("Sunday Checklist", COLUMNS.checklist)).map(toChecklist).filter((row) => row !== null);
  }
  async getChecklistItem(id: string) {
    return (await this.listChecklist()).find((row) => row.id === id) ?? null;
  }
  async createChecklistItems(items: ChecklistItem[]) {
    await this.appendMany("Sunday Checklist", COLUMNS.checklist, items.map((item) => checklistCells(item)));
  }
  async updateChecklistItem(id: string, changes: Partial<ChecklistItem>) {
    const cells = checklistCells(changes);
    delete cells["Check ID"];
    await this.patch("Sunday Checklist", "Check ID", id, cells);
  }
  async listChecklistTemplate() {
    return (await this.records("Checklist Template", COLUMNS.checklistTemplate)).map(toTemplate).filter((row) => row !== null);
  }
  async listMinistryUpdates() {
    return (await this.records("Ministry Updates", COLUMNS.ministryUpdates)).map(toMinistryUpdate).filter((row) => row !== null);
  }
  async createMinistryUpdate(update: MinistryUpdate) {
    await this.append("Ministry Updates", COLUMNS.ministryUpdates, ministryUpdateCells(update));
  }
  async updateMinistryUpdate(id: string, changes: Partial<MinistryUpdate>) {
    const cells = ministryUpdateCells(changes);
    delete cells["Update ID"];
    await this.patch("Ministry Updates", "Update ID", id, cells);
  }
  async listMinistries() {
    return (await this.records("Ministries", COLUMNS.ministries)).map(toMinistry).filter((row) => row !== null);
  }
  async listAnnouncements() {
    return (await this.records("Announcements", COLUMNS.announcements)).map(toAnnouncement).filter((row) => row !== null);
  }
  async createAnnouncement(row: Announcement) {
    await this.ensureHeaders("Announcements", ["Meeting", "Ministry"]);
    await this.append("Announcements", COLUMNS.announcements, announcementCells(row));
  }
  async updateAnnouncement(id: string, changes: Partial<Announcement>) {
    if (changes.meetingId !== undefined || changes.ministry !== undefined) {
      await this.ensureHeaders("Announcements", ["Meeting", "Ministry"]);
    }
    const cells = announcementCells(changes);
    delete cells["Announcement ID"];
    await this.patch("Announcements", "Announcement ID", id, cells);
  }
  async deleteAnnouncement(id: string) {
    await this.remove("Announcements", "Announcement ID", id);
  }
  async listStaffPins() {
    await this.api.ensureTab("Staff Announcements", [...COLUMNS.staffPins]);
    this.cache.delete("Staff Announcements");
    return (await this.records("Staff Announcements", COLUMNS.staffPins)).map(toStaffPin).filter((row) => row !== null);
  }
  async createStaffPin(row: StaffPin) {
    await this.api.ensureTab("Staff Announcements", [...COLUMNS.staffPins]);
    this.cache.delete("Staff Announcements");
    await this.append("Staff Announcements", COLUMNS.staffPins, staffPinCells(row));
  }
  async updateStaffPin(id: string, changes: Partial<StaffPin>) {
    await this.api.ensureTab("Staff Announcements", [...COLUMNS.staffPins]);
    this.cache.delete("Staff Announcements");
    const cells = staffPinCells(changes);
    delete cells["Pin ID"];
    await this.patch("Staff Announcements", "Pin ID", id, cells);
  }
  async deleteStaffPin(id: string) {
    await this.api.ensureTab("Staff Announcements", [...COLUMNS.staffPins]);
    await this.api.ensureTab("Staff Announcement Acks", [...COLUMNS.staffPinAcks]);
    this.cache.delete("Staff Announcements");
    this.cache.delete("Staff Announcement Acks");
    const acks = (await this.records("Staff Announcement Acks", COLUMNS.staffPinAcks))
      .map(toStaffPinAck)
      .filter((row): row is NonNullable<typeof row> => row !== null && row.pinId === id);
    await this.remove("Staff Announcements", "Pin ID", id);
    for (const ack of acks) {
      await this.remove("Staff Announcement Acks", "Ack ID", ack.id);
    }
  }
  async listStaffPinAcks() {
    await this.api.ensureTab("Staff Announcement Acks", [...COLUMNS.staffPinAcks]);
    this.cache.delete("Staff Announcement Acks");
    return (await this.records("Staff Announcement Acks", COLUMNS.staffPinAcks)).map(toStaffPinAck).filter((row) => row !== null);
  }
  async createStaffPinAck(row: StaffPinAck) {
    await this.api.ensureTab("Staff Announcement Acks", [...COLUMNS.staffPinAcks]);
    this.cache.delete("Staff Announcement Acks");
    await this.append("Staff Announcement Acks", COLUMNS.staffPinAcks, staffPinAckCells(row));
  }
  async listSettings() {
    await this.api.ensureTab("Hub Settings", [...COLUMNS.settings]);
    this.cache.delete("Hub Settings");
    return (await this.records("Hub Settings", COLUMNS.settings)).map(toSetting).filter((row) => row !== null);
  }
  async setSetting(key: string, value: string) {
    await this.api.ensureTab("Hub Settings", [...COLUMNS.settings]);
    this.cache.delete("Hub Settings");
    const existing = (await this.listSettings()).some((row) => row.key === key);
    if (!existing) {
      await this.append("Hub Settings", COLUMNS.settings, { Setting: key, Value: value });
      return;
    }
    await this.patch("Hub Settings", "Setting", key, { Value: value });
  }
  async listGraphicsRequests() {
    await this.api.ensureTab("Graphics Requests", [...COLUMNS.graphicsRequests]);
    this.cache.delete("Graphics Requests");
    return (await this.records("Graphics Requests", COLUMNS.graphicsRequests)).map(toGraphicsRequest).filter((row) => row !== null);
  }
  async createGraphicsRequest(row: GraphicsRequest) {
    await this.api.ensureTab("Graphics Requests", [...COLUMNS.graphicsRequests]);
    this.cache.delete("Graphics Requests");
    await this.append("Graphics Requests", COLUMNS.graphicsRequests, graphicsCells(row));
  }
  async updateGraphicsRequest(id: string, changes: Partial<GraphicsRequest>) {
    await this.api.ensureTab("Graphics Requests", [...COLUMNS.graphicsRequests]);
    this.cache.delete("Graphics Requests");
    const cells = graphicsCells(changes);
    delete cells["Request ID"];
    await this.patch("Graphics Requests", "Request ID", id, cells);
  }
  async listTimeAway() {
    await this.api.ensureTab("Time Away", [...COLUMNS.timeAway]);
    this.cache.delete("Time Away");
    return (await this.records("Time Away", COLUMNS.timeAway)).map(toTimeAway).filter((row) => row !== null);
  }
  async createTimeAway(row: TimeAway) {
    await this.api.ensureTab("Time Away", [...COLUMNS.timeAway]);
    this.cache.delete("Time Away");
    await this.append("Time Away", COLUMNS.timeAway, timeAwayCells(row));
  }
  async updateTimeAway(id: string, changes: Partial<TimeAway>) {
    await this.api.ensureTab("Time Away", [...COLUMNS.timeAway]);
    this.cache.delete("Time Away");
    const cells = timeAwayCells(changes);
    delete cells["Away ID"];
    await this.patch("Time Away", "Away ID", id, cells);
  }
  async listWorkStatuses() {
    await this.api.ensureTab("Work Status", [...COLUMNS.workStatuses]);
    this.cache.delete("Work Status");
    return (await this.records("Work Status", COLUMNS.workStatuses)).map(toWorkStatus).filter((row) => row !== null);
  }
  async createWorkStatus(row: WorkStatus) {
    await this.api.ensureTab("Work Status", [...COLUMNS.workStatuses]);
    this.cache.delete("Work Status");
    await this.append("Work Status", COLUMNS.workStatuses, workStatusCells(row));
  }
  async updateWorkStatus(id: string, changes: Partial<WorkStatus>) {
    await this.api.ensureTab("Work Status", [...COLUMNS.workStatuses]);
    this.cache.delete("Work Status");
    const cells = workStatusCells(changes);
    delete cells["Status ID"];
    await this.patch("Work Status", "Status ID", id, cells);
  }
  async listCareNotes() {
    await this.api.ensureTab("Care Notes", [...COLUMNS.careNotes]);
    this.cache.delete("Care Notes");
    return (await this.records("Care Notes", COLUMNS.careNotes)).map(toCareNote).filter((row) => row !== null);
  }
  async createCareNote(row: CareNote) {
    await this.api.ensureTab("Care Notes", [...COLUMNS.careNotes]);
    this.cache.delete("Care Notes");
    await this.append("Care Notes", COLUMNS.careNotes, careNoteCells(row));
  }
  async updateCareNote(id: string, changes: Partial<CareNote>) {
    await this.api.ensureTab("Care Notes", [...COLUMNS.careNotes]);
    this.cache.delete("Care Notes");
    const cells = careNoteCells(changes);
    delete cells["Care Note ID"];
    await this.patch("Care Notes", "Care Note ID", id, cells);
  }
  async deleteCareNote(id: string) {
    await this.api.ensureTab("Care Notes", [...COLUMNS.careNotes]);
    this.cache.delete("Care Notes");
    await this.remove("Care Notes", "Care Note ID", id);
  }
  async listOpenIssues() {
    return (await this.records("Open Issues", COLUMNS.openIssues)).map(toIssue).filter((row) => row !== null);
  }
  async createOpenIssue(row: OpenIssue) {
    await this.append("Open Issues", COLUMNS.openIssues, issueCells(row));
  }
  async updateOpenIssue(id: string, changes: Partial<OpenIssue>) {
    const cells = issueCells(changes);
    delete cells["Issue ID"];
    await this.patch("Open Issues", "Issue ID", id, cells);
  }
  async listRequests() {
    return (await this.records("Requests", COLUMNS.requests)).map(toRequest).filter((row) => row !== null);
  }
  async getRequest(id: string) {
    return (await this.listRequests()).find((row) => row.id === id) ?? null;
  }
  async createRequest(row: DeskRequest) {
    await this.append("Requests", COLUMNS.requests, requestCells(row));
  }
  async updateRequest(id: string, changes: Partial<DeskRequest>) {
    const cells = requestCells(changes);
    delete cells["Request ID"];
    await this.patch("Requests", "Request ID", id, cells);
  }
  async listDocuments() {
    return (await this.records("Documents", COLUMNS.documents)).map(toDocument).filter((row) => row !== null);
  }
  async createDocument(row: PinnedDocument) {
    await this.append("Documents", COLUMNS.documents, documentCells(row));
  }
  async updateDocument(id: string, changes: Partial<PinnedDocument>) {
    const cells = documentCells(changes);
    delete cells["Doc ID"];
    await this.patch("Documents", "Doc ID", id, cells);
  }
  async listQuickLinks() {
    return (await this.records("Quick Links", COLUMNS.quickLinks)).map(toQuickLink).filter((row) => row !== null);
  }
  async createQuickLink(row: QuickLink) {
    await this.append("Quick Links", COLUMNS.quickLinks, quickLinkCells(row));
  }
  async updateQuickLink(id: string, changes: Partial<QuickLink>) {
    const cells = quickLinkCells(changes);
    delete cells["Link ID"];
    await this.patch("Quick Links", "Link ID", id, cells);
  }
  async listFolders() {
    return (await this.records("Folders", COLUMNS.folders)).map(toFolder).filter((row) => row !== null);
  }
  async createFolder(row: FolderLink) {
    await this.append("Folders", COLUMNS.folders, folderCells(row));
  }
  async updateFolder(id: string, changes: Partial<FolderLink>) {
    const cells = folderCells(changes);
    delete cells["Folder ID"];
    await this.patch("Folders", "Folder ID", id, cells);
  }
  async listWorkflowCards() {
    return (await this.records("Workflow Cards", COLUMNS.workflowCards)).map(toWorkflowCard).filter((row) => row !== null);
  }
  async listCardActions() {
    return (await this.records("Card Actions", COLUMNS.cardActions)).map(toCardAction).filter((row) => row !== null);
  }
}

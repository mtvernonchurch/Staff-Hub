import type { HubData, HubStore } from "@/lib/data/types";
import { HubError } from "@/lib/hub-error";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function merge<T extends { id: string }>(rows: T[], id: string, changes: Partial<T>, label: string): void {
  const index = rows.findIndex((row) => row.id === id);
  if (index < 0) throw new HubError(`That ${label} is no longer on the list. Refresh and try again.`);
  const next = { ...rows[index] };
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined) (next as Record<string, unknown>)[key] = value;
  }
  rows[index] = next;
}

export class MemoryStore implements HubStore {
  constructor(private data: HubData) {}

  snapshot(): HubData {
    return clone(this.data);
  }

  async listStaff() {
    return clone(this.data.staff);
  }
  async listMeetings() {
    return clone(this.data.meetings);
  }
  async getMeeting(id: string) {
    return clone(this.data.meetings.find((row) => row.id === id) ?? null);
  }
  async createMeeting(meeting: HubData["meetings"][number]) {
    this.data.meetings.push(clone(meeting));
  }
  async updateMeeting(id: string, changes: Partial<HubData["meetings"][number]>) {
    merge(this.data.meetings, id, changes, "meeting");
  }
  async listActionItems() {
    return clone(this.data.actionItems);
  }
  async getActionItem(id: string) {
    return clone(this.data.actionItems.find((row) => row.id === id) ?? null);
  }
  async createActionItem(item: HubData["actionItems"][number]) {
    this.data.actionItems.push(clone(item));
  }
  async updateActionItem(id: string, changes: Partial<HubData["actionItems"][number]>) {
    merge(this.data.actionItems, id, changes, "action item");
  }
  async deleteActionItem(id: string) {
    const next = this.data.actionItems.filter((row) => row.id !== id);
    if (next.length === this.data.actionItems.length) {
      throw new HubError("That action item is no longer on the list. Refresh and try again.");
    }
    this.data.actionItems = next;
  }
  async listChecklist() {
    return clone(this.data.checklist);
  }
  async getChecklistItem(id: string) {
    return clone(this.data.checklist.find((row) => row.id === id) ?? null);
  }
  async createChecklistItems(items: HubData["checklist"]) {
    this.data.checklist.push(...clone(items));
  }
  async updateChecklistItem(id: string, changes: Partial<HubData["checklist"][number]>) {
    merge(this.data.checklist, id, changes, "checklist row");
  }
  async listChecklistTemplate() {
    return clone(this.data.checklistTemplate);
  }
  async listMinistryUpdates() {
    return clone(this.data.ministryUpdates);
  }
  async createMinistryUpdate(update: HubData["ministryUpdates"][number]) {
    this.data.ministryUpdates.push(clone(update));
  }
  async updateMinistryUpdate(id: string, changes: Partial<HubData["ministryUpdates"][number]>) {
    merge(this.data.ministryUpdates, id, changes, "ministry update");
  }
  async listMinistries() {
    return clone(this.data.ministries);
  }
  async listAnnouncements() {
    return clone(this.data.announcements);
  }
  async createAnnouncement(row: HubData["announcements"][number]) {
    this.data.announcements.push(clone(row));
  }
  async updateAnnouncement(id: string, changes: Partial<HubData["announcements"][number]>) {
    merge(this.data.announcements, id, changes, "announcement");
  }
  async deleteAnnouncement(id: string) {
    const next = this.data.announcements.filter((row) => row.id !== id);
    if (next.length === this.data.announcements.length) {
      throw new HubError("That announcement is no longer on the list. Refresh and try again.");
    }
    this.data.announcements = next;
  }
  async listStaffPins() {
    return clone(this.data.staffPins);
  }
  async createStaffPin(row: HubData["staffPins"][number]) {
    this.data.staffPins.push(clone(row));
  }
  async updateStaffPin(id: string, changes: Partial<HubData["staffPins"][number]>) {
    merge(this.data.staffPins, id, changes, "pinned post");
  }
  async deleteStaffPin(id: string) {
    const next = this.data.staffPins.filter((row) => row.id !== id);
    if (next.length === this.data.staffPins.length) {
      throw new HubError("That pinned post is no longer on the list. Refresh and try again.");
    }
    this.data.staffPins = next;
    this.data.staffPinAcks = this.data.staffPinAcks.filter((row) => row.pinId !== id);
  }
  async listStaffPinAcks() {
    return clone(this.data.staffPinAcks);
  }
  async createStaffPinAck(row: HubData["staffPinAcks"][number]) {
    this.data.staffPinAcks.push(clone(row));
  }
  async listSettings() {
    return clone(this.data.settings);
  }
  async setSetting(key: string, value: string) {
    const index = this.data.settings.findIndex((row) => row.key === key);
    if (index < 0) this.data.settings.push({ key, value });
    else this.data.settings[index] = { key, value };
  }
  async listGraphicsRequests() {
    return clone(this.data.graphicsRequests);
  }
  async createGraphicsRequest(row: HubData["graphicsRequests"][number]) {
    this.data.graphicsRequests.push(clone(row));
  }
  async updateGraphicsRequest(id: string, changes: Partial<HubData["graphicsRequests"][number]>) {
    merge(this.data.graphicsRequests, id, changes, "graphics request");
  }
  async listTimeAway() {
    return clone(this.data.timeAway);
  }
  async createTimeAway(row: HubData["timeAway"][number]) {
    this.data.timeAway.push(clone(row));
  }
  async updateTimeAway(id: string, changes: Partial<HubData["timeAway"][number]>) {
    merge(this.data.timeAway, id, changes, "time away request");
  }
  async listWorkStatuses() {
    return clone(this.data.workStatuses);
  }
  async createWorkStatus(row: HubData["workStatuses"][number]) {
    this.data.workStatuses.push(clone(row));
  }
  async updateWorkStatus(id: string, changes: Partial<HubData["workStatuses"][number]>) {
    merge(this.data.workStatuses, id, changes, "work status");
  }
  async listCalendarEvents() {
    return clone(this.data.calendarEvents);
  }
  async createCalendarEvent(row: HubData["calendarEvents"][number]) {
    this.data.calendarEvents.push(clone(row));
  }
  async updateCalendarEvent(id: string, changes: Partial<HubData["calendarEvents"][number]>) {
    merge(this.data.calendarEvents, id, changes, "calendar event");
  }
  async listCalendarChecks() {
    return clone(this.data.calendarChecks);
  }
  async createCalendarCheck(row: HubData["calendarChecks"][number]) {
    this.data.calendarChecks.push(clone(row));
  }
  async updateCalendarCheck(id: string, changes: Partial<HubData["calendarChecks"][number]>) {
    merge(this.data.calendarChecks, id, changes, "calendar check");
  }
  async listCareNotes() {
    return clone(this.data.careNotes);
  }
  async createCareNote(row: HubData["careNotes"][number]) {
    this.data.careNotes.push(clone(row));
  }
  async updateCareNote(id: string, changes: Partial<HubData["careNotes"][number]>) {
    merge(this.data.careNotes, id, changes, "care note");
  }
  async deleteCareNote(id: string) {
    const next = this.data.careNotes.filter((row) => row.id !== id);
    if (next.length === this.data.careNotes.length) {
      throw new HubError("That care note is no longer on the list. Refresh and try again.");
    }
    this.data.careNotes = next;
  }
  async listOpenIssues() {
    return clone(this.data.openIssues);
  }
  async createOpenIssue(row: HubData["openIssues"][number]) {
    this.data.openIssues.push(clone(row));
  }
  async updateOpenIssue(id: string, changes: Partial<HubData["openIssues"][number]>) {
    merge(this.data.openIssues, id, changes, "issue");
  }
  async listRequests() {
    return clone(this.data.requests);
  }
  async getRequest(id: string) {
    return clone(this.data.requests.find((row) => row.id === id) ?? null);
  }
  async createRequest(row: HubData["requests"][number]) {
    this.data.requests.push(clone(row));
  }
  async updateRequest(id: string, changes: Partial<HubData["requests"][number]>) {
    merge(this.data.requests, id, changes, "request");
  }
  async listDocuments() {
    return clone(this.data.documents);
  }
  async createDocument(row: HubData["documents"][number]) {
    this.data.documents.push(clone(row));
  }
  async updateDocument(id: string, changes: Partial<HubData["documents"][number]>) {
    merge(this.data.documents, id, changes, "document");
  }
  async listMinistryBudgets() {
    return clone(this.data.ministryBudgets);
  }
  async listCardMonths() {
    return clone(this.data.cardMonths);
  }
  async listCardTransactions() {
    return clone(this.data.cardTransactions);
  }
  async listAttendance() {
    return clone(this.data.attendance);
  }
  async createAttendance(row: HubData["attendance"][number]) {
    this.data.attendance.push(clone(row));
  }
  async updateAttendance(id: string, changes: Partial<HubData["attendance"][number]>) {
    merge(this.data.attendance, id, changes, "attendance count");
  }
  async listQuickLinks() {
    return clone(this.data.quickLinks);
  }
  async createQuickLink(row: HubData["quickLinks"][number]) {
    this.data.quickLinks.push(clone(row));
  }
  async updateQuickLink(id: string, changes: Partial<HubData["quickLinks"][number]>) {
    merge(this.data.quickLinks, id, changes, "link");
  }
  async listFolders() {
    return clone(this.data.folders);
  }
  async createFolder(row: HubData["folders"][number]) {
    this.data.folders.push(clone(row));
  }
  async updateFolder(id: string, changes: Partial<HubData["folders"][number]>) {
    merge(this.data.folders, id, changes, "folder");
  }
  async listWorkflowCards() {
    return clone(this.data.workflowCards);
  }
  async listCardActions() {
    return clone(this.data.cardActions);
  }
}

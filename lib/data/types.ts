export type StaffMember = {
  name: string;
  email: string;
  title: string;
  role: string;
  photo: string;
  active: boolean;
};

export type Meeting = {
  id: string;
  date: string;
  title: string;
  status: string;
  attendees: string;
  notesBy: string;
  prayer: string;
  wins: string;
  lookahead: string;
  care: string;
  notes: string;
};

export type ActionItem = {
  id: string;
  action: string;
  owner: string;
  due: string;
  status: string;
  meetingId: string;
  update: string;
  created: string;
  completedOn: string;
  ministry: string;
};

export type ChecklistItem = {
  id: string;
  meetingId: string;
  order: string;
  area: string;
  owner: string;
  covered: string;
  ready: boolean;
  notes: string;
};

export type ChecklistTemplateRow = {
  order: string;
  area: string;
  owner: string;
  covered: string;
};

export type MinistryUpdate = {
  id: string;
  meetingId: string;
  ministry: string;
  lead: string;
  update: string;
  comingUp: string;
  need: string;
  submittedBy: string;
  submittedOn: string;
};

export type Ministry = {
  ministry: string;
  lead: string;
  order: string;
};

export type StaffPin = {
  id: string;
  title: string;
  message: string;
  link: string;
  priority: string;
  showUntil: string;
  author: string;
  posted: string;
};

export type StaffPinAck = {
  id: string;
  pinId: string;
  staff: string;
  acknowledgedOn: string;
};

export type HubSetting = {
  key: string;
  value: string;
};

export type GraphicsRequest = {
  id: string;
  requestedBy: string;
  ministry: string;
  needed: string;
  platforms: string;
  event: string;
  eventDate: string;
  neededBy: string;
  description: string;
  links: string;
  status: string;
  assignedTo: string;
  created: string;
};

export type TimeAway = {
  id: string;
  requestedBy: string;
  kind: string;
  start: string;
  end: string;
  halfDay: boolean;
  notes: string;
  coverage: string;
  status: string;
  created: string;
};

export type WorkStatus = {
  id: string;
  date: string;
  staff: string;
  place: string;
  note: string;
};

export type Announcement = {
  id: string;
  date: string;
  event: string;
  kind: string;
  owner: string;
  announcedWhere: string;
  details: string;
  link: string;
  audience: string;
  meetingId: string;
  ministry: string;
};

export type CareNote = {
  id: string;
  meetingId: string;
  person: string;
  action: string;
  custom: string;
  details: string;
  assignee: string;
  done: boolean;
  actionItemId: string;
};

export type OpenIssue = {
  id: string;
  issue: string;
  owner: string;
  nextStep: string;
  due: string;
  status: string;
  created: string;
};

export type DeskRequest = {
  id: string;
  title: string;
  requestedBy: string;
  neededBy: string;
  details: string;
  needed: string;
  link: string;
  status: string;
  assignedTo: string;
  draftLink: string;
  created: string;
};

export type PinnedDocument = {
  id: string;
  title: string;
  group: string;
  link: string;
  notes: string;
};

export type QuickLink = {
  id: string;
  name: string;
  url: string;
  icon: string;
  order: string;
};

export type FolderLink = {
  id: string;
  name: string;
  url: string;
  icon: string;
  order: string;
};

export type WorkflowCard = {
  id: string;
  workflow: string;
  step: string;
  forPerson: string;
  assignee: string;
  assigneeEmail: string;
  overdue: string;
  movedToStep: string;
  link: string;
  firstSeen: string;
  lastSynced: string;
  personId: string;
  workflowId: string;
  assigneeId: string;
};

export type CardAction = {
  id: string;
  cardId: string;
  action: string;
  note: string;
  snoozeDays: string;
  newAssignee: string;
  requestedBy: string;
  requestedAt: string;
  status: string;
  result: string;
  doneAt: string;
};

export type HubData = {
  staff: StaffMember[];
  meetings: Meeting[];
  actionItems: ActionItem[];
  checklist: ChecklistItem[];
  checklistTemplate: ChecklistTemplateRow[];
  ministryUpdates: MinistryUpdate[];
  ministries: Ministry[];
  announcements: Announcement[];
  staffPins: StaffPin[];
  staffPinAcks: StaffPinAck[];
  settings: HubSetting[];
  graphicsRequests: GraphicsRequest[];
  timeAway: TimeAway[];
  workStatuses: WorkStatus[];
  careNotes: CareNote[];
  openIssues: OpenIssue[];
  requests: DeskRequest[];
  documents: PinnedDocument[];
  quickLinks: QuickLink[];
  folders: FolderLink[];
  workflowCards: WorkflowCard[];
  cardActions: CardAction[];
};

export interface HubStore {
  listStaff(): Promise<StaffMember[]>;
  listMeetings(): Promise<Meeting[]>;
  getMeeting(id: string): Promise<Meeting | null>;
  createMeeting(meeting: Meeting): Promise<void>;
  updateMeeting(id: string, changes: Partial<Meeting>): Promise<void>;
  listActionItems(): Promise<ActionItem[]>;
  getActionItem(id: string): Promise<ActionItem | null>;
  createActionItem(item: ActionItem): Promise<void>;
  updateActionItem(id: string, changes: Partial<ActionItem>): Promise<void>;
  deleteActionItem(id: string): Promise<void>;
  listChecklist(): Promise<ChecklistItem[]>;
  getChecklistItem(id: string): Promise<ChecklistItem | null>;
  createChecklistItems(items: ChecklistItem[]): Promise<void>;
  updateChecklistItem(id: string, changes: Partial<ChecklistItem>): Promise<void>;
  listChecklistTemplate(): Promise<ChecklistTemplateRow[]>;
  listMinistryUpdates(): Promise<MinistryUpdate[]>;
  createMinistryUpdate(update: MinistryUpdate): Promise<void>;
  updateMinistryUpdate(id: string, changes: Partial<MinistryUpdate>): Promise<void>;
  listMinistries(): Promise<Ministry[]>;
  listAnnouncements(): Promise<Announcement[]>;
  createAnnouncement(row: Announcement): Promise<void>;
  updateAnnouncement(id: string, changes: Partial<Announcement>): Promise<void>;
  deleteAnnouncement(id: string): Promise<void>;
  listStaffPins(): Promise<StaffPin[]>;
  createStaffPin(row: StaffPin): Promise<void>;
  updateStaffPin(id: string, changes: Partial<StaffPin>): Promise<void>;
  deleteStaffPin(id: string): Promise<void>;
  listStaffPinAcks(): Promise<StaffPinAck[]>;
  createStaffPinAck(row: StaffPinAck): Promise<void>;
  listSettings(): Promise<HubSetting[]>;
  setSetting(key: string, value: string): Promise<void>;
  listGraphicsRequests(): Promise<GraphicsRequest[]>;
  createGraphicsRequest(row: GraphicsRequest): Promise<void>;
  updateGraphicsRequest(id: string, changes: Partial<GraphicsRequest>): Promise<void>;
  listTimeAway(): Promise<TimeAway[]>;
  createTimeAway(row: TimeAway): Promise<void>;
  updateTimeAway(id: string, changes: Partial<TimeAway>): Promise<void>;
  listWorkStatuses(): Promise<WorkStatus[]>;
  createWorkStatus(row: WorkStatus): Promise<void>;
  updateWorkStatus(id: string, changes: Partial<WorkStatus>): Promise<void>;
  listCareNotes(): Promise<CareNote[]>;
  createCareNote(row: CareNote): Promise<void>;
  updateCareNote(id: string, changes: Partial<CareNote>): Promise<void>;
  deleteCareNote(id: string): Promise<void>;
  listOpenIssues(): Promise<OpenIssue[]>;
  createOpenIssue(row: OpenIssue): Promise<void>;
  updateOpenIssue(id: string, changes: Partial<OpenIssue>): Promise<void>;
  listRequests(): Promise<DeskRequest[]>;
  getRequest(id: string): Promise<DeskRequest | null>;
  createRequest(row: DeskRequest): Promise<void>;
  updateRequest(id: string, changes: Partial<DeskRequest>): Promise<void>;
  listDocuments(): Promise<PinnedDocument[]>;
  createDocument(row: PinnedDocument): Promise<void>;
  updateDocument(id: string, changes: Partial<PinnedDocument>): Promise<void>;
  listQuickLinks(): Promise<QuickLink[]>;
  createQuickLink(row: QuickLink): Promise<void>;
  updateQuickLink(id: string, changes: Partial<QuickLink>): Promise<void>;
  listFolders(): Promise<FolderLink[]>;
  createFolder(row: FolderLink): Promise<void>;
  updateFolder(id: string, changes: Partial<FolderLink>): Promise<void>;
  listWorkflowCards(): Promise<WorkflowCard[]>;
  listCardActions(): Promise<CardAction[]>;
}

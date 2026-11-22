export const READ_ONLY_TABS = ["Workflow Cards", "Card Actions", "Staff", "Ministries", "Checklist Template"] as const;

export const WRITABLE_TABS = [
  "Meetings",
  "Action Items",
  "Sunday Checklist",
  "Ministry Updates",
  "Announcements",
  "Care Notes",
  "Open Issues",
  "Requests",
  "Documents",
  "Quick Links",
  "Folders",
] as const;

export const ALL_TABS = [
  "Staff",
  "Meetings",
  "Action Items",
  "Sunday Checklist",
  "Checklist Template",
  "Ministry Updates",
  "Ministries",
  "Announcements",
  "Care Notes",
  "Open Issues",
  "Requests",
  "Documents",
  "Quick Links",
  "Folders",
  "Workflow Cards",
  "Card Actions",
] as const;

export const COLUMNS = {
  staff: ["Name", "Email", "Title", "Role", "Photo", "Active"],
  meetings: [
    "Meeting ID",
    "Date",
    "Title",
    "Status",
    "Attendees",
    "Notes By",
    "Prayer Requests",
    "Wins",
    "Calendar Look-ahead",
    "Care Update",
    "Notes",
  ],
  actionItems: ["Item ID", "Action", "Owner", "Due", "Status", "Meeting", "Update", "Created", "Completed On"],
  checklist: ["Check ID", "Meeting", "Order", "Area", "Owner", "What's Covered", "Ready", "Notes"],
  checklistTemplate: ["Order", "Area", "Owner", "What's Covered"],
  ministryUpdates: [
    "Update ID",
    "Meeting",
    "Ministry",
    "Lead",
    "Update",
    "Coming Up",
    "Need From Team",
    "Submitted By",
    "Submitted On",
  ],
  ministries: ["Ministry", "Lead", "Order"],
  announcements: [
    "Announcement ID",
    "Date",
    "Event",
    "Kind",
    "Owner",
    "Announced Where",
    "Details",
    "Link",
    "Audience",
  ],
  careNotes: ["Care Note ID", "Meeting", "Name", "Action", "Custom", "Details", "Assignee", "Done", "Action Item"],
  openIssues: ["Issue ID", "Issue", "Owner", "Next Step", "Due", "Status", "Created"],
  requests: [
    "Request ID",
    "Title",
    "Requested By",
    "Needed By",
    "Details",
    "What's Needed",
    "Link",
    "Status",
    "Assigned To",
    "Draft Link",
    "Created",
  ],
  documents: ["Doc ID", "Title", "Group", "Link", "Notes"],
  quickLinks: ["Link ID", "Name", "URL", "Icon", "Order"],
  folders: ["Folder ID", "Name", "URL", "Icon", "Order"],
  workflowCards: [
    "Card ID",
    "Workflow",
    "Step",
    "For Person",
    "Assignee",
    "Assignee Email",
    "Overdue",
    "Moved To Step",
    "Link",
    "First Seen",
    "Last Synced",
    "Person ID",
    "Workflow ID",
    "Assignee ID",
  ],
  cardActions: [
    "Action ID",
    "Card ID",
    "Action",
    "Note",
    "Snooze Days",
    "New Assignee",
    "Requested By",
    "Requested At",
    "Status",
    "Result",
    "Done At",
  ],
} as const;

export function normalizeHeader(header: string): string {
  return header
    .trim()
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ");
}

export function isWritableTab(tab: string): boolean {
  return (WRITABLE_TABS as readonly string[]).includes(tab);
}

# MV Staff Hub sheet

The hub reads and writes the spreadsheet named **MV Staff Hub (App Data)**. It appends rows and updates single cells. It does not replace a whole tab.

Dates are text in `M/D/YYYY`. People are stored by name. Optional columns are added as a new header cell the first time Meeting mode saves a ministry or links an announcement to a meeting. Existing columns are left as they are.

## Tabs the hub writes

| Tab | Required columns | Optional columns added by Meeting mode |
| --- | --- | --- |
| Meetings | Meeting ID, Date, Title, Status, Attendees, Notes By, Prayer Requests, Wins, Calendar Look-ahead, Care Update, Notes | |
| Action Items | Item ID, Action, Owner, Due, Status, Meeting, Update, Created, Completed On | Ministry |
| Announcements | Announcement ID, Date, Event, Kind, Owner, Announced Where, Details, Link, Audience | Meeting, Ministry |
| Care Notes | Care Note ID, Meeting, Name, Action, Custom, Details, Assignee, Done, Action Item | |
| Sunday Checklist | Check ID, Meeting, Order, Area, Owner, What's Covered, Ready, Notes | |
| Ministry Updates | Update ID, Meeting, Ministry, Lead, Update, Coming Up, Need From Team, Submitted By, Submitted On | |
| Open Issues | Issue ID, Issue, Owner, Next Step, Due, Status, Created | |
| Requests | Request ID, Title, Requested By, Needed By, Details, What's Needed, Link, Status, Assigned To, Draft Link, Created | |
| Documents | Doc ID, Title, Group, Link, Notes | |
| Quick Links | Link ID, Name, URL, Icon, Order | |
| Folders | Folder ID, Name, URL, Icon, Order | |

Meeting mode uses the existing Meetings, Action Items, and Announcements tabs.

- Prayer is **Prayer Requests**. Celebrations are **Wins**. Discussion is **Notes**.
- An action item's **Meeting** cell is the meeting id, so it also appears on that person's open items.
- An announcement's **Meeting** cell is the meeting id. **Ministry** is the ministry name when one was chosen.
- Removing an item during the live meeting deletes that one row. The header row is never deleted.
- Care notes live on the **Care Notes** tab. Action is Visit, Card, Flowers, Call, Meal, or Other. Custom is the words used when Action is Other. Done is TRUE or FALSE. If Assignee is filled in, Action Item holds the id of the matching row on Action Items, and that row shows on the assignee's own list. The hub adds the Care Notes tab, with its header row, the first time a note is saved and the tab is not there yet.

## Tabs the hub only reads

Staff, Ministries, Checklist Template, Workflow Cards, Card Actions.

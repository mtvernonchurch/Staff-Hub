# MV Staff Hub sheet

The hub reads and writes the spreadsheet named **MV Staff Hub (App Data)**. It appends rows and updates single cells. It does not replace a whole tab.

Dates are text in `M/D/YYYY`. People are stored by name. Optional columns are added as a new header cell the first time Meeting mode saves a ministry or links an announcement to a meeting. Existing columns are left as they are.

## Tabs the hub writes

| Tab | Required columns | Optional columns added by Meeting mode |
| --- | --- | --- |
| Meetings | Meeting ID, Date, Title, Status, Attendees, Notes By, Prayer Requests, Wins, Calendar Look-ahead, Care Update, Notes | |
| Action Items | Item ID, Action, Owner, Due, Status, Meeting, Update, Created, Completed On | Ministry |
| Announcements | Announcement ID, Date, Event, Kind, Owner, Announced Where, Details, Link, Audience | Meeting, Ministry, Channels |
| Calendar | Event ID, Date, Time, Event, Ministry, Location, Owner | |
| Calendar Checks | Check ID, Event ID, Email, Socials, Platform, Volunteers, Graphics, Notes | |
| Staff Announcements | Pin ID, Title, Message, Link, Priority, Show Until, Author, Posted | |
| Staff Announcement Acks | Ack ID, Pin ID, Staff, Acknowledged On | |
| Hub Settings | Setting, Value | |
| Graphics Requests | Request ID, Requested By, Ministry, What's Needed, Platforms, Event, Event Date, Needed By, Description, Links, Status, Assigned To, Created | |
| Time Away | Away ID, Requested By, Type, Start, End, Half Day, Notes, Coverage, Status, Created | |
| Work Status | Status ID, Date, Staff, Place, Note | |
| Care Notes | Care Note ID, Meeting, Name, Action, Custom, Details, Assignee, Done, Action Item | |
| Sunday Checklist | Check ID, Meeting, Order, Area, Owner, What's Covered, Ready, Notes | |
| Ministry Updates | Update ID, Meeting, Ministry, Lead, Update, Coming Up, Need From Team, Submitted By, Submitted On | |
| Open Issues | Issue ID, Issue, Owner, Next Step, Due, Status, Created | |
| Requests | Request ID, Title, Requested By, Needed By, Details, What's Needed, Link, Status, Assigned To, Draft Link, Created | |
| Documents | Doc ID, Title, Group, Link, Notes | |
| Quick Links | Link ID, Name, URL, Icon, Order | Initials, Color, Visible To, Hidden |
| Budgets | Ministry, Fiscal Year, Annual Budget, Spent YTD, Updated, Monthly | |
| Card Spend | Staff, Month, Limit, Spent | |
| Card Transactions | Transaction ID, Staff, Month, Date, Merchant, Amount, Receipt Missing | |
| Attendance | Attendance ID, Date, Service, Area, Count, Notes | |
| Folders | Folder ID, Name, URL, Icon, Order | |

Meeting mode uses the existing Meetings, Action Items, and Announcements tabs.

- Prayer is **Prayer Requests**. Celebrations are **Wins**. Discussion is **Notes**.
- An action item's **Meeting** cell is the meeting id, so it also appears on that person's open items.
- An announcement's **Meeting** cell is the meeting id. **Ministry** is the ministry name when one was chosen. **Channels** is one or more of Email, Socials, and Platform, separated by commas. A blank Channels cell is unsorted. It is not treated as a platform announcement. The hub adds the Channels header the first time an announcement is saved with that field.
- **Calendar** is the event list for the 4-week check: date, time, event, ministry, location, and owner. Admins add and edit those rows in Meeting mode. A later Planning Center or Google Calendar feed can replace this list. The hub adds the tab the first time it is opened if it is missing.
- **Calendar Checks** stores readiness for an event: Email, Socials, and Platform are TRUE when that channel has been promoted. Volunteers and Graphics are TRUE or FALSE. Notes is short text. Checks stay on this tab even if the event list later comes from another calendar.
- Removing an item during the live meeting deletes that one row. The header row is never deleted.
- Care notes live on the **Care Notes** tab. Action is Visit, Card, Flowers, Call, Meal, or Other. Custom is the words used when Action is Other. Done is TRUE or FALSE. If Assignee is filled in, Action Item holds the id of the matching row on Action Items, and that row shows on the assignee's own list. The hub adds the Care Notes tab, with its header row, the first time a note is saved and the tab is not there yet.
- **Staff Announcements** are the pinned notes at the top of Home. They are not the meeting **Announcements** tab. Priority is Normal or Urgent. Show Until is blank, or a date the note is still visible on. After that date it hides. Author and Posted are filled when an admin pins it. Removing a pin deletes that row.
- **Staff Announcement Acks** is one row per person who tapped Got it. Staff is their name. The hub adds both tabs the first time they are needed.
- **Hub Settings** holds one row per setting. `Graphics Owner` is the staff name who receives new graphics requests. Change that cell to move the work to someone else. No name is hard-coded in the app. For the live sheet, set it to Steven Holland until you want a different person. Sample mode uses Avery Quinn.
- **Graphics Requests** status is New, In progress, Ready for review, or Done. What's Needed and Platforms are comma-separated. Needed By under 7 days is a warning, not a block.
- **Time Away** type is PTO/vacation, Sick, Personal, Conference/training, or Other. Half Day is TRUE or FALSE. Status is Pending, Approved, or Denied. An admin approves or denies. Approved rows that cover today show on Home under Who's out.
- **Work Status** is where someone is working on that date: In office, Working from home, Out, or Off-site/visiting. Home shows only today's rows. A new day starts blank.

- **Quick Links** optional columns: Initials, Color, Visible To (`All`, `Admin`, or a ministry name), and Hidden (`TRUE` or `FALSE`). The hub adds those headers the first time an admin saves a link. Resources shows the first nine tiles, then Show all. The sample list keeps Planning Center, Church Center, Clearstream, Google Calendar, Adobe Express, and Amazon Business for everyone, and BILL and Patriot Software for admins.
- **Budgets**, **Card Spend**, and **Card Transactions** hold sample or live money figures. Amounts are filtered on the server: an admin sees every ministry and every staff card; a minister sees only ministries they lead on the Ministries tab and their own card. Monthly is a comma-separated trend. Do not put real giving or account numbers in the public repo. `DATA_SOURCE_BUDGET=bill` is a stub and does not call BILL.
- **Workflow Cards** stay read-only. Home shows only the cards whose Assignee Email matches the signed-in person. In sample mode that list comes from this tab. `DATA_SOURCE_WORKFLOWS=pco` is a stub and does not call Planning Center. The People API to wire later is `GET /people/v2/workflows` and `GET /people/v2/workflows/{id}/cards`, using `PCO_APP_ID` and `PCO_SECRET`.
- **Attendance** is one row per service and area: Service is `9:00` or `10:30`. Area is Adults/Worship, MV Kids, Students, Volunteers, or First-time guests. The in-the-room total adds Adults/Worship, MV Kids, and Students. Volunteers and first-time guests are shown separately. Counts are visible to all staff. Admins edit them in the hub. `DATA_SOURCE_ATTENDANCE=pco` is a stub and does not call Planning Center.

## Tabs the hub only reads

Staff, Ministries, Checklist Template, Workflow Cards, Card Actions.

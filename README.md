# MV Staff Hub

The staff home for Mt Vernon Church in Columbus, Mississippi. It replaces the unfinished AppSheet front end and uses the Google Sheet **MV Staff Hub (App Data)** as its notebook.

Staff open one site for:

- their action items, including what is overdue
- the Monday 1:00 PM staff meeting
- announcements
- the Sunday checklist
- shared folders, pinned documents, and quick links
- the Request Desk

It is meant to be added to a phone home screen. The sample you can open today uses fictional people, so nothing private is in this public repository.

## Try it first, with no Google setup

The sample hub does not need environment variables. Avery Quinn and Blake Nguyen are fictional.

### On your computer

1. Install Node.js 22 from [https://nodejs.org](https://nodejs.org).
2. Open Terminal (Mac) or Command Prompt (Windows), go to this folder, and run:

```bash
npm install
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000).
4. Choose **Avery Quinn** (admin) or **Blake Nguyen** (staff).

The green bar means you are looking at sample records, not the church sheet. Press Ctrl+C in the terminal when you are done.

### On Vercel, still with no environment variables

1. Go to [https://vercel.com](https://vercel.com) and choose **Add New** → **Project**.
2. Import `mtvernonchurch/Staff-Hub`.
3. Leave the defaults: **Framework Preset** is Next.js, **Root Directory** is the repository root, and the build command stays `next build`.
4. Do not add environment variables. Deploy.

Open the site and sign in as Avery or Blake. Sample mode is what you get until `DATA_MODE` and `AUTH_MODE` are set.

If an earlier import is stuck, open the project → **Settings** → **Build and Deployment**. Set Framework Preset to **Next.js**, leave Root Directory as `./`, and clear any custom Output Directory. Then use **Deployments** → the failed deployment → **Redeploy**. You still do not add environment variables for the sample.

`npm test` checks the rules for who can edit what, and that saves add a row or change single cells instead of rewriting a tab.

## What each page is for

| Page | What staff do there |
| --- | --- |
| Home | A pinned note for everyone sits above a welcome by first name. Then only your open items, care notes, requests, and where you are working today. Shared announcements, who's out, and who's in sit below. Admins can switch to a team overview |
| This week | Announcements, action items, prayer, celebrations, and notes from the latest staff meeting, plus earlier meetings |
| Meeting mode | Admins only. Live entry during Monday's 1:00 PM staff meeting |
| Action items | The one shared list. Filter mine or everyone's. Add, update, and mark done |
| Meetings | Prayer, wins, the week ahead, ministry updates, discussion and decisions, and the items from that meeting |
| Sunday checklist | The areas copied from the checklist template for a meeting |
| Announcements | What the church or the staff need to hear |
| Documents | Quick links, shared folders, and pinned files. The files stay in Drive |
| Requests | Graphics and social, time away, or a general request for email, text, website, or a Sunday announcement |

On a phone the navy menu moves to the top and scrolls sideways.

## Connect the real spreadsheet

Skip this until the sample site is up. With no environment variables the hub stays in sample mode. Setting `DATA_MODE=sheets` and `AUTH_MODE=google` is what switches it to the church sheet and Google sign-in.

Do this once, in order. You will create a Google Cloud project, a robot user (a service account) that can edit the sheet, and a Google sign-in button that only accepts `@mtvernon.church` accounts.

Keep the downloaded key file off this git repository. The repository is public.

### 1. Create the Google Cloud project

1. Sign in to [https://console.cloud.google.com](https://console.cloud.google.com) with the church admin account that owns the spreadsheet.
2. Click the project dropdown at the top and choose **New project**.
3. Name it `MV Staff Hub` and create it. Wait until Google switches you into that project.

### 2. Turn on the Sheets API

1. In the search bar, type **Google Sheets API**.
2. Open it and click **Enable**.

The hub does not need the Drive API. It only reads and writes this one spreadsheet.

### 3. Create the robot user

1. Search for **Service accounts** and open that page.
2. Click **Create service account**.
3. Name it `mv-staff-hub`. The email will look like `mv-staff-hub@something.iam.gserviceaccount.com`.
4. Skip the optional permissions and user-access steps. The sheet share in step 6 is what grants access.
5. Open the new service account, go to **Keys**, then **Add key** → **Create new key** → **JSON** → **Create**.
6. A file downloads. Put it somewhere private, not in this folder.
7. Open the file in a text editor. You will paste it into Vercel in step 8. You can delete the file after it is saved there.

### 4. Tell Google who may sign in

1. Search for **Google Auth platform** or **OAuth consent screen**.
2. If it asks for a user type, choose **Internal**. Internal means only people in the mtvernon.church Workspace can even see the consent screen.
3. App name: `MV Staff Hub`. Support email: your church address. Save.
4. You do not need extra permission scopes. Sign-in only asks for the person's name and email.

### 5. Create the sign-in client

1. Go to **Clients** (or **Credentials**) and click **Create client**.
2. Application type: **Web application**.
3. Name: `MV Staff Hub web`.
4. Under **Authorized JavaScript origins**, add:
   - `http://localhost:3000`
   - `https://YOUR-SITE.vercel.app` (you will know the exact address after the first deploy; add it then)
5. Under **Authorized redirect URIs**, add both of these, with your real site in place of the example:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://YOUR-SITE.vercel.app/api/auth/callback/google`
6. Create it. Copy the **Client ID** and **Client secret**. You will not be able to see the secret again later; if you lose it, create a new secret on that same client.

### 6. Share the spreadsheet

1. Open the spreadsheet named **MV Staff Hub (App Data)**.
2. Click **Share**.
3. Paste the service account email from step 3 (it ends in `gserviceaccount.com`).
4. Set the role to **Editor**.
5. Uncheck "Notify people". A service account cannot read mail.
6. Share.

Also look at the **Staff** tab:

- **Email** must be the person's `@mtvernon.church` address.
- **Active** must be `TRUE`. Anything else is turned away.
- **Role** must be exactly `Admin` or `Staff`. Only `Admin` can assign action items to other people, edit meetings, post announcements, and manage links, folders, and pinned documents.
- On the November 21 copy of the sheet, only Steven's row says Admin. Heather's row says Staff. Change Heather's Role cell to `Admin` if she should manage the hub. The app does not have their names written into the code.

Edit the Staff tab, the Ministries tab, and the Checklist Template tab in the sheet itself. The website reads them and does not write them.

### 7. Fill in the settings

Copy `.env.example` to a file named `.env.local` in this folder. `.env.local` is ignored by git. Do not rename it to `.env` and commit it.

For a real run, set:

```bash
DATA_MODE=sheets
AUTH_MODE=google
AUTH_SECRET=paste-a-long-random-string
AUTH_GOOGLE_ID=the-client-id
AUTH_GOOGLE_SECRET=the-client-secret
AUTH_URL=http://localhost:3000
GOOGLE_SERVICE_ACCOUNT_JSON=paste-the-whole-key-file
GOOGLE_SHEET_ID=the-long-id-between-/d/-and-/edit-in-the-sheet-url
ALLOWED_DOMAIN=mtvernon.church
```

`AUTH_SECRET` can be any long password you make up. It signs the login cookie. Use a different one from any other password, and use the same value in Vercel.

`GOOGLE_SHEET_ID` is the long id in the sheet URL:

`https://docs.google.com/spreadsheets/d/THIS_PART/edit`

If pasting the JSON file is awkward, leave `GOOGLE_SERVICE_ACCOUNT_JSON` blank and set these two instead:

- `GOOGLE_SERVICE_ACCOUNT_EMAIL` = the `client_email` value
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` = the `private_key` value, quotes included

Restart `npm run dev` after you save `.env.local`. Sign in with your church Google account. A Gmail account, an inactive person, and an email that is not on the Staff tab are all refused.

### 8. Put it on Vercel

1. Push this repository to GitHub if it is not there already.
2. Sign in at [https://vercel.com](https://vercel.com) and choose **Add New** → **Project**.
3. Import this repository. Vercel detects Next.js. Do not change the build command.
4. Open **Environment Variables** before the first deploy and add every name from step 7.
5. Set `AUTH_URL` to the site address Vercel gives you, including `https://`, with no slash at the end.
6. Deploy.
7. Go back to the Google sign-in client from step 5 and add the real `https://…` origin and `https://…/api/auth/callback/google` redirect if you did not have them yet. Save, then try sign-in again.

For day-to-day staff use, set `DATA_MODE` to `sheets` and `AUTH_MODE` to `google`. Leave a preview deployment on `mock` if you want a public demo that cannot touch the sheet.

### 9. Add it to a phone

After the site is deployed, open it in Safari or Chrome on the phone, sign in once, then:

- iPhone: Share → **Add to Home Screen**
- Android: the browser menu → **Add to Home screen** or **Install app**

The icon says MV. Signing in lasts about 30 days.

## Who can do what

| | Staff | Admin |
| --- | --- | --- |
| See meetings, items, announcements, requests, files | Yes | Yes |
| Add an action item for themselves, update it, mark it done | Yes | Yes |
| Assign an item to someone else, or change the owner | No | Yes |
| Edit meetings, announcements, links, folders, pinned documents | No | Yes |
| Send a request, and approve or send back their own draft | Yes | Yes |
| Pin a note on Home, and see who tapped Got it | No | Yes |
| Tap Got it on a pinned note | Yes | Yes |
| Send a graphics or time-away request | Yes | Yes |
| Choose the graphics owner, and approve or deny time away | No | Yes |
| Set where you are working today | Yes | Yes |
| Move a request through the queue and attach a draft link | No | Yes |
| Check off their own Sunday area | Yes | Yes, any area |
| Start this week's checklist from the template, if it is empty | Yes | Yes |

Everyone sees every record. Do not put pastoral care details, personnel matters, or money in the hub.

## How saving works

The website does not download the sheet and upload a new copy. That would erase someone else's edit.

- A new meeting, item, request, or other record is **added as a new row**.
- A change updates **only the cells you edited**.
- If two people save different fields of the same row, both saves keep.
- If two people save the same field, the later save wins.
- If an id is on more than one row, the hub refuses to write and asks you to fix the sheet.
- Rows are not replaced in bulk. Mark an item done, or mark a request withdrawn. An admin can remove a pinned Home note, which deletes that one row and its Got it rows.
- These tabs are read-only: **Workflow Cards**, **Card Actions**, **Staff**, **Ministries**, **Checklist Template**. Another automation maintains the workflow tabs. Do not let this app overwrite them.

Dates are stored as `M/D/YYYY` text, which matches the sheet today. The clock for "overdue" and "this Monday" is Columbus time.

Graphics requests are assigned from one cell, **Hub Settings** → `Graphics Owner`. The app does not hard-code a name. On the live sheet, set that cell to Steven Holland for now. Change the cell, or the control on Request Desk, when someone else should receive them. Sample mode uses Avery Quinn. The hub adds **Staff Announcements**, **Graphics Requests**, **Time Away**, **Work Status**, and **Hub Settings** the first time they are saved, if those tabs are missing. Column lists are in SCHEMA.md.

## Staff chat, later

The pages say **staff chat**. They do not name a product, and they do not post messages yet.

When you are ready for the hub to post a new or overdue action item into a chat space, the place to connect that is `lib/chat/notifier.ts`. Replace `createStaffChat()` with a notifier that sends `action_item.created` and `action_item.overdue`. A failure there must not block the save. That also needs Chat apps allowed in the Workspace admin console, which is a separate yes from you.

Quick links can point at each space. The label in the sample data is "Staff chat".

## Assumptions

- The sheet you already have is the database. Column names and ids stay as they are.
- People are stored by **name** in Owner, Lead, and similar columns, because that is how the sheet is set up. If someone changes their name on the Staff tab, older rows still show the old name until you edit them.
- The Request Desk is **one row per request**, because that is the Requests tab. The channels they asked for go in **What's Needed**. The whole request has one status: New, In progress, Ready for review, Changes requested, Approved, Done, Declined, or Withdrawn. A separate status for each channel would need new columns or a new tab.
- There is no column for a decline reason. The status becomes Declined, and the reason is said in person or in staff chat.
- "Ready for review" requires an `https://` draft link. The requester's approval is for that saved link.
- Action item statuses the hub writes are Open, In progress, and Done.
- There is no separate calendar page. Days off live on the staff-out quick link. Room booking stays in Planning Center.
- The hub does not show email, and it does not copy files out of Drive.
- Workflow cards on Home are a read-only view of the rows the other automation already wrote, filtered to the signed-in email.
- Open issues sit at the bottom of Action items. They are shared problems, not someone's to-do.
- Monday at 1:00 PM is the weekly staff meeting. Home looks for a meeting on the coming Monday.
- Sample rows already in the sheet, such as `sample01`, are left in place. Delete them in the sheet if you do not want staff to see them.

## Open questions

- When should this open for everyone, and who pilots it first?
- Should the spreadsheet move from your My Drive to a shared drive before the service account is added?
- Which chat spaces should exist, and when should Chat apps be allowed so the hub can post?
- Should Heather's Role cell be changed from Staff to Admin?
- Do you want the sample rows removed from the live sheet?
- The MV monogram is a stand-in. Send a logo file and the church's official colors if you want those instead of navy `#04354b` and mint `#a8e0cf`.
- If a request really needs a separate status for the graphic and the email, that is a sheet change and a follow-up to this app.
- The AppSheet "My Cards" link can stay until you retire AppSheet. This hub already shows each person's workflow cards and does not write the card-action queue.

## Project layout

- `app/` pages
- `lib/services/hub.ts` who is allowed to change what
- `lib/data/sheets-store.ts` and `lib/sheets/` the Google Sheet reads and writes
- `lib/data/mock-data.ts` the fictional preview
- `lib/chat/notifier.ts` the unused staff-chat hook
- `tests/` role checks and sheet write checks

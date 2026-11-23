import Link from "next/link";
import { setWorkStatusAction } from "@/app/(hub)/extra-actions";
import { AttendanceCard } from "@/components/attendance-card";
import { MinistryBudgetCard, StaffCardSpend } from "@/components/budget-card";
import { HomeSearch } from "@/components/home-search";
import { QuickLinkGrid } from "@/components/quick-link-grid";
import { ActionItemForm, ActionList } from "@/components/records";
import { StaffPinBoard } from "@/components/staff-pins";
import { Empty, Flash, OutLink } from "@/components/ui";
import { loadBudgetView } from "@/lib/budgets/view";
import { monthKey } from "@/lib/budgets/access";
import type { ActionItem, Meeting, WorkflowCard } from "@/lib/data/types";
import { isAdmin } from "@/lib/domain/access";
import { eventsToday, sundayService } from "@/lib/domain/calendar";
import { careActionLabel } from "@/lib/domain/care";
import { graphicsForPerson, graphicsOpen, pendingTimeAway, timeAwayForPerson, whosOut, workForDay, WORK_PILLS, workPlaceLabel } from "@/lib/domain/desk";
import {
  chicagoToday,
  formatFriendly,
  formatLong,
  formatUsDate,
  greeting,
  isClosedStatus,
  isDueSoon,
  isOverdue,
  parseSheetDate,
  sameDay,
  weekStartMonday,
  workWeek,
} from "@/lib/domain/dates";
import { firstName, initials, namesMatch, normalizeEmail } from "@/lib/domain/people";
import { visibleProgramLinks } from "@/lib/domain/programs";
import { announcementsForMeeting, myOpenItems, pickMondayMeeting, sortActionItems, sortAnnouncements, sortByOrder, thisWeekMeeting } from "@/lib/domain/view";
import { requireStaff } from "@/lib/session";
import { requestWaitingOn } from "@/lib/services/hub";

export const metadata = { title: "Home" };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; view?: string }>;
}) {
  const query = await searchParams;
  const { staff, store } = await requireStaff();
  const teamView = isAdmin(staff) && query.view === "team";
  const today = chicagoToday();
  const [items, meetings, announcements, links, checklist, requests, cards, people, careNotes, pins, acks, graphics, away, work, calendarEvents, documents, attendance, ministries] = await Promise.all([
    store.listActionItems(),
    store.listMeetings(),
    store.listAnnouncements(),
    store.listQuickLinks(),
    store.listChecklist(),
    store.listRequests(),
    store.listWorkflowCards(),
    store.listStaff(),
    store.listCareNotes(),
    store.listStaffPins(),
    store.listStaffPinAcks(),
    store.listGraphicsRequests(),
    store.listTimeAway(),
    store.listWorkStatuses(),
    store.listCalendarEvents(),
    store.listDocuments(),
    store.listAttendance(),
    store.listMinistries(),
  ]);
  const budgets = await loadBudgetView(staff, store, monthKey(today));
  const mineItems = items.filter((item) => namesMatch(item.owner, staff.name));
  const open = teamView
    ? sortActionItems(items.filter((item) => !isClosedStatus(item.status)), today)
    : myOpenItems(items, staff.name, today);
  const myNotes = careNotes.filter((note) => namesMatch(note.assignee, staff.name) && !note.done);
  const visibleNotes = teamView ? careNotes.filter((note) => !note.done) : myNotes;
  const waiting = requests.filter((request) => requestWaitingOn(staff, request));
  const myGraphics = teamView ? graphicsOpen(graphics) : graphicsForPerson(graphics, staff.name);
  const myAway = teamView ? pendingTimeAway(away) : timeAwayForPerson(away, staff.name, today);
  const approvals = isAdmin(staff) && !teamView ? pendingTimeAway(away).filter((row) => !namesMatch(row.requestedBy, staff.name)) : [];
  const todayLabel = formatUsDate(today);
  const todayWork = workForDay(work, todayLabel);
  const myWork = todayWork.find((row) => namesMatch(row.staff, staff.name));
  const outToday = whosOut(away, today);
  const overdueCount = open.filter((item) => isOverdue(item.due, item.status, today)).length;
  const dueSoonCount = open.filter((item) => isDueSoon(item.due, item.status, today)).length;
  const weekStart = weekStartMonday(today);
  const doneThisWeek = (teamView ? items : mineItems).filter((item) => {
    const completed = parseSheetDate(item.completedOn);
    return completed && completed.getTime() >= weekStart.getTime() && completed.getTime() <= today.getTime();
  }).length;
  const monday = pickMondayMeeting(meetings, today);
  const weekMeeting = thisWeekMeeting(meetings, today);
  const weekNews = weekMeeting ? announcementsForMeeting(announcements, weekMeeting) : [];
  const mondayChecklist = checklist.filter((row) => monday && row.meetingId === monday.id);
  const readyCount = mondayChecklist.filter((row) => row.ready).length;
  const myCards = cards.filter((card) => normalizeEmail(card.assigneeEmail) === normalizeEmail(staff.email));
  const news = sortAnnouncements(announcements).slice(0, 3);
  const quick = sortByOrder(links);
  const returnTo = teamView ? "/?view=team" : "/";
  const sunday = sundayService(calendarEvents, today);
  const sundayDate = sunday ? parseSheetDate(sunday.date) : null;
  const ready = Number(sunday?.volunteersReady);
  const needed = Number(sunday?.volunteersNeeded);
  const hasVolunteers = Number.isFinite(ready) && Number.isFinite(needed) && needed > 0;
  const todayEvents = eventsToday(calendarEvents, today).filter((event) => event.id !== sunday?.id);
  const programLinks = visibleProgramLinks(staff, links, ministries);
  const myCard = budgets.ok ? budgets.cards.find((card) => namesMatch(card.staff, staff.name)) : undefined;
  const myCharges = budgets.ok && myCard ? budgets.transactions.filter((row) => namesMatch(row.staff, staff.name)) : [];

  return (
    <>
      <HomeSearch
        initials={initials(staff.name)}
        items={[
          ...items.map((item) => ({ href: "/action-items", title: item.action, kind: "Task" })),
          ...documents.map((doc) => ({ href: doc.link, title: doc.title, kind: "File", external: true })),
          ...links.map((link) => ({ href: link.url, title: link.name, kind: "File", external: true })),
          ...people.filter((person) => person.active).map((person) => ({ href: "", title: person.name, kind: person.title || "Person" })),
        ]}
      />
      <header className="home-hello-block">
        <p className="home-date">{formatLong(today).toUpperCase()}</p>
        <div className="hello-row">
          <h1>{greeting()}, {firstName(staff.name)}</h1>
          {isAdmin(staff) ? (
            <div className="filters view-toggle" aria-label="Home view">
              <Link className={teamView ? "" : "is-on"} href="/">My home</Link>
              <Link className={teamView ? "is-on" : ""} href="/?view=team">Team overview</Link>
            </div>
          ) : null}
        </div>
      </header>
      <form action={setWorkStatusAction} className="status-pills">
        <input type="hidden" name="returnTo" value={returnTo} />
        <input type="hidden" name="note" value={myWork?.note ?? ""} />
        <span>Today I&apos;m</span>
        {WORK_PILLS.map((pill) => (
          <button key={pill.value} className={myWork?.place === pill.value ? "pill is-on" : "pill"} name="place" value={pill.value} type="submit">
            {pill.label}
          </button>
        ))}
      </form>
      <section className="card this-week-card">
        <div className="card-head">
          <h2>This week</h2>
          <Link href="/this-week">Full calendar</Link>
        </div>
        {sunday && sundayDate ? (
          <article className="sunday-card">
            <div className="date-tile">
              <span>SUN</span>
              <strong>{sundayDate.getUTCDate()}</strong>
            </div>
            <div>
              <h3>{sunday.event}</h3>
              <p>{sunday.time ? `· ${sunday.time}` : ""}</p>
              {sunday.plan ? <p className="note">{sunday.plan}{hasVolunteers ? ` ${ready} of ${needed} volunteers confirmed.` : ""}</p> : null}
              {hasVolunteers ? <div className="progress" aria-hidden><span style={{ width: `${Math.min(100, Math.round((ready / needed) * 100))}%` }} /></div> : null}
            </div>
          </article>
        ) : <p className="empty">No Sunday service is on the calendar yet.</p>}
        {todayEvents.map((event) => (
          <article key={event.id} className="today-row">
            <p><span>Today</span><strong>{event.time || "—"}</strong></p>
            <div>
              <h3>{event.event}</h3>
              <p className="meta">
                {event.owner ? <span>{event.owner}</span> : null}
                {event.location ? <span>{event.location}</span> : null}
                {event.ministry ? <span className="chip">{event.ministry}</span> : null}
              </p>
            </div>
          </article>
        ))}
      </section>
      <Flash error={query.error} notice={query.notice} />
      <StaffPinBoard pins={pins} acks={acks} actor={staff} today={today} returnTo={returnTo} />
      <AttendanceCard rows={attendance} today={today} editable={isAdmin(staff)} returnTo={returnTo} />
      {budgets.ok ? <MinistryBudgetCard rows={budgets.ministries} today={today} sample={budgets.sample} admin={isAdmin(staff)} /> : <p className="banner banner-error">{budgets.message}</p>}
      {myCard && budgets.ok ? <StaffCardSpend card={myCard} transactions={myCharges} sample={budgets.sample} /> : null}
      <section className="card">
        <h2>Quick links</h2>
        <QuickLinkGrid links={programLinks} />
      </section>
      <section className="card">
        <div className="card-head">
          <h2>Announcements</h2>
          <Link href="/announcements">All</Link>
        </div>
        {weekNews.length === 0 ? <Empty>No announcements from this week's meeting yet.</Empty> : weekNews.map((item) => (
          <article key={item.id} className="announce-row">
            <h3>{item.event}</h3>
            {item.details ? <p>{item.details}</p> : null}
          </article>
        ))}
      </section>
      <div className="stack">
        <section className="card tone-action">
          <div className="card-head">
            <h2>{teamView ? "Open items for the team" : "Your open items"}</h2>
            <Link href={teamView ? "/action-items?scope=all" : "/action-items"}>All items</Link>
          </div>
          <ActionList items={open} actor={staff} staff={people} meetings={meetings} today={today} returnTo={returnTo} />
          {teamView ? null : (
            <details>
              <summary>Add an item</summary>
              <ActionItemForm actor={staff} staff={people} meetings={meetings} returnTo={returnTo} />
            </details>
          )}
        </section>
        <section className="card">
          <div className="card-head">
            <h2>{teamView ? "Open care notes" : "Your care notes"}</h2>
            <Link href="/this-week">This week</Link>
          </div>
          {visibleNotes.length === 0 ? <Empty>{teamView ? "No open care notes." : "Nothing assigned to you."}</Empty> : visibleNotes.map((note) => (
            <article key={note.id} className="item">
              <div>
                <h3>{note.person}</h3>
                <p className="meta">
                  <span>{careActionLabel(note)}</span>
                  {teamView && note.assignee ? <span>{note.assignee}</span> : null}
                  {note.details ? <span>{note.details}</span> : null}
                </p>
              </div>
            </article>
          ))}
        </section>
        <section className="card">
          <div className="card-head">
            <h2>{teamView ? "Requests that need an admin" : "Your requests"}</h2>
            <Link href="/requests">Request Desk</Link>
          </div>
          {waiting.length + myGraphics.length + myAway.length + approvals.length === 0 ? <Empty>Nothing is waiting on you.</Empty> : null}
          {waiting.map((request) => (
            <Link key={request.id} href={`/requests/${request.id}`} className="meeting-link">
              <strong>{request.title}</strong>
              <span>{request.status} · {namesMatch(staff.name, request.requestedBy) ? "You asked" : request.requestedBy}</span>
            </Link>
          ))}
          {myGraphics.map((request) => (
            <Link key={request.id} href={`/requests/graphics/${request.id}`} className="meeting-link">
              <strong>{request.event}</strong>
              <span>Graphics · {request.status} · {namesMatch(staff.name, request.requestedBy) ? "You asked" : request.requestedBy}</span>
            </Link>
          ))}
          {myAway.map((request) => (
            <Link key={request.id} href={`/requests/away/${request.id}`} className="meeting-link">
              <strong>{request.kind}</strong>
              <span>Time away · {request.status} · {formatFriendly(request.start)}</span>
            </Link>
          ))}
          {approvals.map((request) => (
            <Link key={request.id} href={`/requests/away/${request.id}`} className="meeting-link">
              <strong>{request.kind}</strong>
              <span>Time away needs approval · {request.requestedBy}</span>
            </Link>
          ))}
        </section>
        {myCards.length > 0 && !teamView ? (
          <section className="card">
            <h2>Your workflow cards</h2>
            <p className="hint">From Planning Center. Open a card there to work it. This hub only shows them.</p>
            {myCards.map((card) => <CardRow key={card.id} card={card} />)}
          </section>
        ) : null}
        <h2 className="section-break">For the whole staff</h2>
        <section className="card">
          <h2>Who&apos;s out</h2>
          {outToday.length === 0 ? <Empty>No approved time away covers today.</Empty> : outToday.map((row) => (
            <article key={row.id} className="item">
              <div>
                <h3>{row.requestedBy}</h3>
                <p className="meta">
                  <span>{row.kind}</span>
                  {row.halfDay ? <span>Half day</span> : null}
                  <span>{formatFriendly(row.start)}{row.end !== row.start ? ` – ${formatFriendly(row.end)}` : ""}</span>
                  {row.coverage ? <span>Covered by {row.coverage}</span> : null}
                </p>
              </div>
            </article>
          ))}
        </section>
        <section className="card">
          <h2>Who&apos;s in today</h2>
          <p className="hint">Yesterday&apos;s status is not carried over.</p>
          {people.filter((person) => person.active).map((person) => {
            const status = todayWork.find((row) => namesMatch(row.staff, person.name));
            return (
              <article key={person.email} className="item">
                <div>
                  <h3>{namesMatch(person.name, staff.name) ? "You" : person.name}</h3>
                  <p className="meta">
                    <span>{status ? workPlaceLabel(status.place) : "Not set"}</span>
                    {status?.note ? <span>{status.note}</span> : null}
                  </p>
                </div>
              </article>
            );
          })}
        </section>
        <section className="card tone-news">
          <div className="card-head">
            <h2>This week</h2>
            <Link href="/this-week">Open</Link>
          </div>
          {weekMeeting ? (
            <>
              <p><strong>{weekMeeting.title}</strong></p>
              <p className="hint">{formatFriendly(weekMeeting.date)}</p>
              {weekNews.length === 0 ? <p className="empty">No announcements from this meeting yet.</p> : weekNews.slice(0, 3).map((item) => (
                <article key={item.id} className="item">
                  <div>
                    <h3>{item.event}</h3>
                    {item.details ? <p className="note">{item.details}</p> : null}
                  </div>
                </article>
              ))}
            </>
          ) : (
            <p className="empty">The staff meeting is not posted yet.</p>
          )}
        </section>
        <section className="card tone-meeting">
          <div className="card-head">
            <h2>Monday, 1:00 PM</h2>
            {monday ? <Link href={`/meetings/${monday.id}`}>Open</Link> : <Link href="/meetings">Meetings</Link>}
          </div>
          {monday ? (
            <>
              <p><strong>{monday.title}</strong></p>
              <p className="hint">{formatFriendly(monday.date)} · {monday.status || "Upcoming"}</p>
              {monday.notes ? <p className="prose">{monday.notes}</p> : <p className="empty">Notes will show here after the meeting.</p>}
            </>
          ) : (
            <p className="empty">This Monday&apos;s agenda is not opened yet.</p>
          )}
          {mondayChecklist.length > 0 ? (
            <p className="progress-label"><Link href="/checklist">{readyCount} of {mondayChecklist.length} Sunday areas ready</Link></p>
          ) : null}
        </section>
        <section className="card tone-news">
          <div className="card-head">
            <h2>Announcements</h2>
            <Link href="/announcements">All</Link>
          </div>
          {news.length === 0 ? <Empty>No announcements yet.</Empty> : news.map((item) => (
            <article key={item.id} className="item">
              <div>
                <h3>{item.event}</h3>
                <p className="meta"><span>{formatFriendly(item.date)}</span>{item.kind ? <span>{item.kind}</span> : null}</p>
              </div>
            </article>
          ))}
        </section>
      </div>
    </>
  );
}

function CardRow({ card }: { card: WorkflowCard }) {
  const late = /^(yes|true)$/i.test(card.overdue);
  return (
    <article className={late ? "item item-overdue" : "item"}>
      <div>
        <h3>{card.workflow}</h3>
        <p className="meta">
          <span>{card.step}</span>
          {card.forPerson ? <span>{card.forPerson}</span> : null}
          {late ? <span className="chip chip-overdue">Overdue</span> : null}
        </p>
      </div>
      <OutLink className="btn btn-small" href={card.link}>Open card</OutLink>
    </article>
  );
}

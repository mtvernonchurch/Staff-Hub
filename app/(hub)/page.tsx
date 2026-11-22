import Link from "next/link";
import { ActionItemForm, ActionList } from "@/components/records";
import { Empty, Flash, OutLink, PageHeader } from "@/components/ui";
import type { ActionItem, Meeting, WorkflowCard } from "@/lib/data/types";
import { isAdmin } from "@/lib/domain/access";
import { careActionLabel } from "@/lib/domain/care";
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
import { firstName, namesMatch, normalizeEmail } from "@/lib/domain/people";
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
  const [items, meetings, announcements, links, checklist, requests, cards, people, careNotes] = await Promise.all([
    store.listActionItems(),
    store.listMeetings(),
    store.listAnnouncements(),
    store.listQuickLinks(),
    store.listChecklist(),
    store.listRequests(),
    store.listWorkflowCards(),
    store.listStaff(),
    store.listCareNotes(),
  ]);
  const mineItems = items.filter((item) => namesMatch(item.owner, staff.name));
  const open = teamView
    ? sortActionItems(items.filter((item) => !isClosedStatus(item.status)), today)
    : myOpenItems(items, staff.name, today);
  const myNotes = careNotes.filter((note) => namesMatch(note.assignee, staff.name) && !note.done);
  const visibleNotes = teamView ? careNotes.filter((note) => !note.done) : myNotes;
  const waiting = requests.filter((request) => requestWaitingOn(staff, request));
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

  return (
    <>
      <PageHeader
        kicker="Mt Vernon Church · Columbus"
        title={`Welcome, ${firstName(staff.name)}`}
        lede={`${greeting()} · ${formatLong(today)}`}
      />
      <Flash error={query.error} notice={query.notice} />
      {isAdmin(staff) ? (
        <div className="filters" aria-label="Home view">
          <Link className={teamView ? "btn btn-small" : "btn btn-primary btn-small"} href="/">My home</Link>
          <Link className={teamView ? "btn btn-primary btn-small" : "btn btn-small"} href="/?view=team">Team overview</Link>
        </div>
      ) : null}
      <section className="summary" aria-label="My week">
        <div className="ring" style={{ background: `conic-gradient(#b7e6d6 ${open.length + doneThisWeek ? Math.round((doneThisWeek / (open.length + doneThisWeek)) * 100) : 0}%, rgba(255,255,255,0.16) 0)` }} aria-hidden>
          <span>{doneThisWeek}</span>
        </div>
        <div>
          <p>{teamView ? "Team week" : "My week"}</p>
          <div className="stat-row">
            <strong>{overdueCount} overdue</strong>
            <strong>{dueSoonCount} due soon</strong>
            <strong>{open.length} open</strong>
            <strong>{visibleNotes.length} care {visibleNotes.length === 1 ? "note" : "notes"}</strong>
            <strong>{waiting.length} {waiting.length === 1 ? "request" : "requests"}</strong>
          </div>
          <WeekStrip today={today} items={teamView ? items : mineItems} meetings={meetings} />
        </div>
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
          {waiting.length === 0 ? <Empty>Nothing is waiting on you.</Empty> : waiting.map((request) => (
            <Link key={request.id} href={`/requests/${request.id}`} className="meeting-link">
              <strong>{request.title}</strong>
              <span>{request.status} · {namesMatch(staff.name, request.requestedBy) ? "You asked" : request.requestedBy}</span>
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
        <section className="card">
          <h2>Quick links</h2>
          {quick.length === 0 ? <Empty>No links yet.</Empty> : (
            <div className="quick-grid">
              {quick.map((link) => (
                <OutLink key={link.id} className="quick-link" href={link.url}>{link.name}</OutLink>
              ))}
            </div>
          )}
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

function WeekStrip({ today, items, meetings }: { today: Date; items: ActionItem[]; meetings: Meeting[] }) {
  return (
    <ol className="week">
      {workWeek(today).map((day) => {
        const label = formatUsDate(day);
        const hasItem = items.some((item) => !isClosedStatus(item.status) && sameDay(item.due, label));
        const hasMeeting = meetings.some((meeting) => sameDay(meeting.date, label));
        const isToday = sameDay(label, formatUsDate(today));
        const name = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(day);
        return (
          <li key={label} className={isToday ? "is-today" : undefined}>
            <span>{name}</span>
            <strong>{day.getUTCDate()}</strong>
            <span className="dots">
              {hasItem ? <i className="dot dot-action" title="Due" /> : null}
              {hasMeeting ? <i className="dot dot-meeting" title="Meeting" /> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

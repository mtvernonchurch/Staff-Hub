import Link from "next/link";
import { ActionItemForm, ActionList } from "@/components/records";
import { Empty, Flash, OutLink, PageHeader } from "@/components/ui";
import type { ActionItem, Meeting } from "@/lib/data/types";
import {
  chicagoToday,
  formatFriendly,
  formatLong,
  formatUsDate,
  greeting,
  isClosedStatus,
  isOverdue,
  parseSheetDate,
  sameDay,
  weekStartMonday,
  workWeek,
} from "@/lib/domain/dates";
import { firstName, normalizeEmail } from "@/lib/domain/people";
import { mine, pickMondayMeeting, sortActionItems, sortAnnouncements, sortByOrder } from "@/lib/domain/view";
import { requireStaff } from "@/lib/session";
import { requestWaitingOn } from "@/lib/services/hub";

export const metadata = { title: "Home" };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const { staff, store } = await requireStaff();
  const today = chicagoToday();
  const [items, meetings, announcements, links, checklist, requests, cards, people] = await Promise.all([
    store.listActionItems(),
    store.listMeetings(),
    store.listAnnouncements(),
    store.listQuickLinks(),
    store.listChecklist(),
    store.listRequests(),
    store.listWorkflowCards(),
    store.listStaff(),
  ]);
  const mineItems = mine(items, staff.name);
  const open = sortActionItems(mineItems.filter((item) => !isClosedStatus(item.status)), today);
  const overdueCount = open.filter((item) => isOverdue(item.due, item.status, today)).length;
  const weekStart = weekStartMonday(today);
  const doneThisWeek = mineItems.filter((item) => {
    const completed = parseSheetDate(item.completedOn);
    return completed && completed.getTime() >= weekStart.getTime() && completed.getTime() <= today.getTime();
  }).length;
  const ringTotal = doneThisWeek + open.length;
  const monday = pickMondayMeeting(meetings, today);
  const mondayChecklist = checklist.filter((row) => monday && row.meetingId === monday.id);
  const readyCount = mondayChecklist.filter((row) => row.ready).length;
  const waiting = requests.filter((request) => requestWaitingOn(staff, request));
  const myCards = cards.filter((card) => normalizeEmail(card.assigneeEmail) === normalizeEmail(staff.email));
  const news = sortAnnouncements(announcements).slice(0, 3);
  const quick = sortByOrder(links);

  return (
    <>
      <PageHeader kicker="Mt Vernon Church · Columbus" title={`${greeting()}, ${firstName(staff.name)}`} lede={formatLong(today)} />
      <Flash error={query.error} notice={query.notice} />
      <section className="summary">
        <div className="ring" style={{ background: `conic-gradient(#b7e6d6 ${ringTotal ? Math.round((doneThisWeek / ringTotal) * 100) : 0}%, rgba(255,255,255,0.16) 0)` }} aria-hidden>
          <span>{doneThisWeek}</span>
        </div>
        <div>
          <p>{doneThisWeek === 1 ? "1 item done this week" : `${doneThisWeek} items done this week`}</p>
          <div className="stat-row">
            <strong>{overdueCount} overdue</strong>
            <strong>{open.length} still open</strong>
            {waiting.length === 1 ? <strong>1 request needs you</strong> : null}
            {waiting.length > 1 ? <strong>{waiting.length} requests need you</strong> : null}
          </div>
          <WeekStrip today={today} items={mineItems} meetings={meetings} />
        </div>
      </section>
      <div className="grid-home">
        <section className="card tone-action">
          <div className="card-head">
            <h2>Your open items</h2>
            <Link href="/action-items">All items</Link>
          </div>
          <ActionList items={open} actor={staff} staff={people} meetings={meetings} today={today} returnTo="/" />
          <details>
            <summary>Add an item</summary>
            <ActionItemForm actor={staff} staff={people} meetings={meetings} returnTo="/" />
          </details>
        </section>
        <div className="stack">
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
                  {item.details ? <p className="note">{item.details}</p> : null}
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
          {myCards.length > 0 ? (
            <section className="card">
              <h2>Workflow cards</h2>
              <p className="hint">From Planning Center. Open a card there to work it. This hub only shows them.</p>
              {myCards.map((card) => {
                const late = /^(yes|true)$/i.test(card.overdue);
                return (
                  <article key={card.id} className={late ? "item item-overdue" : "item"}>
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
              })}
            </section>
          ) : null}
        </div>
      </div>
    </>
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

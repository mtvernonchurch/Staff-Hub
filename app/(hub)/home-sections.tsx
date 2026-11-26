import { Bell, GitBranch, Inbox, Megaphone, SquareCheck } from "lucide-react";
import Link from "next/link";
import { MinistryBudgetCard } from "@/components/budget-card";
import { Heading } from "@/components/heading";
import { HomeAnnouncements } from "@/components/home-announcements";
import { ActionItemForm, ActionList } from "@/components/records";
import { StaffPinBoard } from "@/components/staff-pins";
import { UpcomingEventsCard } from "@/components/upcoming-events";
import { StatusChip } from "@/components/status-chip";
import { Empty } from "@/components/ui";
import { RecentAttendanceCard } from "@/components/recent-attendance";
import { WorkflowList } from "@/components/workflow-list";
import { monthKey } from "@/lib/budgets/access";
import { loadBudgetView } from "@/lib/budgets/view";
import { isAdmin } from "@/lib/domain/access";
import { addUtcDays, formatFriendly, isOverdue, parseSheetDate } from "@/lib/domain/dates";
import { normalizeEmail } from "@/lib/domain/people";
import { KIND_LABEL, deskRows } from "@/lib/domain/request-desk";
import { announcementsForMeeting, myOpenItems, thisWeekMeeting } from "@/lib/domain/view";
import type { HubStore, StaffMember } from "@/lib/data/types";
import { loadHomeCalendar, loadRecentAttendance } from "@/lib/pco/load";
import { loadMyWorkflows } from "@/lib/workflows/source";

export function Pending({ title }: { title: string }) {
  return (
    <section className="card" aria-busy="true">
      <p className="hint">Loading {title}</p>
    </section>
  );
}

export async function HomePins({ store, actor, today }: { store: HubStore; actor: StaffMember; today: Date }) {
  const [pins, acks] = await Promise.all([store.listStaffPins(), store.listStaffPinAcks()]);
  return <StaffPinBoard pins={pins} acks={acks} actor={actor} today={today} returnTo="/" />;
}

export async function HomeAnnouncementsSection({ store, today }: { store: HubStore; today: Date }) {
  const [meetings, announcements] = await Promise.all([store.listMeetings(), store.listAnnouncements()]);
  const weekMeeting = thisWeekMeeting(meetings, today);
  const weekNews = weekMeeting ? announcementsForMeeting(announcements, weekMeeting) : [];
  const monday = weekMeeting ? parseSheetDate(weekMeeting.date) : null;
  const short = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
  const range = monday ? `${short.format(monday)}–${short.format(addUtcDays(monday, 6))}` : "";
  return (
    <section className="card">
      <div className="card-head">
        <Heading icon={Megaphone}>{range ? `Announcements for ${range}` : "Announcements"}</Heading>
        <Link href="/this-week">Calendar</Link>
      </div>
      {weekMeeting ? <p className="hint">From the {formatFriendly(weekMeeting.date)} staff meeting.</p> : null}
      <HomeAnnouncements rows={weekNews} />
    </section>
  );
}

export async function HomeTasks({ store, actor, today }: { store: HubStore; actor: StaffMember; today: Date }) {
  const [items, meetings, people] = await Promise.all([store.listActionItems(), store.listMeetings(), store.listStaff()]);
  const open = myOpenItems(items, actor.name, today);
  return (
    <section className="card tone-action">
      <div className="card-head">
        <Heading icon={SquareCheck}>Your tasks</Heading>
        <Link href="/action-items">All tasks</Link>
      </div>
      <ActionList items={open} actor={actor} staff={people} meetings={meetings} today={today} returnTo="/" />
      <details>
        <summary>Add a task</summary>
        <ActionItemForm actor={actor} staff={people} meetings={meetings} returnTo="/" />
      </details>
    </section>
  );
}

export async function HomeCalendarSection({ today }: { today: Date }) {
  const upcoming = await loadHomeCalendar(today);
  if (!upcoming.ok) return <p className="banner banner-error" role="alert">{upcoming.message}</p>;
  return <UpcomingEventsCard events={upcoming.data} sample={upcoming.sample} />;
}

export async function HomeWorkflows({ email }: { email: string }) {
  const workflows = await loadMyWorkflows(email);
  return (
    <section className="card">
      <div className="card-head">
        <Heading icon={GitBranch}>Planning Center workflows</Heading>
        <span className="hint">Assigned to you</span>
      </div>
      {workflows.ok ? (
        workflows.cards.length === 0 ? <Empty>No workflow cards are assigned to you.</Empty> : <WorkflowList cards={workflows.cards} />
      ) : <p className="banner banner-error">{workflows.message}</p>}
    </section>
  );
}

export async function HomeCheckIns({ today }: { today: Date }) {
  const checkIns = await loadRecentAttendance(today);
  if (!checkIns.ok) return <p className="banner banner-error" role="alert">{checkIns.message}</p>;
  return <RecentAttendanceCard attendance={checkIns.data} sample={checkIns.sample} today={today} />;
}

export async function HomeBudgets({ store, actor, today }: { store: HubStore; actor: StaffMember; today: Date }) {
  const budgets = await loadBudgetView(actor, store, monthKey(today));
  if (!budgets.ok) return <p className="banner banner-error">{budgets.message}</p>;
  return <MinistryBudgetCard rows={budgets.ministries} today={today} sample={budgets.sample} admin={isAdmin(actor)} />;
}

/**
 * The first thing on Home: what is waiting on you right now, and the way to
 * ask for something. Requests of every kind, plus how many tasks are overdue.
 */
export async function HomeNeedsYou({ store, actor, today }: { store: HubStore; actor: StaffMember; today: Date }) {
  const [requests, graphics, away, items, prefs] = await Promise.all([
    store.listRequests(),
    store.listGraphicsRequests(),
    store.listTimeAway(),
    store.listActionItems(),
    store.listNotificationPrefs(),
  ]);
  const waiting = deskRows(requests, graphics, away, today).filter((row) => row.waitingOn(actor));
  const overdue = myOpenItems(items, actor.name, today).filter((item) => isOverdue(item.due, item.status, today));
  const alertsSet = prefs.some((row) => row.email === normalizeEmail(actor.email));
  const shown = waiting.slice(0, 4);
  return (
    <section className="card needs-you" aria-labelledby="needs-you-title">
      <div className="card-head">
        <h2 id="needs-you-title" className="with-icon">
          <Inbox aria-hidden size={18} strokeWidth={2} />
          <span>Needs you</span>
        </h2>
        <Link className="btn btn-primary btn-small" href="/requests">Make a request</Link>
      </div>
      {waiting.length === 0 && overdue.length === 0 ? <p className="empty">You&apos;re all caught up.</p> : null}
      {shown.map((row) => (
        <Link key={`${row.kind}-${row.id}`} href={row.href} className="meeting-link desk-row">
          <span className="desk-row-top">
            <strong>{row.title}</strong>
            <StatusChip status={row.status} />
          </span>
          <span>
            {KIND_LABEL[row.kind]} · {row.requestedBy}
            {row.when ? ` · ${row.when}` : ""}
            {row.shortNotice ? " · short notice" : ""}
          </span>
        </Link>
      ))}
      {waiting.length > shown.length ? (
        <Link className="meeting-link" href="/requests">See all {waiting.length} requests waiting on you</Link>
      ) : null}
      {overdue.length ? (
        <Link className="meeting-link needs-overdue" href="/action-items">
          <strong>{overdue.length === 1 ? "1 task is overdue" : `${overdue.length} tasks are overdue`}</strong>
          <span>Open your tasks to update or finish {overdue.length === 1 ? "it" : "them"}.</span>
        </Link>
      ) : null}
      {!alertsSet ? (
        <Link className="alerts-nudge" href="/notifications">
          <Bell aria-hidden size={16} />
          <span><strong>Turn on alerts</strong> so requests and tasks reach you by email or on your phone.</span>
        </Link>
      ) : null}
    </section>
  );
}

import { GitBranch, Megaphone, SquareCheck } from "lucide-react";
import Link from "next/link";
import { AttendanceCard } from "@/components/attendance-card";
import { MinistryBudgetCard } from "@/components/budget-card";
import { Heading } from "@/components/heading";
import { HomeAnnouncements } from "@/components/home-announcements";
import { ActionItemForm, ActionList } from "@/components/records";
import { StaffPinBoard } from "@/components/staff-pins";
import { UpcomingEventsCard } from "@/components/upcoming-events";
import { Empty } from "@/components/ui";
import { RecentAttendanceCard } from "@/components/recent-attendance";
import { WorkflowList } from "@/components/workflow-list";
import { monthKey } from "@/lib/budgets/access";
import { loadBudgetView } from "@/lib/budgets/view";
import { isAdmin } from "@/lib/domain/access";
import { formatUsDate } from "@/lib/domain/dates";
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
  return (
    <section className="card">
      <div className="card-head">
        <Heading icon={Megaphone}>This week&apos;s announcements</Heading>
        <Link href="/this-week">Calendar</Link>
      </div>
      <HomeAnnouncements rows={weekNews} todayLabel={formatUsDate(today)} />
    </section>
  );
}

export async function HomeTasks({ store, actor, today }: { store: HubStore; actor: StaffMember; today: Date }) {
  const [items, meetings, people] = await Promise.all([store.listActionItems(), store.listMeetings(), store.listStaff()]);
  const open = myOpenItems(items, actor.name, today);
  return (
    <section className="card tone-action">
      <div className="card-head">
        <Heading icon={SquareCheck}>Your open items</Heading>
        <Link href="/action-items">All items</Link>
      </div>
      <ActionList items={open} actor={actor} staff={people} meetings={meetings} today={today} returnTo="/" />
      <details>
        <summary>Add an item</summary>
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
  return <RecentAttendanceCard attendance={checkIns.data} sample={checkIns.sample} />;
}

export async function HomeSheetAttendance({ store, actor, today }: { store: HubStore; actor: StaffMember; today: Date }) {
  const attendance = await store.listAttendance();
  return <AttendanceCard rows={attendance} today={today} editable={isAdmin(actor)} returnTo="/" />;
}

export async function HomeBudgets({ store, actor, today }: { store: HubStore; actor: StaffMember; today: Date }) {
  const budgets = await loadBudgetView(actor, store, monthKey(today));
  if (!budgets.ok) return <p className="banner banner-error">{budgets.message}</p>;
  return <MinistryBudgetCard rows={budgets.ministries} today={today} sample={budgets.sample} admin={isAdmin(actor)} />;
}

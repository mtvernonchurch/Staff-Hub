import Link from "next/link";
import { GitBranch, Megaphone, SquareCheck } from "lucide-react";
import { AttendanceCard } from "@/components/attendance-card";
import { MinistryBudgetCard } from "@/components/budget-card";
import { Heading } from "@/components/heading";
import { HomeAnnouncements } from "@/components/home-announcements";
import { ActionItemForm, ActionList } from "@/components/records";
import { StaffPinBoard } from "@/components/staff-pins";
import { Empty, Flash } from "@/components/ui";
import { RecentAttendanceCard } from "@/components/recent-attendance";
import { UpcomingEventsCard } from "@/components/upcoming-events";
import { WorkflowList } from "@/components/workflow-list";
import { monthKey } from "@/lib/budgets/access";
import { loadBudgetView } from "@/lib/budgets/view";
import { isAdmin } from "@/lib/domain/access";
import { chicagoToday, formatUsDate } from "@/lib/domain/dates";
import { announcementsForMeeting, myOpenItems, thisWeekMeeting } from "@/lib/domain/view";
import { homeEvents, loadRecentAttendance, loadUpcomingEvents } from "@/lib/pco/load";
import { requireStaff } from "@/lib/session";
import { loadMyWorkflows } from "@/lib/workflows/source";

export const metadata = { title: "Home" };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const { staff, store } = await requireStaff();
  const today = chicagoToday();
  const [items, meetings, announcements, people, pins, acks, attendance] = await Promise.all([
    store.listActionItems(),
    store.listMeetings(),
    store.listAnnouncements(),
    store.listStaff(),
    store.listStaffPins(),
    store.listStaffPinAcks(),
    store.listAttendance(),
  ]);
  const [budgets, workflows, upcoming, checkIns] = await Promise.all([
    loadBudgetView(staff, store, monthKey(today)),
    loadMyWorkflows(staff.email),
    loadUpcomingEvents(today),
    loadRecentAttendance(today),
  ]);
  const open = myOpenItems(items, staff.name, today);
  const weekMeeting = thisWeekMeeting(meetings, today);
  const weekNews = weekMeeting ? announcementsForMeeting(announcements, weekMeeting) : [];

  return (
    <>
      <Flash error={query.error} notice={query.notice} />
      <section className="stack">
        <StaffPinBoard pins={pins} acks={acks} actor={staff} today={today} returnTo="/" />
        <section className="card">
          <div className="card-head">
            <Heading icon={Megaphone}>This week&apos;s announcements</Heading>
            <Link href="/this-week">Calendar</Link>
          </div>
          <HomeAnnouncements rows={weekNews} todayLabel={formatUsDate(today)} />
        </section>
        <section className="card tone-action">
          <div className="card-head">
            <Heading icon={SquareCheck}>Your open items</Heading>
            <Link href="/action-items">All items</Link>
          </div>
          <ActionList items={open} actor={staff} staff={people} meetings={meetings} today={today} returnTo="/" />
          <details>
            <summary>Add an item</summary>
            <ActionItemForm actor={staff} staff={people} meetings={meetings} returnTo="/" />
          </details>
        </section>
        {upcoming.ok ? (
          <UpcomingEventsCard events={homeEvents(upcoming.data, today)} sample={upcoming.sample} moreHref="/upcoming" />
        ) : <p className="banner banner-error" role="alert">{upcoming.message}</p>}
        <section className="card">
          <div className="card-head">
            <Heading icon={GitBranch}>Planning Center workflows</Heading>
            <span className="hint">Assigned to you</span>
          </div>
          {workflows.ok ? (
            workflows.cards.length === 0 ? <Empty>No workflow cards are assigned to you.</Empty> : <WorkflowList cards={workflows.cards} />
          ) : <p className="banner banner-error">{workflows.message}</p>}
        </section>
        {checkIns.ok ? (
          <RecentAttendanceCard attendance={checkIns.data} sample={checkIns.sample} />
        ) : <p className="banner banner-error" role="alert">{checkIns.message}</p>}
        <AttendanceCard rows={attendance} today={today} editable={isAdmin(staff)} returnTo="/" />
        {budgets.ok ? (
          <MinistryBudgetCard rows={budgets.ministries} today={today} sample={budgets.sample} admin={isAdmin(staff)} />
        ) : <p className="banner banner-error">{budgets.message}</p>}
      </section>
    </>
  );
}

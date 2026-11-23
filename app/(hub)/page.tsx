import Link from "next/link";
import { AttendanceCard } from "@/components/attendance-card";
import { MinistryBudgetCard } from "@/components/budget-card";
import { ActionItemForm, ActionList } from "@/components/records";
import { StaffPinBoard } from "@/components/staff-pins";
import { Empty, Flash, OutLink } from "@/components/ui";
import { monthKey } from "@/lib/budgets/access";
import { loadBudgetView } from "@/lib/budgets/view";
import type { WorkflowCard } from "@/lib/data/types";
import { isAdmin } from "@/lib/domain/access";
import { parseChannels } from "@/lib/domain/channels";
import { chicagoToday } from "@/lib/domain/dates";
import { announcementsForMeeting, myOpenItems, thisWeekMeeting } from "@/lib/domain/view";
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
  const [budgets, workflows] = await Promise.all([
    loadBudgetView(staff, store, monthKey(today)),
    loadMyWorkflows(staff.email),
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
            <h2>This week&apos;s announcements</h2>
            <Link href="/this-week">Calendar</Link>
          </div>
          {weekNews.length === 0 ? <Empty>Nothing from this week&apos;s meeting yet.</Empty> : weekNews.map((item) => (
            <article key={item.id} className="announce-row">
              <h3>{item.event}</h3>
              <p className="meta">
                {parseChannels(item.channels).map((channel) => <span key={channel} className="chip">{channel}</span>)}
                {parseChannels(item.channels).length === 0 ? <span className="chip">Unsorted</span> : null}
              </p>
              {item.details ? <p>{item.details}</p> : null}
            </article>
          ))}
        </section>
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
        <section className="card">
          <div className="card-head">
            <h2>Planning Center workflows</h2>
            <span className="hint">Assigned to you</span>
          </div>
          {workflows.ok ? (
            workflows.cards.length === 0 ? <Empty>No workflow cards are assigned to you.</Empty> : workflows.cards.map((card) => <WorkflowRow key={card.id} card={card} />)
          ) : <p className="banner banner-error">{workflows.message}</p>}
        </section>
        <AttendanceCard rows={attendance} today={today} editable={isAdmin(staff)} returnTo="/" />
        {budgets.ok ? (
          <MinistryBudgetCard rows={budgets.ministries} today={today} sample={budgets.sample} admin={isAdmin(staff)} />
        ) : <p className="banner banner-error">{budgets.message}</p>}
      </section>
    </>
  );
}

function WorkflowRow({ card }: { card: WorkflowCard }) {
  const late = /^(yes|true)$/i.test(card.overdue);
  return (
    <article className={late ? "item item-overdue" : "item"}>
      <div>
        <h3>{card.workflow}</h3>
        <p className="meta">
          {card.forPerson ? <span>{card.forPerson}</span> : null}
          <span>{card.step}</span>
          {late ? <span className="chip chip-overdue">Overdue</span> : <span className="chip">Open</span>}
        </p>
      </div>
      <OutLink className="btn btn-small" href={card.link}>Open card</OutLink>
    </article>
  );
}

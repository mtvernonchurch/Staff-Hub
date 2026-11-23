import Link from "next/link";
import { Calendar, CalendarDays, Megaphone } from "lucide-react";
import { MonthBoard, WeekEvents } from "@/components/calendar-board";
import { CalendarCheckBoard } from "@/components/calendar-check";
import { Heading } from "@/components/heading";
import { HomeAnnouncements } from "@/components/home-announcements";
import { PageHeader } from "@/components/ui";
import { sheetCalendarSource } from "@/lib/calendar/source";
import { isAdmin } from "@/lib/domain/access";
import { eventsInMonth, eventsInWeek, mondayWeek } from "@/lib/domain/calendar";
import { chicagoToday, formatFriendly, formatUsDate } from "@/lib/domain/dates";
import { announcementsForMeeting, thisWeekMeeting } from "@/lib/domain/view";
import { requireStaff } from "@/lib/session";

export const metadata = { title: "Calendar" };

export default async function ThisWeekPage() {
  const { staff, store } = await requireStaff();
  const today = chicagoToday();
  const todayLabel = formatUsDate(today);
  const week = mondayWeek(today);
  const [meetings, announcements, people, ministries, calendarEvents, calendarChecks] = await Promise.all([
    store.listMeetings(),
    store.listAnnouncements(),
    store.listStaff(),
    store.listMinistries(),
    sheetCalendarSource(store).listEvents(),
    store.listCalendarChecks(),
  ]);
  const meeting = thisWeekMeeting(meetings, today);
  const weekNews = meeting ? announcementsForMeeting(announcements, meeting) : [];

  return (
    <>
      <PageHeader
        kicker="Church calendar"
        icon={CalendarDays}
        title="Calendar"
        lede="This week, this month, and where each event is being promoted."
      />
      <p className="hint">
        <Link href="/meetings">Meetings</Link>
        {" · "}
        <Link href="/checklist">Sunday checklist</Link>
        {isAdmin(staff) ? <> · <Link href="/meeting">Meeting mode</Link> · <Link href="/announcements">Edit announcements</Link></> : null}
      </p>
      <nav className="jump-row" aria-label="Calendar sections">
        <a href="#this-week">This Week</a>
        <a href="#this-month">This Month</a>
        <a href="#communications">Communications Calendar</a>
      </nav>
      <div className="stack">
        <section className="card section-anchor" id="this-week">
          <Heading icon={CalendarDays}>This Week</Heading>
          <p className="hint">{formatFriendly(formatUsDate(week.start))} – {formatFriendly(formatUsDate(week.end))}</p>
          <WeekEvents events={eventsInWeek(calendarEvents, week)} />
          <HomeAnnouncements rows={weekNews} todayLabel={todayLabel} />
        </section>
        <section className="card section-anchor" id="this-month">
          <Heading icon={Calendar}>This Month</Heading>
          <MonthBoard events={eventsInMonth(calendarEvents, today)} todayLabel={todayLabel} />
        </section>
        <section className="card section-anchor" id="communications">
          <Heading icon={Megaphone}>Communications Calendar</Heading>
          <CalendarCheckBoard
            events={calendarEvents}
            checks={calendarChecks}
            todayLabel={todayLabel}
            editable={false}
            staff={people}
            ministries={ministries}
          />
        </section>
      </div>
    </>
  );
}

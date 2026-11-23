import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { AttendanceCard } from "@/components/attendance-card";
import { ThisWeekView } from "@/components/this-week";
import { PageHeader } from "@/components/ui";
import { sheetCalendarSource } from "@/lib/calendar/source";
import { chicagoToday, formatUsDate } from "@/lib/domain/dates";
import { isAdmin } from "@/lib/domain/access";
import { announcementsForMeeting, sortActionItems, thisWeekMeeting } from "@/lib/domain/view";
import { requireStaff } from "@/lib/session";

export const metadata = { title: "This week" };

export default async function ThisWeekPage() {
  const { staff, store } = await requireStaff();
  const today = chicagoToday();
  const [meetings, announcements, items, careNotes, people, ministries, calendarEvents, calendarChecks, attendance] = await Promise.all([
    store.listMeetings(),
    store.listAnnouncements(),
    store.listActionItems(),
    store.listCareNotes(),
    store.listStaff(),
    store.listMinistries(),
    sheetCalendarSource(store).listEvents(),
    store.listCalendarChecks(),
    store.listAttendance(),
  ]);
  const meeting = thisWeekMeeting(meetings, today);
  const archive = meetings.filter((row) => row.id !== meeting?.id);
  const weekNotes = meeting ? careNotes.filter((note) => note.meetingId === meeting.id) : [];
  const linked = new Set(weekNotes.map((note) => note.actionItemId).filter(Boolean));

  return (
    <>
      <PageHeader
        kicker="From Monday's staff meeting"
        icon={CalendarDays}
        title="Calendar"
        lede="Announcements by channel, and the next four weeks."
      />
      <p className="hint">
        <Link href="/meetings">Meetings</Link>
        {" · "}
        <Link href="/checklist">Sunday checklist</Link>
        {isAdmin(staff) ? <> · <Link href="/meeting">Meeting mode</Link> · <Link href="/announcements">Edit announcements</Link></> : null}
      </p>
      <AttendanceCard rows={attendance} today={today} editable={isAdmin(staff)} returnTo="/this-week" />
      <ThisWeekView
        meeting={meeting}
        announcements={meeting ? announcementsForMeeting(announcements, meeting) : []}
        items={meeting ? sortActionItems(items.filter((item) => item.meetingId === meeting.id && !linked.has(item.id)), today) : []}
        careNotes={weekNotes}
        archive={archive}
        calendar={{
          events: calendarEvents,
          checks: calendarChecks,
          todayLabel: formatUsDate(today),
          staff: people,
          ministries,
        }}
      />
    </>
  );
}

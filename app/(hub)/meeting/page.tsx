import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { AttendanceCard } from "@/components/attendance-card";
import { MeetingMode } from "@/components/meeting-mode";
import { PageHeader } from "@/components/ui";
import { isAdmin } from "@/lib/domain/access";
import { sheetCalendarSource } from "@/lib/calendar/source";
import { chicagoToday, formatFriendly, formatUsDate } from "@/lib/domain/dates";
import { isFrameworkError } from "@/lib/framework";
import { HubError } from "@/lib/hub-error";
import { requireStaff } from "@/lib/session";
import { ensureMondayMeeting } from "@/lib/services/hub";

export const metadata = { title: "Meeting mode" };

export default async function MeetingModePage() {
  const { staff, store } = await requireStaff();
  if (!isAdmin(staff)) redirect("/meetings");
  let meeting;
  try {
    meeting = await ensureMondayMeeting({ store, actor: staff });
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    const message = error instanceof HubError ? error.message : "Meeting mode could not open this week's staff meeting.";
    return <p className="banner banner-error" role="alert">{message}</p>;
  }
  const [itemList, announcementList, care, peopleList, ministryList, calendar, checks, counts] = await Promise.all([
    loadList(() => store.listActionItems(), "action items"),
    loadList(() => store.listAnnouncements(), "announcements"),
    loadList(() => store.listCareNotes(), "care notes"),
    loadList(() => store.listStaff(), "the staff list"),
    loadList(() => store.listMinistries(), "ministries"),
    loadList(() => sheetCalendarSource(store).listEvents(), "the calendar"),
    loadList(() => store.listCalendarChecks(), "calendar checks"),
    loadList(() => store.listAttendance(), "attendance"),
  ]);
  const items = itemList.rows;
  const announcements = announcementList.rows;
  const people = peopleList.rows;
  const careNotes = care.rows;
  const ministries = ministryList.rows;
  const calendarEvents = calendar.rows;
  const calendarChecks = checks.rows;
  const attendance = counts.rows;
  const notices = [itemList.error, announcementList.error, care.error, peopleList.error, ministryList.error, calendar.error, checks.error, counts.error].filter(Boolean);
  const today = chicagoToday();
  const meetingNotes = careNotes.filter((note) => note.meetingId === meeting.id);
  const linked = new Set(meetingNotes.map((note) => note.actionItemId).filter(Boolean));

  return (
    <>
      <PageHeader
        kicker="Monday at 1:00 PM"
        icon={ClipboardList}
        title="Staff meeting"
        lede={`Live notes for ${formatFriendly(meeting.date)}. What you add here is on each person's list as soon as you save it.`}
      />
      <p className="hint"><Link href="/meetings">All meetings</Link></p>
      {notices.map((notice) => <p key={notice} className="banner banner-error" role="alert">{notice}</p>)}
      <AttendanceCard rows={attendance} today={today} editable returnTo="/meeting" />
      <MeetingMode
        meeting={meeting}
        initialItems={items.filter((item) => item.meetingId === meeting.id && !linked.has(item.id))}
        initialAnnouncements={announcements.filter((row) => row.meetingId === meeting.id)}
        initialCareNotes={meetingNotes}
        staff={people}
        ministries={ministries}
        calendarEvents={calendarEvents}
        calendarChecks={calendarChecks}
        todayLabel={formatUsDate(today)}
      />
    </>
  );
}

async function loadList<T>(work: () => Promise<T[]>, label: string): Promise<{ rows: T[]; error: string }> {
  try {
    return { rows: await work(), error: "" };
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return {
      rows: [] as T[],
      error: error instanceof HubError ? error.message : `Could not load ${label}.`,
    };
  }
}

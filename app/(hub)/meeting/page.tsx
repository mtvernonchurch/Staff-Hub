import { redirect } from "next/navigation";
import { MeetingMode } from "@/components/meeting-mode";
import { PageHeader } from "@/components/ui";
import { isAdmin } from "@/lib/domain/access";
import { sheetCalendarSource } from "@/lib/calendar/source";
import { chicagoToday, formatFriendly, formatUsDate } from "@/lib/domain/dates";
import { requireStaff } from "@/lib/session";
import { ensureMondayMeeting } from "@/lib/services/hub";

export const metadata = { title: "Meeting mode" };

export default async function MeetingModePage() {
  const { staff, store } = await requireStaff();
  if (!isAdmin(staff)) redirect("/this-week");
  const meeting = await ensureMondayMeeting({ store, actor: staff });
  const [items, announcements, careNotes, people, ministries, calendarEvents, calendarChecks] = await Promise.all([
    store.listActionItems(),
    store.listAnnouncements(),
    store.listCareNotes(),
    store.listStaff(),
    store.listMinistries(),
    sheetCalendarSource(store).listEvents(),
    store.listCalendarChecks(),
  ]);
  const meetingNotes = careNotes.filter((note) => note.meetingId === meeting.id);
  const linked = new Set(meetingNotes.map((note) => note.actionItemId).filter(Boolean));

  return (
    <>
      <PageHeader
        kicker="Monday at 1:00 PM"
        title="Staff meeting"
        lede={`Live notes for ${formatFriendly(meeting.date)}. What you add here is on each person's list as soon as you save it.`}
      />
      <MeetingMode
        meeting={meeting}
        initialItems={items.filter((item) => item.meetingId === meeting.id && !linked.has(item.id))}
        initialAnnouncements={announcements.filter((row) => row.meetingId === meeting.id)}
        initialCareNotes={meetingNotes}
        staff={people}
        ministries={ministries}
        calendarEvents={calendarEvents}
        calendarChecks={calendarChecks}
        todayLabel={formatUsDate(chicagoToday())}
      />
    </>
  );
}

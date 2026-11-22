import { ThisWeekView } from "@/components/this-week";
import { PageHeader } from "@/components/ui";
import { chicagoToday } from "@/lib/domain/dates";
import { announcementsForMeeting, sortActionItems, thisWeekMeeting } from "@/lib/domain/view";
import { requireStaff } from "@/lib/session";

export const metadata = { title: "This week" };

export default async function ThisWeekPage() {
  const { store } = await requireStaff();
  const today = chicagoToday();
  const [meetings, announcements, items] = await Promise.all([
    store.listMeetings(),
    store.listAnnouncements(),
    store.listActionItems(),
  ]);
  const meeting = thisWeekMeeting(meetings, today);
  const archive = meetings.filter((row) => row.id !== meeting?.id);

  return (
    <>
      <PageHeader
        kicker="From Monday's staff meeting"
        title="This week"
        lede="Announcements, action items, and notes for the whole staff."
      />
      <ThisWeekView
        meeting={meeting}
        announcements={meeting ? announcementsForMeeting(announcements, meeting) : []}
        items={meeting ? sortActionItems(items.filter((item) => item.meetingId === meeting.id), today) : []}
        archive={archive}
      />
    </>
  );
}

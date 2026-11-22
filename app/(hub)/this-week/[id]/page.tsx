import { notFound } from "next/navigation";
import { ThisWeekView } from "@/components/this-week";
import { PageHeader } from "@/components/ui";
import { chicagoToday, formatFriendly, sortMeetings } from "@/lib/domain/dates";
import { announcementsForMeeting, sortActionItems } from "@/lib/domain/view";
import { requireStaff } from "@/lib/session";

export const metadata = { title: "Meeting archive" };

export default async function ArchivedWeekPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { store } = await requireStaff();
  const today = chicagoToday();
  const [meetings, announcements, items] = await Promise.all([
    store.listMeetings(),
    store.listAnnouncements(),
    store.listActionItems(),
  ]);
  const meeting = meetings.find((row) => row.id === id);
  if (!meeting) notFound();

  return (
    <>
      <PageHeader kicker="Staff meeting archive" title={formatFriendly(meeting.date)} lede={meeting.title} />
      <ThisWeekView
        meeting={meeting}
        announcements={announcementsForMeeting(announcements, meeting)}
        items={sortActionItems(items.filter((item) => item.meetingId === meeting.id), today)}
        archive={sortMeetings(meetings, today).filter((row) => row.id !== meeting.id)}
      />
    </>
  );
}

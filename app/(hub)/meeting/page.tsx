import { redirect } from "next/navigation";
import { MeetingMode } from "@/components/meeting-mode";
import { PageHeader } from "@/components/ui";
import { isAdmin } from "@/lib/domain/access";
import { formatFriendly } from "@/lib/domain/dates";
import { requireStaff } from "@/lib/session";
import { ensureMondayMeeting } from "@/lib/services/hub";

export const metadata = { title: "Meeting mode" };

export default async function MeetingModePage() {
  const { staff, store } = await requireStaff();
  if (!isAdmin(staff)) redirect("/this-week");
  const meeting = await ensureMondayMeeting({ store, actor: staff });
  const [items, announcements, people, ministries] = await Promise.all([
    store.listActionItems(),
    store.listAnnouncements(),
    store.listStaff(),
    store.listMinistries(),
  ]);

  return (
    <>
      <PageHeader
        kicker="Monday at 1:00 PM"
        title="Staff meeting"
        lede={`Live notes for ${formatFriendly(meeting.date)}. What you add here is on each person's list as soon as you save it.`}
      />
      <MeetingMode
        meeting={meeting}
        initialItems={items.filter((item) => item.meetingId === meeting.id)}
        initialAnnouncements={announcements.filter((row) => row.meetingId === meeting.id)}
        staff={people}
        ministries={ministries}
      />
    </>
  );
}

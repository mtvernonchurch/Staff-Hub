import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { UpcomingEventsCard } from "@/components/upcoming-events";
import { PageHeader } from "@/components/ui";
import { chicagoToday } from "@/lib/domain/dates";
import { loadUpcomingEvents } from "@/lib/pco/load";
import { requireStaff } from "@/lib/session";

export const metadata = { title: "Upcoming events" };

export default async function UpcomingPage() {
  await requireStaff();
  const today = chicagoToday();
  const events = await loadUpcomingEvents(today);
  return (
    <>
      <PageHeader
        kicker="Planning Center"
        icon={CalendarDays}
        title="Next 30 days"
        lede="Approved church events."
      />
      <p className="hint"><Link href="/">Home</Link></p>
      {events.ok ? (
        <UpcomingEventsCard events={events.data} sample={events.sample} />
      ) : <p className="banner banner-error" role="alert">{events.message}</p>}
    </>
  );
}

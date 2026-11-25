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
        lede="Events and room reservations. Groups stay on the month calendar."
      />
      <p className="hint"><Link href="/">Home</Link></p>
      {events.ok ? (
        <UpcomingEventsCard
          events={events.data}
          sample={events.sample}
          heading="Next 30 days"
          hint={events.sample ? "The next 30 days. Sample events and room reservations, not the live church calendar." : "The next 30 days. Events and room reservations. Groups are on the month calendar."}
        />
      ) : <p className="banner banner-error" role="alert">{events.message}</p>}
    </>
  );
}

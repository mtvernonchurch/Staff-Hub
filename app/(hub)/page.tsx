import { Suspense } from "react";
import {
  HomeAnnouncementsSection,
  HomeBudgets,
  HomeCalendarSection,
  HomeCheckIns,
  HomePins,
  HomeSheetAttendance,
  HomeTasks,
  HomeWorkflows,
  Pending,
} from "@/app/(hub)/home-sections";
import { Flash } from "@/components/ui";
import { chicagoToday } from "@/lib/domain/dates";
import { requireStaff } from "@/lib/session";

export const metadata = { title: "Home" };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const { staff, store } = await requireStaff();
  const today = chicagoToday();

  return (
    <>
      <Flash error={query.error} notice={query.notice} />
      <div className="home-columns">
        <div className="home-span">
          <Suspense fallback={<Pending title="pinned notes" />}>
            <HomePins store={store} actor={staff} today={today} />
          </Suspense>
        </div>
        <div className="home-main">
          <Suspense fallback={<Pending title="announcements" />}>
            <HomeAnnouncementsSection store={store} today={today} />
          </Suspense>
        </div>
        <div className="home-side">
          <Suspense fallback={<Pending title="your open items" />}>
            <HomeTasks store={store} actor={staff} today={today} />
          </Suspense>
        </div>
        <div className="home-main">
          <Suspense fallback={<Pending title="the week ahead" />}>
            <HomeCalendarSection today={today} />
          </Suspense>
        </div>
        <div className="home-side">
          <Suspense fallback={<Pending title="workflows" />}>
            <HomeWorkflows email={staff.email} />
          </Suspense>
        </div>
        <div className="home-main">
          <Suspense fallback={<Pending title="recent attendance" />}>
            <HomeCheckIns today={today} />
          </Suspense>
        </div>
        <div className="home-main">
          <Suspense fallback={<Pending title="last Sunday" />}>
            <HomeSheetAttendance store={store} actor={staff} today={today} />
          </Suspense>
        </div>
        <div className="home-side">
          <Suspense fallback={<Pending title="budgets" />}>
            <HomeBudgets store={store} actor={staff} today={today} />
          </Suspense>
        </div>
      </div>
    </>
  );
}

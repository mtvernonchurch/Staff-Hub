import { Users } from "lucide-react";
import { Heading } from "@/components/heading";
import type { RecentAttendance, SundayCount } from "@/lib/pco/types";
import { formatFriendly, parseSheetDate } from "@/lib/domain/dates";

/**
 * The one attendance card on Home, from Planning Center. The coming Sunday
 * only shows on Sunday itself, while services are counted; the rest of the
 * week it has no numbers yet.
 */
export function RecentAttendanceCard({ attendance, sample, today }: { attendance: RecentAttendance; sample: boolean; today: Date }) {
  const isSunday = today.getUTCDay() === 0;
  const counted = attendance.sundays.filter((row) => (parseSheetDate(row.sunday)?.getTime() ?? 0) <= today.getTime());
  return (
    <section className="card">
      <div className="card-head">
        <Heading icon={Users}>Recent attendance</Heading>
        {sample ? <span className="sample-chip">Sample</span> : null}
      </div>
      <p className="hint">
        {sample
          ? "Sample Sunday numbers, not the live church."
          : "Worship uses the Worship headcount. A service with none uses that service's check-ins. Kids are check-ins in Discovery Zone and KidZone, not volunteers."}
      </p>
      {isSunday ? (
        <SundayLine label="Today so far" day={attendance.coming.sunday} worship={attendance.coming.worship} kids={attendance.coming.kids} />
      ) : null}
      <SundayLine label="Last Sunday" day={attendance.last.sunday} worship={attendance.last.worship} kids={attendance.last.kids} />
      <p className="hint">Last {counted.length} Sundays, oldest to newest</p>
      <p className="hint">Worship: {counted.map((row) => figure(row.worship)).join(" · ")}</p>
      <p className="hint">Kids: {counted.map((row) => row.kids.total.toLocaleString("en-US")).join(" · ")}</p>
    </section>
  );
}

function SundayLine({ label, day, worship, kids }: { label: string; day: string; worship: SundayCount; kids: SundayCount }) {
  return (
    <article className="item">
      <div>
        <h3>{label}</h3>
        <p className="meta">
          <span>{formatFriendly(day)}</span>
          <span>Worship {figure(worship)}</span>
          <span>Kids {kids.total.toLocaleString("en-US")}</span>
        </p>
      </div>
    </article>
  );
}

function figure(count: SundayCount): string {
  const total = count.total.toLocaleString("en-US");
  if (count.source === "check-ins") return `${total} from check-ins`;
  if (count.source === "mixed") return `${total} includes check-ins`;
  return total;
}

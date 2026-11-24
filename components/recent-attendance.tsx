import { Users } from "lucide-react";
import { Heading } from "@/components/heading";
import type { EventAttendance } from "@/lib/pco/types";

export function RecentAttendanceCard({ rows, sample }: { rows: EventAttendance[]; sample: boolean }) {
  return (
    <section className="card">
      <div className="card-head">
        <Heading icon={Users}>Recent attendance</Heading>
        {sample ? <span className="sample-chip">Sample</span> : null}
      </div>
      <p className="hint">
        {sample
          ? "Sample Check-Ins headcounts, not the live church."
          : "Planning Center Check-Ins headcounts. This week is next to last week."}
      </p>
      {rows.length === 0 ? <p className="empty">No headcounts in the last several weeks.</p> : rows.map((row) => (
        <article key={row.id} className="item">
          <div>
            <h3>{row.name}</h3>
            <p className="meta">
              <span>This week {row.thisWeek.toLocaleString("en-US")}</span>
              <span>Last week {row.lastWeek.toLocaleString("en-US")}</span>
              <span>{signed(row.change)}</span>
            </p>
            <p className="hint">Last 6 weeks: {row.weeks.map((week) => week.total.toLocaleString("en-US")).join(" · ")}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

function signed(value: number): string {
  if (value > 0) return `+${value.toLocaleString("en-US")}`;
  return value.toLocaleString("en-US");
}

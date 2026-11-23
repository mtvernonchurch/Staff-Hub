import { BarChart3 } from "lucide-react";
import { saveAttendanceAction } from "@/app/(hub)/extra-actions";
import { Heading } from "@/components/heading";
import type { AttendanceCount } from "@/lib/data/types";
import { ATTENDANCE_AREAS, ATTENDANCE_SERVICES, attendanceSnapshot } from "@/lib/domain/attendance";
import { formatFriendly, formatUsDate } from "@/lib/domain/dates";

export function AttendanceCard({
  rows,
  today,
  editable,
  returnTo,
}: {
  rows: AttendanceCount[];
  today: Date;
  editable: boolean;
  returnTo: string;
}) {
  const snap = attendanceSnapshot(rows, today);
  const max = Math.max(...snap.trend, 1);
  const noteRow = snap.rows.find((row) => row.service === "9:00" && row.area === "Adults/Worship");
  return (
    <section className="card">
      <div className="card-head">
        <Heading icon={BarChart3}>Last Sunday</Heading>
        <span>{formatFriendly(formatUsDate(snap.sunday))}</span>
      </div>
      <p className="attendance-total">{snap.total.toLocaleString("en-US")}</p>
      <p className="hint">In the room at 9:00 and 10:30. Volunteers and first-time guests are listed apart so they are not counted twice.</p>
      <div className="stat-row">
        {snap.services.map((service) => <strong key={service.service}>{service.service}: {service.total}</strong>)}
      </div>
      <div className="area-grid">
        {snap.areas.map((area) => (
          <p key={area.area}><span>{area.area}</span><strong>{area.total}</strong></p>
        ))}
      </div>
      <p className="hint">
        {snap.versusPrior === null ? "No prior Sunday to compare." : `${signed(snap.versusPrior)} vs the Sunday before.`}
        {snap.versusAverage === null ? "" : ` ${signed(snap.versusAverage)} vs the prior 4-week average (${snap.average}).`}
      </p>
      <div className="spark" aria-hidden>
        {snap.trend.map((value, index) => (
          <span key={index} style={{ height: `${Math.max(4, (value / max) * 36)}px` }} />
        ))}
      </div>
      {snap.notes ? <p className="note">{snap.notes}</p> : null}
      {editable ? (
        <details>
          <summary>Edit these counts</summary>
          <form action={saveAttendanceAction} className="stack-form">
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="date" value={formatUsDate(snap.sunday)} />
            {ATTENDANCE_SERVICES.map((service) => (
              <fieldset key={service} className="field">
                <legend>{service}</legend>
                {ATTENDANCE_AREAS.map((area) => {
                  const found = snap.rows.find((row) => row.service === service && row.area === area);
                  return (
                    <label key={area} className="field">{area}
                      <input name={`count_${service}_${area}`} inputMode="numeric" defaultValue={found ? String(found.count) : ""} />
                    </label>
                  );
                })}
              </fieldset>
            ))}
            <label className="field">Notes
              <input name="notes" defaultValue={noteRow?.notes ?? ""} maxLength={500} />
            </label>
            <button className="btn btn-primary" type="submit">Save attendance</button>
          </form>
        </details>
      ) : null}
    </section>
  );
}

function signed(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
}

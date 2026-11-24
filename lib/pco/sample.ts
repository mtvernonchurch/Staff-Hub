import type { RecentAttendance, SundayAttendance, UpcomingEvent } from "@/lib/pco/types";
import { addUtcDays, formatUsDate } from "@/lib/domain/dates";
import { comingSunday, noonChicago } from "@/lib/pco/map";

export function sampleUpcomingEvents(today: Date): UpcomingEvent[] {
  const rows: Array<{ offset: number; name: string; location: string; allDay?: boolean }> = [
    { offset: 0, name: "Sample staff lunch", location: "Office" },
    { offset: 6, name: "Sample Sunday worship", location: "Worship room" },
    { offset: 10, name: "Sample kids rehearsal", location: "Kids hallway" },
    { offset: 20, name: "Sample choir night", location: "Choir room" },
  ];
  return rows.map((row) => {
    const day = addUtcDays(today, row.offset);
    return {
      id: `sample_event_${row.offset}`,
      name: row.name,
      startsAt: noonChicago(day),
      endsAt: "",
      location: row.location,
      allDay: Boolean(row.allDay),
      day: formatUsDate(day),
    };
  });
}

export function sampleAttendance(today: Date): RecentAttendance {
  const coming = comingSunday(today);
  const worship = [180, 190, 176, 188, 200, 210];
  const kids = [40, 42, 38, 44, 41, 36];
  const sundays: SundayAttendance[] = worship.map((total, index) => ({
    sunday: formatUsDate(addUtcDays(coming, -7 * (worship.length - 1 - index))),
    worship: { total, source: index === 4 ? "check-ins" : "headcount" },
    kids: { total: kids[index] ?? 0, source: "check-ins" },
  }));
  return { coming: sundays[5]!, last: sundays[4]!, sundays };
}

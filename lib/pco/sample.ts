import type { RecentAttendance, SundayAttendance, UpcomingEvent } from "@/lib/pco/types";
import { addUtcDays, formatUsDate } from "@/lib/domain/dates";
import { comingSunday, noonChicago } from "@/lib/pco/map";

export function sampleUpcomingEvents(today: Date): UpcomingEvent[] {
  const rows: Array<{ offset: number; name: string; location: string; source: UpcomingEvent["source"]; allDay?: boolean }> = [
    { offset: 0, name: "Sample staff lunch", location: "Office", source: "event" },
    { offset: 1, name: "Sample staff meeting", location: "Fellowship Hall", source: "room" },
    { offset: 2, name: "Sample men's breakfast", location: "Men's group", source: "group" },
    { offset: 6, name: "Sample Sunday worship", location: "Worship room", source: "event" },
    { offset: 10, name: "Sample kids rehearsal", location: "Kids hallway", source: "event" },
    { offset: 20, name: "Sample choir night", location: "Choir room", source: "event" },
  ];
  return rows.map((row) => {
    const day = addUtcDays(today, row.offset);
    return {
      id: `sample_${row.source}_${row.offset}`,
      name: row.name,
      startsAt: noonChicago(day),
      endsAt: "",
      location: row.location,
      allDay: Boolean(row.allDay),
      day: formatUsDate(day),
      source: row.source,
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

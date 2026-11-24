import type { EventAttendance, UpcomingEvent } from "@/lib/pco/types";
import { addUtcDays, formatUsDate, weekStartMonday } from "@/lib/domain/dates";
import { noonChicago } from "@/lib/pco/map";

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

export function sampleAttendance(today: Date): EventAttendance[] {
  const start = weekStartMonday(today);
  const weeks = [5, 4, 3, 2, 1, 0].map((ago) => formatUsDate(addUtcDays(start, -7 * ago)));
  const worship = [180, 190, 176, 188, 200, 210];
  const kids = [40, 42, 38, 44, 41, 36];
  const build = (id: string, name: string, counts: number[]): EventAttendance => ({
    id,
    name,
    thisWeek: counts[5] ?? 0,
    lastWeek: counts[4] ?? 0,
    change: (counts[5] ?? 0) - (counts[4] ?? 0),
    weeks: weeks.map((week, index) => ({ week, total: counts[index] ?? 0 })),
  });
  return [
    build("sample_worship", "Sample Sunday worship", worship),
    build("sample_kids", "Sample MV Kids", kids),
  ];
}

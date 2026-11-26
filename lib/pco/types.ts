export type PcoRef = { type?: string; id?: string };

export type PcoResource = {
  type?: string;
  id?: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: PcoRef | PcoRef[] | null }>;
};

export type PcoDocument = {
  data?: PcoResource[];
  included?: PcoResource[];
  links?: { next?: string | null };
};

/** Where a calendar row came from. Groups stay off the home week. */
export type CalendarSource = "event" | "room" | "group";

export type UpcomingEvent = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  location: string;
  allDay: boolean;
  day: string;
  source: CalendarSource;
};

export type CountSource = "headcount" | "check-ins" | "mixed";

export type SundayCount = { total: number; source: CountSource };

/** Worship and kids for one Sunday. */
export type SundayAttendance = {
  sunday: string;
  worship: SundayCount;
  kids: SundayCount;
};

export type RecentAttendance = {
  coming: SundayAttendance;
  last: SundayAttendance;
  sundays: SundayAttendance[];
};

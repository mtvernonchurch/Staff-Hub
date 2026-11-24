export type PcoResource = {
  type?: string;
  id?: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: { type?: string; id?: string } | null }>;
};

export type PcoDocument = {
  data?: PcoResource[];
  included?: PcoResource[];
  links?: { next?: string | null };
};

export type UpcomingEvent = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  location: string;
  allDay: boolean;
  day: string;
};

export type WeeklyCount = { week: string; total: number };

export type EventAttendance = {
  id: string;
  name: string;
  thisWeek: number;
  lastWeek: number;
  change: number;
  weeks: WeeklyCount[];
};

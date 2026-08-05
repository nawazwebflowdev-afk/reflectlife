export type RemembranceEventType =
  | "birthday"
  | "date_of_death"
  | "anniversary"
  | "memorial_service"
  | "funeral"
  | "special_memory"
  | "custom";

export type RecurrenceType = "once" | "daily" | "weekly" | "monthly" | "yearly" | "custom";
export type RecurrenceUnit = "day" | "week" | "month" | "year";

export interface RemembranceSubject {
  id: string;
  remembrance_id: string;
  memorial_id: string | null;
  subject_name: string;
  subject_avatar_url: string | null;
}

export interface RemembranceRecipient {
  id: string;
  remembrance_id: string;
  user_id: string | null;
  invited_email: string | null;
  invited_phone: string | null;
  display_name: string | null;
  timezone: string | null;
  share_presence: boolean;
  status: string;
}

export interface Remembrance {
  id: string;
  creator_id: string;
  event_type: RemembranceEventType;
  event_date: string; // YYYY-MM-DD
  time_local: string; // HH:MM:SS
  timezone: string;
  recurrence: RecurrenceType;
  recurrence_interval: number;
  recurrence_unit: RecurrenceUnit;
  end_date: string | null;
  message: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  remembrance_subjects?: RemembranceSubject[];
  remembrance_recipients?: RemembranceRecipient[];
}

export const EVENT_TYPE_LABELS: Record<RemembranceEventType, string> = {
  birthday: "Birthday",
  date_of_death: "Date of passing",
  anniversary: "Anniversary",
  memorial_service: "Memorial service",
  funeral: "Funeral",
  special_memory: "Special memory",
  custom: "Custom date",
};

export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  once: "One time",
  daily: "Every day",
  weekly: "Every week",
  monthly: "Every month",
  yearly: "Every year",
  custom: "Custom",
};

export const QUICK_RESPONSES = [
  { type: "remember_too", emoji: "❤️", label: "I remember them too" },
  { type: "lighting_candle", emoji: "🕯️", label: "Lighting a candle" },
  { type: "thinking_today", emoji: "🙏", label: "Thinking of them today" },
  { type: "sending_love", emoji: "💐", label: "Sending love" },
  { type: "thank_you", emoji: "🤍", label: "Thank you for remembering" },
] as const;

export const REACTIONS = [
  { type: "love", emoji: "❤️", label: "Love" },
  { type: "remembering", emoji: "🕯️", label: "Remembering" },
  { type: "thinking_of_you", emoji: "🙏", label: "Thinking of you" },
  { type: "with_you", emoji: "🤍", label: "With you" },
  { type: "in_memory", emoji: "💐", label: "In memory" },
] as const;

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addUnits(base: Date, unit: RecurrenceUnit, count: number): Date {
  const d = new Date(base);
  if (unit === "day") d.setDate(d.getDate() + count);
  else if (unit === "week") d.setDate(d.getDate() + count * 7);
  else if (unit === "month") d.setMonth(d.getMonth() + count);
  else d.setFullYear(d.getFullYear() + count);
  return d;
}

function stepFor(r: Pick<Remembrance, "recurrence" | "recurrence_interval" | "recurrence_unit">): {
  unit: RecurrenceUnit;
  interval: number;
} | null {
  switch (r.recurrence) {
    case "once":
      return null;
    case "daily":
      return { unit: "day", interval: 1 };
    case "weekly":
      return { unit: "week", interval: 1 };
    case "monthly":
      return { unit: "month", interval: 1 };
    case "yearly":
      return { unit: "year", interval: 1 };
    case "custom":
      return { unit: r.recurrence_unit, interval: Math.max(1, r.recurrence_interval || 1) };
  }
}

/** All occurrence dates (local, date-only) of a remembrance inside [from, to]. */
export function occurrencesInRange(r: Remembrance, from: Date, to: Date): Date[] {
  const out: Date[] = [];
  const start = parseDateKey(r.event_date);
  const end = r.end_date ? parseDateKey(r.end_date) : null;
  const step = stepFor(r);

  if (!step) {
    if (start >= from && start <= to) out.push(start);
    return out;
  }

  let cursor = new Date(start);
  let guard = 0;
  while (cursor <= to && guard < 4000) {
    guard++;
    if (end && cursor > end) break;
    if (cursor >= from) out.push(new Date(cursor));
    cursor = addUnits(cursor, step.unit, step.interval);
  }
  return out;
}

/** Next occurrence (as a local Date at the remembrance time) at or after `from`. */
export function nextOccurrence(r: Remembrance, from: Date = new Date()): Date | null {
  const horizon = new Date(from);
  horizon.setFullYear(horizon.getFullYear() + 5);
  const startOfToday = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const dates = occurrencesInRange(r, startOfToday, horizon);
  const [hh, mm] = r.time_local.split(":").map(Number);
  for (const d of dates) {
    const withTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh || 0, mm || 0);
    if (withTime >= from) return withTime;
  }
  return null;
}

export function subjectNames(r: Remembrance): string {
  const names = (r.remembrance_subjects ?? []).map((s) => s.subject_name).filter(Boolean);
  if (names.length === 0) return "someone dear";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(d);
}

export function recurrenceLabel(r: Remembrance): string {
  if (r.recurrence !== "custom") return RECURRENCE_LABELS[r.recurrence];
  const n = Math.max(1, r.recurrence_interval || 1);
  return n === 1 ? `Every ${r.recurrence_unit}` : `Every ${n} ${r.recurrence_unit}s`;
}

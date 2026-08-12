export type RemembranceEventType =
  | "birthday"
  | "date_of_death"
  | "anniversary"
  | "memorial_service"
  | "funeral"
  | "special_memory"
  | "custom"
  | "reminder"
  | "task"
  | "appointment"
  | "goal"
  | "milestone"
  | "event"
  | "medication";

export type RecurrenceType = "once" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "custom";
export type RecurrenceUnit = "hour" | "day" | "week" | "month" | "year";

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
  title: string | null;
  description: string | null;
  location: string | null;
  category: string | null;
  image_url: string | null;
  remembrance_subjects?: RemembranceSubject[];
  remembrance_recipients?: RemembranceRecipient[];
}

export const MEMORIAL_EVENT_TYPES: RemembranceEventType[] = [
  "birthday",
  "date_of_death",
  "anniversary",
  "memorial_service",
  "funeral",
  "special_memory",
];

export const EVENT_TYPE_LABELS: Record<RemembranceEventType, string> = {
  birthday: "Birthday",
  date_of_death: "Date of passing",
  anniversary: "Anniversary",
  memorial_service: "Memorial service",
  funeral: "Funeral",
  special_memory: "Special memory",
  custom: "Custom date",
  reminder: "Reminder",
  task: "Task",
  appointment: "Appointment",
  goal: "Goal",
  milestone: "Milestone",
  event: "Event",
  medication: "Medication",
};

export const EVENT_TYPE_EMOJI: Record<RemembranceEventType, string> = {
  birthday: "🎂",
  date_of_death: "🕯️",
  anniversary: "🤍",
  memorial_service: "🕊️",
  funeral: "🌿",
  special_memory: "🕯️",
  custom: "📌",
  reminder: "🔔",
  task: "✅",
  appointment: "📅",
  goal: "🎯",
  milestone: "🏁",
  event: "✨",
  medication: "💊",
};

export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  once: "One time",
  hourly: "Every hour",
  daily: "Every day",
  weekly: "Every week",
  monthly: "Every month",
  yearly: "Every year",
  custom: "Custom",
};

export const CATEGORY_OPTIONS = [
  "Personal",
  "Family",
  "Work",
  "Health",
  "Finance",
  "Celebration",
  "Remembrance",
  "Travel",
  "Other",
] as const;

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
  if (unit === "hour") d.setHours(d.getHours() + count);
  else if (unit === "day") d.setDate(d.getDate() + count);
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
    case "hourly":
      return { unit: "hour", interval: 1 };
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
    default:
      return null;
  }
}

/** The first occurrence as a full local date-time. */
export function anchorDateTime(r: Remembrance): Date {
  const d = parseDateKey(r.event_date);
  const [hh, mm] = r.time_local.split(":").map(Number);
  d.setHours(hh || 0, mm || 0, 0, 0);
  return d;
}

/**
 * All occurrences of a remembrance inside [from, to] as full date-times.
 * `from`/`to` are inclusive and compared with time.
 */
export function occurrenceTimesInRange(r: Remembrance, from: Date, to: Date): Date[] {
  const out: Date[] = [];
  const start = anchorDateTime(r);
  const end = r.end_date ? (() => { const e = parseDateKey(r.end_date!); e.setHours(23, 59, 59, 999); return e; })() : null;
  const step = stepFor(r);

  if (!step) {
    if (start >= from && start <= to) out.push(start);
    return out;
  }

  let cursor = new Date(start);
  let guard = 0;
  const maxIterations = step.unit === "hour" ? 20000 : 4000;
  while (cursor <= to && guard < maxIterations) {
    guard++;
    if (end && cursor > end) break;
    if (cursor >= from) out.push(new Date(cursor));
    cursor = addUnits(cursor, step.unit, step.interval);
  }
  return out;
}

/** All occurrence dates (local, date-only) of a remembrance inside [from, to]. */
export function occurrencesInRange(r: Remembrance, from: Date, to: Date): Date[] {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0, 0);
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
  const seen = new Set<string>();
  const out: Date[] = [];
  for (const t of occurrenceTimesInRange(r, start, end)) {
    const key = toDateKey(t);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(new Date(t.getFullYear(), t.getMonth(), t.getDate()));
  }
  return out;
}

/** Next occurrence (as a local Date at the remembrance time) at or after `from`. */
export function nextOccurrence(r: Remembrance, from: Date = new Date()): Date | null {
  const horizon = new Date(from);
  horizon.setFullYear(horizon.getFullYear() + 5);
  const times = occurrenceTimesInRange(r, from, horizon);
  return times.length ? times[0] : null;
}

/** The most recent occurrence strictly before `before`, if any. */
export function lastOccurrence(r: Remembrance, before: Date = new Date()): Date | null {
  const start = anchorDateTime(r);
  if (start > before) return null;
  const times = occurrenceTimesInRange(r, start, new Date(before.getTime() - 1));
  return times.length ? times[times.length - 1] : null;
}

export function subjectNames(r: Remembrance): string {
  const names = (r.remembrance_subjects ?? []).map((s) => s.subject_name).filter(Boolean);
  if (names.length === 0) return "someone dear";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Best display title: explicit title, otherwise the people being remembered. */
export function displayTitle(r: Remembrance): string {
  const t = (r.title ?? "").trim();
  if (t) return t;
  if ((r.remembrance_subjects ?? []).length > 0) return subjectNames(r);
  return EVENT_TYPE_LABELS[r.event_type] ?? "Reminder";
}

export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(d);
}

export function formatClock(d: Date): string {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(d);
}

export function recurrenceLabel(r: Remembrance): string {
  if (r.recurrence !== "custom") return RECURRENCE_LABELS[r.recurrence];
  const n = Math.max(1, r.recurrence_interval || 1);
  return n === 1 ? `Every ${r.recurrence_unit}` : `Every ${n} ${r.recurrence_unit}s`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Friendly countdown such as "In 45 minutes", "Tomorrow at 9:00 AM", "In 3 months". */
export function formatCountdown(target: Date, now: Date = new Date()): string {
  const diff = target.getTime() - now.getTime();
  const overdue = diff < 0;
  const ms = Math.abs(diff);
  const minutes = Math.round(ms / 60000);
  const hours = Math.round(ms / 3600000);
  const dayDiff = Math.round((startOfDay(target).getTime() - startOfDay(now).getTime()) / 86400000);

  const suffix = (label: string) => (overdue ? `${label} ago` : `In ${label}`);

  if (minutes < 1) return overdue ? "Just now" : "Now";
  if (minutes < 60) return suffix(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  if (!overdue && dayDiff === 1) return `Tomorrow at ${formatClock(target)}`;
  if (overdue && dayDiff === -1) return `Yesterday at ${formatClock(target)}`;
  if (dayDiff === 0) return suffix(`${hours} hour${hours === 1 ? "" : "s"}`);
  const days = Math.abs(dayDiff);
  if (days < 7) return suffix(`${days} day${days === 1 ? "" : "s"}`);
  if (days < 31) {
    const weeks = Math.round(days / 7);
    return suffix(`${weeks} week${weeks === 1 ? "" : "s"}`);
  }
  if (days < 365) {
    const months = Math.max(1, Math.round(days / 30));
    return suffix(`${months} month${months === 1 ? "" : "s"}`);
  }
  const years = Math.round(days / 365);
  if (years === 1) return overdue ? "Last year" : "Next year";
  return suffix(`${years} years`);
}

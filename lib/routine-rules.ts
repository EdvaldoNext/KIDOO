import { SCORE_TIME_ZONE } from "@/lib/dates";

/** Bit 0 = Sunday … bit 6 = Saturday. 127 = every day. */
export const ALL_WEEKDAYS = 127;

const WEEKDAY_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"] as const;
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function weekdayMask(days: readonly number[]) {
  let mask = 0;
  for (const day of days) {
    if (!Number.isInteger(day) || day < 0 || day > 6) return 0;
    mask |= 1 << day;
  }
  return mask;
}

export function repeatLabel(mask: number) {
  if (mask === ALL_WEEKDAYS) return "Todo dia";
  const names = DISPLAY_ORDER.filter((day) => (mask & (1 << day)) !== 0).map((day) => WEEKDAY_SHORT[day]);
  return names.join(", ");
}

export function saoPauloToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SCORE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function saoPauloWeekday(now = new Date()) {
  const short = new Intl.DateTimeFormat("en-US", {
    timeZone: SCORE_TIME_ZONE,
    weekday: "short",
  }).format(now);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[short] ?? 0;
}

function zoneOffsetMs(timeZone: string, instant: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour") % 24, value("minute"), value("second"));
  return asUtc - instant.getTime();
}

/** End of that São Paulo day, or the chosen clock time, as a UTC ISO string. */
export function saoPauloDueIso(day: string, time: string | null) {
  const clock = time && TIME_RE.test(time) ? time : "23:59";
  const [year, month, date] = day.split("-").map(Number);
  const [hour, minute] = clock.split(":").map(Number);
  const utcGuess = Date.UTC(year, month - 1, date, hour, minute, 0);
  const offset = zoneOffsetMs(SCORE_TIME_ZONE, new Date(utcGuess));
  return new Date(utcGuess - offset).toISOString();
}

export function isValidClock(value: string) {
  return TIME_RE.test(value);
}

export function kidCanSeeTask(
  task: { routine_id?: string | null; status?: string | null; occurs_on?: string | null },
  today = saoPauloToday(),
) {
  if (!task.routine_id) return true;
  if (task.status === "awaiting_approval") return true;
  return task.occurs_on === today;
}

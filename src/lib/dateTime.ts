export const APP_TIME_ZONE = "Europe/Istanbul";
const DAY_MS = 86_400_000;

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function dateKeyFromTimestamp(timestamp: number): string {
  const parts = dateKeyFormatter.formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function todayKey(nowMs = Date.now()): string {
  return dateKeyFromTimestamp(nowMs);
}

export function formatDate(dateKey: string, options?: Intl.DateTimeFormatOptions): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: APP_TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
    ...options,
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function toIstanbulDateTimeInput(timestamp: number): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${dateKeyFromTimestamp(timestamp)}T${values.hour}:${values.minute}`;
}

export function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: APP_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function parseIstanbulDateTime(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}:00+03:00`);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function addRelativeDays(days: number, nowMs = Date.now()): number {
  return nowMs + days * DAY_MS;
}

export function currentMonthKey(nowMs = Date.now()): string {
  return todayKey(nowMs).slice(0, 7);
}

export function shiftMonth(monthKey: string, amount: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthTitle(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("tr-TR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export interface CalendarDay {
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
}

export function buildCalendarDays(monthKey: string): CalendarDay[] {
  const [year, month] = monthKey.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const mondayOffset = (firstDay.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(year, month - 1, 1 - mondayOffset));
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getTime() + index * DAY_MS);
    const dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
    return {
      dateKey,
      dayNumber: date.getUTCDate(),
      isCurrentMonth: date.getUTCMonth() === month - 1,
    };
  });
}

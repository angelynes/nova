import type { Habit, Task } from "./types";

export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function addDays(value: string, amount: number) {
  const date = parseDateKey(value);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}

export function compareDateKeys(a?: string, b?: string) {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  return a.localeCompare(b);
}

export function formatLongDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parseDateKey(value));
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(parseDateKey(value));
}

export function formatTime(value?: string) {
  if (!value) return "";
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function minutesFromTime(value?: string) {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function timeFromMinutes(total: number) {
  const normalized = ((Math.round(total) % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function durationLabel(minutes?: number) {
  if (!minutes) return "No duration";
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} min`;
  const days = Math.floor(rounded / (24 * 60));
  const remainingAfterDays = rounded % (24 * 60);
  const hours = Math.floor(remainingAfterDays / 60);
  const rest = remainingAfterDays % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days} day${days === 1 ? "" : "s"}`);
  if (hours) parts.push(`${hours} hr${hours === 1 ? "" : "s"}`);
  if (rest) parts.push(`${rest} min`);
  return parts.join(" ") || `${rounded} min`;
}

export type DurationUnit = "minutes" | "hours" | "days";

export function durationInputParts(minutes?: number): { value: string; unit: DurationUnit } {
  if (!minutes || minutes <= 0) return { value: "", unit: "minutes" };
  if (minutes >= 24 * 60) return { value: String(Number((minutes / (24 * 60)).toFixed(2))), unit: "days" };
  if (minutes >= 60) return { value: String(Number((minutes / 60).toFixed(2))), unit: "hours" };
  return { value: String(Math.round(minutes)), unit: "minutes" };
}

export function durationToMinutes(value: string | number, unit: DurationUnit): number | undefined {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  const multiplier = unit === "days" ? 24 * 60 : unit === "hours" ? 60 : 1;
  return Math.max(1, Math.round(amount * multiplier));
}

export function timeRangeLabel(start?: string, durationMinutes?: number) {
  if (!start) return "";
  if (!durationMinutes) return formatTime(start);
  const startMinutes = minutesFromTime(start) ?? 0;
  const totalEnd = startMinutes + durationMinutes;
  const dayOffset = Math.floor(totalEnd / (24 * 60));
  const suffix = dayOffset > 0 ? ` (+${dayOffset}d)` : "";
  return `${formatTime(start)} - ${formatTime(timeFromMinutes(totalEnd))}${suffix}`;
}

export function resolvedTimeZone(setting?: string) {
  if (!setting || setting === "auto") {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  }
  return setting;
}

export function zonedNow(timeZoneSetting?: string, now = new Date()) {
  const timeZone = resolvedTimeZone(timeZoneSetting);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");
  return {
    dateKey: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    minutes: hour * 60 + minute,
    timeZone,
  };
}

export function googleMapsUrl(location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

export function taskOccursOn(task: Task, targetDate: string) {
  if (task.excludedDates?.includes(targetDate)) return false;
  if (task.recurrenceEndDate && targetDate > task.recurrenceEndDate) return false;
  if (!task.dueDate) return task.recurrence === "none" ? targetDate === dateKey() : false;
  if (targetDate < task.dueDate) return false;
  const base = parseDateKey(task.dueDate);
  const target = parseDateKey(targetDate);

  switch (task.recurrence) {
    case "daily":
      return true;
    case "weekdays":
      return target.getDay() >= 1 && target.getDay() <= 5;
    case "weekends":
      return target.getDay() === 0 || target.getDay() === 6;
    case "weekly":
      return (task.recurrenceDays?.length ? task.recurrenceDays : [base.getDay()]).includes(target.getDay());
    case "monthly":
      return target.getDate() === base.getDate();
    case "yearly":
      return target.getMonth() === base.getMonth() && target.getDate() === base.getDate();
    case "none":
    default:
      return task.dueDate === targetDate;
  }
}

export function taskIsCompletedOn(task: Task, targetDate: string) {
  if (task.recurrence !== "none") {
    return task.completedDates?.includes(targetDate) ?? false;
  }
  return task.status === "completed" || Boolean(task.completedAt);
}

export function habitOccursOn(habit: Habit, targetDate: string) {
  if (!habit.active) return false;
  if (habit.excludedDates?.includes(targetDate)) return false;
  if (habit.recurrenceEndDate && targetDate > habit.recurrenceEndDate) return false;
  const day = parseDateKey(targetDate).getDay();

  if (habit.weekdays?.length) return habit.weekdays.includes(day);

  switch (habit.frequency) {
    case "weekdays":
      return day >= 1 && day <= 5;
    case "weekly":
    case "custom":
      return (habit.weekdays ?? []).includes(day);
    case "daily":
    default:
      return true;
  }
}

export function getMonthGrid(monthDate: Date, weekStartsMonday = false) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 12);
  const start = new Date(first);
  const day = first.getDay();
  const offset = weekStartsMonday ? (day === 0 ? 6 : day - 1) : day;
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const d = new Date(start);
    d.setDate(start.getDate() + index);
    return d;
  });
}

export function sameMonth(a: Date, b: Date) {
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

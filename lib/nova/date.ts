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

export function taskOccursOn(task: Task, targetDate: string) {
  if (!task.dueDate) return targetDate === dateKey();
  if (targetDate < task.dueDate) return false;
  const base = parseDateKey(task.dueDate);
  const target = parseDateKey(targetDate);

  switch (task.recurrence) {
    case "daily":
      return true;
    case "weekdays":
      return target.getDay() >= 1 && target.getDay() <= 5;
    case "weekly":
      return target.getDay() === base.getDay();
    case "monthly":
      return target.getDate() === base.getDate();
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
  const day = parseDateKey(targetDate).getDay();
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

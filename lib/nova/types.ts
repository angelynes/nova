export type TaskStatus = "todo" | "in_progress" | "completed";
export type Recurrence = "none" | "daily" | "weekdays" | "weekends" | "weekly" | "monthly" | "yearly";
export type ThemeId = "lavender" | "neutral" | "blush" | "aqua";

export type Category = {
  id: string;
  name: string;
  color: string;
};

export type ProjectUpdate = {
  id: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
};

export type Project = {
  id: string;
  name: string;
  description?: string;
  /** Legacy freeform notes. Migrated to updates when possible. */
  notes?: string;
  updates?: ProjectUpdate[];
  color: string;
  status: "active" | "archived";
  createdAt: string;
};

export type Task = {
  id: string;
  title: string;
  notes?: string;
  categoryId?: string;
  projectId?: string;
  status: TaskStatus;
  dueDate?: string;
  scheduledTime?: string;
  durationMinutes?: number;
  recurrence: Recurrence;
  recurrenceDays?: number[];
  recurrenceEndDate?: string;
  excludedDates?: string[];
  location?: string;
  travelTimeMinutes?: number;
  reminderMinutes?: number;
  order?: number;
  completedAt?: string;
  completedDates?: string[];
  createdAt: string;
  updatedAt: string;
};

export type HabitSubtask = {
  id: string;
  title: string;
};

/**
 * A NOVA habit is a repeatable routine. The routine can contain a checklist of
 * subtasks (for example "Morning Routine" → water, skincare, vitamins).
 */
export type Habit = {
  id: string;
  name: string;
  /** Legacy field retained so older cloud states remain readable. */
  categoryId?: string;
  /** Legacy frequency retained for backwards compatibility. New routines use weekdays. */
  frequency: "daily" | "weekdays" | "weekly" | "custom";
  weekdays?: number[];
  scheduledTime?: string;
  durationMinutes?: number;
  reminderMinutes?: number;
  color?: string;
  subtasks?: HabitSubtask[];
  recurrenceEndDate?: string;
  excludedDates?: string[];
  active: boolean;
  createdAt: string;
};

export type ExternalCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  isAllDay?: boolean;
  calendarName?: string;
  location?: string;
  notes?: string;
  source: "apple" | "google" | "ics" | "sample";
};

export type NovaSettings = {
  displayName: string;
  profileImage?: string;
  profileSetupComplete: boolean;
  theme: ThemeId;
  eveningReviewTime: string;
  notificationsEnabled: boolean;
  dayStartHour: number;
  dayEndHour: number;
  weekStartsMonday: boolean;
  /** "auto" uses the device time zone. Otherwise this is an IANA zone. */
  timeZone: string;
};

export type NovaState = {
  version: 5;
  categories: Category[];
  projects: Project[];
  tasks: Task[];
  habits: Habit[];
  habitCompletions: Record<string, string[]>;
  /** habit id -> date key -> completed subtask ids */
  habitSubtaskCompletions: Record<string, Record<string, string[]>>;
  externalEvents: ExternalCalendarEvent[];
  settings: NovaSettings;
  lastUpdatedAt: string;
};

export type TaskStatus = "todo" | "in_progress" | "completed";
export type Recurrence = "none" | "daily" | "weekdays" | "weekly" | "monthly";

export type Category = {
  id: string;
  name: string;
  color: string;
};

export type Project = {
  id: string;
  name: string;
  description?: string;
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
  location?: string;
  travelTimeMinutes?: number;
  reminderMinutes?: number;
  completedAt?: string;
  completedDates?: string[];
  createdAt: string;
  updatedAt: string;
};

export type Habit = {
  id: string;
  name: string;
  categoryId?: string;
  frequency: "daily" | "weekdays" | "weekly" | "custom";
  weekdays?: number[];
  scheduledTime?: string;
  reminderMinutes?: number;
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
  source: "apple" | "ics" | "sample";
};

export type NovaSettings = {
  displayName: string;
  eveningReviewTime: string;
  notificationsEnabled: boolean;
  dayStartHour: number;
  dayEndHour: number;
  weekStartsMonday: boolean;
};

export type NovaState = {
  version: 3;
  categories: Category[];
  projects: Project[];
  tasks: Task[];
  habits: Habit[];
  habitCompletions: Record<string, string[]>;
  externalEvents: ExternalCalendarEvent[];
  settings: NovaSettings;
  lastUpdatedAt: string;
};

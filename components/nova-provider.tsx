"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Provider, Session, SupabaseClient } from "@supabase/supabase-js";
import { createClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { createSeedState } from "@/lib/nova/seed";
import { addDays, dateKey, minutesFromTime, taskIsCompletedOn, taskOccursOn, zonedNow } from "@/lib/nova/date";
import type {
  Category,
  ExternalCalendarEvent,
  Habit,
  NovaSettings,
  NovaState,
  Project,
  Task,
  TaskStatus,
  ThemeId,
} from "@/lib/nova/types";

const STORAGE_KEY = "nova-planner-state-v2";
const GOOGLE_CALENDAR_TOKEN_KEY = "nova-google-calendar-token";
const GOOGLE_OAUTH_INTENT_KEY = "nova-google-oauth-intent";
const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

type CloudStatus = "local" | "connecting" | "synced" | "error";

type Result = { ok: boolean; message: string };

type NovaContextValue = {
  state: NovaState;
  hydrated: boolean;
  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  reorderTask: (draggedId: string, targetId: string) => void;
  toggleTask: (id: string, onDate?: string) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  addProject: (project: Omit<Project, "id" | "createdAt">) => string;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addCategory: (category: Omit<Category, "id">) => string;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  reorderCategory: (draggedId: string, targetId: string) => void;
  addHabit: (habit: Omit<Habit, "id" | "createdAt">) => string;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleHabit: (id: string, onDate?: string) => void;
  toggleHabitSubtask: (habitId: string, subtaskId: string, onDate?: string) => void;
  importExternalEvents: (events: ExternalCalendarEvent[]) => void;
  clearImportedEvents: (source?: ExternalCalendarEvent["source"]) => void;
  updateSettings: (patch: Partial<NovaSettings>) => void;
  importState: (next: NovaState) => void;
  resetState: () => void;
  cloudConfigured: boolean;
  cloudStatus: CloudStatus;
  cloudEmail: string | null;
  sendMagicLink: (email: string) => Promise<Result>;
  verifyEmailOtp: (email: string, token: string) => Promise<Result>;
  signInWithProvider: (provider: "google" | "apple") => Promise<Result>;
  signOutCloud: () => Promise<void>;
  syncNow: () => Promise<void>;
  googleCalendarConnected: boolean;
  connectGoogleCalendar: () => Promise<Result>;
  syncGoogleCalendar: () => Promise<Result>;
  disconnectGoogleCalendar: () => void;
};

const NovaContext = createContext<NovaContextValue | null>(null);

function stamp(state: NovaState): NovaState {
  return { ...state, lastUpdatedAt: new Date().toISOString() };
}

const LEGACY_DEMO_TASK_IDS = new Set(["task-1", "task-2", "task-3", "task-4", "task-5", "task-6", "task-7"]);
const LEGACY_DEMO_PROJECT_IDS = new Set(["project-nova", "project-thesis", "project-trip"]);
const LEGACY_DEMO_HABIT_IDS = new Set(["habit-1", "habit-2", "habit-3"]);
const VALID_THEMES = new Set<ThemeId>(["lavender", "neutral", "blush", "aqua"]);
const LEGACY_PROJECT_DESCRIPTIONS = new Set([
  "an all-in-one planner, with day-to-day tasks and project manager",
  "an all-in-one planner with day-to-day tasks and project manager",
]);
const CATEGORY_COLOR_MIGRATION: Record<string, string> = {
  "#d7c8ed": "#EEE8F7", "#b29ce4": "#E5DCF5", "#e8cfe5": "#F5E5F1", "#c9d8ee": "#E6EEF9",
  "#e6d7b8": "#F7EEDC", "#bfd8ce": "#E2F0E9", "#d9c7ef": "#ECE5F8", "#f0d6e4": "#F8E8EF",
  "#d8dcdd": "#ECEEEF", "#bfc7c9": "#E5E9EA", "#d9d4cb": "#EFECE7", "#c8d1cb": "#E4ECE7",
  "#d4d0dc": "#ECE9F0", "#e2d5cf": "#F1E9E5", "#c7d3db": "#E4EBF0", "#dfdece": "#F0EFE5",
  "#f2c9d9": "#F9E4EC", "#e8b8cc": "#F6DCE7", "#f7d9e5": "#FCEBF2", "#e6cbd6": "#F4E3EA",
  "#f0cdbf": "#F8E5DD", "#d9cedf": "#EDE5F1", "#f4d6d0": "#FAE8E4", "#e7bfd0": "#F5DFE8",
  "#bfe6e3": "#DDF3F1", "#8ed6d2": "#D2EEEB", "#c7dfec": "#E1EFF7", "#bbd8d2": "#DCEEEA",
  "#d7e8c8": "#E8F3DD", "#c9d4e8": "#E3EAF6", "#a9ddd7": "#D5F2EF", "#d5e9e7": "#E8F5F3",
};

function removeLegacyDemoData(state: NovaState): NovaState {
  const categories = state.categories.filter((category) => category.id !== "cat-project");
  const projects = state.projects.filter((project) => !LEGACY_DEMO_PROJECT_IDS.has(project.id));
  const tasks = state.tasks
    .filter((task) => !LEGACY_DEMO_TASK_IDS.has(task.id))
    .map((task) => ({
      ...task,
      categoryId: task.categoryId === "cat-project" ? undefined : task.categoryId,
      projectId: task.projectId && LEGACY_DEMO_PROJECT_IDS.has(task.projectId) ? undefined : task.projectId,
    }));
  const habits = state.habits.filter((habit) => !LEGACY_DEMO_HABIT_IDS.has(habit.id));
  const habitCompletions = Object.fromEntries(Object.entries(state.habitCompletions).filter(([habitId]) => !LEGACY_DEMO_HABIT_IDS.has(habitId)));
  const habitSubtaskCompletions = Object.fromEntries(Object.entries(state.habitSubtaskCompletions).filter(([habitId]) => !LEGACY_DEMO_HABIT_IDS.has(habitId)));
  const externalEvents = state.externalEvents.filter((event) => event.source !== "sample");

  return { ...state, version: 5, categories, projects, tasks, habits, habitCompletions, habitSubtaskCompletions, externalEvents };
}

function normalizeState(input: unknown): NovaState | null {
  if (!input || typeof input !== "object") return null;
  const state = input as Partial<NovaState>;
  if (!Array.isArray(state.tasks) || !Array.isArray(state.projects) || !Array.isArray(state.categories)) return null;

  const base = createSeedState();
  const settings = { ...base.settings, ...(state.settings ?? {}) };
  const incomingName = (state.settings?.displayName ?? "").trim();
  const hadCustomName = Boolean(incomingName) && !["darren", "profile"].includes(incomingName.toLowerCase());
  if (!settings.displayName || settings.displayName.trim().toLowerCase() === "darren") settings.displayName = "Profile";
  settings.profileSetupComplete = state.settings?.profileSetupComplete ?? hadCustomName;
  if (!VALID_THEMES.has(settings.theme as ThemeId)) settings.theme = "lavender";
  if (!settings.timeZone) settings.timeZone = "auto";
  settings.dayStartHour = Math.max(0, Math.min(23, Number(settings.dayStartHour ?? 7)));
  settings.dayEndHour = Math.max(settings.dayStartHour + 1, Math.min(47, Number(settings.dayEndHour ?? 22)));

  const normalized: NovaState = {
    ...base,
    ...state,
    version: 5,
    tasks: state.tasks.map((task, index) => ({
      ...task,
      recurrence: task.recurrence ?? "none",
      order: typeof task.order === "number" ? task.order : index,
      excludedDates: task.excludedDates ?? [],
    })),
    projects: state.projects.map((project) => {
      const existingUpdates = project.updates ?? [];
      const migratedUpdate = !existingUpdates.length && project.notes?.trim()
        ? [{ id: crypto.randomUUID(), text: project.notes.trim(), createdAt: project.createdAt ?? new Date().toISOString() }]
        : [];
      const description = project.description?.trim();
      const cleanedDescription = description && !LEGACY_PROJECT_DESCRIPTIONS.has(description.toLowerCase()) ? description : undefined;
      return { ...project, description: cleanedDescription, updates: existingUpdates.length ? existingUpdates : migratedUpdate };
    }),
    categories: state.categories.map((category) => ({
      ...category,
      color: CATEGORY_COLOR_MIGRATION[category.color?.toLowerCase?.() ?? ""] ?? category.color,
    })),
    habits: Array.isArray(state.habits)
      ? state.habits.map((habit) => ({
          ...habit,
          frequency: habit.frequency ?? "custom",
          excludedDates: habit.excludedDates ?? [],
          subtasks: habit.subtasks ?? [],
          color: habit.color ?? "#C9B7F1",
        }))
      : [],
    habitCompletions: state.habitCompletions ?? {},
    habitSubtaskCompletions: state.habitSubtaskCompletions ?? {},
    externalEvents: Array.isArray(state.externalEvents) ? state.externalEvents : [],
    settings,
    lastUpdatedAt: state.lastUpdatedAt ?? new Date().toISOString(),
  };

  return removeLegacyDemoData(normalized);
}

export function NovaProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<NovaState>(() => createSeedState());
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>("local");
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const sessionRef = useRef<Session | null>(null);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const cloudLoadingRef = useRef(false);
  const cloudReadyRef = useRef(false);
  const lastRemoteUpdatedAtRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<NovaState>(state);

  const cloudConfigured = hasSupabaseConfig();

  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = normalizeState(JSON.parse(stored));
        if (parsed) setState(parsed);
      }
      setGoogleCalendarConnected(Boolean(window.localStorage.getItem(GOOGLE_CALENDAR_TOKEN_KEY)));
    } catch {
      // Keep seed state.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    document.documentElement.dataset.theme = state.settings.theme ?? "lavender";
  }, [state, hydrated]);

  const loadCloud = useCallback(async (client: SupabaseClient, activeSession: Session) => {
    if (cloudLoadingRef.current) return;
    const loadStartedAt = stateRef.current.lastUpdatedAt;
    cloudLoadingRef.current = true;
    setCloudStatus("connecting");
    const { data, error } = await client.from("app_state").select("data, updated_at").eq("user_id", activeSession.user.id).maybeSingle();

    if (error) {
      cloudLoadingRef.current = false;
      setCloudStatus("error");
      return;
    }

    const localSnapshot = stateRef.current;
    if (data?.data) {
      const remote = normalizeState(data.data);
      if (remote) {
        const remoteUpdatedAt = typeof data.updated_at === "string" ? data.updated_at : null;
        if (!cloudReadyRef.current) {
          const changedWhileLoading = localSnapshot.lastUpdatedAt !== loadStartedAt;
          if (changedWhileLoading) {
            const updatedAt = new Date().toISOString();
            const { error: saveError } = await client.from("app_state").upsert({ user_id: activeSession.user.id, data: localSnapshot, updated_at: updatedAt });
            if (saveError) { cloudLoadingRef.current = false; setCloudStatus("error"); return; }
            lastRemoteUpdatedAtRef.current = updatedAt;
          } else {
            stateRef.current = remote;
            setState(remote);
            lastRemoteUpdatedAtRef.current = remoteUpdatedAt;
          }
        } else if (remoteUpdatedAt && remoteUpdatedAt !== lastRemoteUpdatedAtRef.current) {
          const remoteStamp = Date.parse(remote.lastUpdatedAt || "");
          const localStamp = Date.parse(localSnapshot.lastUpdatedAt || "");
          if (Number.isFinite(remoteStamp) && (!Number.isFinite(localStamp) || remoteStamp > localStamp)) {
            stateRef.current = remote;
            setState(remote);
            lastRemoteUpdatedAtRef.current = remoteUpdatedAt;
          } else {
            const updatedAt = new Date().toISOString();
            const { error: saveError } = await client.from("app_state").upsert({ user_id: activeSession.user.id, data: localSnapshot, updated_at: updatedAt });
            if (saveError) { cloudLoadingRef.current = false; setCloudStatus("error"); return; }
            lastRemoteUpdatedAtRef.current = updatedAt;
          }
        }
      }
    } else {
      const updatedAt = new Date().toISOString();
      const { error: saveError } = await client.from("app_state").upsert({ user_id: activeSession.user.id, data: localSnapshot, updated_at: updatedAt });
      if (saveError) { cloudLoadingRef.current = false; setCloudStatus("error"); return; }
      lastRemoteUpdatedAtRef.current = updatedAt;
    }

    cloudReadyRef.current = true;
    cloudLoadingRef.current = false;
    setCloudStatus("synced");
  }, []);

  const captureProviderToken = useCallback((nextSession: Session | null) => {
    if (!nextSession?.provider_token || typeof window === "undefined") return;
    const intent = window.localStorage.getItem(GOOGLE_OAUTH_INTENT_KEY);
    if (intent === "calendar") {
      window.localStorage.setItem(GOOGLE_CALENDAR_TOKEN_KEY, nextSession.provider_token);
      window.localStorage.removeItem(GOOGLE_OAUTH_INTENT_KEY);
      setGoogleCalendarConnected(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || !cloudConfigured) return;
    const client = createClient();
    if (!client) return;
    supabaseRef.current = client;

    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      sessionRef.current = data.session;
      captureProviderToken(data.session);
      if (data.session) loadCloud(client, data.session);
    });

    const { data: subscription } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      sessionRef.current = nextSession;
      captureProviderToken(nextSession);
      if (nextSession) window.setTimeout(() => loadCloud(client, nextSession), 0);
      else {
        cloudReadyRef.current = false;
        lastRemoteUpdatedAtRef.current = null;
        setCloudStatus("local");
      }
    });

    const onFocus = () => { if (sessionRef.current) loadCloud(client, sessionRef.current); };
    window.addEventListener("focus", onFocus);
    return () => {
      subscription.subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
    };
  }, [hydrated, cloudConfigured, captureProviderToken, loadCloud]);

  useEffect(() => {
    if (!hydrated || !session || !supabaseRef.current || cloudLoadingRef.current || !cloudReadyRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setCloudStatus("connecting");
    saveTimerRef.current = setTimeout(async () => {
      const client = supabaseRef.current;
      if (!client || !session) return;
      const updatedAt = new Date().toISOString();
      const { error } = await client.from("app_state").upsert({ user_id: session.user.id, data: state, updated_at: updatedAt });
      if (!error) lastRemoteUpdatedAtRef.current = updatedAt;
      setCloudStatus(error ? "error" : "synced");
    }, 350);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [state, session, hydrated]);

  const mutate = useCallback((recipe: (current: NovaState) => NovaState) => {
    const next = stamp(recipe(stateRef.current));
    stateRef.current = next;
    setState(next);
  }, []);

  // Scheduled tasks complete automatically once their scheduled end time has passed.
  // Durations may cross midnight or span multiple days. Habits/routines are intentionally
  // excluded: they always require a manual check.
  useEffect(() => {
    if (!hydrated) return;

    const occurrenceHasEnded = (occurrenceDate: string, startMinutes: number, durationMinutes: number, nowDate: string, nowMinutes: number) => {
      const totalEnd = startMinutes + Math.max(0, durationMinutes);
      const endDate = addDays(occurrenceDate, Math.floor(totalEnd / (24 * 60)));
      const endMinutes = totalEnd % (24 * 60);
      return nowDate > endDate || (nowDate === endDate && nowMinutes >= endMinutes);
    };

    const completePassedTasks = () => {
      const now = zonedNow(stateRef.current.settings.timeZone);
      const completedAt = new Date().toISOString();
      let changed = false;

      const tasks = stateRef.current.tasks.map((task) => {
        if (!task.scheduledTime) return task;
        const start = minutesFromTime(task.scheduledTime);
        if (start == null) return task;
        const duration = task.durationMinutes ?? 0;

        if (task.recurrence !== "none") {
          const completedDates = new Set(task.completedDates ?? []);
          const lookbackDays = Math.max(1, Math.ceil(duration / (24 * 60)) + 1);
          let taskChanged = false;
          for (let offset = lookbackDays; offset >= 0; offset -= 1) {
            const occurrenceDate = addDays(now.dateKey, -offset);
            if (!taskOccursOn(task, occurrenceDate) || completedDates.has(occurrenceDate)) continue;
            if (occurrenceHasEnded(occurrenceDate, start, duration, now.dateKey, now.minutes)) {
              completedDates.add(occurrenceDate);
              taskChanged = true;
            }
          }
          if (!taskChanged) return task;
          changed = true;
          return { ...task, completedDates: [...completedDates], updatedAt: completedAt };
        }

        if (taskIsCompletedOn(task, task.dueDate ?? now.dateKey)) return task;
        const occurrenceDate = task.dueDate ?? now.dateKey;
        if (!occurrenceHasEnded(occurrenceDate, start, duration, now.dateKey, now.minutes)) return task;
        changed = true;
        return { ...task, status: "completed" as const, completedAt, updatedAt: completedAt };
      });

      if (changed) mutate((current) => ({ ...current, tasks }));
    };

    completePassedTasks();
    const timer = window.setInterval(completePassedTasks, 30_000);
    return () => window.clearInterval(timer);
  }, [hydrated, mutate]);

  const addTask = useCallback((task: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    mutate((current) => {
      const maxOrder = current.tasks.reduce((max, item) => Math.max(max, item.order ?? -1), -1);
      return { ...current, tasks: [...current.tasks, { ...task, id, order: task.order ?? maxOrder + 1, createdAt: now, updatedAt: now }] };
    });
    return id;
  }, [mutate]);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    mutate((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, ...patch, updatedAt: new Date().toISOString() } : task) }));
  }, [mutate]);

  const deleteTask = useCallback((id: string) => { mutate((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) })); }, [mutate]);

  const reorderTask = useCallback((draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    mutate((current) => {
      const ordered = [...current.tasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const from = ordered.findIndex((task) => task.id === draggedId);
      const to = ordered.findIndex((task) => task.id === targetId);
      if (from < 0 || to < 0) return current;
      const [moved] = ordered.splice(from, 1);
      ordered.splice(to, 0, moved);
      const orderById = new Map(ordered.map((task, index) => [task.id, index]));
      return { ...current, tasks: current.tasks.map((task) => ({ ...task, order: orderById.get(task.id) ?? task.order })) };
    });
  }, [mutate]);

  const toggleTask = useCallback((id: string, onDate = dateKey()) => {
    mutate((current) => ({
      ...current,
      tasks: current.tasks.map((task) => {
        if (task.id !== id) return task;
        if (task.recurrence !== "none") {
          const completedDates = new Set(task.completedDates ?? []);
          if (completedDates.has(onDate)) completedDates.delete(onDate); else completedDates.add(onDate);
          return { ...task, completedDates: [...completedDates], updatedAt: new Date().toISOString() };
        }
        const complete = !taskIsCompletedOn(task, onDate);
        return { ...task, status: complete ? "completed" : "todo", completedAt: complete ? new Date().toISOString() : undefined, updatedAt: new Date().toISOString() };
      }),
    }));
  }, [mutate]);

  const setTaskStatus = useCallback((id: string, status: TaskStatus) => { updateTask(id, { status, completedAt: status === "completed" ? new Date().toISOString() : undefined }); }, [updateTask]);

  const addProject = useCallback((project: Omit<Project, "id" | "createdAt">) => {
    const id = crypto.randomUUID();
    mutate((current) => ({ ...current, projects: [...current.projects, { ...project, updates: project.updates ?? [], id, createdAt: new Date().toISOString() }] }));
    return id;
  }, [mutate]);
  const updateProject = useCallback((id: string, patch: Partial<Project>) => { mutate((current) => ({ ...current, projects: current.projects.map((project) => project.id === id ? { ...project, ...patch } : project) })); }, [mutate]);
  const deleteProject = useCallback((id: string) => { mutate((current) => ({ ...current, projects: current.projects.filter((project) => project.id !== id), tasks: current.tasks.map((task) => task.projectId === id ? { ...task, projectId: undefined, status: task.status === "in_progress" ? "todo" : task.status } : task) })); }, [mutate]);

  const addCategory = useCallback((category: Omit<Category, "id">) => { const id = crypto.randomUUID(); mutate((current) => ({ ...current, categories: [...current.categories, { ...category, id }] })); return id; }, [mutate]);
  const updateCategory = useCallback((id: string, patch: Partial<Category>) => { mutate((current) => ({ ...current, categories: current.categories.map((category) => category.id === id ? { ...category, ...patch } : category) })); }, [mutate]);
  const deleteCategory = useCallback((id: string) => { mutate((current) => ({ ...current, categories: current.categories.filter((category) => category.id !== id), tasks: current.tasks.map((task) => task.categoryId === id ? { ...task, categoryId: undefined } : task) })); }, [mutate]);
  const reorderCategory = useCallback((draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    mutate((current) => {
      const categories = [...current.categories];
      const from = categories.findIndex((category) => category.id === draggedId);
      const to = categories.findIndex((category) => category.id === targetId);
      if (from < 0 || to < 0) return current;
      const [moved] = categories.splice(from, 1);
      categories.splice(to, 0, moved);
      return { ...current, categories };
    });
  }, [mutate]);

  const addHabit = useCallback((habit: Omit<Habit, "id" | "createdAt">) => { const id = crypto.randomUUID(); mutate((current) => ({ ...current, habits: [...current.habits, { ...habit, id, createdAt: new Date().toISOString() }] })); return id; }, [mutate]);
  const updateHabit = useCallback((id: string, patch: Partial<Habit>) => { mutate((current) => ({ ...current, habits: current.habits.map((habit) => habit.id === id ? { ...habit, ...patch } : habit) })); }, [mutate]);
  const deleteHabit = useCallback((id: string) => {
    mutate((current) => {
      const { [id]: _completed, ...habitCompletions } = current.habitCompletions;
      const { [id]: _subtasks, ...habitSubtaskCompletions } = current.habitSubtaskCompletions;
      return { ...current, habits: current.habits.filter((habit) => habit.id !== id), habitCompletions, habitSubtaskCompletions };
    });
  }, [mutate]);

  const toggleHabit = useCallback((id: string, onDate = dateKey()) => {
    mutate((current) => {
      const habit = current.habits.find((item) => item.id === id);
      if (!habit) return current;
      const dates = new Set(current.habitCompletions[id] ?? []);
      const wasComplete = dates.has(onDate);
      if (wasComplete) dates.delete(onDate); else dates.add(onDate);
      const subtaskMap = { ...(current.habitSubtaskCompletions[id] ?? {}) };
      subtaskMap[onDate] = wasComplete ? [] : (habit.subtasks ?? []).map((subtask) => subtask.id);
      return {
        ...current,
        habitCompletions: { ...current.habitCompletions, [id]: [...dates] },
        habitSubtaskCompletions: { ...current.habitSubtaskCompletions, [id]: subtaskMap },
      };
    });
  }, [mutate]);

  const toggleHabitSubtask = useCallback((habitId: string, subtaskId: string, onDate = dateKey()) => {
    mutate((current) => {
      const habit = current.habits.find((item) => item.id === habitId);
      if (!habit) return current;
      const allSubtasks = habit.subtasks ?? [];
      const habitMap = { ...(current.habitSubtaskCompletions[habitId] ?? {}) };
      const done = new Set(habitMap[onDate] ?? []);
      if (done.has(subtaskId)) done.delete(subtaskId); else done.add(subtaskId);
      habitMap[onDate] = [...done];

      const completedDates = new Set(current.habitCompletions[habitId] ?? []);
      const allDone = allSubtasks.length > 0 && allSubtasks.every((subtask) => done.has(subtask.id));
      if (allDone) completedDates.add(onDate); else completedDates.delete(onDate);

      return {
        ...current,
        habitSubtaskCompletions: { ...current.habitSubtaskCompletions, [habitId]: habitMap },
        habitCompletions: { ...current.habitCompletions, [habitId]: [...completedDates] },
      };
    });
  }, [mutate]);

  const importExternalEvents = useCallback((events: ExternalCalendarEvent[]) => {
    mutate((current) => {
      const map = new Map(current.externalEvents.map((event) => [event.id, event]));
      events.forEach((event) => map.set(event.id, event));
      return { ...current, externalEvents: [...map.values()] };
    });
  }, [mutate]);

  const clearImportedEvents = useCallback((source?: ExternalCalendarEvent["source"]) => { mutate((current) => ({ ...current, externalEvents: source ? current.externalEvents.filter((event) => event.source !== source) : [] })); }, [mutate]);
  const updateSettings = useCallback((patch: Partial<NovaSettings>) => { mutate((current) => ({ ...current, settings: { ...current.settings, ...patch } })); }, [mutate]);
  const importState = useCallback((next: NovaState) => { const normalized = normalizeState(next); if (normalized) { const stamped = stamp(normalized); stateRef.current = stamped; setState(stamped); } }, []);
  const resetState = useCallback(() => { const next = createSeedState(); stateRef.current = next; setState(next); }, []);

  const sendMagicLink = useCallback(async (email: string) => {
    const client = supabaseRef.current ?? createClient();
    if (!client) return { ok: false, message: "Supabase is not configured yet." };
    supabaseRef.current = client;
    setCloudStatus("connecting");
    const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/settings` } });
    if (error) { setCloudStatus("error"); return { ok: false, message: error.message }; }
    return { ok: true, message: "Check your email for NOVA's sign-in link or code." };
  }, []);

  const verifyEmailOtp = useCallback(async (email: string, token: string) => {
    const client = supabaseRef.current ?? createClient();
    if (!client) return { ok: false, message: "Supabase is not configured yet." };
    supabaseRef.current = client;
    const { data, error } = await client.auth.verifyOtp({ email, token, type: "email" });
    if (error) return { ok: false, message: error.message };
    if (data.session) {
      setSession(data.session);
      sessionRef.current = data.session;
      await loadCloud(client, data.session);
    }
    return { ok: true, message: "Signed in. This device will stay signed in." };
  }, [loadCloud]);

  const signInWithProvider = useCallback(async (provider: "google" | "apple") => {
    const client = supabaseRef.current ?? createClient();
    if (!client) return { ok: false, message: "Supabase is not configured yet." };
    supabaseRef.current = client;
    const { error } = await client.auth.signInWithOAuth({ provider: provider as Provider, options: { redirectTo: `${window.location.origin}/settings` } });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: `Opening ${provider === "google" ? "Google" : "Apple"} sign in…` };
  }, []);

  const signOutCloud = useCallback(async () => {
    await supabaseRef.current?.auth.signOut();
    setSession(null);
    sessionRef.current = null;
    cloudReadyRef.current = false;
    lastRemoteUpdatedAtRef.current = null;
    window.localStorage.removeItem(GOOGLE_CALENDAR_TOKEN_KEY);
    setGoogleCalendarConnected(false);
    setCloudStatus("local");
  }, []);

  const syncNow = useCallback(async () => {
    const client = supabaseRef.current;
    if (!client || !session) return;
    setCloudStatus("connecting");
    const updatedAt = new Date().toISOString();
    const { error } = await client.from("app_state").upsert({ user_id: session.user.id, data: stateRef.current, updated_at: updatedAt });
    if (!error) { lastRemoteUpdatedAtRef.current = updatedAt; cloudReadyRef.current = true; }
    setCloudStatus(error ? "error" : "synced");
  }, [session]);

  const connectGoogleCalendar = useCallback(async () => {
    const client = supabaseRef.current ?? createClient();
    if (!client) return { ok: false, message: "Supabase is not configured yet." };
    supabaseRef.current = client;
    window.localStorage.setItem(GOOGLE_OAUTH_INTENT_KEY, "calendar");
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/settings?calendar=google`,
        scopes: GOOGLE_CALENDAR_SCOPE,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) {
      window.localStorage.removeItem(GOOGLE_OAUTH_INTENT_KEY);
      return { ok: false, message: error.message };
    }
    return { ok: true, message: "Opening Google Calendar permission…" };
  }, []);

  const syncGoogleCalendar = useCallback(async () => {
    const token = window.localStorage.getItem(GOOGLE_CALENDAR_TOKEN_KEY);
    if (!token) return { ok: false, message: "Connect Google Calendar first." };
    const now = new Date();
    const timeMin = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const params = new URLSearchParams({ timeMin, timeMax, singleEvents: "true", orderBy: "startTime", maxResults: "2500" });
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 401 || response.status === 403) {
      window.localStorage.removeItem(GOOGLE_CALENDAR_TOKEN_KEY);
      setGoogleCalendarConnected(false);
      return { ok: false, message: "Google permission expired. Reconnect Google Calendar and try again." };
    }
    if (!response.ok) return { ok: false, message: `Google Calendar sync failed (${response.status}).` };
    const payload = await response.json() as { items?: Array<any> };
    const events: ExternalCalendarEvent[] = (payload.items ?? []).filter((item) => item.status !== "cancelled" && (item.start?.dateTime || item.start?.date)).map((item) => {
      const allDay = Boolean(item.start?.date && !item.start?.dateTime);
      const startRaw = item.start?.dateTime ?? `${item.start.date}T00:00:00`;
      const endRaw = item.end?.dateTime ?? `${item.end?.date ?? item.start.date}T23:59:00`;
      return {
        id: `google-${item.id}`,
        title: item.summary || "Untitled event",
        start: new Date(startRaw).toISOString(),
        end: new Date(endRaw).toISOString(),
        isAllDay: allDay,
        calendarName: "Google Calendar",
        location: item.location || undefined,
        notes: item.description || undefined,
        source: "google" as const,
      };
    });
    mutate((current) => ({ ...current, externalEvents: [...current.externalEvents.filter((event) => event.source !== "google"), ...events] }));
    return { ok: true, message: `Synced ${events.length} Google Calendar event${events.length === 1 ? "" : "s"}.` };
  }, [mutate]);

  const disconnectGoogleCalendar = useCallback(() => {
    window.localStorage.removeItem(GOOGLE_CALENDAR_TOKEN_KEY);
    window.localStorage.removeItem(GOOGLE_OAUTH_INTENT_KEY);
    setGoogleCalendarConnected(false);
    clearImportedEvents("google");
  }, [clearImportedEvents]);

  const value = useMemo<NovaContextValue>(() => ({
    state, hydrated, addTask, updateTask, deleteTask, reorderTask, toggleTask, setTaskStatus,
    addProject, updateProject, deleteProject, addCategory, updateCategory, deleteCategory, reorderCategory,
    addHabit, updateHabit, deleteHabit, toggleHabit, toggleHabitSubtask, importExternalEvents, clearImportedEvents,
    updateSettings, importState, resetState, cloudConfigured, cloudStatus, cloudEmail: session?.user.email ?? null,
    sendMagicLink, verifyEmailOtp, signInWithProvider, signOutCloud, syncNow,
    googleCalendarConnected, connectGoogleCalendar, syncGoogleCalendar, disconnectGoogleCalendar,
  }), [
    state, hydrated, addTask, updateTask, deleteTask, reorderTask, toggleTask, setTaskStatus,
    addProject, updateProject, deleteProject, addCategory, updateCategory, deleteCategory, reorderCategory,
    addHabit, updateHabit, deleteHabit, toggleHabit, toggleHabitSubtask, importExternalEvents, clearImportedEvents,
    updateSettings, importState, resetState, cloudConfigured, cloudStatus, session,
    sendMagicLink, verifyEmailOtp, signInWithProvider, signOutCloud, syncNow,
    googleCalendarConnected, connectGoogleCalendar, syncGoogleCalendar, disconnectGoogleCalendar,
  ]);

  return <NovaContext.Provider value={value}>{children}</NovaContext.Provider>;
}

export function useNova() {
  const context = useContext(NovaContext);
  if (!context) throw new Error("useNova must be used inside NovaProvider");
  return context;
}

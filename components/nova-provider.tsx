"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { createSeedState } from "@/lib/nova/seed";
import { dateKey, taskIsCompletedOn } from "@/lib/nova/date";
import type {
  Category,
  ExternalCalendarEvent,
  Habit,
  NovaSettings,
  NovaState,
  Project,
  Task,
  TaskStatus,
} from "@/lib/nova/types";

const STORAGE_KEY = "nova-planner-state-v2";

type CloudStatus = "local" | "connecting" | "synced" | "error";

type NovaContextValue = {
  state: NovaState;
  hydrated: boolean;
  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string, onDate?: string) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  addProject: (project: Omit<Project, "id" | "createdAt">) => string;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addCategory: (category: Omit<Category, "id">) => string;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  addHabit: (habit: Omit<Habit, "id" | "createdAt">) => string;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleHabit: (id: string, onDate?: string) => void;
  importExternalEvents: (events: ExternalCalendarEvent[]) => void;
  clearImportedEvents: () => void;
  updateSettings: (patch: Partial<NovaSettings>) => void;
  importState: (next: NovaState) => void;
  resetState: () => void;
  cloudConfigured: boolean;
  cloudStatus: CloudStatus;
  cloudEmail: string | null;
  sendMagicLink: (email: string) => Promise<{ ok: boolean; message: string }>;
  signOutCloud: () => Promise<void>;
  syncNow: () => Promise<void>;
};

const NovaContext = createContext<NovaContextValue | null>(null);

function stamp(state: NovaState): NovaState {
  return { ...state, lastUpdatedAt: new Date().toISOString() };
}

const LEGACY_DEMO_TASK_IDS = new Set([
  "task-1",
  "task-2",
  "task-3",
  "task-4",
  "task-5",
  "task-6",
  "task-7",
]);
const LEGACY_DEMO_PROJECT_IDS = new Set(["project-nova", "project-thesis", "project-trip"]);
const LEGACY_DEMO_HABIT_IDS = new Set(["habit-1", "habit-2", "habit-3"]);

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
  const habitCompletions = Object.fromEntries(
    Object.entries(state.habitCompletions).filter(([habitId]) => !LEGACY_DEMO_HABIT_IDS.has(habitId)),
  );
  const externalEvents = state.externalEvents.filter((event) => event.source !== "sample");

  return {
    ...state,
    version: 3,
    categories,
    projects,
    tasks,
    habits,
    habitCompletions,
    externalEvents,
  };
}

function normalizeState(input: unknown): NovaState | null {
  if (!input || typeof input !== "object") return null;
  const state = input as Partial<NovaState>;
  if (!Array.isArray(state.tasks) || !Array.isArray(state.projects) || !Array.isArray(state.categories)) return null;

  const base = createSeedState();
  const normalized: NovaState = {
    ...base,
    ...state,
    version: 3,
    habits: Array.isArray(state.habits) ? state.habits : [],
    habitCompletions: state.habitCompletions ?? {},
    externalEvents: Array.isArray(state.externalEvents) ? state.externalEvents : [],
    settings: { ...base.settings, ...(state.settings ?? {}) },
    lastUpdatedAt: state.lastUpdatedAt ?? new Date().toISOString(),
  };

  return removeLegacyDemoData(normalized);
}

export function NovaProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<NovaState>(() => createSeedState());
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>("local");
  const sessionRef = useRef<Session | null>(null);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const cloudLoadingRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cloudConfigured = hasSupabaseConfig();

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = normalizeState(JSON.parse(stored));
        if (parsed) setState(parsed);
      }
    } catch {
      // If local data is corrupt, the starter state remains available.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const loadCloud = useCallback(async (client: SupabaseClient, activeSession: Session) => {
    cloudLoadingRef.current = true;
    setCloudStatus("connecting");
    const { data, error } = await client
      .from("app_state")
      .select("data, updated_at")
      .eq("user_id", activeSession.user.id)
      .maybeSingle();

    if (error) {
      cloudLoadingRef.current = false;
      setCloudStatus("error");
      return;
    }

    if (data?.data) {
      const remote = normalizeState(data.data);
      if (remote) setState(remote);
    } else {
      await client.from("app_state").upsert({
        user_id: activeSession.user.id,
        data: state,
        updated_at: new Date().toISOString(),
      });
    }
    cloudLoadingRef.current = false;
    setCloudStatus("synced");
  }, [state]);

  useEffect(() => {
    if (!hydrated || !cloudConfigured) return;
    const client = createClient();
    if (!client) return;
    supabaseRef.current = client;

    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      sessionRef.current = data.session;
      if (data.session) loadCloud(client, data.session);
    });

    const { data: subscription } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      sessionRef.current = nextSession;
      if (nextSession) window.setTimeout(() => loadCloud(client, nextSession), 0);
      else setCloudStatus("local");
    });

    const onFocus = () => {
      if (sessionRef.current) loadCloud(client, sessionRef.current);
    };
    window.addEventListener("focus", onFocus);
    return () => {
      subscription.subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, cloudConfigured]);

  useEffect(() => {
    if (!hydrated || !session || !supabaseRef.current || cloudLoadingRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const client = supabaseRef.current;
      if (!client || !session) return;
      const { error } = await client.from("app_state").upsert({
        user_id: session.user.id,
        data: state,
        updated_at: new Date().toISOString(),
      });
      setCloudStatus(error ? "error" : "synced");
    }, 700);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state, session, hydrated]);

  const mutate = useCallback((recipe: (current: NovaState) => NovaState) => {
    setState((current) => stamp(recipe(current)));
  }, []);

  const addTask = useCallback((task: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    mutate((current) => ({ ...current, tasks: [...current.tasks, { ...task, id, createdAt: now, updatedAt: now }] }));
    return id;
  }, [mutate]);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    mutate((current) => ({
      ...current,
      tasks: current.tasks.map((task) => task.id === id ? { ...task, ...patch, updatedAt: new Date().toISOString() } : task),
    }));
  }, [mutate]);

  const deleteTask = useCallback((id: string) => {
    mutate((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }));
  }, [mutate]);

  const toggleTask = useCallback((id: string, onDate = dateKey()) => {
    mutate((current) => ({
      ...current,
      tasks: current.tasks.map((task) => {
        if (task.id !== id) return task;
        if (task.recurrence !== "none") {
          const completedDates = new Set(task.completedDates ?? []);
          if (completedDates.has(onDate)) completedDates.delete(onDate);
          else completedDates.add(onDate);
          return { ...task, completedDates: [...completedDates], updatedAt: new Date().toISOString() };
        }
        const complete = !taskIsCompletedOn(task, onDate);
        return {
          ...task,
          status: complete ? "completed" : "todo",
          completedAt: complete ? new Date().toISOString() : undefined,
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  }, [mutate]);

  const setTaskStatus = useCallback((id: string, status: TaskStatus) => {
    updateTask(id, {
      status,
      completedAt: status === "completed" ? new Date().toISOString() : undefined,
    });
  }, [updateTask]);

  const addProject = useCallback((project: Omit<Project, "id" | "createdAt">) => {
    const id = crypto.randomUUID();
    mutate((current) => ({ ...current, projects: [...current.projects, { ...project, id, createdAt: new Date().toISOString() }] }));
    return id;
  }, [mutate]);

  const updateProject = useCallback((id: string, patch: Partial<Project>) => {
    mutate((current) => ({ ...current, projects: current.projects.map((project) => project.id === id ? { ...project, ...patch } : project) }));
  }, [mutate]);

  const deleteProject = useCallback((id: string) => {
    mutate((current) => ({
      ...current,
      projects: current.projects.filter((project) => project.id !== id),
      tasks: current.tasks.map((task) => task.projectId === id ? { ...task, projectId: undefined } : task),
    }));
  }, [mutate]);

  const addCategory = useCallback((category: Omit<Category, "id">) => {
    const id = crypto.randomUUID();
    mutate((current) => ({ ...current, categories: [...current.categories, { ...category, id }] }));
    return id;
  }, [mutate]);

  const updateCategory = useCallback((id: string, patch: Partial<Category>) => {
    mutate((current) => ({ ...current, categories: current.categories.map((category) => category.id === id ? { ...category, ...patch } : category) }));
  }, [mutate]);

  const deleteCategory = useCallback((id: string) => {
    mutate((current) => ({
      ...current,
      categories: current.categories.filter((category) => category.id !== id),
      tasks: current.tasks.map((task) => task.categoryId === id ? { ...task, categoryId: undefined } : task),
      habits: current.habits.map((habit) => habit.categoryId === id ? { ...habit, categoryId: undefined } : habit),
    }));
  }, [mutate]);

  const addHabit = useCallback((habit: Omit<Habit, "id" | "createdAt">) => {
    const id = crypto.randomUUID();
    mutate((current) => ({ ...current, habits: [...current.habits, { ...habit, id, createdAt: new Date().toISOString() }] }));
    return id;
  }, [mutate]);

  const updateHabit = useCallback((id: string, patch: Partial<Habit>) => {
    mutate((current) => ({ ...current, habits: current.habits.map((habit) => habit.id === id ? { ...habit, ...patch } : habit) }));
  }, [mutate]);

  const deleteHabit = useCallback((id: string) => {
    mutate((current) => {
      const { [id]: _discarded, ...rest } = current.habitCompletions;
      return { ...current, habits: current.habits.filter((habit) => habit.id !== id), habitCompletions: rest };
    });
  }, [mutate]);

  const toggleHabit = useCallback((id: string, onDate = dateKey()) => {
    mutate((current) => {
      const dates = new Set(current.habitCompletions[id] ?? []);
      if (dates.has(onDate)) dates.delete(onDate);
      else dates.add(onDate);
      return { ...current, habitCompletions: { ...current.habitCompletions, [id]: [...dates] } };
    });
  }, [mutate]);

  const importExternalEvents = useCallback((events: ExternalCalendarEvent[]) => {
    mutate((current) => {
      const map = new Map(current.externalEvents.map((event) => [event.id, event]));
      events.forEach((event) => map.set(event.id, event));
      return { ...current, externalEvents: [...map.values()] };
    });
  }, [mutate]);

  const clearImportedEvents = useCallback(() => {
    mutate((current) => ({ ...current, externalEvents: [] }));
  }, [mutate]);

  const updateSettings = useCallback((patch: Partial<NovaSettings>) => {
    mutate((current) => ({ ...current, settings: { ...current.settings, ...patch } }));
  }, [mutate]);

  const importState = useCallback((next: NovaState) => {
    const normalized = normalizeState(next);
    if (normalized) setState(stamp(normalized));
  }, []);

  const resetState = useCallback(() => setState(createSeedState()), []);

  const sendMagicLink = useCallback(async (email: string) => {
    const client = supabaseRef.current ?? createClient();
    if (!client) return { ok: false, message: "Supabase is not configured yet." };
    supabaseRef.current = client;
    setCloudStatus("connecting");
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/settings` },
    });
    if (error) {
      setCloudStatus("error");
      return { ok: false, message: error.message };
    }
    return { ok: true, message: "Check your email for the NOVA sign-in link." };
  }, []);

  const signOutCloud = useCallback(async () => {
    await supabaseRef.current?.auth.signOut();
    setSession(null);
    sessionRef.current = null;
    setCloudStatus("local");
  }, []);

  const syncNow = useCallback(async () => {
    const client = supabaseRef.current;
    if (!client || !session) return;
    setCloudStatus("connecting");
    const { error } = await client.from("app_state").upsert({
      user_id: session.user.id,
      data: state,
      updated_at: new Date().toISOString(),
    });
    setCloudStatus(error ? "error" : "synced");
  }, [session, state]);

  const value = useMemo<NovaContextValue>(() => ({
    state,
    hydrated,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    setTaskStatus,
    addProject,
    updateProject,
    deleteProject,
    addCategory,
    updateCategory,
    deleteCategory,
    addHabit,
    updateHabit,
    deleteHabit,
    toggleHabit,
    importExternalEvents,
    clearImportedEvents,
    updateSettings,
    importState,
    resetState,
    cloudConfigured,
    cloudStatus,
    cloudEmail: session?.user.email ?? null,
    sendMagicLink,
    signOutCloud,
    syncNow,
  }), [
    state, hydrated, addTask, updateTask, deleteTask, toggleTask, setTaskStatus,
    addProject, updateProject, deleteProject, addCategory, updateCategory, deleteCategory,
    addHabit, updateHabit, deleteHabit, toggleHabit, importExternalEvents, clearImportedEvents,
    updateSettings, importState, resetState, cloudConfigured, cloudStatus, session,
    sendMagicLink, signOutCloud, syncNow,
  ]);

  return <NovaContext.Provider value={value}>{children}</NovaContext.Provider>;
}

export function useNova() {
  const context = useContext(NovaContext);
  if (!context) throw new Error("useNova must be used inside NovaProvider");
  return context;
}

import type { NovaState } from "./types";

const nowIso = () => new Date().toISOString();

/**
 * Production starter state.
 *
 * NOVA intentionally starts with no tasks, projects, habits, or calendar events.
 * The three life categories below are part of the product defaults, not demo data.
 */
export function createSeedState(): NovaState {
  const now = nowIso();

  return {
    version: 4,
    categories: [
      { id: "cat-personal", name: "Personal", color: "#D7C8ED" },
      { id: "cat-work", name: "Work", color: "#B29CE4" },
      { id: "cat-errands", name: "Errands", color: "#E8CFE5" },
    ],
    projects: [],
    tasks: [],
    habits: [],
    habitCompletions: {},
    externalEvents: [],
    settings: {
      displayName: "Profile",
      profileSetupComplete: false,
      eveningReviewTime: "20:30",
      notificationsEnabled: false,
      dayStartHour: 7,
      dayEndHour: 22,
      weekStartsMonday: false,
    },
    lastUpdatedAt: now,
  };
}

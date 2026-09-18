import type { NovaState } from "./types";

const nowIso = () => new Date().toISOString();

export function createSeedState(): NovaState {
  const now = nowIso();

  return {
    version: 5,
    categories: [
      { id: "cat-personal", name: "Personal", color: "#D7C8ED" },
      { id: "cat-work", name: "Work", color: "#B29CE4" },
      { id: "cat-errands", name: "Errands", color: "#E8CFE5" },
    ],
    projects: [],
    tasks: [],
    habits: [],
    habitCompletions: {},
    habitSubtaskCompletions: {},
    externalEvents: [],
    settings: {
      displayName: "Profile",
      profileSetupComplete: false,
      theme: "lavender",
      eveningReviewTime: "20:30",
      notificationsEnabled: false,
      dayStartHour: 7,
      dayEndHour: 22,
      weekStartsMonday: false,
      timeZone: "auto",
    },
    lastUpdatedAt: now,
  };
}

"use client";

import { useEffect } from "react";
import { dateKey, habitOccursOn, minutesFromTime, taskIsCompletedOn, taskOccursOn } from "@/lib/nova/date";
import { useNova } from "./nova-provider";

export function ReminderWatcher() {
  const { state, hydrated } = useNova();

  useEffect(() => {
    if (!hydrated || !state.settings.notificationsEnabled || typeof Notification === "undefined" || Notification.permission !== "granted") return;

    function check() {
      const now = new Date();
      const today = dateKey(now);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      state.tasks.filter((task) => task.scheduledTime && taskOccursOn(task, today) && !taskIsCompletedOn(task, today)).forEach((task) => {
        const start = minutesFromTime(task.scheduledTime);
        if (start == null) return;
        const trigger = start - (task.reminderMinutes ?? 0) - (task.travelTimeMinutes ?? 0);
        if (nowMinutes < trigger || nowMinutes > trigger + 1) return;
        const key = `nova-notified-task-${task.id}-${today}-${trigger}`;
        if (window.localStorage.getItem(key)) return;
        const reminder = task.reminderMinutes ?? 0;
        const body = task.travelTimeMinutes
          ? `${reminder > 0 ? `Leave in ${reminder} minutes` : "Time to leave"} · ${task.travelTimeMinutes} min travel${task.location ? ` · ${task.location}` : ""}`
          : `${reminder > 0 ? `Starts in ${reminder} minutes` : "Starting now"} · ${task.scheduledTime}`;
        new Notification(task.title, { body, icon: "/icons/icon-192.png" });
        window.localStorage.setItem(key, "1");
      });

      state.habits.filter((habit) => habit.scheduledTime && habitOccursOn(habit, today) && !(state.habitCompletions[habit.id] ?? []).includes(today)).forEach((habit) => {
        const start = minutesFromTime(habit.scheduledTime);
        if (start == null) return;
        const trigger = start - (habit.reminderMinutes ?? 0);
        if (nowMinutes < trigger || nowMinutes > trigger + 1) return;
        const key = `nova-notified-habit-${habit.id}-${today}-${trigger}`;
        if (window.localStorage.getItem(key)) return;
        new Notification(habit.name, { body: "NOVA habit reminder", icon: "/icons/icon-192.png" });
        window.localStorage.setItem(key, "1");
      });
    }

    check();
    const timer = window.setInterval(check, 30_000);
    return () => window.clearInterval(timer);
  }, [hydrated, state]);

  return null;
}

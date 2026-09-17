"use client";

import { FormEvent } from "react";
import { useNova } from "./nova-provider";
import type { Habit } from "@/lib/nova/types";

const weekdays = [
  [0, "Sun"], [1, "Mon"], [2, "Tue"], [3, "Wed"], [4, "Thu"], [5, "Fri"], [6, "Sat"],
] as const;

export function HabitModal({ open, onClose, habit }: { open: boolean; onClose: () => void; habit?: Habit | null }) {
  const { state, addHabit, updateHabit, deleteHabit } = useNova();
  if (!open) return null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    if (!name) return;
    const frequency = String(data.get("frequency") || "daily") as Habit["frequency"];
    const selectedDays = weekdays.filter(([day]) => data.get(`day-${day}`) === "on").map(([day]) => day);
    const payload = {
      name,
      categoryId: String(data.get("categoryId") || "") || undefined,
      frequency,
      weekdays: frequency === "custom" || frequency === "weekly" ? selectedDays : undefined,
      scheduledTime: String(data.get("scheduledTime") || "") || undefined,
      reminderMinutes: Number(data.get("reminderMinutes")) || undefined,
      active: true,
    };
    if (habit) updateHabit(habit.id, payload);
    else addHabit(payload);
    onClose();
  }

  const selected = new Set(habit?.weekdays ?? [1, 3, 5]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="modal-card" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-heading">
          <div><span className="eyebrow">HABIT</span><h2>{habit ? "Edit habit" : "Add habit"}</h2></div>
          <button type="button" className="close-button" onClick={onClose}>×</button>
        </div>
        <label className="field full-field"><span>Name</span><input name="name" defaultValue={habit?.name ?? ""} autoFocus required placeholder="e.g. Read 20 minutes" /></label>
        <div className="form-grid two">
          <label className="field"><span>Category</span><select name="categoryId" defaultValue={habit?.categoryId ?? state.categories[0]?.id ?? ""}><option value="">No category</option>{state.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="field"><span>Frequency</span><select name="frequency" defaultValue={habit?.frequency ?? "daily"}><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekly">Weekly</option><option value="custom">Custom days</option></select></label>
          <label className="field"><span>Time</span><input name="scheduledTime" type="time" defaultValue={habit?.scheduledTime ?? ""} /></label>
          <label className="field"><span>Reminder</span><select name="reminderMinutes" defaultValue={String(habit?.reminderMinutes ?? 10)}><option value="0">At start</option><option value="5">5 minutes before</option><option value="10">10 minutes before</option><option value="30">30 minutes before</option><option value="60">1 hour before</option></select></label>
        </div>
        <div className="field full-field"><span>Custom days</span><div className="weekday-picker">{weekdays.map(([day, label]) => <label key={day}><input type="checkbox" name={`day-${day}`} defaultChecked={selected.has(day)} /><span>{label}</span></label>)}</div></div>
        <div className="modal-actions">
          {habit ? <button type="button" className="danger-button" onClick={() => { if (confirm("Delete this habit?")) { deleteHabit(habit.id); onClose(); } }}>Delete</button> : <span />}
          <button className="primary-button" type="submit">{habit ? "Save habit" : "Add habit"}</button>
        </div>
      </form>
    </div>
  );
}

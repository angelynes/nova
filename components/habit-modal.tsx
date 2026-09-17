"use client";

import { FormEvent, useEffect, useState } from "react";
import { addDays, dateKey } from "@/lib/nova/date";
import { useNova } from "./nova-provider";
import type { Habit } from "@/lib/nova/types";

const weekdays = [
  [0, "Sun"], [1, "Mon"], [2, "Tue"], [3, "Wed"], [4, "Thu"], [5, "Fri"], [6, "Sat"],
] as const;

export function HabitModal({
  open,
  onClose,
  habit,
  occurrenceDate,
}: {
  open: boolean;
  onClose: () => void;
  habit?: Habit | null;
  occurrenceDate?: string;
}) {
  const { state, addHabit, updateHabit, deleteHabit } = useNova();
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [deletePrompt, setDeletePrompt] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (habit?.weekdays?.length) setSelectedDays(habit.weekdays);
    else if (habit?.frequency === "weekdays") setSelectedDays([1, 2, 3, 4, 5]);
    else if (habit?.frequency === "weekly") setSelectedDays(habit.weekdays?.length ? habit.weekdays : [new Date().getDay()]);
    else setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
    setDeletePrompt(false);
  }, [open, habit]);

  if (!open) return null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    if (!name) return;
    if (!selectedDays.length) {
      alert("Choose at least one day for this habit.");
      return;
    }
    const reminderRaw = String(data.get("reminderMinutes") || "");
    const reminderMinutes = reminderRaw ? Number(reminderRaw) : undefined;
    const payload = {
      name,
      categoryId: String(data.get("categoryId") || "") || undefined,
      frequency: "custom" as const,
      weekdays: selectedDays,
      scheduledTime: String(data.get("scheduledTime") || "") || undefined,
      reminderMinutes: Number.isFinite(reminderMinutes) && (reminderMinutes ?? -1) >= 0 ? reminderMinutes : undefined,
      recurrenceEndDate: habit?.recurrenceEndDate,
      excludedDates: habit?.excludedDates ?? [],
      active: true,
    };
    if (habit) updateHabit(habit.id, payload);
    else addHabit(payload);
    onClose();
  }

  function toggleDay(day: number) {
    setSelectedDays((days) => days.includes(day) ? days.filter((item) => item !== day) : [...days, day].sort());
  }

  function deleteThisOccurrence() {
    if (!habit) return;
    const target = occurrenceDate ?? dateKey();
    updateHabit(habit.id, { excludedDates: [...new Set([...(habit.excludedDates ?? []), target])] });
    onClose();
  }

  function deleteFuture() {
    if (!habit) return;
    const target = occurrenceDate ?? dateKey();
    updateHabit(habit.id, { recurrenceEndDate: addDays(target, -1) });
    onClose();
  }

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
          <label className="field"><span>Time</span><input name="scheduledTime" type="time" defaultValue={habit?.scheduledTime ?? ""} /></label>
          <label className="field"><span>Reminder</span><select name="reminderMinutes" defaultValue={habit?.reminderMinutes == null ? "" : String(habit.reminderMinutes)}><option value="">No reminder</option><option value="0">At start</option><option value="5">5 minutes before</option><option value="10">10 minutes before</option><option value="30">30 minutes before</option><option value="60">1 hour before</option></select></label>
        </div>
        <div className="field full-field repeat-days-field"><span>Repeat on</span><div className="weekday-picker">{weekdays.map(([day, label]) => <label key={day}><input type="checkbox" checked={selectedDays.includes(day)} onChange={() => toggleDay(day)} /><span>{label}</span></label>)}</div><small className="field-help">Choose exactly the days this habit should appear. This replaces the old separate frequency + custom-days controls.</small></div>

        {deletePrompt && habit ? (
          <div className="delete-choice-panel">
            <strong>Delete repeating habit</strong>
            <p>Choose whether to skip only this occurrence or stop the habit from this date forward.</p>
            <div className="delete-choice-actions">
              <button type="button" className="soft-button" onClick={deleteThisOccurrence}>Delete this event only</button>
              <button type="button" className="soft-button" onClick={deleteFuture}>Delete this & future</button>
              <button type="button" className="danger-button" onClick={() => { deleteHabit(habit.id); onClose(); }}>Delete entire habit</button>
              <button type="button" className="ghost-button" onClick={() => setDeletePrompt(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="modal-actions">
            {habit ? <button type="button" className="danger-button" onClick={() => setDeletePrompt(true)}>Delete</button> : <span />}
            <button className="primary-button" type="submit">{habit ? "Save habit" : "Add habit"}</button>
          </div>
        )}
      </form>
    </div>
  );
}

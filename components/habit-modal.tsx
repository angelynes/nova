"use client";

import { FormEvent, useEffect, useState } from "react";
import { addDays, dateKey, durationInputParts, durationToMinutes, type DurationUnit } from "@/lib/nova/date";
import { THEME_META } from "@/lib/nova/theme";
import { useNova } from "./nova-provider";
import type { Habit, HabitSubtask } from "@/lib/nova/types";

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
  const [subtasks, setSubtasks] = useState<HabitSubtask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [color, setColor] = useState(THEME_META[state.settings.theme].habitColor);
  const initialDuration = durationInputParts(habit?.durationMinutes);
  const [durationValue, setDurationValue] = useState(initialDuration.value);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>(initialDuration.unit);

  useEffect(() => {
    if (!open) return;
    if (habit?.weekdays?.length) setSelectedDays(habit.weekdays);
    else if (habit?.frequency === "weekdays") setSelectedDays([1, 2, 3, 4, 5]);
    else if (habit?.frequency === "weekly") setSelectedDays(habit.weekdays?.length ? habit.weekdays : [new Date().getDay()]);
    else setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
    setDeletePrompt(false);
    setSubtasks(habit?.subtasks ?? []);
    setNewSubtask("");
    setColor(habit?.color ?? THEME_META[state.settings.theme].habitColor);
    const duration = durationInputParts(habit?.durationMinutes);
    setDurationValue(duration.value);
    setDurationUnit(duration.unit);
  }, [open, habit, state.settings.theme]);

  if (!open) return null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    if (!name) return;
    if (!selectedDays.length) {
      alert("Choose at least one day for this routine.");
      return;
    }
    const reminderRaw = String(data.get("reminderMinutes") || "");
    const reminderMinutes = reminderRaw ? Number(reminderRaw) : undefined;
    const durationMinutes = durationToMinutes(durationValue, durationUnit);
    const payload = {
      name,
      frequency: "custom" as const,
      weekdays: selectedDays,
      scheduledTime: String(data.get("scheduledTime") || "") || undefined,
      durationMinutes,
      reminderMinutes: Number.isFinite(reminderMinutes) && (reminderMinutes ?? -1) >= 0 ? reminderMinutes : undefined,
      color,
      subtasks: subtasks.filter((item) => item.title.trim()).map((item) => ({ ...item, title: item.title.trim() })),
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

  function addSubtask() {
    const title = newSubtask.trim();
    if (!title) return;
    setSubtasks((current) => [...current, { id: crypto.randomUUID(), title }]);
    setNewSubtask("");
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

  function duplicateCurrentRoutine() {
    if (!habit) return;
    const { id: _id, createdAt: _createdAt, ...copy } = habit;
    addHabit({ ...copy, excludedDates: [], recurrenceEndDate: undefined, active: true, subtasks: (copy.subtasks ?? []).map((item) => ({ ...item, id: crypto.randomUUID() })) });
    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="modal-card habit-composer" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-heading"><div><span className="eyebrow">ROUTINE</span><h2>{habit ? "Edit routine" : "Add routine"}</h2></div><button type="button" className="close-button" onClick={onClose}>×</button></div>
        <label className="field full-field"><span>Routine name</span><input name="name" defaultValue={habit?.name ?? ""} autoFocus required placeholder="e.g. Morning Routine" /></label>

        <div className="form-grid two">
          <label className="field"><span>Time</span><input name="scheduledTime" type="time" defaultValue={habit?.scheduledTime ?? ""} /></label>
          <label className="field"><span>Duration</span><div className="duration-input-row"><input type="number" min="0" step="0.25" inputMode="decimal" value={durationValue} onChange={(event) => setDurationValue(event.target.value)} placeholder="No duration" /><select value={durationUnit} onChange={(event) => setDurationUnit(event.target.value as DurationUnit)}><option value="minutes">Minutes</option><option value="hours">Hours</option><option value="days">Days</option></select></div><small className="field-help">Leave the amount blank for no duration.</small></label>
          <label className="field"><span>Reminder</span><select name="reminderMinutes" defaultValue={habit?.reminderMinutes == null ? "" : String(habit.reminderMinutes)}><option value="">No reminder</option><option value="0">At start</option><option value="5">5 minutes before</option><option value="10">10 minutes before</option><option value="30">30 minutes before</option><option value="60">1 hour before</option></select></label>
          <label className="field"><span>Habit color</span><div className="habit-color-control"><input type="color" value={color} onChange={(event) => setColor(event.target.value)} /><span style={{ background: color }} /></div></label>
        </div>

        <div className="field full-field repeat-days-field"><span>Repeat on</span><div className="weekday-picker">{weekdays.map(([day, label]) => <label key={day}><input type="checkbox" checked={selectedDays.includes(day)} onChange={() => toggleDay(day)} /><span>{label}</span></label>)}</div><small className="field-help">Select every day for a daily routine, or pick only the days you want.</small></div>

        <div className="habit-subtask-editor">
          <div className="habit-subtask-heading"><div><span className="eyebrow">CHECKLIST</span><strong>Routine items</strong></div><small>{subtasks.length} item{subtasks.length === 1 ? "" : "s"}</small></div>
          {subtasks.map((subtask, index) => <div className="habit-subtask-edit-row" key={subtask.id}><span>{index + 1}</span><input value={subtask.title} onChange={(event) => setSubtasks((items) => items.map((item) => item.id === subtask.id ? { ...item, title: event.target.value } : item))} /><button type="button" className="icon-control" onClick={() => setSubtasks((items) => items.filter((item) => item.id !== subtask.id))}>×</button></div>)}
          <div className="habit-subtask-add-row"><input value={newSubtask} onChange={(event) => setNewSubtask(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addSubtask(); } }} placeholder="Add an item, e.g. Vitamins" /><button type="button" className="soft-button" onClick={addSubtask}>Add</button></div>
        </div>

        {deletePrompt && habit ? (
          <div className="delete-choice-panel"><strong>Delete repeating routine</strong><p>Choose whether to skip only this occurrence or stop the routine from this date forward.</p><div className="delete-choice-actions"><button type="button" className="soft-button" onClick={deleteThisOccurrence}>Delete this event only</button><button type="button" className="soft-button" onClick={deleteFuture}>Delete this & future</button><button type="button" className="danger-button" onClick={() => { deleteHabit(habit.id); onClose(); }}>Delete entire routine</button><button type="button" className="ghost-button" onClick={() => setDeletePrompt(false)}>Cancel</button></div></div>
        ) : (
          <div className="modal-actions">{habit ? <div className="modal-secondary-actions"><button type="button" className="danger-button" onClick={() => setDeletePrompt(true)}>Delete</button><button type="button" className="ghost-button" onClick={duplicateCurrentRoutine}>Duplicate</button></div> : <span />}<button className="primary-button" type="submit">{habit ? "Save routine" : "Add routine"}</button></div>
        )}
      </form>
    </div>
  );
}

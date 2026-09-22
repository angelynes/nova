"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { addDays, dateKey, durationInputParts, durationToMinutes, googleMapsUrl, parseDateKey, type DurationUnit } from "@/lib/nova/date";
import { useNova } from "./nova-provider";
import type { Recurrence, Task, TaskStatus, TaskSubtask } from "@/lib/nova/types";

const weekdays = [
  [0, "Sun"], [1, "Mon"], [2, "Tue"], [3, "Wed"], [4, "Thu"], [5, "Fri"], [6, "Sat"],
] as const;

export function TaskModal({
  open,
  onClose,
  task,
  defaultDate,
  defaultProjectId,
  defaultTime,
  occurrenceDate,
}: {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  defaultDate?: string;
  defaultProjectId?: string;
  defaultTime?: string;
  occurrenceDate?: string;
}) {
  const { state, addTask, updateTask, deleteTask } = useNova();
  const [showMore, setShowMore] = useState(Boolean(task));
  const [recurrence, setRecurrence] = useState<Recurrence>(task?.recurrence ?? "none");
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>(task?.recurrenceDays ?? []);
  const [deletePrompt, setDeletePrompt] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(task?.projectId ?? defaultProjectId ?? "");
  const [location, setLocation] = useState(task?.location ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? defaultDate ?? "");
  const [subtasks, setSubtasks] = useState<TaskSubtask[]>(task?.subtasks ?? []);
  const [newSubtask, setNewSubtask] = useState("");
  const initialDuration = durationInputParts(task?.durationMinutes);
  const [durationValue, setDurationValue] = useState(initialDuration.value);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>(initialDuration.unit);

  useEffect(() => {
    if (!open) return;
    setShowMore(Boolean(task));
    setRecurrence(task?.recurrence ?? "none");
    const anchor = task?.dueDate ?? defaultDate ?? dateKey();
    const anchorDay = parseDateKey(anchor).getDay();
    setRecurrenceDays(task?.recurrenceDays?.length ? task.recurrenceDays : [anchorDay]);
    setDeletePrompt(false);
    setSelectedProjectId(task?.projectId ?? defaultProjectId ?? "");
    setLocation(task?.location ?? "");
    setDueDate(task?.dueDate ?? defaultDate ?? "");
    setSubtasks(task?.subtasks ?? []);
    setNewSubtask("");
    const duration = durationInputParts(task?.durationMinutes);
    setDurationValue(duration.value);
    setDurationUnit(duration.unit);
  }, [open, task, defaultDate, defaultProjectId]);

  const key = `${task?.id ?? "new"}-${defaultDate ?? ""}-${defaultProjectId ?? ""}-${defaultTime ?? ""}`;

  const initial = useMemo(() => ({
    title: task?.title ?? "",
    dueDate: task?.dueDate ?? defaultDate ?? "",
    scheduledTime: task?.scheduledTime ?? defaultTime ?? "",
    durationMinutes: task?.durationMinutes,
    categoryId: task?.categoryId ?? state.categories[0]?.id ?? "",
    projectId: task?.projectId ?? defaultProjectId ?? "",
    status: task?.status ?? "todo",
    reminderMinutes: task?.reminderMinutes,
    travelTimeMinutes: task?.travelTimeMinutes,
    notes: task?.notes ?? "",
  }), [task, defaultDate, defaultProjectId, defaultTime, state.categories]);

  if (!open) return null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") || "").trim();
    if (!title) return;

    const projectId = String(data.get("projectId") || "") || undefined;
    const selectedStatus = String(data.get("status") || "todo") as TaskStatus;
    let status: TaskStatus;
    if (projectId) status = selectedStatus;
    else if (task?.status === "completed") status = "completed";
    else status = "todo";

    let savedDueDate = dueDate || undefined;
    // Only project tasks may stay undated. Standalone tasks need a day so they remain reachable from Today.
    if (!projectId && !savedDueDate) savedDueDate = defaultDate ?? dateKey();
    if (recurrence !== "none" && !savedDueDate) savedDueDate = defaultDate ?? dateKey();
    const scheduledTime = String(data.get("scheduledTime") || "") || undefined;
    const reminderRaw = String(data.get("reminderMinutes") || "");
    const travelRaw = String(data.get("travelTimeMinutes") || "");
    const durationMinutes = durationToMinutes(durationValue, durationUnit);
    const reminderMinutes = reminderRaw ? Number(reminderRaw) : undefined;
    const travelTimeMinutes = travelRaw ? Number(travelRaw) : undefined;

    const payload = {
      title,
      notes: String(data.get("notes") || "").trim() || undefined,
      subtasks: subtasks.filter((item) => item.title.trim()).map((item) => ({ ...item, title: item.title.trim() })),
      categoryId: String(data.get("categoryId") || "") || undefined,
      projectId,
      status,
      dueDate: savedDueDate,
      scheduledTime,
      durationMinutes,
      recurrence,
      recurrenceDays: recurrence === "weekly" ? recurrenceDays : undefined,
      recurrenceEndDate: task?.recurrenceEndDate,
      excludedDates: task?.excludedDates ?? [],
      location: location.trim() || undefined,
      travelTimeMinutes: Number.isFinite(travelTimeMinutes) && (travelTimeMinutes ?? 0) > 0 ? travelTimeMinutes : undefined,
      reminderMinutes: Number.isFinite(reminderMinutes) && (reminderMinutes ?? -1) >= 0 ? reminderMinutes : undefined,
      completedAt: status === "completed" ? (task?.completedAt ?? new Date().toISOString()) : undefined,
      completedDates: task?.completedDates ?? [],
      order: task?.order,
    };

    if (task) updateTask(task.id, payload);
    else addTask(payload);
    onClose();
  }

  function addSubtask() {
    const title = newSubtask.trim();
    if (!title) return;
    setSubtasks((current) => [...current, { id: crypto.randomUUID(), title }]);
    setNewSubtask("");
  }

  function toggleRecurrenceDay(day: number) {
    setRecurrenceDays((days) => days.includes(day) ? days.filter((item) => item !== day) : [...days, day].sort());
  }

  function handleDeleteClick() {
    if (!task) return;
    if (task.recurrence !== "none" || task.scheduledTime) {
      setDeletePrompt(true);
      return;
    }
    if (confirm("Delete this task?")) {
      deleteTask(task.id);
      onClose();
    }
  }

  function deleteOccurrenceOnly() {
    if (!task) return;
    const date = occurrenceDate ?? defaultDate ?? dateKey();
    updateTask(task.id, { excludedDates: [...new Set([...(task.excludedDates ?? []), date])] });
    onClose();
  }

  function deleteFutureOccurrences() {
    if (!task) return;
    const date = occurrenceDate ?? defaultDate ?? dateKey();
    updateTask(task.id, { recurrenceEndDate: addDays(date, -1) });
    onClose();
  }

  function moveToUnscheduled() {
    if (!task) return;
    updateTask(task.id, { dueDate: occurrenceDate ?? defaultDate ?? task.dueDate ?? dateKey(), scheduledTime: undefined });
    onClose();
  }

  function duplicateCurrentTask() {
    if (!task) return;
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, completedAt: _completedAt, completedDates: _completedDates, order: _order, ...copy } = task;
    addTask({ ...copy, subtasks: (copy.subtasks ?? []).map((item) => ({ ...item, id: crypto.randomUUID() })), status: "todo", completedAt: undefined, completedDates: [] });
    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form key={key} className="modal-card task-composer" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-heading">
          <div><span className="eyebrow">{task ? "TASK DETAILS" : "NEW TASK"}</span><h2>{task ? "Edit task" : "Add task"}</h2></div>
          <button type="button" className="close-button" onClick={onClose} aria-label="Close">×</button>
        </div>

        <label className="field full-field"><span>What do you need to do?</span><input name="title" autoFocus defaultValue={initial.title} placeholder="e.g. Finish report" required /></label>

        <div className="form-grid two">
          <label className="field"><span>Date</span><div className="date-input-row"><input name="dueDate" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />{selectedProjectId && <button type="button" className={dueDate ? "tiny-button" : "tiny-button active"} onClick={() => setDueDate("")}>Undated</button>}</div>{selectedProjectId && !dueDate && recurrence === "none" && <small className="field-help">This task will stay in the project backlog and will not appear on Today until you add a date.</small>}</label>
          <label className="field"><span>Time</span><input name="scheduledTime" type="time" defaultValue={initial.scheduledTime} /></label>
          <label className="field"><span>Category</span><select name="categoryId" defaultValue={initial.categoryId}><option value="">No category</option>{state.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="field"><span>Project</span><select name="projectId" value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}><option value="">No project</option>{state.projects.filter((project) => project.status === "active").map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        </div>

        <button type="button" className="more-options" onClick={() => setShowMore((value) => !value)}>{showMore ? "− Fewer options" : "+ More options"}</button>

        {showMore && (
          <div className="advanced-fields">
            <div className="form-grid two">
              {selectedProjectId && <label className="field"><span>Status</span><select name="status" defaultValue={initial.status}><option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="completed">Completed</option></select></label>}
              <label className="field"><span>Duration</span><div className="duration-input-row"><input type="number" min="0" step="0.25" inputMode="decimal" value={durationValue} onChange={(event) => setDurationValue(event.target.value)} placeholder="No duration" /><select value={durationUnit} onChange={(event) => setDurationUnit(event.target.value as DurationUnit)}><option value="minutes">Minutes</option><option value="hours">Hours</option><option value="days">Days</option></select></div><small className="field-help">Leave the amount blank for no duration.</small></label>
              <label className="field"><span>Repeat</span><select name="recurrence" value={recurrence} onChange={(event) => setRecurrence(event.target.value as Recurrence)}><option value="none">Never</option><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekends">Weekends</option><option value="weekly">Weekly / selected days</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label>
              <label className="field"><span>Reminder</span><select name="reminderMinutes" defaultValue={initial.reminderMinutes == null ? "" : String(initial.reminderMinutes)}><option value="">No reminder</option><option value="0">At start time</option><option value="5">5 minutes before</option><option value="10">10 minutes before</option><option value="15">15 minutes before</option><option value="30">30 minutes before</option><option value="60">1 hour before</option></select></label>
            </div>

            {recurrence === "weekly" && <div className="field full-field repeat-days-field"><span>Repeat on</span><div className="weekday-picker">{weekdays.map(([day, label]) => <label key={day}><input type="checkbox" checked={recurrenceDays.includes(day)} onChange={() => toggleRecurrenceDay(day)} /><span>{label}</span></label>)}</div></div>}

            <div className="form-grid two advanced-second-row">
              <label className="field"><span>Location</span><div className="location-input-row"><input name="location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Optional address or place" />{location.trim() && <a className="map-link-button" href={googleMapsUrl(location.trim())} target="_blank" rel="noreferrer">Maps ↗</a>}</div></label>
              <label className="field"><span>Travel time</span><select name="travelTimeMinutes" defaultValue={initial.travelTimeMinutes ? String(initial.travelTimeMinutes) : ""}><option value="">None</option><option value="10">10 minutes</option><option value="15">15 minutes</option><option value="20">20 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">1 hour</option></select></label>
            </div>
            <div className="task-subtask-editor">
              <div className="task-subtask-heading"><div><span className="eyebrow">SUBTASKS</span><strong>Checklist</strong></div><small>{subtasks.length} item{subtasks.length === 1 ? "" : "s"}</small></div>
              {subtasks.map((subtask, index) => <div className="task-subtask-edit-row" key={subtask.id}><span>{index + 1}</span><input value={subtask.title} onChange={(event) => setSubtasks((items) => items.map((item) => item.id === subtask.id ? { ...item, title: event.target.value } : item))} /><button type="button" className="icon-control" onClick={() => setSubtasks((items) => items.filter((item) => item.id !== subtask.id))}>×</button></div>)}
              <div className="task-subtask-add-row"><input value={newSubtask} onChange={(event) => setNewSubtask(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addSubtask(); } }} placeholder="Add a subtask" /><button type="button" className="soft-button" onClick={addSubtask}>Add</button></div>
            </div>
            <label className="field full-field"><span>Notes</span><textarea name="notes" defaultValue={initial.notes} rows={4} placeholder="Anything you want to remember…" /></label>
          </div>
        )}

        {deletePrompt && task ? (
          <div className="delete-choice-panel">
            <strong>{task.recurrence !== "none" ? "Delete repeating task" : "Remove scheduled task"}</strong>
            <p>{task.recurrence !== "none" ? "Choose whether this applies only to this occurrence or the repeating series." : "You can keep the task on today without a time, or delete it completely."}</p>
            <div className="delete-choice-actions">
              {task.recurrence !== "none" ? <><button type="button" className="soft-button" onClick={deleteOccurrenceOnly}>Delete this event only</button><button type="button" className="soft-button" onClick={deleteFutureOccurrences}>Delete this & future</button><button type="button" className="danger-button" onClick={() => { deleteTask(task.id); onClose(); }}>Delete entire series</button></> : <><button type="button" className="soft-button" onClick={moveToUnscheduled}>Move to unscheduled today</button><button type="button" className="danger-button" onClick={() => { deleteTask(task.id); onClose(); }}>Delete task</button></>}
              <button type="button" className="ghost-button" onClick={() => setDeletePrompt(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="modal-actions">{task ? <div className="modal-secondary-actions"><button type="button" className="danger-button" onClick={handleDeleteClick}>Delete</button><button type="button" className="ghost-button" onClick={duplicateCurrentTask}>Duplicate</button></div> : <span />}<button className="primary-button" type="submit">{task ? "Save changes" : "Add task"}</button></div>
        )}
      </form>
    </div>
  );
}

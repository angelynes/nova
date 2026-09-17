"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNova } from "./nova-provider";
import type { Recurrence, Task, TaskStatus } from "@/lib/nova/types";

export function TaskModal({
  open,
  onClose,
  task,
  defaultDate,
  defaultProjectId,
  defaultTime,
}: {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  defaultDate?: string;
  defaultProjectId?: string;
  defaultTime?: string;
}) {
  const { state, addTask, updateTask, deleteTask } = useNova();
  const [showMore, setShowMore] = useState(Boolean(task));
  useEffect(() => { if (open) setShowMore(Boolean(task)); }, [open, task]);
  const key = `${task?.id ?? "new"}-${defaultDate ?? ""}-${defaultProjectId ?? ""}-${defaultTime ?? ""}`;

  const initial = useMemo(() => ({
    title: task?.title ?? "",
    dueDate: task?.dueDate ?? defaultDate ?? "",
    scheduledTime: task?.scheduledTime ?? defaultTime ?? "",
    durationMinutes: task?.durationMinutes ?? 60,
    categoryId: task?.categoryId ?? state.categories[0]?.id ?? "",
    projectId: task?.projectId ?? defaultProjectId ?? "",
    status: task?.status ?? "todo",
    recurrence: task?.recurrence ?? "none",
    reminderMinutes: task?.reminderMinutes ?? 10,
    location: task?.location ?? "",
    travelTimeMinutes: task?.travelTimeMinutes ?? 0,
    notes: task?.notes ?? "",
  }), [task, defaultDate, defaultProjectId, defaultTime, state.categories]);

  if (!open) return null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") || "").trim();
    if (!title) return;
    const status = String(data.get("status") || "todo") as TaskStatus;
    const recurrence = String(data.get("recurrence") || "none") as Recurrence;
    const dueDate = String(data.get("dueDate") || "") || undefined;
    const scheduledTime = String(data.get("scheduledTime") || "") || undefined;
    const durationRaw = Number(data.get("durationMinutes"));
    const reminderRaw = Number(data.get("reminderMinutes"));
    const travelRaw = Number(data.get("travelTimeMinutes"));
    const payload = {
      title,
      notes: String(data.get("notes") || "").trim() || undefined,
      categoryId: String(data.get("categoryId") || "") || undefined,
      projectId: String(data.get("projectId") || "") || undefined,
      status,
      dueDate,
      scheduledTime,
      durationMinutes: scheduledTime && Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : undefined,
      recurrence,
      location: String(data.get("location") || "").trim() || undefined,
      travelTimeMinutes: Number.isFinite(travelRaw) && travelRaw > 0 ? travelRaw : undefined,
      reminderMinutes: Number.isFinite(reminderRaw) && reminderRaw >= 0 ? reminderRaw : undefined,
      completedAt: status === "completed" ? (task?.completedAt ?? new Date().toISOString()) : undefined,
      completedDates: task?.completedDates ?? [],
    };

    if (task) updateTask(task.id, payload);
    else addTask(payload);
    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form key={key} className="modal-card task-composer" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <span className="eyebrow">{task ? "TASK DETAILS" : "NEW TASK"}</span>
            <h2>{task ? "Edit task" : "Add task"}</h2>
          </div>
          <button type="button" className="close-button" onClick={onClose} aria-label="Close">×</button>
        </div>

        <label className="field full-field">
          <span>What do you need to do?</span>
          <input name="title" autoFocus defaultValue={initial.title} placeholder="e.g. Finish report" required />
        </label>

        <div className="form-grid two">
          <label className="field">
            <span>Date</span>
            <input name="dueDate" type="date" defaultValue={initial.dueDate} />
          </label>
          <label className="field">
            <span>Time</span>
            <input name="scheduledTime" type="time" defaultValue={initial.scheduledTime} />
          </label>
          <label className="field">
            <span>Category</span>
            <select name="categoryId" defaultValue={initial.categoryId}>
              <option value="">No category</option>
              {state.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Project</span>
            <select name="projectId" defaultValue={initial.projectId}>
              <option value="">No project</option>
              {state.projects.filter((project) => project.status === "active").map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
        </div>

        <button type="button" className="more-options" onClick={() => setShowMore((value) => !value)}>
          {showMore ? "− Fewer options" : "+ More options"}
        </button>

        {showMore && (
          <div className="advanced-fields">
            <div className="form-grid two">
              <label className="field">
                <span>Status</span>
                <select name="status" defaultValue={initial.status}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
              <label className="field">
                <span>Duration</span>
                <select name="durationMinutes" defaultValue={String(initial.durationMinutes)}>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                  <option value="180">3 hours</option>
                </select>
              </label>
              <label className="field">
                <span>Repeat</span>
                <select name="recurrence" defaultValue={initial.recurrence}>
                  <option value="none">Never</option>
                  <option value="daily">Daily</option>
                  <option value="weekdays">Weekdays</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
              <label className="field">
                <span>Reminder</span>
                <select name="reminderMinutes" defaultValue={String(initial.reminderMinutes)}>
                  <option value="0">At start time</option>
                  <option value="5">5 minutes before</option>
                  <option value="10">10 minutes before</option>
                  <option value="15">15 minutes before</option>
                  <option value="30">30 minutes before</option>
                  <option value="60">1 hour before</option>
                </select>
              </label>
              <label className="field">
                <span>Location</span>
                <input name="location" defaultValue={initial.location} placeholder="Optional" />
              </label>
              <label className="field">
                <span>Travel time</span>
                <select name="travelTimeMinutes" defaultValue={String(initial.travelTimeMinutes)}>
                  <option value="0">None</option>
                  <option value="10">10 minutes</option>
                  <option value="15">15 minutes</option>
                  <option value="20">20 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 hour</option>
                </select>
              </label>
            </div>
            <label className="field full-field">
              <span>Notes</span>
              <textarea name="notes" defaultValue={initial.notes} rows={4} placeholder="Anything you want to remember…" />
            </label>
          </div>
        )}

        <div className="modal-actions">
          {task ? (
            <button type="button" className="danger-button" onClick={() => { if (confirm("Delete this task?")) { deleteTask(task.id); onClose(); } }}>Delete</button>
          ) : <span />}
          <button className="primary-button" type="submit">{task ? "Save changes" : "Add task"}</button>
        </div>
      </form>
    </div>
  );
}

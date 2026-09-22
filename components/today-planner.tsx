"use client";

import { DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  addDays,
  durationLabel,
  formatLongDate,
  formatTime,
  googleMapsUrl,
  habitOccursOn,
  minutesFromTime,
  parseDateKey,
  taskIsCompletedOn,
  taskOccursOn,
  timeFromMinutes,
  timeRangeLabel,
  zonedNow,
  resolvedTimeZone,
} from "@/lib/nova/date";
import type { Habit, Task } from "@/lib/nova/types";
import { useNova } from "./nova-provider";
import { TaskModal } from "./task-modal";
import { HabitModal } from "./habit-modal";

const HOUR_HEIGHT = 82;

function hourLabel(hour: number) {
  const normalized = ((hour % 24) + 24) % 24;
  const date = new Date(2020, 0, 1, normalized, 0, 0, 0);
  const label = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(date);
  return hour >= 24 ? `${label} +1` : label;
}

function isoParts(value: string, timeZoneSetting: string) {
  const timeZone = resolvedTimeZone(timeZoneSetting);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  return { date: `${pick("year")}-${pick("month")}-${pick("day")}`, time: `${pick("hour")}:${pick("minute")}` };
}

function eventDurationMinutes(start: string, end: string) {
  const minutes = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  return Math.max(15, Number.isFinite(minutes) ? minutes : 30);
}

function habitStreak(completions: string[], today: string) {
  if (!completions.length) return 0;
  const set = new Set(completions);
  let cursor = today;
  let streak = 0;
  if (!set.has(cursor)) cursor = addDays(cursor, -1);
  while (set.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function recurringLabel(task: Task) {
  if (task.recurrence === "weekly" && task.recurrenceDays?.length) return "weekly";
  return task.recurrence.replace("_", " ");
}

export function TodayPlanner() {
  const { state, hydrated, toggleTask, toggleTaskSubtask, updateTask, reorderTask, toggleHabit, toggleHabitSubtask } = useNova();
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = zonedNow(state.settings.timeZone);
  const todayKey = current.dateKey;
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [filter, setFilter] = useState("all");
  const [taskModal, setTaskModal] = useState<{ open: boolean; task?: Task | null; time?: string; occurrenceDate?: string }>({ open: false });
  const [habitModal, setHabitModal] = useState<{ open: boolean; habit?: Habit | null; occurrenceDate?: string }>({ open: false });
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewTaskIds, setReviewTaskIds] = useState<string[]>([]);
  const [reviewSelection, setReviewSelection] = useState<string[]>([]);
  const [reviewDate, setReviewDate] = useState(addDays(todayKey, 1));
  const timelineRef = useRef<HTMLDivElement>(null);
  const didSetInitialDate = useRef(false);

  useEffect(() => {
    if (hydrated && !didSetInitialDate.current) {
      didSetInitialDate.current = true;
      const key = zonedNow(state.settings.timeZone).dateKey;
      setSelectedDate(key);
      setReviewDate(addDays(key, 1));
    }
  }, [hydrated, state.settings.timeZone]);

  useEffect(() => {
    if (searchParams.get("compose") === "task") {
      setTaskModal({ open: true });
      router.replace("/today", { scroll: false });
    }
  }, [searchParams, router]);

  const isToday = selectedDate === todayKey;
  const categoriesById = useMemo(() => new Map(state.categories.map((category) => [category.id, category])), [state.categories]);
  const projectsById = useMemo(() => new Map(state.projects.map((project) => [project.id, project])), [state.projects]);

  const visibleTasks = useMemo(() => state.tasks.filter((task) => {
    const occurs = taskOccursOn(task, selectedDate);
    const overdue = isToday && task.recurrence === "none" && Boolean(task.dueDate) && task.dueDate! < selectedDate && !taskIsCompletedOn(task, selectedDate);
    return occurs || overdue;
  }), [state.tasks, selectedDate, isToday]);

  const filteredTasks = useMemo(() => filter === "all" ? visibleTasks : visibleTasks.filter((task) => task.categoryId === filter), [visibleTasks, filter]);
  const unscheduledTasks = useMemo(() => filteredTasks.filter((task) => !task.scheduledTime).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [filteredTasks]);
  const dayHabits = state.habits.filter((habit) => habitOccursOn(habit, selectedDate));
  const nextDate = addDays(selectedDate, 1);
  const nextDayVisibleEndMinutes = state.settings.dayEndHour >= 24 ? ((state.settings.dayEndHour - 24 + 1) * 60) : 0;
  const sameDayVisibleEndMinutes = state.settings.dayEndHour < 24 ? ((state.settings.dayEndHour + 1) * 60) : 24 * 60;
  const timelineStartClockMinutes = state.settings.dayStartHour * 60;

  const timelineScheduledTasks = [
    ...visibleTasks.filter((task) => {
      const minutes = minutesFromTime(task.scheduledTime);
      return minutes != null && minutes >= timelineStartClockMinutes && minutes < sameDayVisibleEndMinutes;
    }).map((task) => ({ task, occurrenceDate: selectedDate })),
    ...(nextDayVisibleEndMinutes > 0 ? state.tasks.filter((task) => {
      const minutes = minutesFromTime(task.scheduledTime);
      return minutes != null && minutes < nextDayVisibleEndMinutes && taskOccursOn(task, nextDate);
    }).map((task) => ({ task, occurrenceDate: nextDate })) : []),
  ];

  const timelineScheduledHabits = [
    ...dayHabits.filter((habit) => {
      const minutes = minutesFromTime(habit.scheduledTime);
      return minutes != null && minutes >= timelineStartClockMinutes && minutes < sameDayVisibleEndMinutes;
    }).map((habit) => ({ habit, occurrenceDate: selectedDate })),
    ...(nextDayVisibleEndMinutes > 0 ? state.habits.filter((habit) => {
      const minutes = minutesFromTime(habit.scheduledTime);
      return minutes != null && minutes < nextDayVisibleEndMinutes && habitOccursOn(habit, nextDate);
    }).map((habit) => ({ habit, occurrenceDate: nextDate })) : []),
  ];

  const timelineEvents = state.externalEvents.flatMap((event) => {
    const startParts = isoParts(event.start, state.settings.timeZone);
    const minutes = minutesFromTime(startParts.time);
    if (minutes == null) return [];
    if (startParts.date === selectedDate && minutes >= timelineStartClockMinutes && minutes < sameDayVisibleEndMinutes) return [{ event, occurrenceDate: selectedDate }];
    if (nextDayVisibleEndMinutes > 0 && startParts.date === nextDate && minutes < nextDayVisibleEndMinutes) return [{ event, occurrenceDate: nextDate }];
    return [];
  });
  const draggedTask = draggedId ? state.tasks.find((task) => task.id === draggedId) : undefined;

  const completedTaskCount = visibleTasks.filter((task) => taskIsCompletedOn(task, selectedDate)).length;
  const completedHabitCount = dayHabits.filter((habit) => (state.habitCompletions[habit.id] ?? []).includes(selectedDate)).length;
  const progressTotal = visibleTasks.length + dayHabits.length;
  const progressDone = completedTaskCount + completedHabitCount;
  const progressPercent = progressTotal ? Math.round((progressDone / progressTotal) * 100) : 0;
  const unfinished = visibleTasks.filter((task) => !taskIsCompletedOn(task, selectedDate));

  function openReview() {
    const ids = unfinished.map((task) => task.id);
    setReviewTaskIds(ids);
    setReviewSelection(ids);
    setReviewOpen(true);
  }

  useEffect(() => {
    if (!hydrated || !isToday || !unfinished.length) return;
    const dismissed = window.localStorage.getItem(`nova-review-dismissed-${selectedDate}`);
    if (dismissed) return;
    const check = () => {
      const now = zonedNow(state.settings.timeZone);
      const [hh, mm] = state.settings.eveningReviewTime.split(":").map(Number);
      if (now.dateKey === selectedDate && now.minutes >= (hh || 20) * 60 + (mm || 30)) {
        const ids = unfinished.map((task) => task.id);
        setReviewTaskIds(ids);
        setReviewSelection(ids);
        setReviewOpen(true);
        return true;
      }
      return false;
    };
    if (check()) return;
    const timer = window.setInterval(() => { if (check()) window.clearInterval(timer); }, 30_000);
    return () => window.clearInterval(timer);
  }, [hydrated, isToday, selectedDate, state.settings.eveningReviewTime, state.settings.timeZone, unfinished.length]);

  function scheduleAtPosition(event: DragEvent<HTMLDivElement>) {
    if (!draggedId || !timelineRef.current) return;
    event.preventDefault();
    const bounds = timelineRef.current.getBoundingClientRect();
    const y = Math.max(0, Math.min(bounds.height - 1, event.clientY - bounds.top));
    const minutesIntoDay = Math.round((y / HOUR_HEIGHT) * 60 / 15) * 15;
    const maxMinutes = (state.settings.dayEndHour - state.settings.dayStartHour + 1) * 60 - 15;
    const scheduledAbsoluteMinutes = state.settings.dayStartHour * 60 + Math.max(0, Math.min(maxMinutes, minutesIntoDay));
    const dayOffset = Math.floor(scheduledAbsoluteMinutes / (24 * 60));
    updateTask(draggedId, { dueDate: addDays(selectedDate, dayOffset), scheduledTime: timeFromMinutes(scheduledAbsoluteMinutes) });
    setDraggedId(null);
  }

  function unscheduleDragged() {
    if (!draggedId) return;
    updateTask(draggedId, { dueDate: selectedDate, scheduledTime: undefined });
    setDraggedId(null);
  }

  function dropOnTask(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    if (draggedTask?.scheduledTime) updateTask(draggedId, { dueDate: selectedDate, scheduledTime: undefined });
    reorderTask(draggedId, targetId);
    setDraggedId(null);
  }

  function finishReview() {
    window.localStorage.setItem(`nova-review-dismissed-${selectedDate}`, "1");
    setReviewOpen(false);
    setReviewTaskIds([]);
    setReviewSelection([]);
  }

  function applyReview(action: "tomorrow" | "date" | "overdue") {
    if (!reviewSelection.length) return;
    const chosen = new Set(reviewSelection);
    if (action !== "overdue") {
      const destination = action === "tomorrow" ? addDays(selectedDate, 1) : reviewDate;
      reviewSelection.forEach((id) => updateTask(id, { dueDate: destination }));
    }
    const remaining = reviewTaskIds.filter((id) => !chosen.has(id));
    if (!remaining.length) {
      finishReview();
      return;
    }
    setReviewTaskIds(remaining);
    setReviewSelection(remaining);
  }

  function toggleReviewSelection(id: string) {
    setReviewSelection((currentIds) => currentIds.includes(id) ? currentIds.filter((item) => item !== id) : [...currentIds, id]);
  }

  if (!hydrated) return <div className="loading-screen"><span className="brand-mark">NOVA</span><p>Opening your day…</p></div>;

  const hours = Array.from({ length: state.settings.dayEndHour - state.settings.dayStartHour + 1 }, (_, index) => state.settings.dayStartHour + index);
  const grouped = state.categories.map((category) => ({ category, tasks: unscheduledTasks.filter((task) => task.categoryId === category.id) })).filter((group) => group.tasks.length > 0);
  const uncategorized = unscheduledTasks.filter((task) => !task.categoryId || !categoriesById.has(task.categoryId));
  const timelineHeight = hours.length * HOUR_HEIGHT;
  const timelineStartMinutes = state.settings.dayStartHour * 60;
  const liveNow = zonedNow(state.settings.timeZone);

  function timelineStyle(time?: string, duration = 30, occurrenceDate = selectedDate) {
    const clockMinutes = minutesFromTime(time) ?? timelineStartMinutes;
    const dateOffset = occurrenceDate === selectedDate ? 0 : occurrenceDate === nextDate ? 1 : Math.round((parseDateKey(occurrenceDate).getTime() - parseDateKey(selectedDate).getTime()) / 86400000);
    const minutes = clockMinutes + dateOffset * 24 * 60;
    const top = Math.max(0, ((minutes - timelineStartMinutes) / 60) * HOUR_HEIGHT);
    const height = Math.max(44, (duration / 60) * HOUR_HEIGHT - 4);
    return { top: `${top}px`, minHeight: `${height}px` } as React.CSSProperties;
  }

  function isPast(time?: string, durationMinutes?: number, occurrenceDate = selectedDate) {
    if (!time) return false;
    const start = minutesFromTime(time) ?? 0;
    const totalEnd = start + (durationMinutes ?? 0);
    const endDate = addDays(occurrenceDate, Math.floor(totalEnd / (24 * 60)));
    const endMinutes = totalEnd % (24 * 60);
    if (endDate < liveNow.dateKey) return true;
    if (endDate > liveNow.dateKey) return false;
    return liveNow.minutes >= endMinutes;
  }

  function moveInUnscheduled(taskId: string, list: Task[], direction: -1 | 1) {
    const index = list.findIndex((task) => task.id === taskId);
    const target = list[index + direction];
    if (target) reorderTask(taskId, target.id);
  }

  function taskSubtaskDone(task: Task, occurrenceDate = selectedDate) {
    const key = task.recurrence === "none" ? "__task" : occurrenceDate;
    return new Set(state.taskSubtaskCompletions[task.id]?.[key] ?? []);
  }

  function renderUnscheduledTask(task: Task, list: Task[]) {
    const project = task.projectId ? projectsById.get(task.projectId) : undefined;
    const completed = taskIsCompletedOn(task, selectedDate);
    const overdue = Boolean(task.dueDate && task.dueDate < selectedDate && task.recurrence === "none");
    const done = taskSubtaskDone(task);
    return <div className="task-item-stack" key={task.id}>
      <article className="task-row" draggable onDragStart={() => setDraggedId(task.id)} onDragEnd={() => setDraggedId(null)} onDragOver={(event) => { if (draggedId) event.preventDefault(); }} onDrop={(event) => { event.stopPropagation(); dropOnTask(task.id); }}>
        <span className="drag-handle" title="Drag to reorder or schedule">⋮⋮</span>
        <button className={`checkbox ${completed ? "checked" : ""}`} onClick={() => toggleTask(task.id, selectedDate)} aria-label={`Complete ${task.title}`}>{completed ? "✓" : ""}</button>
        <button className="task-copy" onClick={() => setTaskModal({ open: true, task })}><span className={completed ? "task-title complete" : "task-title"}>{task.title}</span><small>{project?.name}{project && overdue ? " · " : ""}{overdue ? "Overdue" : ""}{task.recurrence !== "none" ? `${project || overdue ? " · " : ""}↻ ${recurringLabel(task)}` : ""}{(task.subtasks ?? []).length ? `${project || overdue || task.recurrence !== "none" ? " · " : ""}${done.size}/${task.subtasks!.length} subtasks` : ""}</small></button>
        <span className="task-order-mobile"><button type="button" disabled={list[0]?.id === task.id} onClick={() => moveInUnscheduled(task.id, list, -1)}>↑</button><button type="button" disabled={list[list.length - 1]?.id === task.id} onClick={() => moveInUnscheduled(task.id, list, 1)}>↓</button></span>
        {task.location && <a className="micro-badge" title={task.location} href={googleMapsUrl(task.location)} target="_blank" rel="noreferrer">⌖</a>}
      </article>
      {(task.subtasks ?? []).length > 0 && <div className="task-subtasks-inline">{task.subtasks!.map((subtask) => { const checked = done.has(subtask.id); return <button key={subtask.id} className={checked ? "task-subtask-inline done" : "task-subtask-inline"} onClick={() => toggleTaskSubtask(task.id, subtask.id, selectedDate)}><span>{checked ? "✓" : ""}</span><small>{subtask.title}</small></button>; })}</div>}
    </div>;
  }

  return (
    <>
      <header className="page-header">
        <div><p className="mobile-brand">NOVA</p><span className="eyebrow">TODAY</span><h1>{formatLongDate(selectedDate)}</h1><p className="subtitle">A calmer place for everything your day needs.</p></div>
        <div className="header-actions">{unfinished.length > 0 && <button className="soft-button desktop-only" onClick={openReview}>Evening review · {unfinished.length}</button>}<button className="primary-button" onClick={() => setTaskModal({ open: true })}>＋ Add task</button></div>
      </header>

      <section className="progress-compact">
        <div className="compact-progress-copy"><strong>Today&apos;s progress</strong><span>{progressDone} of {progressTotal} complete</span></div>
        <div className="compact-progress-track" aria-label={`${progressPercent}% complete`}><i style={{ width: `${progressPercent}%` }} /></div>
        <div className="date-switcher"><button onClick={() => setSelectedDate(addDays(selectedDate, -1))}>‹</button><button className="date-today" onClick={() => setSelectedDate(todayKey)}>{isToday ? "Today" : "Back to today"}</button><button onClick={() => setSelectedDate(addDays(selectedDate, 1))}>›</button></div>
      </section>

      <div className="filter-row" role="group" aria-label="Task filters"><button className={filter === "all" ? "filter-chip active" : "filter-chip"} onClick={() => setFilter("all")}>All</button>{state.categories.map((category) => <button key={category.id} className={filter === category.id ? "filter-chip active" : "filter-chip"} onClick={() => setFilter(category.id)}><span className="color-dot" style={{ background: category.color }} />{category.name}</button>)}</div>

      <div className="planner-grid">
        <section className="task-column">
          <div className={`panel task-panel ${draggedTask?.scheduledTime ? "unschedule-drop-ready" : ""}`} onDragOver={(event) => { if (draggedId) event.preventDefault(); }} onDrop={(event) => { if (event.target === event.currentTarget || draggedTask?.scheduledTime) unscheduleDragged(); }}>
            <div className="panel-heading" onDragOver={(event) => { if (draggedTask?.scheduledTime) event.preventDefault(); }} onDrop={unscheduleDragged}><div><h2>Unscheduled</h2><span className="count-pill">{unscheduledTasks.length}</span></div><button className="text-button" onClick={() => setTaskModal({ open: true })}>＋ Add task</button></div>
            {draggedTask?.scheduledTime && <div className="unschedule-drop-hint" onDragOver={(event) => event.preventDefault()} onDrop={unscheduleDragged}>Drop here to move back to unscheduled</div>}
            {unscheduledTasks.length === 0 ? <p className="empty-state" onDragOver={(event) => { if (draggedId) event.preventDefault(); }} onDrop={unscheduleDragged}>Nothing waiting here. Your day has breathing room. ✦</p> : <div className="task-groups">
              {grouped.map(({ category, tasks }) => <div className="task-group" key={category.id}><div className="task-group-heading"><span className="color-dot" style={{ background: category.color }} />{category.name}<small>{tasks.length}</small></div>{tasks.map((task) => renderUnscheduledTask(task, tasks))}</div>)}
              {uncategorized.length > 0 && <div className="task-group"><div className="task-group-heading">Other<small>{uncategorized.length}</small></div>{uncategorized.map((task) => renderUnscheduledTask(task, uncategorized))}</div>}
            </div>}
          </div>

          <div className="panel habit-panel">
            <div className="panel-heading"><div><h2>Habits</h2><span className="count-pill">{dayHabits.length}</span></div><button className="text-button" onClick={() => setHabitModal({ open: true })}>＋ Add routine</button></div>
            {dayHabits.length === 0 ? <p className="empty-state compact">No routines scheduled for this day.</p> : <div className="habit-routine-list">{dayHabits.map((habit) => {
              const completed = (state.habitCompletions[habit.id] ?? []).includes(selectedDate);
              const streak = habitStreak(state.habitCompletions[habit.id] ?? [], todayKey);
              const subtaskDone = new Set(state.habitSubtaskCompletions[habit.id]?.[selectedDate] ?? []);
              return <article className="habit-routine-card" key={habit.id} style={{ "--habit-color": habit.color ?? "#C9B7F1" } as React.CSSProperties}>
                <div className="habit-routine-main"><button className={`checkbox habit-checkbox ${completed ? "checked" : ""}`} onClick={() => toggleHabit(habit.id, selectedDate)}>{completed ? "✓" : ""}</button><button className="task-copy" onClick={() => setHabitModal({ open: true, habit })}><span className={completed ? "complete" : ""}>{habit.name}</span><small>{habit.scheduledTime ? `${formatTime(habit.scheduledTime)}${habit.durationMinutes ? ` · ${durationLabel(habit.durationMinutes)}` : ""}` : "Unscheduled"}{streak > 0 ? ` · ✦ ${streak} day streak` : ""}</small></button>{habit.scheduledTime && <span className="habit-scheduled-badge">Scheduled</span>}</div>
                {(habit.subtasks ?? []).length > 0 && <div className="habit-subtasks">{habit.subtasks!.map((subtask) => { const done = subtaskDone.has(subtask.id); return <button key={subtask.id} className={done ? "habit-subtask done" : "habit-subtask"} onClick={() => toggleHabitSubtask(habit.id, subtask.id, selectedDate)}><span>{done ? "✓" : ""}</span><small>{subtask.title}</small></button>; })}</div>}
              </article>;
            })}</div>}
          </div>
        </section>

        <section className="panel timeline-panel">
          <div className="timeline-toolbar"><div><span className="eyebrow">SCHEDULE</span><strong>{parseDateKey(selectedDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</strong><small className="timezone-note">{resolvedTimeZone(state.settings.timeZone)}</small></div><button className="text-button" onClick={() => setTaskModal({ open: true, time: "09:00" })}>＋ Schedule</button></div>
          <div className={`timeline-canvas ${draggedId ? "drop-ready" : ""}`} ref={timelineRef} style={{ height: `${timelineHeight}px`, "--hour-height": `${HOUR_HEIGHT}px` } as React.CSSProperties} onDragOver={(event) => { if (draggedId) event.preventDefault(); }} onDrop={scheduleAtPosition}>
            <div className="timeline-grid" aria-hidden="true">{hours.map((hour) => <div className="timeline-grid-row" key={hour} style={{ height: `${HOUR_HEIGHT}px` }}><time>{hourLabel(hour)}</time><span /></div>)}</div>
            <div className="timeline-events">
              {timelineEvents.map(({ event, occurrenceDate }) => {
                const startParts = isoParts(event.start, state.settings.timeZone);
                const endParts = isoParts(event.end, state.settings.timeZone);
                const duration = eventDurationMinutes(event.start, event.end);
                const past = new Date(event.end).getTime() <= Date.now();
                return <article className={`timeline-positioned calendar-event positioned-event ${past ? "past-event" : ""}`} key={event.id} style={timelineStyle(startParts.time, duration, occurrenceDate)}><div className="event-copy"><strong>{event.title}</strong><small>{formatTime(startParts.time)} - {formatTime(endParts.time)}</small></div><div className="event-right-meta">{event.location && <a href={googleMapsUrl(event.location)} target="_blank" rel="noreferrer">⌖ {event.location} ↗</a>}{event.notes && <span>Notes</span>}<small>{event.calendarName ?? "Calendar"}</small></div></article>;
              })}

              {timelineScheduledTasks.map(({ task, occurrenceDate }) => {
                const completed = taskIsCompletedOn(task, occurrenceDate);
                const category = task.categoryId ? categoriesById.get(task.categoryId) : undefined;
                const visualDuration = task.durationMinutes ?? 30;
                const past = isPast(task.scheduledTime, task.durationMinutes, occurrenceDate);
                const subtaskDone = taskSubtaskDone(task, occurrenceDate);
                return <article className={`timeline-positioned task-event positioned-event ${past && !completed ? "past-event" : ""}`} draggable key={`${task.id}-${occurrenceDate}`} onDragStart={(event) => { event.stopPropagation(); setDraggedId(task.id); }} onDragEnd={() => setDraggedId(null)} onClick={() => setTaskModal({ open: true, task, occurrenceDate })} style={{ ...timelineStyle(task.scheduledTime, visualDuration, occurrenceDate), "--event-color": category?.color ?? "#B29CE4" } as React.CSSProperties}>
                  <button className="event-check" onClick={(event) => { event.stopPropagation(); toggleTask(task.id, occurrenceDate); }}>{completed ? "✓" : "○"}</button>
                  <span className="event-copy"><strong className={completed || past ? "complete" : ""}>{task.title}</strong><small>{timeRangeLabel(task.scheduledTime, task.durationMinutes)}{task.travelTimeMinutes ? ` · ${task.travelTimeMinutes} min travel` : ""}</small></span>
                  <span className="event-right-meta"><span className="event-duration">{durationLabel(task.durationMinutes)}</span>{(task.subtasks ?? []).length > 0 && <span>{subtaskDone.size}/{task.subtasks!.length} subtasks</span>}{task.location && <a href={googleMapsUrl(task.location)} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>⌖ {task.location} ↗</a>}{task.notes && <span>Notes</span>}</span>
                </article>;
              })}

              {timelineScheduledHabits.map(({ habit, occurrenceDate }) => {
                const completed = (state.habitCompletions[habit.id] ?? []).includes(occurrenceDate);
                const visualDuration = habit.durationMinutes ?? 30;
                return <article className="timeline-positioned habit-event positioned-event" key={`${habit.id}-${occurrenceDate}`} style={{ ...timelineStyle(habit.scheduledTime, visualDuration, occurrenceDate), "--habit-color": habit.color ?? "#C9B7F1" } as React.CSSProperties}><button className="event-check" onClick={() => toggleHabit(habit.id, occurrenceDate)}>{completed ? "✓" : "◇"}</button><button className="event-copy event-copy-button" onClick={() => setHabitModal({ open: true, habit, occurrenceDate })}><strong className={completed ? "complete" : ""}>{habit.name}</strong><small>{timeRangeLabel(habit.scheduledTime, habit.durationMinutes)} · routine</small></button><span className="event-right-meta"><span className="event-duration">{durationLabel(habit.durationMinutes)}</span></span></article>;
              })}
            </div>
            {draggedId && <div className="timeline-drop-overlay"><span>Drop anywhere · snaps to 15 minutes</span></div>}
          </div>
        </section>
      </div>

      <button className="mobile-fab" aria-label="Add task" onClick={() => setTaskModal({ open: true })}>＋</button>
      <TaskModal open={taskModal.open} onClose={() => setTaskModal({ open: false })} task={taskModal.task} defaultDate={selectedDate} defaultTime={taskModal.time} occurrenceDate={taskModal.occurrenceDate ?? selectedDate} />
      <HabitModal open={habitModal.open} onClose={() => setHabitModal({ open: false })} habit={habitModal.habit} occurrenceDate={habitModal.occurrenceDate ?? selectedDate} />

      {reviewOpen && reviewTaskIds.length > 0 && <div className="modal-backdrop"><div className="modal-card review-card review-card-bulk">
        <div className="modal-heading"><div><span className="eyebrow">EVENING REVIEW</span><h2>Wrap up your day</h2><p className="subtitle">Select one or more unfinished tasks, then move them together.</p></div><button className="close-button" onClick={finishReview}>×</button></div>
        <div className="review-select-toolbar"><button className="text-button" onClick={() => setReviewSelection(reviewSelection.length === reviewTaskIds.length ? [] : [...reviewTaskIds])}>{reviewSelection.length === reviewTaskIds.length ? "Clear selection" : "Select all"}</button><span>{reviewSelection.length} selected · {reviewTaskIds.length} remaining</span></div>
        <div className="review-task-list">{reviewTaskIds.map((id) => { const task = state.tasks.find((item) => item.id === id); if (!task) return null; const selected = reviewSelection.includes(id); return <button className={selected ? "review-list-item selected" : "review-list-item"} key={id} onClick={() => toggleReviewSelection(id)}><span className={`mini-check ${selected ? "checked" : ""}`}>{selected ? "✓" : ""}</span><span><strong>{task.title}</strong><small>{task.scheduledTime ? timeRangeLabel(task.scheduledTime, task.durationMinutes) : task.projectId ? projectsById.get(task.projectId)?.name : categoriesById.get(task.categoryId ?? "")?.name ?? "Unscheduled"}</small></span></button>; })}</div>
        <div className="review-bulk-actions"><button className="soft-button" disabled={!reviewSelection.length} onClick={() => applyReview("tomorrow")}>Move selected to tomorrow</button><div className="review-date-action"><input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} /><button className="soft-button" disabled={!reviewSelection.length} onClick={() => applyReview("date")}>Move selected</button></div><button className="ghost-button" disabled={!reviewSelection.length} onClick={() => applyReview("overdue")}>Keep selected overdue</button></div>
      </div></div>}
    </>
  );
}

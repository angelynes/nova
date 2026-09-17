"use client";

import { DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addDays, dateKey, formatLongDate, formatTime, habitOccursOn, minutesFromTime, parseDateKey, taskIsCompletedOn, taskOccursOn, timeFromMinutes } from "@/lib/nova/date";
import type { Habit, Task } from "@/lib/nova/types";
import { useNova } from "./nova-provider";
import { TaskModal } from "./task-modal";
import { HabitModal } from "./habit-modal";

const HOUR_HEIGHT = 82;

function hourLabel(hour: number) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(date);
}

function eventDateKey(value: string) {
  const date = new Date(value);
  return dateKey(date);
}

function timeFromIso(value: string) {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function eventDurationMinutes(start: string, end: string) {
  const minutes = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  return Math.max(15, Number.isFinite(minutes) ? minutes : 30);
}

function habitStreak(completions: string[]) {
  if (!completions.length) return 0;
  const set = new Set(completions);
  let cursor = dateKey();
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
  const { state, hydrated, toggleTask, updateTask, reorderTask, toggleHabit } = useNova();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(dateKey());
  const [filter, setFilter] = useState("all");
  const [taskModal, setTaskModal] = useState<{ open: boolean; task?: Task | null; time?: string }>({ open: false });
  const [habitModal, setHabitModal] = useState<{ open: boolean; habit?: Habit | null }>({ open: false });
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewQueue, setReviewQueue] = useState<string[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewDate, setReviewDate] = useState(addDays(dateKey(), 1));
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchParams.get("compose") === "task") {
      setTaskModal({ open: true });
      router.replace("/today", { scroll: false });
    }
  }, [searchParams, router]);

  const isToday = selectedDate === dateKey();
  const categoriesById = useMemo(() => new Map(state.categories.map((category) => [category.id, category])), [state.categories]);
  const projectsById = useMemo(() => new Map(state.projects.map((project) => [project.id, project])), [state.projects]);

  const visibleTasks = useMemo(() => state.tasks.filter((task) => {
    const occurs = taskOccursOn(task, selectedDate);
    const overdue = isToday && task.recurrence === "none" && Boolean(task.dueDate) && task.dueDate! < selectedDate && !taskIsCompletedOn(task, selectedDate);
    return occurs || overdue;
  }), [state.tasks, selectedDate, isToday]);

  const filteredTasks = useMemo(() => filter === "all" ? visibleTasks : visibleTasks.filter((task) => task.categoryId === filter), [visibleTasks, filter]);
  const unscheduledTasks = useMemo(() => filteredTasks.filter((task) => !task.scheduledTime).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [filteredTasks]);
  const scheduledTasks = visibleTasks.filter((task) => Boolean(task.scheduledTime));
  const dayHabits = state.habits.filter((habit) => habitOccursOn(habit, selectedDate));
  const unscheduledHabits = dayHabits.filter((habit) => !habit.scheduledTime);
  const scheduledHabits = dayHabits.filter((habit) => Boolean(habit.scheduledTime));
  const dayEvents = state.externalEvents.filter((event) => eventDateKey(event.start) === selectedDate);
  const draggedTask = draggedId ? state.tasks.find((task) => task.id === draggedId) : undefined;

  const completedTaskCount = visibleTasks.filter((task) => taskIsCompletedOn(task, selectedDate)).length;
  const completedHabitCount = dayHabits.filter((habit) => (state.habitCompletions[habit.id] ?? []).includes(selectedDate)).length;
  const progressTotal = visibleTasks.length + dayHabits.length;
  const progressDone = completedTaskCount + completedHabitCount;
  const progressPercent = progressTotal ? Math.round((progressDone / progressTotal) * 100) : 0;

  const unfinished = visibleTasks.filter((task) => !taskIsCompletedOn(task, selectedDate));

  useEffect(() => {
    if (!hydrated || !isToday || !unfinished.length) return;
    const dismissed = window.localStorage.getItem(`nova-review-dismissed-${selectedDate}`);
    if (dismissed) return;
    const timer = window.setInterval(() => {
      const now = new Date();
      const [hh, mm] = state.settings.eveningReviewTime.split(":").map(Number);
      if (now.getHours() * 60 + now.getMinutes() >= (hh || 20) * 60 + (mm || 30)) {
        const queue = unfinished.map((task) => task.id);
        setReviewQueue(queue);
        setReviewTotal(queue.length);
        setReviewOpen(true);
        window.clearInterval(timer);
      }
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [hydrated, isToday, selectedDate, state.settings.eveningReviewTime, unfinished.length]);

  function scheduleAtPosition(event: DragEvent<HTMLDivElement>) {
    if (!draggedId || !timelineRef.current) return;
    event.preventDefault();
    const bounds = timelineRef.current.getBoundingClientRect();
    const y = Math.max(0, Math.min(bounds.height - 1, event.clientY - bounds.top));
    const minutesIntoDay = Math.round((y / HOUR_HEIGHT) * 60 / 15) * 15;
    const maxMinutes = (state.settings.dayEndHour - state.settings.dayStartHour + 1) * 60 - 15;
    const scheduledMinutes = state.settings.dayStartHour * 60 + Math.max(0, Math.min(maxMinutes, minutesIntoDay));
    updateTask(draggedId, { dueDate: selectedDate, scheduledTime: timeFromMinutes(scheduledMinutes) });
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

  function advanceReview() {
    if (reviewQueue.length <= 1) finishReview();
    else setReviewQueue((queue) => queue.slice(1));
  }

  function reviewMove(date: string) {
    const taskId = reviewQueue[0];
    if (!taskId) return;
    updateTask(taskId, { dueDate: date });
    advanceReview();
  }

  function reviewKeep() { advanceReview(); }

  function finishReview() {
    window.localStorage.setItem(`nova-review-dismissed-${selectedDate}`, "1");
    setReviewOpen(false);
    setReviewQueue([]);
    setReviewTotal(0);
  }

  if (!hydrated) return <div className="loading-screen"><span className="brand-mark">NOVA</span><p>Opening your day…</p></div>;

  const hours = Array.from({ length: state.settings.dayEndHour - state.settings.dayStartHour + 1 }, (_, index) => state.settings.dayStartHour + index);
  const grouped = state.categories.map((category) => ({ category, tasks: unscheduledTasks.filter((task) => task.categoryId === category.id) })).filter((group) => group.tasks.length > 0);
  const uncategorized = unscheduledTasks.filter((task) => !task.categoryId || !categoriesById.has(task.categoryId));
  const timelineHeight = hours.length * HOUR_HEIGHT;
  const timelineStartMinutes = state.settings.dayStartHour * 60;

  function timelineStyle(time?: string, duration = 30) {
    const minutes = minutesFromTime(time) ?? timelineStartMinutes;
    const top = Math.max(0, ((minutes - timelineStartMinutes) / 60) * HOUR_HEIGHT);
    const height = Math.max(44, (duration / 60) * HOUR_HEIGHT - 4);
    return { top: `${top}px`, minHeight: `${height}px` } as React.CSSProperties;
  }

  function moveInUnscheduled(taskId: string, list: Task[], direction: -1 | 1) {
    const index = list.findIndex((task) => task.id === taskId);
    const target = list[index + direction];
    if (target) reorderTask(taskId, target.id);
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="mobile-brand">NOVA</p>
          <span className="eyebrow">TODAY</span>
          <h1>{formatLongDate(selectedDate)}</h1>
          <p className="subtitle">A calmer place for everything your day needs.</p>
        </div>
        <div className="header-actions">
          {unfinished.length > 0 && <button className="soft-button desktop-only" onClick={() => { const queue = unfinished.map((task) => task.id); setReviewQueue(queue); setReviewTotal(queue.length); setReviewOpen(true); }}>Evening review · {unfinished.length}</button>}
          <button className="primary-button" onClick={() => setTaskModal({ open: true })}>＋ Add task</button>
        </div>
      </header>

      <section className="progress-compact">
        <div className="compact-progress-copy"><strong>Today&apos;s progress</strong><span>{progressDone} of {progressTotal} complete</span></div>
        <div className="compact-progress-track" aria-label={`${progressPercent}% complete`}><i style={{ width: `${progressPercent}%` }} /></div>
        <div className="date-switcher">
          <button onClick={() => setSelectedDate(addDays(selectedDate, -1))}>‹</button>
          <button className="date-today" onClick={() => setSelectedDate(dateKey())}>{isToday ? "Today" : "Back to today"}</button>
          <button onClick={() => setSelectedDate(addDays(selectedDate, 1))}>›</button>
        </div>
      </section>

      <div className="filter-row" role="group" aria-label="Task filters">
        <button className={filter === "all" ? "filter-chip active" : "filter-chip"} onClick={() => setFilter("all")}>All</button>
        {state.categories.map((category) => <button key={category.id} className={filter === category.id ? "filter-chip active" : "filter-chip"} onClick={() => setFilter(category.id)}><span className="color-dot" style={{ background: category.color }} />{category.name}</button>)}
      </div>

      <div className="planner-grid">
        <section className="task-column">
          <div
            className={`panel task-panel ${draggedTask?.scheduledTime ? "unschedule-drop-ready" : ""}`}
            onDragOver={(event) => { if (draggedId) event.preventDefault(); }}
            onDrop={(event) => { if (event.target === event.currentTarget || draggedTask?.scheduledTime) unscheduleDragged(); }}
          >
            <div className="panel-heading" onDragOver={(event) => { if (draggedTask?.scheduledTime) event.preventDefault(); }} onDrop={unscheduleDragged}>
              <div><h2>Unscheduled</h2><span className="count-pill">{unscheduledTasks.length}</span></div>
              <button className="text-button" onClick={() => setTaskModal({ open: true })}>＋ Add task</button>
            </div>
            {draggedTask?.scheduledTime && <div className="unschedule-drop-hint" onDragOver={(event) => event.preventDefault()} onDrop={unscheduleDragged}>Drop here to move back to unscheduled</div>}

            {unscheduledTasks.length === 0 ? <p className="empty-state" onDragOver={(event) => { if (draggedId) event.preventDefault(); }} onDrop={unscheduleDragged}>Nothing waiting here. Your day has breathing room. ✦</p> : (
              <div className="task-groups">
                {grouped.map(({ category, tasks }) => (
                  <div className="task-group" key={category.id}>
                    <div className="task-group-heading"><span className="color-dot" style={{ background: category.color }} />{category.name}<small>{tasks.length}</small></div>
                    {tasks.map((task) => {
                      const project = task.projectId ? projectsById.get(task.projectId) : undefined;
                      const completed = taskIsCompletedOn(task, selectedDate);
                      const overdue = Boolean(task.dueDate && task.dueDate < selectedDate && task.recurrence === "none");
                      return <article key={task.id} className="task-row" draggable onDragStart={() => setDraggedId(task.id)} onDragEnd={() => setDraggedId(null)} onDragOver={(event) => { if (draggedId) event.preventDefault(); }} onDrop={(event) => { event.stopPropagation(); dropOnTask(task.id); }}>
                        <span className="drag-handle" title="Drag to reorder or schedule">⋮⋮</span>
                        <button className={`checkbox ${completed ? "checked" : ""}`} onClick={() => toggleTask(task.id, selectedDate)} aria-label={`Complete ${task.title}`}>{completed ? "✓" : ""}</button>
                        <button className="task-copy" onClick={() => setTaskModal({ open: true, task })}>
                          <span className={completed ? "task-title complete" : "task-title"}>{task.title}</span>
                          <small>{project?.name}{project && overdue ? " · " : ""}{overdue ? "Overdue" : ""}{task.recurrence !== "none" ? `${project || overdue ? " · " : ""}↻ ${recurringLabel(task)}` : ""}</small>
                        </button>
                        <span className="task-order-mobile"><button type="button" disabled={tasks[0]?.id === task.id} onClick={() => moveInUnscheduled(task.id, tasks, -1)} aria-label={`Move ${task.title} up`}>↑</button><button type="button" disabled={tasks[tasks.length - 1]?.id === task.id} onClick={() => moveInUnscheduled(task.id, tasks, 1)} aria-label={`Move ${task.title} down`}>↓</button></span>
                        {task.location && <span className="micro-badge" title={task.location}>⌖</span>}
                      </article>;
                    })}
                  </div>
                ))}
                {uncategorized.length > 0 && <div className="task-group"><div className="task-group-heading">Other<small>{uncategorized.length}</small></div>{uncategorized.map((task) => {
                  const completed = taskIsCompletedOn(task, selectedDate);
                  return <article key={task.id} className="task-row" draggable onDragStart={() => setDraggedId(task.id)} onDragEnd={() => setDraggedId(null)} onDragOver={(event) => { if (draggedId) event.preventDefault(); }} onDrop={(event) => { event.stopPropagation(); dropOnTask(task.id); }}><span className="drag-handle">⋮⋮</span><button className={`checkbox ${completed ? "checked" : ""}`} onClick={() => toggleTask(task.id, selectedDate)}>{completed ? "✓" : ""}</button><button className="task-copy" onClick={() => setTaskModal({ open: true, task })}><span className={completed ? "task-title complete" : "task-title"}>{task.title}</span></button><span className="task-order-mobile"><button type="button" disabled={uncategorized[0]?.id === task.id} onClick={() => moveInUnscheduled(task.id, uncategorized, -1)}>↑</button><button type="button" disabled={uncategorized[uncategorized.length - 1]?.id === task.id} onClick={() => moveInUnscheduled(task.id, uncategorized, 1)}>↓</button></span></article>;
                })}</div>}
              </div>
            )}
          </div>

          <div className="panel habit-panel">
            <div className="panel-heading"><div><h2>Habits</h2><span className="count-pill">{dayHabits.length}</span></div><button className="text-button" onClick={() => setHabitModal({ open: true })}>＋ Add habit</button></div>
            {unscheduledHabits.length === 0 ? <p className="empty-state compact">Scheduled habits appear on your timeline.</p> : unscheduledHabits.map((habit) => {
              const completed = (state.habitCompletions[habit.id] ?? []).includes(selectedDate);
              const streak = habitStreak(state.habitCompletions[habit.id] ?? []);
              return <div className="habit-row" key={habit.id}><button className={`checkbox ${completed ? "checked" : ""}`} onClick={() => toggleHabit(habit.id, selectedDate)}>{completed ? "✓" : ""}</button><button className="task-copy" onClick={() => setHabitModal({ open: true, habit })}><span className={completed ? "complete" : ""}>{habit.name}</span><small>{streak > 0 ? `✦ ${streak} day streak` : "habit"}</small></button></div>;
            })}
          </div>
        </section>

        <section className="panel timeline-panel">
          <div className="timeline-toolbar"><div><span className="eyebrow">SCHEDULE</span><strong>{parseDateKey(selectedDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</strong></div><button className="text-button" onClick={() => setTaskModal({ open: true, time: "09:00" })}>＋ Schedule</button></div>
          <div className={`timeline-canvas ${draggedId ? "drop-ready" : ""}`} ref={timelineRef} style={{ height: `${timelineHeight}px`, "--hour-height": `${HOUR_HEIGHT}px` } as React.CSSProperties} onDragOver={(event) => { if (draggedId) event.preventDefault(); }} onDrop={scheduleAtPosition}>
            <div className="timeline-grid" aria-hidden="true">
              {hours.map((hour) => <div className="timeline-grid-row" key={hour} style={{ height: `${HOUR_HEIGHT}px` }}><time>{hourLabel(hour)}</time><span /></div>)}
            </div>

            <div className="timeline-events">
              {dayEvents.map((event) => {
                const start = timeFromIso(event.start);
                const duration = eventDurationMinutes(event.start, event.end);
                return <div className="timeline-positioned calendar-event positioned-event" key={event.id} style={timelineStyle(start, duration)}><div className="event-copy"><strong>{event.title}</strong><small>{formatTime(start)} – {formatTime(timeFromIso(event.end))}</small></div><div className="event-right-meta">{event.location && <span>⌖ {event.location}</span>}{event.notes && <span>Notes</span>}<small>{event.calendarName ?? "Calendar"}</small></div></div>;
              })}

              {scheduledTasks.map((task) => {
                const completed = taskIsCompletedOn(task, selectedDate);
                const category = task.categoryId ? categoriesById.get(task.categoryId) : undefined;
                const duration = task.durationMinutes ?? 30;
                return <button className="timeline-positioned task-event positioned-event" draggable key={task.id} onDragStart={(event) => { event.stopPropagation(); setDraggedId(task.id); }} onDragEnd={() => setDraggedId(null)} onClick={() => setTaskModal({ open: true, task })} style={{ ...timelineStyle(task.scheduledTime, duration), "--event-color": category?.color ?? "#B29CE4" } as React.CSSProperties}>
                  <span className="event-check" onClick={(event) => { event.stopPropagation(); toggleTask(task.id, selectedDate); }}>{completed ? "✓" : "○"}</span>
                  <span className="event-copy"><strong className={completed ? "complete" : ""}>{task.title}</strong><small>{formatTime(task.scheduledTime)}{task.durationMinutes ? ` · ${task.durationMinutes} min` : ""}{task.travelTimeMinutes ? ` · ${task.travelTimeMinutes} min travel` : ""}</small></span>
                  <span className="event-right-meta">{task.location && <span>⌖ {task.location}</span>}{task.notes && <span>Notes</span>}</span>
                </button>;
              })}

              {scheduledHabits.map((habit) => {
                const completed = (state.habitCompletions[habit.id] ?? []).includes(selectedDate);
                return <div className="timeline-positioned habit-event positioned-event" key={habit.id} style={timelineStyle(habit.scheduledTime, 30)}><button className="event-check" onClick={() => toggleHabit(habit.id, selectedDate)}>{completed ? "✓" : "◇"}</button><button className="event-copy event-copy-button" onClick={() => setHabitModal({ open: true, habit })}><strong className={completed ? "complete" : ""}>{habit.name}</strong><small>{formatTime(habit.scheduledTime)} · habit</small></button></div>;
              })}
            </div>

            {draggedId && <div className="timeline-drop-overlay"><span>Drop anywhere · snaps to 15 minutes</span></div>}
          </div>
        </section>
      </div>

      <button className="mobile-fab" aria-label="Add task" onClick={() => setTaskModal({ open: true })}>＋</button>
      <TaskModal open={taskModal.open} onClose={() => setTaskModal({ open: false })} task={taskModal.task} defaultDate={selectedDate} defaultTime={taskModal.time} occurrenceDate={selectedDate} />
      <HabitModal open={habitModal.open} onClose={() => setHabitModal({ open: false })} habit={habitModal.habit} occurrenceDate={selectedDate} />

      {reviewOpen && reviewQueue.length > 0 ? (() => { const currentReviewTask = state.tasks.find((task) => task.id === reviewQueue[0]); if (!currentReviewTask) return null; return <div className="modal-backdrop"><div className="modal-card review-card">
        <div className="modal-heading"><div><span className="eyebrow">EVENING REVIEW</span><h2>Wrap up your day</h2></div><button className="close-button" onClick={finishReview}>×</button></div>
        <p className="review-progress">{reviewTotal - reviewQueue.length + 1} of {reviewTotal} unfinished tasks</p>
        <div className="review-task"><span className="review-icon">○</span><strong>{currentReviewTask.title}</strong></div>
        <p className="muted-copy">What would you like NOVA to do with this task?</p>
        <div className="review-actions">
          <button className="soft-button" onClick={() => reviewMove(addDays(selectedDate, 1))}>Move to tomorrow</button>
          <div className="review-date-action"><input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} /><button className="soft-button" onClick={() => reviewMove(reviewDate)}>Move</button></div>
          <button className="ghost-button" onClick={reviewKeep}>Keep overdue</button>
        </div>
      </div></div>; })() : null}
    </>
  );
}

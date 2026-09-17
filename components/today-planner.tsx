"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, dateKey, formatLongDate, formatTime, habitOccursOn, parseDateKey, taskIsCompletedOn, taskOccursOn } from "@/lib/nova/date";
import type { Habit, Task } from "@/lib/nova/types";
import { useNova } from "./nova-provider";
import { TaskModal } from "./task-modal";
import { HabitModal } from "./habit-modal";

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

export function TodayPlanner() {
  const { state, hydrated, toggleTask, updateTask, toggleHabit } = useNova();
  const [selectedDate, setSelectedDate] = useState(dateKey());
  const [filter, setFilter] = useState("all");
  const [taskModal, setTaskModal] = useState<{ open: boolean; task?: Task | null; time?: string }>({ open: false });
  const [habitModal, setHabitModal] = useState<{ open: boolean; habit?: Habit | null }>({ open: false });
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewQueue, setReviewQueue] = useState<string[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewDate, setReviewDate] = useState(addDays(dateKey(), 1));

  const isToday = selectedDate === dateKey();
  const categoriesById = useMemo(() => new Map(state.categories.map((category) => [category.id, category])), [state.categories]);
  const projectsById = useMemo(() => new Map(state.projects.map((project) => [project.id, project])), [state.projects]);

  const visibleTasks = useMemo(() => state.tasks.filter((task) => {
    const occurs = taskOccursOn(task, selectedDate);
    const overdue = isToday && task.recurrence === "none" && Boolean(task.dueDate) && task.dueDate! < selectedDate && !taskIsCompletedOn(task, selectedDate);
    return occurs || overdue;
  }), [state.tasks, selectedDate, isToday]);

  const filteredTasks = useMemo(() => filter === "all" ? visibleTasks : visibleTasks.filter((task) => task.categoryId === filter), [visibleTasks, filter]);
  const unscheduledTasks = filteredTasks.filter((task) => !task.scheduledTime);
  const scheduledTasks = visibleTasks.filter((task) => Boolean(task.scheduledTime));
  const dayHabits = state.habits.filter((habit) => habitOccursOn(habit, selectedDate));
  const unscheduledHabits = dayHabits.filter((habit) => !habit.scheduledTime);
  const scheduledHabits = dayHabits.filter((habit) => Boolean(habit.scheduledTime));
  const dayEvents = state.externalEvents.filter((event) => eventDateKey(event.start) === selectedDate);

  const completedTaskCount = visibleTasks.filter((task) => taskIsCompletedOn(task, selectedDate)).length;
  const completedHabitCount = dayHabits.filter((habit) => (state.habitCompletions[habit.id] ?? []).includes(selectedDate)).length;
  const progressTotal = visibleTasks.length + dayHabits.length;
  const progressDone = completedTaskCount + completedHabitCount;

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

  function scheduleDragged(hour: number) {
    if (!draggedId) return;
    updateTask(draggedId, { dueDate: selectedDate, scheduledTime: `${String(hour).padStart(2, "0")}:00`, durationMinutes: 60 });
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

  function reviewKeep() {
    advanceReview();
  }

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

      <section className="progress-card">
        <div className="progress-main">
          <span className="section-kicker">TODAY&apos;S PROGRESS</span>
          <div className="progress-copy">
            <div className="progress-ring" style={{ "--progress": `${progressTotal ? (progressDone / progressTotal) * 100 : 0}%` } as React.CSSProperties}><span>{progressDone}/{progressTotal}</span></div>
            <div><blockquote>“Make room for what matters, then let the rest feel lighter.”</blockquote><p className="progress-note">Tasks and habits update together across NOVA.</p></div>
          </div>
        </div>
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
          <div className="panel task-panel">
            <div className="panel-heading">
              <div><h2>Unscheduled</h2><span className="count-pill">{unscheduledTasks.length}</span></div>
              <button className="text-button" onClick={() => setTaskModal({ open: true })}>＋ Add task</button>
            </div>

            {unscheduledTasks.length === 0 ? <p className="empty-state">Nothing waiting here. Your day has breathing room. ✦</p> : (
              <div className="task-groups">
                {grouped.map(({ category, tasks }) => (
                  <div className="task-group" key={category.id}>
                    <div className="task-group-heading"><span className="color-dot" style={{ background: category.color }} />{category.name}<small>{tasks.length}</small></div>
                    {tasks.map((task) => {
                      const project = task.projectId ? projectsById.get(task.projectId) : undefined;
                      const completed = taskIsCompletedOn(task, selectedDate);
                      const overdue = Boolean(task.dueDate && task.dueDate < selectedDate && task.recurrence === "none");
                      return <article key={task.id} className="task-row" draggable onDragStart={() => setDraggedId(task.id)} onDragEnd={() => setDraggedId(null)}>
                        <span className="drag-handle">⋮⋮</span>
                        <button className={`checkbox ${completed ? "checked" : ""}`} onClick={() => toggleTask(task.id, selectedDate)} aria-label={`Complete ${task.title}`}>{completed ? "✓" : ""}</button>
                        <button className="task-copy" onClick={() => setTaskModal({ open: true, task })}>
                          <span className={completed ? "task-title complete" : "task-title"}>{task.title}</span>
                          <small>{project?.name}{project && overdue ? " · " : ""}{overdue ? "Overdue" : ""}</small>
                        </button>
                        {task.location && <span className="micro-badge" title={task.location}>⌖</span>}
                      </article>;
                    })}
                  </div>
                ))}
                {uncategorized.length > 0 && <div className="task-group"><div className="task-group-heading">Other<small>{uncategorized.length}</small></div>{uncategorized.map((task) => {
                  const completed = taskIsCompletedOn(task, selectedDate);
                  return <article key={task.id} className="task-row" draggable onDragStart={() => setDraggedId(task.id)} onDragEnd={() => setDraggedId(null)}><span className="drag-handle">⋮⋮</span><button className={`checkbox ${completed ? "checked" : ""}`} onClick={() => toggleTask(task.id, selectedDate)}>{completed ? "✓" : ""}</button><button className="task-copy" onClick={() => setTaskModal({ open: true, task })}><span className={completed ? "task-title complete" : "task-title"}>{task.title}</span></button></article>;
                })}</div>}
              </div>
            )}
          </div>

          <div className="panel habit-panel">
            <div className="panel-heading"><div><h2>Habits</h2><span className="count-pill">{dayHabits.length}</span></div><button className="text-button" onClick={() => setHabitModal({ open: true })}>＋ Add habit</button></div>
            {unscheduledHabits.length === 0 ? <p className="empty-state compact">Scheduled habits appear on your timeline.</p> : unscheduledHabits.map((habit) => {
              const completed = (state.habitCompletions[habit.id] ?? []).includes(selectedDate);
              const streak = habitStreak(state.habitCompletions[habit.id] ?? []);
              return <div className="habit-row" key={habit.id}><button className={`checkbox ${completed ? "checked" : ""}`} onClick={() => toggleHabit(habit.id, selectedDate)}>{completed ? "✓" : ""}</button><button className="task-copy" onClick={() => setHabitModal({ open: true, habit })}><span className={completed ? "complete" : ""}>{habit.name}</span><small>{streak > 0 ? `✦ ${streak} day streak` : habit.frequency}</small></button></div>;
            })}
          </div>
        </section>

        <section className="panel timeline-panel">
          <div className="timeline-toolbar"><div><span className="eyebrow">SCHEDULE</span><strong>{parseDateKey(selectedDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</strong></div><button className="text-button" onClick={() => setTaskModal({ open: true, time: "09:00" })}>＋ Schedule</button></div>
          <div className="timeline">
            {hours.map((hour) => {
              const tasksAtHour = scheduledTasks.filter((task) => Number(task.scheduledTime?.slice(0, 2)) === hour);
              const habitsAtHour = scheduledHabits.filter((habit) => Number(habit.scheduledTime?.slice(0, 2)) === hour);
              const eventsAtHour = dayEvents.filter((event) => new Date(event.start).getHours() === hour);
              return <div className={`time-row ${draggedId ? "drop-ready" : ""}`} key={hour} onDragOver={(e) => e.preventDefault()} onDrop={() => scheduleDragged(hour)}>
                <time>{hourLabel(hour)}</time>
                <div className="time-slot">
                  {eventsAtHour.map((event) => <div className="event-card calendar-event" key={event.id}><strong>{event.title}</strong><span>{formatTime(timeFromIso(event.start))} – {formatTime(timeFromIso(event.end))}</span><small>{event.calendarName ?? "Calendar"}{event.location ? ` · ${event.location}` : ""}</small></div>)}
                  {tasksAtHour.map((task) => {
                    const completed = taskIsCompletedOn(task, selectedDate);
                    const category = task.categoryId ? categoriesById.get(task.categoryId) : undefined;
                    return <button className="event-card task-event" key={task.id} onClick={() => setTaskModal({ open: true, task })} style={{ "--event-color": category?.color ?? "#B29CE4" } as React.CSSProperties}><span className="event-check" onClick={(e) => { e.stopPropagation(); toggleTask(task.id, selectedDate); }}>{completed ? "✓" : "○"}</span><span className="event-copy"><strong className={completed ? "complete" : ""}>{task.title}</strong><small>{formatTime(task.scheduledTime)} · {task.durationMinutes ?? 60} min{task.travelTimeMinutes ? ` · ${task.travelTimeMinutes} min travel` : ""}</small></span></button>;
                  })}
                  {habitsAtHour.map((habit) => {
                    const completed = (state.habitCompletions[habit.id] ?? []).includes(selectedDate);
                    return <button className="event-card habit-event" key={habit.id} onClick={() => toggleHabit(habit.id, selectedDate)}><span className="event-check">{completed ? "✓" : "◇"}</span><span className="event-copy"><strong className={completed ? "complete" : ""}>{habit.name}</strong><small>{formatTime(habit.scheduledTime)} · habit</small></span></button>;
                  })}
                  {draggedId && tasksAtHour.length === 0 && eventsAtHour.length === 0 && habitsAtHour.length === 0 && <div className="drop-hint">Drop task here</div>}
                </div>
              </div>;
            })}
          </div>
        </section>
      </div>

      <button className="mobile-fab" onClick={() => setTaskModal({ open: true })} aria-label="Add task">＋</button>

      <TaskModal open={taskModal.open} onClose={() => setTaskModal({ open: false })} task={taskModal.task} defaultDate={selectedDate} defaultTime={taskModal.time} />
      <HabitModal open={habitModal.open} onClose={() => setHabitModal({ open: false })} habit={habitModal.habit} />

      {reviewOpen && reviewQueue.length > 0 && (() => { const currentReviewTask = state.tasks.find((task) => task.id === reviewQueue[0]); return currentReviewTask ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={finishReview}>
          <div className="modal-card review-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-heading"><div><span className="eyebrow">EVENING REVIEW</span><h2>Wrap up your day</h2></div><button className="close-button" onClick={finishReview}>×</button></div>
            <p className="review-progress">{reviewTotal - reviewQueue.length + 1} of {reviewTotal} unfinished tasks</p>
            <div className="review-task"><span className="review-icon">○</span><strong>{currentReviewTask.title}</strong></div>
            <p className="muted-copy">What would you like NOVA to do with this task?</p>
            <div className="review-actions">
              <button className="soft-button" onClick={() => reviewMove(addDays(selectedDate, 1))}>Move to tomorrow</button>
              <div className="review-date-action"><input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} /><button className="soft-button" onClick={() => reviewMove(reviewDate)}>Move</button></div>
              <button className="ghost-button" onClick={reviewKeep}>Keep overdue</button>
            </div>
          </div>
        </div>
      ) : null; })()}
    </>
  );
}

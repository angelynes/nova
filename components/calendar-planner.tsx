"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { dateKey, formatLongDate, formatTime, getMonthGrid, googleMapsUrl, habitOccursOn, parseDateKey, resolvedTimeZone, sameMonth, taskIsCompletedOn, taskOccursOn, timeRangeLabel, zonedNow } from "@/lib/nova/date";
import { parseIcs } from "@/lib/nova/ics";
import type { Task } from "@/lib/nova/types";
import { useNova } from "./nova-provider";
import { TaskModal } from "./task-modal";

function isoParts(value: string, timeZoneSetting: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: resolvedTimeZone(timeZoneSetting), year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  return { date: `${pick("year")}-${pick("month")}-${pick("day")}`, time: `${pick("hour")}:${pick("minute")}` };
}

export function CalendarPlanner() {
  const { state, hydrated, importExternalEvents, googleCalendarConnected, connectGoogleCalendar, syncGoogleCalendar } = useNova();
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(dateKey());
  const [taskModal, setTaskModal] = useState<{ open: boolean; task?: Task | null }>({ open: false });
  const [importMessage, setImportMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const didInitZone = useRef(false);

  useEffect(() => {
    if (!hydrated || didInitZone.current) return;
    didInitZone.current = true;
    const todayKey = zonedNow(state.settings.timeZone).dateKey;
    setSelectedDate(todayKey);
    setMonth(parseDateKey(todayKey));
  }, [hydrated, state.settings.timeZone]);

  const days = useMemo(() => getMonthGrid(month, state.settings.weekStartsMonday), [month, state.settings.weekStartsMonday]);
  const categoriesById = useMemo(() => new Map(state.categories.map((category) => [category.id, category])), [state.categories]);
  const projectsById = useMemo(() => new Map(state.projects.map((project) => [project.id, project])), [state.projects]);

  const selectedTasks = state.tasks.filter((task) => taskOccursOn(task, selectedDate));
  const selectedHabits = state.habits.filter((habit) => habitOccursOn(habit, selectedDate));
  const selectedEvents = state.externalEvents.filter((event) => isoParts(event.start, state.settings.timeZone).date === selectedDate);

  async function importIcsFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const events = parseIcs(text);
    importExternalEvents(events);
    setImportMessage(events.length ? `Imported ${events.length} Apple/.ics calendar event${events.length === 1 ? "" : "s"}.` : "No supported events were found in that file.");
    event.target.value = "";
  }

  async function googleAction() {
    const result = googleCalendarConnected ? await syncGoogleCalendar() : await connectGoogleCalendar();
    setImportMessage(result.message);
  }

  if (!hydrated) return <div className="loading-screen"><span className="brand-mark">NOVA</span><p>Opening your calendar…</p></div>;

  const weekdayLabels = state.settings.weekStartsMonday ? ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] : ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  return (
    <>
      <header className="page-header">
        <div><p className="mobile-brand">NOVA</p><span className="eyebrow">MONTHLY PLANNER</span><h1>Calendar</h1><p className="subtitle">NOVA tasks, routines and connected calendars in one month.</p></div>
        <div className="header-actions calendar-header-actions"><button className="soft-button" onClick={() => fileRef.current?.click()}> Import Apple/.ics</button><button className={googleCalendarConnected ? "soft-button" : "ghost-button"} onClick={googleAction}>G {googleCalendarConnected ? "Sync Google" : "Connect Google"}</button><button className="primary-button" onClick={() => setTaskModal({ open: true })}>＋ Add task</button><input ref={fileRef} hidden type="file" accept=".ics,text/calendar" onChange={importIcsFile} /></div>
      </header>

      <div className="calendar-connection-strip"><span><i className={`connection-dot ${googleCalendarConnected ? "connected" : ""}`} />Google {googleCalendarConnected ? "connected" : "not connected"}</span><span><i className={state.externalEvents.some((event) => event.source === "ics") ? "connection-dot connected" : "connection-dot"} />Apple/.ics {state.externalEvents.some((event) => event.source === "ics") ? "imported" : "not imported"}</span><small>{resolvedTimeZone(state.settings.timeZone)}</small></div>
      {importMessage && <div className="notice-bar"><span>{importMessage}</span><button onClick={() => setImportMessage("")}>×</button></div>}

      <div className="calendar-layout">
        <section className="panel calendar-panel">
          <div className="calendar-toolbar"><div><button className="icon-control" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button><h2>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2><button className="icon-control" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button></div><button className="soft-button" onClick={() => { const todayKey = zonedNow(state.settings.timeZone).dateKey; setMonth(parseDateKey(todayKey)); setSelectedDate(todayKey); }}>Today</button></div>
          <div className="calendar-weekdays">{weekdayLabels.map((day) => <span key={day}>{day}</span>)}</div>
          <div className="calendar-grid">{days.map((day) => {
            const key = dateKey(day);
            const tasks = state.tasks.filter((task) => taskOccursOn(task, key));
            const events = state.externalEvents.filter((event) => isoParts(event.start, state.settings.timeZone).date === key);
            const habits = state.habits.filter((habit) => habit.scheduledTime && habitOccursOn(habit, key));
            const colors = tasks.map((task) => task.categoryId ? categoriesById.get(task.categoryId)?.color : undefined).filter(Boolean).slice(0, 3) as string[];
            if (events.some((event) => event.source === "google")) colors.push("#4285F4");
            if (events.some((event) => event.source === "ics" || event.source === "apple")) colors.push("#6E5B9A");
            if (habits.length) colors.push(habits[0]?.color ?? "#C9B7F1");
            const selected = key === selectedDate;
            const today = key === zonedNow(state.settings.timeZone).dateKey;
            return <button key={key} className={`calendar-day ${!sameMonth(day, month) ? "outside" : ""} ${selected ? "selected" : ""} ${today ? "today" : ""}`} onClick={() => setSelectedDate(key)}><span className="day-number">{day.getDate()}</span><span className="calendar-dots">{colors.slice(0, 4).map((color, index) => <i key={`${color}-${index}`} style={{ background: color }} />)}</span>{(tasks.length + events.length + habits.length) > 4 && <small>+{tasks.length + events.length + habits.length - 4}</small>}</button>;
          })}</div>
        </section>

        <aside className="panel day-detail-panel">
          <div className="day-detail-header"><div><span className="eyebrow">SELECTED DAY</span><h2>{formatLongDate(selectedDate)}</h2></div><button className="icon-control" onClick={() => setTaskModal({ open: true })}>＋</button></div>

          <div className="day-detail-section"><div className="detail-section-title"><span>Schedule</span><small>{selectedEvents.length + selectedTasks.filter((task) => task.scheduledTime).length}</small></div>
            {selectedEvents.length === 0 && selectedTasks.filter((task) => task.scheduledTime).length === 0 ? <p className="empty-mini">No timed items.</p> : null}
            {[...selectedEvents].sort((a, b) => a.start.localeCompare(b.start)).map((event) => { const start = isoParts(event.start, state.settings.timeZone); const end = isoParts(event.end, state.settings.timeZone); return <div className="detail-event" key={event.id}><time>{formatTime(start.time)}</time><div><strong>{event.title}</strong><small>{event.calendarName ?? "Calendar"} · {formatTime(start.time)} - {formatTime(end.time)}{event.location ? <> · <a href={googleMapsUrl(event.location)} target="_blank" rel="noreferrer">{event.location} ↗</a></> : null}</small></div></div>; })}
            {selectedTasks.filter((task) => task.scheduledTime).sort((a, b) => (a.scheduledTime ?? "").localeCompare(b.scheduledTime ?? "")).map((task) => <button className="detail-event clickable" key={task.id} onClick={() => setTaskModal({ open: true, task })}><time>{formatTime(task.scheduledTime)}</time><div><strong className={taskIsCompletedOn(task, selectedDate) ? "complete" : ""}>{task.title}</strong><small>{timeRangeLabel(task.scheduledTime, task.durationMinutes)} · {task.projectId ? projectsById.get(task.projectId)?.name : categoriesById.get(task.categoryId ?? "")?.name}</small></div></button>)}
          </div>

          <div className="day-detail-section"><div className="detail-section-title"><span>Tasks</span><small>{selectedTasks.filter((task) => !task.scheduledTime).length}</small></div>{selectedTasks.filter((task) => !task.scheduledTime).length === 0 ? <p className="empty-mini">No unscheduled tasks.</p> : selectedTasks.filter((task) => !task.scheduledTime).map((task) => <button className="detail-task" key={task.id} onClick={() => setTaskModal({ open: true, task })}><span className={`mini-check ${taskIsCompletedOn(task, selectedDate) ? "checked" : ""}`}>{taskIsCompletedOn(task, selectedDate) ? "✓" : ""}</span><span><strong className={taskIsCompletedOn(task, selectedDate) ? "complete" : ""}>{task.title}</strong><small>{categoriesById.get(task.categoryId ?? "")?.name ?? "Task"}</small></span></button>)}</div>

          <div className="day-detail-section"><div className="detail-section-title"><span>Habits</span><small>{selectedHabits.length}</small></div>{selectedHabits.length === 0 ? <p className="empty-mini">No routines for this day.</p> : selectedHabits.map((habit) => <div className="detail-task" key={habit.id}><span className={`mini-check ${(state.habitCompletions[habit.id] ?? []).includes(selectedDate) ? "checked" : ""}`}>{(state.habitCompletions[habit.id] ?? []).includes(selectedDate) ? "✓" : ""}</span><span><strong>{habit.name}</strong><small>{habit.scheduledTime ? timeRangeLabel(habit.scheduledTime, habit.durationMinutes) : "Unscheduled"}{habit.subtasks?.length ? ` · ${habit.subtasks.length} items` : ""}</small></span></div>)}</div>
        </aside>
      </div>

      <TaskModal open={taskModal.open} onClose={() => setTaskModal({ open: false })} task={taskModal.task} defaultDate={selectedDate} occurrenceDate={selectedDate} />
    </>
  );
}

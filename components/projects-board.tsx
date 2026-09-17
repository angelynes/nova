"use client";

import { useMemo, useState } from "react";
import type { Project, Task, TaskStatus } from "@/lib/nova/types";
import { formatShortDate, taskIsCompletedOn } from "@/lib/nova/date";
import { useNova } from "./nova-provider";
import { ProjectModal } from "./project-modal";
import { TaskModal } from "./task-modal";

const columns: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "To Do" },
  { status: "in_progress", label: "In Progress" },
  { status: "completed", label: "Completed" },
];

export function ProjectsBoard() {
  const { state, hydrated, setTaskStatus } = useNova();
  const activeProjects = state.projects.filter((project) => project.status === "active");
  const [selectedProjectId, setSelectedProjectId] = useState(() => activeProjects[0]?.id ?? "");
  const [mobileStatus, setMobileStatus] = useState<TaskStatus>("todo");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [projectModal, setProjectModal] = useState<{ open: boolean; project?: Project | null }>({ open: false });
  const [taskModal, setTaskModal] = useState<{ open: boolean; task?: Task | null }>({ open: false });

  const selectedProject = state.projects.find((project) => project.id === selectedProjectId) ?? activeProjects[0];
  const projectTasks = useMemo(() => state.tasks.filter((task) => task.projectId === selectedProject?.id), [state.tasks, selectedProject?.id]);
  const categories = useMemo(() => new Map(state.categories.map((category) => [category.id, category])), [state.categories]);
  const completed = projectTasks.filter((task) => task.status === "completed").length;
  const progress = projectTasks.length ? Math.round((completed / projectTasks.length) * 100) : 0;

  if (!hydrated) return <div className="loading-screen"><span className="brand-mark">NOVA</span><p>Opening your projects…</p></div>;

  function dropStatus(status: TaskStatus) {
    if (!draggedTaskId) return;
    setTaskStatus(draggedTaskId, status);
    setDraggedTaskId(null);
  }

  return (
    <>
      <header className="page-header">
        <div><p className="mobile-brand">NOVA</p><span className="eyebrow">PROJECTS</span><h1>Projects</h1><p className="subtitle">Big things feel lighter when every next step has a home.</p></div>
        <div className="header-actions"><button className="primary-button" onClick={() => setProjectModal({ open: true })}>＋ New project</button></div>
      </header>

      <section className="project-strip">
        {activeProjects.map((project) => {
          const tasks = state.tasks.filter((task) => task.projectId === project.id);
          const done = tasks.filter((task) => task.status === "completed").length;
          const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
          return <button key={project.id} className={`project-summary-card ${selectedProject?.id === project.id ? "active" : ""}`} onClick={() => setSelectedProjectId(project.id)}>
            <span className="project-color" style={{ background: project.color }} />
            <div className="project-summary-copy"><strong>{project.name}</strong><small>{done}/{tasks.length} tasks</small></div>
            <span className="project-mini-progress"><i style={{ width: `${pct}%`, background: project.color }} /></span>
            <b>{pct}%</b>
          </button>;
        })}
        <button className="project-summary-card add-project-card" onClick={() => setProjectModal({ open: true })}><span className="project-add-icon">＋</span><strong>New project</strong></button>
      </section>

      {selectedProject ? (
        <section className="project-workspace">
          <div className="project-heading-row">
            <div><div className="project-title-line"><span className="project-color large" style={{ background: selectedProject.color }} /><h2>{selectedProject.name}</h2><button className="tiny-button" onClick={() => setProjectModal({ open: true, project: selectedProject })}>Edit</button></div><p>{selectedProject.description || "A focused place for this project."}</p></div>
            <div className="project-progress-block"><strong>{progress}%</strong><span>complete</span><div className="project-progress-track"><i style={{ width: `${progress}%`, background: selectedProject.color }} /></div></div>
          </div>

          <div className="mobile-kanban-tabs">{columns.map((column) => <button key={column.status} className={mobileStatus === column.status ? "active" : ""} onClick={() => setMobileStatus(column.status)}>{column.label}<span>{projectTasks.filter((task) => task.status === column.status).length}</span></button>)}</div>

          <div className="kanban-board">
            {columns.map((column) => {
              const tasks = projectTasks.filter((task) => task.status === column.status);
              return <div key={column.status} className={`kanban-column mobile-${column.status} ${mobileStatus !== column.status ? "mobile-hidden" : ""}`} onDragOver={(e) => e.preventDefault()} onDrop={() => dropStatus(column.status)}>
                <div className="kanban-column-header"><div><span className={`status-dot ${column.status}`} />{column.label}<small>{tasks.length}</small></div><button onClick={() => setTaskModal({ open: true })}>＋</button></div>
                <div className="kanban-list">
                  {tasks.map((task) => {
                    const category = task.categoryId ? categories.get(task.categoryId) : undefined;
                    return <article key={task.id} className="kanban-card" draggable onDragStart={() => setDraggedTaskId(task.id)} onDragEnd={() => setDraggedTaskId(null)} onClick={() => setTaskModal({ open: true, task })}>
                      <div className="kanban-card-top">{category ? <span className="category-label" style={{ background: `${category.color}88` }}>{category.name}</span> : <span />}{task.dueDate && <time>{formatShortDate(task.dueDate)}</time>}</div>
                      <h3 className={task.status === "completed" ? "complete" : ""}>{task.title}</h3>
                      {task.notes && <p>{task.notes}</p>}
                      <div className="kanban-meta">{task.scheduledTime && <span>◷ {task.scheduledTime}</span>}{task.location && <span>⌖ {task.location}</span>}{task.recurrence !== "none" && <span>↻ {task.recurrence}</span>}</div>
                    </article>;
                  })}
                  {tasks.length === 0 && <div className="kanban-empty">Drop tasks here</div>}
                </div>
              </div>;
            })}
          </div>
        </section>
      ) : (
        <section className="panel empty-projects"><span className="empty-illustration">✦</span><h2>Create your first project</h2><p>Projects connect directly to Today and Calendar, so you never duplicate a task.</p><button className="primary-button" onClick={() => setProjectModal({ open: true })}>Create project</button></section>
      )}

      <ProjectModal open={projectModal.open} onClose={() => setProjectModal({ open: false })} project={projectModal.project} />
      <TaskModal open={taskModal.open} onClose={() => setTaskModal({ open: false })} task={taskModal.task} defaultProjectId={selectedProject?.id} />
    </>
  );
}

"use client";

import { FormEvent } from "react";
import { useNova } from "./nova-provider";
import type { Project } from "@/lib/nova/types";

export function ProjectModal({ open, onClose, project }: { open: boolean; onClose: () => void; project?: Project | null }) {
  const { addProject, updateProject, deleteProject } = useNova();
  if (!open) return null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    if (!name) return;
    const payload = {
      name,
      description: String(data.get("description") || "").trim() || undefined,
      color: String(data.get("color") || "#B29CE4"),
      status: String(data.get("status") || "active") as Project["status"],
    };
    if (project) updateProject(project.id, payload);
    else addProject(payload);
    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="modal-card" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-heading"><div><span className="eyebrow">PROJECT</span><h2>{project ? "Edit project" : "New project"}</h2></div><button type="button" className="close-button" onClick={onClose}>×</button></div>
        <label className="field full-field"><span>Project name</span><input name="name" defaultValue={project?.name ?? ""} autoFocus required placeholder="e.g. NOVA App" /></label>
        <label className="field full-field"><span>Description</span><textarea name="description" defaultValue={project?.description ?? ""} rows={3} placeholder="What is this project about?" /></label>
        <div className="form-grid two">
          <label className="field"><span>Color</span><input className="color-input" name="color" type="color" defaultValue={project?.color ?? "#B29CE4"} /></label>
          <label className="field"><span>Status</span><select name="status" defaultValue={project?.status ?? "active"}><option value="active">Active</option><option value="archived">Archived</option></select></label>
        </div>
        <div className="modal-actions">{project ? <button type="button" className="danger-button" onClick={() => { if (confirm("Delete this project? Tasks will stay in NOVA without a project.")) { deleteProject(project.id); onClose(); } }}>Delete</button> : <span />}<button className="primary-button" type="submit">{project ? "Save project" : "Create project"}</button></div>
      </form>
    </div>
  );
}

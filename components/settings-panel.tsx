"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { useNova } from "./nova-provider";
import type { Category, NovaState } from "@/lib/nova/types";

export function SettingsPanel() {
  const {
    state,
    hydrated,
    updateSettings,
    addCategory,
    updateCategory,
    deleteCategory,
    importState,
    resetState,
    clearImportedEvents,
    cloudConfigured,
    cloudStatus,
    cloudEmail,
    sendMagicLink,
    signOutCloud,
    syncNow,
  } = useNova();
  const [email, setEmail] = useState("");
  const [cloudMessage, setCloudMessage] = useState("");
  const [newCategory, setNewCategory] = useState({ name: "", color: "#B29CE4" });
  const importRef = useRef<HTMLInputElement>(null);

  if (!hydrated) return <div className="loading-screen"><span className="brand-mark">NOVA</span><p>Opening settings…</p></div>;

  async function enableNotifications() {
    if (!("Notification" in window)) {
      alert("This browser does not support notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    updateSettings({ notificationsEnabled: permission === "granted" });
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nova-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as NovaState;
      importState(parsed);
      alert("NOVA backup restored.");
    } catch {
      alert("That file does not look like a valid NOVA backup.");
    }
    event.target.value = "";
  }

  function addNewCategory(event: FormEvent) {
    event.preventDefault();
    const name = newCategory.name.trim();
    if (!name) return;
    addCategory({ name, color: newCategory.color });
    setNewCategory({ name: "", color: "#B29CE4" });
  }

  async function connectCloud(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    const result = await sendMagicLink(email.trim());
    setCloudMessage(result.message);
  }

  return (
    <>
      <header className="page-header settings-header">
        <div><p className="mobile-brand">NOVA</p><span className="eyebrow">PREFERENCES</span><h1>Settings</h1><p className="subtitle">Tune NOVA around how you actually plan.</p></div>
      </header>

      <div className="settings-grid">
        <section className="panel settings-card">
          <div className="settings-card-heading"><div><span className="settings-icon">✦</span><div><h2>Your day</h2><p>Personalize your daily planner and review.</p></div></div></div>
          <div className="settings-fields">
            <label className="field"><span>Name</span><input value={state.settings.displayName} onChange={(e) => updateSettings({ displayName: e.target.value })} /></label>
            <label className="field"><span>Evening review</span><input type="time" value={state.settings.eveningReviewTime} onChange={(e) => updateSettings({ eveningReviewTime: e.target.value })} /></label>
            <div className="form-grid two">
              <label className="field"><span>Timeline starts</span><select value={state.settings.dayStartHour} onChange={(e) => updateSettings({ dayStartHour: Number(e.target.value) })}>{Array.from({ length: 10 }, (_, i) => i + 4).map((hour) => <option key={hour} value={hour}>{hour}:00</option>)}</select></label>
              <label className="field"><span>Timeline ends</span><select value={state.settings.dayEndHour} onChange={(e) => updateSettings({ dayEndHour: Number(e.target.value) })}>{Array.from({ length: 11 }, (_, i) => i + 16).map((hour) => <option key={hour} value={hour}>{hour}:00</option>)}</select></label>
            </div>
            <label className="toggle-row"><span><strong>Week starts Monday</strong><small>Changes the monthly calendar layout.</small></span><input type="checkbox" checked={state.settings.weekStartsMonday} onChange={(e) => updateSettings({ weekStartsMonday: e.target.checked })} /></label>
          </div>
        </section>

        <section className="panel settings-card">
          <div className="settings-card-heading"><div><span className="settings-icon">◌</span><div><h2>Reminders</h2><p>Browser reminders plus your end-of-day check-in.</p></div></div></div>
          <div className="settings-fields">
            <div className="status-row"><div><strong>Browser notifications</strong><small>{typeof window !== "undefined" && "Notification" in window ? `Permission: ${Notification.permission}` : "Not supported in this browser"}</small></div><button className="soft-button" onClick={enableNotifications}>{state.settings.notificationsEnabled ? "Enabled" : "Enable"}</button></div>
            <p className="settings-note">NOVA can remind you while the web app is open. Reliable background reminders on iPhone will be part of the native companion app later.</p>
          </div>
        </section>

        <section className="panel settings-card wide-card">
          <div className="settings-card-heading"><div><span className="settings-icon">◐</span><div><h2>Categories</h2><p>Categories describe the part of life a task belongs to. Projects stay separate.</p></div></div></div>
          <div className="category-settings-list">
            {state.categories.map((category) => <CategoryRow key={category.id} category={category} onUpdate={updateCategory} onDelete={deleteCategory} />)}
            <form className="add-category-row" onSubmit={addNewCategory}><input type="color" value={newCategory.color} onChange={(e) => setNewCategory((current) => ({ ...current, color: e.target.value }))} /><input placeholder="New category" value={newCategory.name} onChange={(e) => setNewCategory((current) => ({ ...current, name: e.target.value }))} /><button className="soft-button" type="submit">Add</button></form>
          </div>
        </section>

        <section className="panel settings-card">
          <div className="settings-card-heading"><div><span className="settings-icon">☁</span><div><h2>Cloud sync</h2><p>Keep the same NOVA data on laptop and phone.</p></div></div></div>
          <div className="settings-fields">
            {cloudConfigured ? cloudEmail ? <>
              <div className="status-row"><div><strong>{cloudEmail}</strong><small>Status: {cloudStatus === "synced" ? "Synced" : cloudStatus === "connecting" ? "Syncing…" : cloudStatus === "error" ? "Needs attention" : "Local"}</small></div><span className={`status-pill ${cloudStatus}`}>{cloudStatus}</span></div>
              <div className="inline-actions"><button className="soft-button" onClick={syncNow}>Sync now</button><button className="ghost-button" onClick={signOutCloud}>Sign out</button></div>
            </> : <form className="cloud-form" onSubmit={connectCloud}><label className="field"><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></label><button className="primary-button" type="submit">Send sign-in link</button>{cloudMessage && <p className="settings-note">{cloudMessage}</p>}</form> : <>
              <div className="connection-empty"><strong>Cloud sync is ready, but not connected yet.</strong><p>When we deploy NOVA, we&apos;ll add two Supabase environment variables. After that, you can sign in here and your laptop + phone will use the same data.</p></div>
              <span className="status-pill local">Local only</span>
            </>}
          </div>
        </section>

        <section className="panel settings-card">
          <div className="settings-card-heading"><div><span className="settings-icon">⌁</span><div><h2>Apple Calendar</h2><p>Calendar events can already live beside your NOVA tasks.</p></div></div></div>
          <div className="settings-fields"><div className="connection-empty"><strong>Current V1: .ics import</strong><p>Use Calendar → Import .ics to bring exported Apple Calendar events into NOVA. Live two-way Apple Calendar access requires the native iPhone companion, because browsers cannot directly read your private device calendars.</p></div><button className="ghost-button" onClick={() => { if (confirm("Remove imported calendar events?")) clearImportedEvents(); }}>Clear imported events</button></div>
        </section>

        <section className="panel settings-card wide-card">
          <div className="settings-card-heading"><div><span className="settings-icon">⇄</span><div><h2>Data & backup</h2><p>Your local data is stored in this browser unless cloud sync is connected.</p></div></div></div>
          <div className="data-actions"><button className="soft-button" onClick={exportBackup}>Export NOVA backup</button><button className="soft-button" onClick={() => importRef.current?.click()}>Restore backup</button><input ref={importRef} hidden type="file" accept="application/json,.json" onChange={importBackup} /><button className="danger-outline" onClick={() => { if (confirm("Reset NOVA to a blank planner? This removes your tasks, projects, habits, and imported calendar events.")) resetState(); }}>Reset NOVA</button></div>
        </section>
      </div>
    </>
  );
}

function CategoryRow({ category, onUpdate, onDelete }: { category: Category; onUpdate: (id: string, patch: Partial<Category>) => void; onDelete: (id: string) => void }) {
  return <div className="category-setting-row"><input type="color" value={category.color} onChange={(e) => onUpdate(category.id, { color: e.target.value })} /><input value={category.name} onChange={(e) => onUpdate(category.id, { name: e.target.value })} /><button className="icon-control danger-text" onClick={() => { if (confirm(`Delete ${category.name}? Tasks will remain without this category.`)) onDelete(category.id); }} aria-label={`Delete ${category.name}`}>×</button></div>;
}

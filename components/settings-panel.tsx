"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { resolvedTimeZone } from "@/lib/nova/date";
import { THEME_IDS, THEME_META } from "@/lib/nova/theme";
import { useNova } from "./nova-provider";
import type { Category, NovaSettings, NovaState, ThemeId } from "@/lib/nova/types";

const TIME_ZONES = [
  ["auto", "Automatic (this device)"],
  ["America/Los_Angeles", "Pacific Time · Los Angeles"],
  ["America/Denver", "Mountain Time · Denver"],
  ["America/Chicago", "Central Time · Chicago"],
  ["America/New_York", "Eastern Time · New York"],
  ["Asia/Jakarta", "Western Indonesia Time · Jakarta"],
  ["UTC", "UTC"],
] as const;

async function imageFileToAvatar(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Could not open image"));
      image.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        if (!context) return reject(new Error("Canvas is unavailable"));
        const crop = Math.min(image.width, image.height);
        const sx = (image.width - crop) / 2;
        const sy = (image.height - crop) / 2;
        context.drawImage(image, sx, sy, crop, crop, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function SettingsPanel() {
  const {
    state,
    hydrated,
    updateSettings,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategory,
    importState,
    resetState,
    clearImportedEvents,
    cloudConfigured,
    cloudStatus,
    cloudEmail,
    sendMagicLink,
    verifyEmailOtp,
    signInWithProvider,
    signOutCloud,
    syncNow,
    googleCalendarConnected,
    connectGoogleCalendar,
    syncGoogleCalendar,
    disconnectGoogleCalendar,
  } = useNova();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [cloudMessage, setCloudMessage] = useState("");
  const [calendarMessage, setCalendarMessage] = useState("");
  const [newCategory, setNewCategory] = useState({ name: "", color: "#B29CE4" });
  const [daySaveMessage, setDaySaveMessage] = useState("");
  const [dayDraft, setDayDraft] = useState<NovaSettings>(state.settings);
  const importRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (hydrated) setDayDraft(state.settings);
  }, [hydrated, state.settings]);

  if (!hydrated) return <div className="loading-screen"><span className="brand-mark">NOVA</span><p>Opening settings…</p></div>;

  async function enableNotifications() {
    if (!("Notification" in window)) { alert("This browser does not support notifications."); return; }
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

  async function updateAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Choose an image file."); return; }
    try {
      const profileImage = await imageFileToAvatar(file);
      updateSettings({ profileImage });
    } catch {
      alert("NOVA could not process that image.");
    }
    event.target.value = "";
  }

  function addNewCategory(event: FormEvent) {
    event.preventDefault();
    const name = newCategory.name.trim();
    if (!name) return;
    addCategory({ name, color: newCategory.color });
    setNewCategory({ name: "", color: THEME_META[state.settings.theme].categoryColors[0] });
  }

  async function connectCloud(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    const result = await sendMagicLink(email.trim());
    setCloudMessage(result.message);
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !otp.trim()) return;
    const result = await verifyEmailOtp(email.trim(), otp.trim());
    setCloudMessage(result.message);
    if (result.ok) setOtp("");
  }

  async function saveDayPreferences() {
    if (dayDraft.dayEndHour <= dayDraft.dayStartHour) { alert("Timeline end time needs to be after the start time."); return; }
    setDaySaveMessage("Saving…");
    updateSettings({ ...dayDraft, displayName: dayDraft.displayName.trim() || "Profile", profileSetupComplete: true });
    if (cloudEmail) await syncNow();
    setDaySaveMessage(cloudEmail ? "Saved to NOVA cloud." : "Saved on this device.");
    window.setTimeout(() => setDaySaveMessage(""), 2500);
  }

  function moveCategory(id: string, direction: -1 | 1) {
    const index = state.categories.findIndex((category) => category.id === id);
    const target = state.categories[index + direction];
    if (target) reorderCategory(id, target.id);
  }

  function chooseTheme(theme: ThemeId) {
    updateSettings({ theme });
    setDayDraft((current) => ({ ...current, theme }));
    const firstColor = THEME_META[theme].categoryColors[0];
    setNewCategory((current) => ({ ...current, color: firstColor }));
  }

  return (
    <>
      <header className="page-header settings-header"><div><p className="mobile-brand">NOVA</p><span className="eyebrow">PREFERENCES</span><h1>Settings</h1><p className="subtitle">Tune NOVA around how you actually plan.</p></div></header>

      <div className="settings-grid">
        <section className="panel settings-card">
          <div className="settings-card-heading"><div><span className="settings-icon">✦</span><div><h2>Profile & your day</h2><p>Personalize your planner, time zone and review.</p></div></div></div>
          <div className="settings-fields">
            <div className="profile-picture-setting"><button type="button" className="profile-picture-button" onClick={() => avatarRef.current?.click()}>{state.settings.profileImage ? <img src={state.settings.profileImage} alt="Profile" /> : <span>{(dayDraft.displayName || "P").slice(0, 1).toUpperCase()}</span>}</button><div><strong>Profile picture</strong><small>Optional. NOVA compresses it before syncing.</small><div className="inline-actions"><button type="button" className="text-button" onClick={() => avatarRef.current?.click()}>Choose photo</button>{state.settings.profileImage && <button type="button" className="text-button danger-text" onClick={() => updateSettings({ profileImage: undefined })}>Remove</button>}</div></div><input ref={avatarRef} hidden type="file" accept="image/*" onChange={updateAvatar} /></div>
            <label className="field"><span>Name</span><input value={dayDraft.displayName} onChange={(e) => setDayDraft((current) => ({ ...current, displayName: e.target.value }))} /></label>
            <label className="field"><span>Time zone</span><select value={dayDraft.timeZone} onChange={(e) => setDayDraft((current) => ({ ...current, timeZone: e.target.value }))}>{TIME_ZONES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><small className="field-help">Current resolved zone: {resolvedTimeZone(dayDraft.timeZone)}. Choose Pacific Time if you want NOVA fixed to PST/PDT even when traveling.</small></label>
            <label className="field"><span>Evening review</span><input type="time" value={dayDraft.eveningReviewTime} onChange={(e) => setDayDraft((current) => ({ ...current, eveningReviewTime: e.target.value }))} /></label>
            <div className="form-grid two"><label className="field"><span>Timeline starts</span><select value={dayDraft.dayStartHour} onChange={(e) => setDayDraft((current) => ({ ...current, dayStartHour: Number(e.target.value) }))}>{Array.from({ length: 16 }, (_, i) => i).map((hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>)}</select></label><label className="field"><span>Timeline ends</span><select value={dayDraft.dayEndHour} onChange={(e) => setDayDraft((current) => ({ ...current, dayEndHour: Number(e.target.value) }))}>{Array.from({ length: 17 }, (_, i) => i + 7).map((hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>)}</select></label></div>
            <label className="toggle-row"><span><strong>Week starts Monday</strong><small>Changes the monthly calendar layout.</small></span><input type="checkbox" checked={dayDraft.weekStartsMonday} onChange={(e) => setDayDraft((current) => ({ ...current, weekStartsMonday: e.target.checked }))} /></label>
            <div className="inline-actions settings-save-row"><button className="primary-button" type="button" onClick={saveDayPreferences}>Save changes</button>{daySaveMessage && <small className="settings-save-message">{daySaveMessage}</small>}</div>
          </div>
        </section>

        <section className="panel settings-card">
          <div className="settings-card-heading"><div><span className="settings-icon">◒</span><div><h2>Theme</h2><p>Your choice follows your NOVA account.</p></div></div></div>
          <div className="settings-fields"><div className="theme-grid">{THEME_IDS.map((themeId) => { const theme = THEME_META[themeId]; return <button key={themeId} className={`theme-card ${state.settings.theme === themeId ? "active" : ""}`} onClick={() => chooseTheme(themeId)}><span className="theme-swatches">{theme.preview.map((color) => <i key={color} style={{ background: color }} />)}</span><strong>{theme.name}</strong><small>{theme.description}</small></button>; })}</div></div>
        </section>

        <section className="panel settings-card">
          <div className="settings-card-heading"><div><span className="settings-icon">◌</span><div><h2>Reminders</h2><p>Browser reminders plus your end-of-day check-in.</p></div></div></div>
          <div className="settings-fields"><div className="status-row"><div><strong>Browser notifications</strong><small>{typeof window !== "undefined" && "Notification" in window ? `Permission: ${Notification.permission}` : "Not supported in this browser"}</small></div><button className="soft-button" onClick={enableNotifications}>{state.settings.notificationsEnabled ? "Enabled" : "Enable"}</button></div><p className="settings-note">NOVA only sends task/routine notifications when you choose a reminder. Native iPhone notifications will be more reliable once the App Store version is built.</p></div>
        </section>

        <section className="panel settings-card wide-card">
          <div className="settings-card-heading"><div><span className="settings-icon">◐</span><div><h2>Task categories</h2><p>Use NOVA&apos;s suggested colors or pick any custom color.</p></div></div></div>
          <div className="category-settings-list">{state.categories.map((category, index) => <CategoryRow key={category.id} category={category} first={index === 0} last={index === state.categories.length - 1} palette={THEME_META[state.settings.theme].categoryColors} onUpdate={updateCategory} onDelete={deleteCategory} onMove={moveCategory} />)}<form className="add-category-row category-add-expanded" onSubmit={addNewCategory}><input type="color" value={newCategory.color} onChange={(e) => setNewCategory((current) => ({ ...current, color: e.target.value }))} /><input placeholder="New category" value={newCategory.name} onChange={(e) => setNewCategory((current) => ({ ...current, name: e.target.value }))} /><span className="palette-swatches">{THEME_META[state.settings.theme].categoryColors.map((color) => <button key={color} type="button" title={color} style={{ background: color }} onClick={() => setNewCategory((current) => ({ ...current, color }))} />)}</span><button className="soft-button" type="submit">Add</button></form></div>
        </section>

        <section className="panel settings-card">
          <div className="settings-card-heading"><div><span className="settings-icon">☁</span><div><h2>Account & cloud sync</h2><p>Stay signed in and keep laptop + phone together.</p></div></div></div>
          <div className="settings-fields">
            {cloudConfigured ? cloudEmail ? <><div className="status-row"><div><strong>{cloudEmail}</strong><small>Status: {cloudStatus === "synced" ? "Synced" : cloudStatus === "connecting" ? "Syncing…" : cloudStatus === "error" ? "Needs attention" : "Local"}</small></div><span className={`status-pill ${cloudStatus}`}>{cloudStatus}</span></div><p className="settings-note">NOVA keeps the Supabase session on this device and refreshes it automatically, so you should not need to sign in each time.</p><div className="inline-actions"><button className="soft-button" onClick={syncNow}>Sync now</button><button className="ghost-button" onClick={signOutCloud}>Sign out</button></div></> : <>
              <form className="cloud-form" onSubmit={connectCloud}><label className="field"><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></label><button className="primary-button" type="submit">Send sign-in email</button></form>
              <form className="otp-form" onSubmit={verifyCode}><label className="field"><span>Email code</span><input inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="Enter the code from your email" /></label><button className="soft-button" type="submit" disabled={!email.trim() || !otp.trim()}>Verify code</button></form>
              <div className="social-login-divider"><span>or</span></div><div className="social-login-buttons"><button className="oauth-button" type="button" onClick={async () => setCloudMessage((await signInWithProvider("google")).message)}>G&nbsp; Continue with Google</button><button className="oauth-button" type="button" onClick={async () => setCloudMessage((await signInWithProvider("apple")).message)}>&nbsp; Continue with Apple</button></div>
              <p className="settings-note">Using the email code is the most reliable sign-in method when NOVA is installed to your iPhone Home Screen because it does not need to jump back from Safari.</p>{cloudMessage && <p className="settings-note auth-message">{cloudMessage}</p>}
            </> : <><div className="connection-empty"><strong>Cloud sync is ready, but not connected yet.</strong><p>Add the Supabase environment variables in Vercel, then sign in here.</p></div><span className="status-pill local">Local only</span></>}
          </div>
        </section>

        <section className="panel settings-card">
          <div className="settings-card-heading"><div><span className="settings-icon">G</span><div><h2>Google Calendar</h2><p>Bring your Google events into Today and Calendar.</p></div></div></div>
          <div className="settings-fields">{googleCalendarConnected ? <><div className="status-row"><div><strong>Google Calendar connected</strong><small>Current beta sync reads your primary calendar.</small></div><span className="status-pill synced">connected</span></div><div className="inline-actions"><button className="primary-button" onClick={async () => setCalendarMessage((await syncGoogleCalendar()).message)}>Sync now</button><button className="ghost-button" onClick={() => { disconnectGoogleCalendar(); setCalendarMessage("Google Calendar disconnected."); }}>Disconnect</button></div></> : <><div className="connection-empty"><strong>Connect Google Calendar</strong><p>NOVA requests read-only Calendar access. Your tasks remain separate from Google Calendar.</p></div><button className="primary-button" onClick={async () => setCalendarMessage((await connectGoogleCalendar()).message)}>Connect Google Calendar</button></>}{calendarMessage && <p className="settings-note">{calendarMessage}</p>}<p className="settings-note">This requires the Google provider to be configured in Supabase. If Google says the app is not configured, finish the provider setup first.</p></div>
        </section>

        <section className="panel settings-card">
          <div className="settings-card-heading"><div><span className="settings-icon"></span><div><h2>Apple Calendar</h2><p>Apple Calendar needs a different path than Google.</p></div></div></div>
          <div className="settings-fields"><div className="connection-empty"><strong>Web/PWA: .ics import · Native app: direct calendar access</strong><p>The browser version cannot directly request your iPhone&apos;s private Calendar database. NOVA keeps .ics import now; the native iPhone/iPad version will use Apple&apos;s EventKit permission flow for live Apple Calendar access.</p></div><button className="ghost-button" onClick={() => { if (confirm("Remove imported .ics calendar events?")) clearImportedEvents("ics"); }}>Clear .ics events</button></div>
        </section>

        <section className="panel settings-card wide-card">
          <div className="settings-card-heading"><div><span className="settings-icon">⇄</span><div><h2>Data & backup</h2><p>Your local data is stored in this browser unless cloud sync is connected.</p></div></div></div>
          <div className="data-actions"><button className="soft-button" onClick={exportBackup}>Export NOVA backup</button><button className="soft-button" onClick={() => importRef.current?.click()}>Restore backup</button><input ref={importRef} hidden type="file" accept="application/json,.json" onChange={importBackup} /><button className="danger-outline" onClick={() => { if (confirm("Reset NOVA to a blank planner? This removes your tasks, projects, routines, and imported calendar events.")) resetState(); }}>Reset NOVA</button></div>
        </section>
      </div>
    </>
  );
}

function CategoryRow({ category, first, last, palette, onUpdate, onDelete, onMove }: { category: Category; first: boolean; last: boolean; palette: string[]; onUpdate: (id: string, patch: Partial<Category>) => void; onDelete: (id: string) => void; onMove: (id: string, direction: -1 | 1) => void; }) {
  return <div className="category-setting-row category-setting-row-expanded category-setting-with-palette"><input type="color" value={category.color} onChange={(e) => onUpdate(category.id, { color: e.target.value })} /><input value={category.name} onChange={(e) => onUpdate(category.id, { name: e.target.value })} /><span className="palette-swatches">{palette.map((color) => <button key={color} type="button" title={color} className={category.color.toLowerCase() === color.toLowerCase() ? "active" : ""} style={{ background: color }} onClick={() => onUpdate(category.id, { color })} />)}</span><div className="category-order-controls"><button type="button" className="icon-control" disabled={first} onClick={() => onMove(category.id, -1)}>↑</button><button type="button" className="icon-control" disabled={last} onClick={() => onMove(category.id, 1)}>↓</button></div><button type="button" className="category-delete-button" onClick={() => { if (confirm(`Delete ${category.name}? Tasks will remain, but without this category.`)) onDelete(category.id); }}>Delete</button></div>;
}

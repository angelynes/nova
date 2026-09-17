"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useNova } from "./nova-provider";

const items = [
  { key: "today", label: "Today", href: "/today", icon: "⌂" },
  { key: "calendar", label: "Calendar", href: "/calendar", icon: "▦" },
  { key: "projects", label: "Projects", href: "/projects", icon: "▱" },
] as const;

export function NovaShell({ active, children }: { active: "today" | "calendar" | "projects" | "settings"; children: React.ReactNode }) {
  const { state, hydrated, updateSettings } = useNova();
  const [profileName, setProfileName] = useState("");
  const initials = state.settings.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "P";
  const showProfileSetup = hydrated && !state.settings.profileSetupComplete;

  useEffect(() => {
    if (showProfileSetup) setProfileName(state.settings.displayName === "Profile" ? "" : state.settings.displayName);
  }, [showProfileSetup, state.settings.displayName]);

  function finishProfileSetup(event?: FormEvent) {
    event?.preventDefault();
    updateSettings({
      displayName: profileName.trim() || "Profile",
      profileSetupComplete: true,
    });
  }

  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <Link className="brand" href="/today" aria-label="NOVA home">NOVA</Link>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {items.map((item) => <Link key={item.key} className={`nav-item ${active === item.key ? "active" : ""}`} href={item.href}><span className="nav-icon" aria-hidden="true">{item.icon}</span>{item.label}</Link>)}
        </nav>
        <div className="sidebar-spacer" />
        <Link className="sidebar-new" href="/today?compose=task">＋ New task</Link>
        <Link className={`profile-row ${active === "settings" ? "active" : ""}`} href="/settings">
          <span className="avatar">{initials}</span>
          <span><strong>{state.settings.displayName || "NOVA"}</strong><small>Settings</small></span>
          <span className="profile-arrow">›</span>
        </Link>
      </aside>

      <Link className={`mobile-settings-link ${active === "settings" ? "active" : ""}`} href="/settings" aria-label="Settings">⚙</Link>

      <main className="main-content">{children}</main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {items.map((item) => <Link key={item.key} className={active === item.key ? "active" : ""} href={item.href}><span aria-hidden="true">{item.icon}</span><small>{item.label}</small></Link>)}
      </nav>

      {showProfileSetup && (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-card profile-setup-card" onSubmit={finishProfileSetup} role="dialog" aria-modal="true" aria-labelledby="profile-setup-title">
            <div className="profile-setup-mark">NOVA</div>
            <div className="modal-heading profile-setup-heading">
              <div>
                <span className="eyebrow">WELCOME</span>
                <h2 id="profile-setup-title">What should we call you?</h2>
                <p className="subtitle">This only changes the name shown inside NOVA. You can change it anytime in Settings.</p>
              </div>
            </div>
            <label className="field">
              <span>Name</span>
              <input autoFocus value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="Profile" maxLength={60} />
            </label>
            <div className="modal-actions profile-setup-actions">
              <button className="ghost-button" type="button" onClick={() => { setProfileName(""); updateSettings({ displayName: "Profile", profileSetupComplete: true }); }}>Use Profile</button>
              <button className="primary-button" type="submit">Continue</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

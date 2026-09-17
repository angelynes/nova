"use client";

import Link from "next/link";
import { useNova } from "./nova-provider";

const items = [
  { key: "today", label: "Today", href: "/today", icon: "⌂" },
  { key: "calendar", label: "Calendar", href: "/calendar", icon: "▦" },
  { key: "projects", label: "Projects", href: "/projects", icon: "▱" },
] as const;

export function NovaShell({ active, children }: { active: "today" | "calendar" | "projects" | "settings"; children: React.ReactNode }) {
  const { state } = useNova();
  const initials = state.settings.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "N";

  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <Link className="brand" href="/today" aria-label="NOVA home">NOVA</Link>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {items.map((item) => <Link key={item.key} className={`nav-item ${active === item.key ? "active" : ""}`} href={item.href}><span className="nav-icon" aria-hidden="true">{item.icon}</span>{item.label}</Link>)}
        </nav>
        <div className="sidebar-spacer" />
        <Link className="sidebar-new" href="/today">＋ New task</Link>
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
    </div>
  );
}

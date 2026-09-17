# NOVA Planner — V1 Production Clean Build

NOVA is a responsive personal planner that starts clean (no demo tasks/projects/habits/events) and combines a daily to-do list, Hobonichi-style timeline, projects/Kanban, a clean monthly calendar, habits, recurring tasks, reminders, end-of-day review, and optional cloud sync.


## Production-clean behavior

- Fresh installs start with **no demo tasks, projects, habits, or calendar events**.
- Personal, Work, and Errands remain as default life categories.
- If this build is deployed over the earlier demo build, NOVA automatically removes the known legacy demo records from both local and cloud-loaded state while preserving user-created records.
- Settings → Data & backup → **Reset NOVA** returns the planner to a blank production state.

## What is finished in this V1

### Today
- Desktop two-column layout: tasks on the left, schedule on the right
- Mobile vertical layout with tasks above a Hobonichi-style timeline
- Custom category filters and colors
- Drag unscheduled tasks into hourly schedule slots on desktop
- Add/edit/delete tasks
- Due dates, time, duration, category, project, status, notes, location, travel time, reminders, recurrence
- Checkbox completion + strikethrough
- Recurring tasks: daily, weekdays, weekly, monthly
- Habits, scheduled/unscheduled habits, habit streaks
- Evening review for unfinished tasks

### Projects
- Multiple projects with color and progress
- To Do / In Progress / Completed Kanban columns on desktop
- Tabbed stages on mobile
- Drag project tasks between columns
- One task is shared across Today, Calendar, and Projects

### Calendar
- Clean month view with colored activity dots
- Click/tap a date to reveal schedule, tasks, and habits
- Add tasks directly to the selected date
- Import `.ics` calendar files as read-only events

### Phone experience
- Fully responsive web app
- PWA manifest + service worker
- Can be added to the iPhone/Android home screen after deployment

### Reminders
- Browser notification permission in Settings
- Task reminders can include optional travel time
- Reminder watcher works while NOVA is open
- Evening review notification flow is built into Today

### Data
- Works immediately with browser-local storage
- JSON backup export/restore
- Optional Supabase cloud sync using email magic-link sign-in
- Cloud sync uses a secure per-user `app_state` record with Row Level Security

## Important Apple Calendar limitation

A website cannot directly read the private Apple Calendar database on an iPhone or Mac. NOVA V1 supports `.ics` import so Apple Calendar events can appear beside NOVA tasks. Live two-way Apple Calendar sync and reliable background iPhone notifications require a native iOS companion app. The web/PWA is structured so that can be added later.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

NOVA works without Supabase. Your data will be saved in that browser.

## Optional cloud sync

1. Create a Supabase project.
2. Open Supabase SQL Editor and run `supabase/schema.sql`.
3. Copy `.env.example` to `.env.local`.
4. Add your project values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

5. Restart NOVA.
6. Open Settings → Cloud sync and send yourself a sign-in link.

After deployment, add your production NOVA URL to Supabase Auth → URL Configuration so magic links return to the deployed app.

## Deploy to Vercel

The easiest reliable deployment path is GitHub → Vercel:

1. Put this folder in a GitHub repository.
2. In Vercel choose **Add New → Project** and import that repository.
3. Vercel should detect **Next.js** automatically.
4. If using Supabase, add the two environment variables above in Vercel Project Settings → Environment Variables.
5. Click **Deploy**.
6. After Vercel gives you a `*.vercel.app` URL, add that URL in Supabase Auth → URL Configuration if cloud sync is enabled.

For a local-only test, you can deploy without Supabase environment variables.

## Install on iPhone after deployment

1. Open the deployed NOVA URL in Safari.
2. Tap the Share button.
3. Tap **Add to Home Screen**.
4. Open NOVA from the new home-screen icon.

## Palette

- Primary: `#42326E`
- Secondary: `#6E5B9A`
- Accent: `#B29CE4`
- Muted: `#B2A6CE`
- Light: `#D7C8ED`
- Very light: `#E0D4FC`
- Background: `#FAF9FC`

## Build note

This package was syntax-checked in the generation environment. A full `npm install` / `next build` could not be completed there because the npm registry was temporarily unreachable (`EAI_AGAIN`). Run `npm install` and `npm run build` on your Mac or let Vercel perform the production build.

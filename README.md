# NOVA Planner

NOVA is a responsive personal planner that brings daily planning, projects, calendar events, routines, and cloud sync into one place.

The app is designed around a simple idea: **one item can appear in the right place everywhere without being duplicated**. A project task can live inside its project, appear in Today when it is due, and show on the schedule when it has a time.

NOVA currently runs as a responsive web app / PWA and is optimized for both laptop and phone use.

---

## Current build: V1.2.1

This version includes the September 17 planning, personalization, and behavior updates.

### Today

- Responsive Today layout:
  - desktop: unscheduled tasks on the left, schedule timeline on the right
  - mobile: unscheduled tasks first, followed by a vertical Hobonichi-style timeline
- Tasks can belong to both a **category** and a **project**
- Unscheduled tasks can be reordered
- Tasks can be dragged into the schedule
- Scheduled tasks can be moved back to Unscheduled
- Scheduled cards show:
  - task name
  - full start/end time, such as `10:45 AM – 12:45 PM`
  - duration on the right
  - optional location
  - `Notes` indicator when notes are present
- Timeline cards are positioned using the actual minute instead of only the hour
- Scheduled tasks automatically complete when their scheduled time has passed:
  - tasks with a duration complete after their end time
  - tasks without a duration complete after their start time
- **Habits/routines never auto-complete** and must always be checked manually
- Completed items stay synchronized between their different views
- Task deletion supports:
  - delete
  - move scheduled task back to Unscheduled for today
- Repeating tasks support:
  - Daily
  - Weekdays
  - Weekends
  - Weekly with custom weekdays
  - Monthly
  - Yearly
  - Custom recurrence
- Repeating items support deleting:
  - this event only
  - this and future events
  - the entire series
- Evening Review shows all unfinished tasks together and supports multi-select actions:
  - move selected tasks to tomorrow
  - move selected tasks to another date
  - keep selected tasks overdue
- Task Status only appears when a Project is selected
- Project task status defaults to **To Do**
- NOVA uses its own selected time zone for schedule behavior and automatic completion

---

## Routines / Habits

Habits have evolved into repeatable routines.

A routine can have:

- its own name, such as `Morning Routine`
- its own color
- custom repeat days
- optional scheduled time
- optional duration
- optional reminder
- customizable subtasks

Examples:

- Morning Routine
  - Vitamins
  - Skincare
  - Water
  - Make bed

Scheduled routines:

- remain visible in the Habits/Routines section
- also appear on the Today timeline
- use a different visual treatment from normal tasks
- share the same completion state between the Habits section and timeline
- always require manual completion

Completing all subtasks can complete the parent routine.

---

## Calendar

NOVA includes a clean monthly calendar view designed to stay visually simple.

- Click a date to reveal its schedule, tasks, and routines
- NOVA tasks and scheduled routines appear in the calendar
- Google Calendar read-only sync is available as a beta
- Google Calendar events can appear in Today and Calendar
- `.ics` calendar import is supported
- Apple Calendar direct device access is **not** implemented in the browser/PWA version

### Google Calendar beta

Google Calendar uses Google OAuth with the read-only Calendar scope.

Current behavior:

- imports the user's primary Google Calendar
- read-only inside NOVA
- use **Sync Google** to refresh
- browser OAuth tokens may eventually require reconnecting

Google Calendar must be enabled and configured in Google Cloud and Supabase before use.

### Apple Calendar

The current web/PWA version supports `.ics` import.

Direct access to the iPhone/iPad calendar database requires a future native Apple build using EventKit. NOVA does not fake native Apple Calendar access in the browser.

---

## Projects

Projects use a Kanban-style workflow.

Desktop:

- To Do
- In Progress
- Completed

Mobile:

- tabbed/swipe-friendly project stages

Project features include:

- project description
- project color
- progress tracking
- drag-and-drop task status
- archive project
- Archived Projects section
- unarchive project
- project progress / update history

### Project updates

Each project can keep a timestamped update feed similar to comments or progress notes.

Updates can be:

- added
- edited
- deleted

This can be used as a lightweight project journal or progress overview.

The project header now shows **only the project description entered by the user**. If there is no description, the area stays empty.

---

## Categories

Default categories:

- Personal
- Work
- Errands

Users can:

- create custom categories
- choose category colors
- reorder categories
- delete categories
- use suggested palettes based on the selected NOVA theme
- still use a fully custom color picker

---

## Themes

NOVA currently includes four account-persistent themes:

1. **Lavender**
   - soft lavender / purple palette
   - original NOVA visual identity

2. **Minimal**
   - neutral, understated, gender-neutral palette

3. **Blush**
   - soft baby-pink pastel palette

4. **Aqua**
   - pastel turquoise / blue palette

Theme choice is saved to the user's account and remains active until changed.

Onboarding asks for:

- display name
- preferred theme

---

## Profile

- Default display name is `Profile`
- Users can set their own display name
- Profile name is saved with NOVA cloud state
- Profile photos are supported
- Profile photos are center-cropped and displayed as a true circular avatar

---

## Authentication

NOVA uses Supabase Auth.

Supported sign-in options in the UI:

- email OTP/code
- email magic link
- Google OAuth
- Apple OAuth

Provider configuration is still required in Supabase before Google or Apple buttons can work.

### Email OTP / Home Screen sign-in

For installed iPhone Home Screen use, email OTP is preferred because it avoids the magic-link flow opening a separate Safari tab.

The Supabase Magic Link / OTP email template should contain:

```text
{{ .Token }}
```

NOVA can verify the code directly inside the installed app.

### Google Sign-In

Google Sign-In can be used without a paid Google subscription.

Google provider setup requires:

- Google Cloud OAuth client
- correct authorized app origin
- Supabase callback URL
- matching Client ID and Client Secret in Supabase

### Apple Sign-In

Apple Sign-In requires Apple Developer configuration.

For a public/native Apple version, an Apple Developer Program membership is expected to be needed.

---

## Cloud Sync

NOVA uses Supabase for cloud sync.

Planner state is stored in:

```text
public.app_state
```

The app currently stores planner data in the existing JSON state row, so V1.2.1 does not require a new database migration.

Cloud sync is intended to keep the same NOVA account consistent across:

- laptop
- phone
- installed PWA

---

## Email delivery

NOVA uses Supabase Auth together with Resend for authentication email delivery.

Typical flow:

```text
NOVA
  ↓
Supabase Auth
  ↓
Resend sends the email/code
  ↓
User signs in
  ↓
Supabase syncs NOVA data
```

---

## Location

Location is currently kept intentionally simple.

A task may contain an optional text location, but NOVA does **not** currently use:

- Google Maps API
- location autocomplete
- live traffic
- automatic travel-time calculation
- paid Places/Routes integrations

These can be added later if needed.

---

## Time zones

NOVA has its own time-zone setting.

Current options include:

- Automatic / device time zone
- Pacific
- Mountain
- Central
- Eastern
- Jakarta
- UTC

The selected time zone is used for:

- schedule display
- identifying past scheduled tasks
- automatic scheduled-task completion
- daily planning behavior

---

## Current completion behavior

### Normal scheduled tasks

Scheduled tasks automatically become completed when their scheduled time has passed.

- with duration → complete after end time
- without duration → complete after start time

### Habits / routines

Habits and routines never auto-complete.

They always require the user to personally check them.

---

## Current platform

NOVA currently runs as:

- responsive web app
- installable PWA / Home Screen app

The current web build is intended to work well on:

- MacBook
- desktop browser
- iPhone
- iPad browser / Home Screen

---

## Native app plan

A native Apple version is planned for later.

The native iPhone/iPad version is the right place to add:

- direct Apple Calendar / EventKit access
- native deep-link authentication
- more reliable background notifications
- native widgets
- improved device integrations
- App Store distribution

The existing web/PWA version remains useful independently.

---

## Run locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Supabase environment variables

NOVA expects:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

These should be configured in the hosting environment when cloud sync is enabled.

Do **not** expose Supabase service-role or secret keys in the browser build.

---

## Deploy

The production workflow is:

```text
GitHub
   ↓
Vercel
   ↓
Existing NOVA production domain
```

The GitHub repository is connected to the existing Vercel project.

To update NOVA:

1. upload or commit changed files to the existing repository
2. commit to `main`
3. Vercel automatically creates a new deployment
4. once the deployment is Ready, the existing NOVA domain serves the latest production version

There is no need to create a new Vercel project or change the production domain for each update.

---

## Current priorities

The current focus is to stabilize the planner experience before adding more external integrations.

Near-term work includes:

- refine Google Calendar sync
- continue testing cross-device sync
- improve routines and scheduling behavior
- polish mobile/PWA behavior
- continue UI/UX feedback passes
- prepare architecture for a future native iPhone/iPad build

Advanced Maps/location features and native Apple Calendar access are intentionally postponed for now.

---

## Product direction

NOVA is designed to stay:

- aesthetic
- minimal
- easy to navigate
- personal-first
- useful on both laptop and phone

The goal is to combine the user's separate planning workflows — daily to-dos, project management, routines, and calendar scheduling — into one calm, unified system.

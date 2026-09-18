# NOVA V1.2 — Planning, routines, calendar & personalization

## Today
- Scheduled task metadata now shows a readable start–end range and a separate duration label.
- Locations are clickable Google Maps links.
- Past scheduled items are crossed based on the time zone selected in Settings.
- Evening Review lists all unfinished tasks, supports multi-select, and can bulk move selected items to tomorrow, a chosen date, or keep them overdue.
- Task Status is hidden when there is no project; selecting a project exposes Status and defaults it to To Do.
- Habits are now independent repeatable routines with custom weekday repetition, subtasks, their own color, optional scheduled time, optional duration, and optional reminder.
- Scheduled routines remain in Habits and also appear on the timeline; both views share the same completion state.

## Calendar
- Google Calendar read-only sync beta added through Google OAuth.
- Existing `.ics` import remains for Apple Calendar exports and other calendars.
- Direct live Apple Calendar access is intentionally deferred to the native iPhone/iPad build because browser/PWA code cannot use iOS EventKit directly.

## Projects
- Project Notes became a timestamped update/comment history.
- Updates can be created, edited, and deleted.
- The project header now shows the user-entered description; if no description exists, it stays empty.

## Settings & account
- Supabase sessions remain persisted on the device.
- Added email OTP/code verification so installed Home Screen users can sign in without needing the email link to return to the PWA.
- Added Google and Apple OAuth buttons (provider setup required in Supabase).
- Added profile picture upload, resized locally before storage.
- Added four persistent themes: Lavender, Minimal, Blush, Aqua.
- Onboarding asks for name and theme.
- Category color suggestions change with the selected theme, while a custom color picker remains available.
- Added explicit time-zone selection including Pacific Time.

## Native app direction
- The web/PWA stays the Mac/browser version.
- A native iPhone/iPad companion is the next platform milestone; that is where direct Apple Calendar/EventKit access, native deep links, and stronger background notifications should live.

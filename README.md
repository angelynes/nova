# NOVA Planner

NOVA is a responsive personal planner that combines Today, Projects, Calendar, routines, and cloud sync in one place.

## V1.2 planning & personalization pass

This build incorporates the next September 17 feedback pass:

- scheduled cards show start/end time plus a separate duration label
- locations open directly in Google Maps
- past scheduled tasks/routines/calendar events are visually crossed based on NOVA's selected time zone
- evening review supports multi-select and bulk move-to-date / tomorrow / keep-overdue
- task Status is shown only when a project is selected, defaulting to To Do
- habits are now repeatable routines with their own color, optional time/duration, weekday schedule, and customizable subtasks
- scheduled routines stay visible in the Habits section and share completion state with their timeline card
- project updates are a timestamped history feed with add/edit/delete
- project header uses the project description only; there is no generic fallback tagline
- profile picture support
- four account-persistent themes: Lavender, Minimal, Blush, Aqua
- onboarding asks for both display name and theme
- category color suggestions follow the selected theme while retaining a custom color picker
- explicit NOVA time-zone setting, including Pacific, Mountain, Central, Eastern, Jakarta, UTC, or automatic device zone
- email OTP/code sign-in option for installed Home Screen use, in addition to email magic link
- Google and Apple OAuth buttons (provider setup required in Supabase)
- Google Calendar read-only sync beta (Google provider setup required)
- Apple/.ics calendar import remains available; live Apple Calendar access is reserved for the native iPhone/iPad version

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Supabase / cloud sync

NOVA expects these environment variables when cloud sync is enabled:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

The app stores its planner state in the existing `public.app_state` JSON row, so V1.2 does not require an additional database migration.

### Email code for Home Screen sign-in

The Settings page can verify a Supabase email OTP code without leaving the installed Home Screen app. To make the email include a code, your Supabase Magic Link / OTP email template must contain `{{ .Token }}`. The normal email link can remain in the template too.

### Google / Apple sign-in

The buttons are present in NOVA, but each provider must first be enabled and configured under Supabase Authentication > Providers.

### Google Calendar beta

Google Calendar uses the Google OAuth provider with the read-only Calendar scope and imports the primary calendar into NOVA. Use **Sync Google** to refresh. The current browser-only implementation may require reconnecting Google when its provider access token expires.

### Apple Calendar

The web/PWA build supports `.ics` import. Direct access to the device's Apple Calendar database requires the native iPhone/iPad build (EventKit), so it is not faked in the browser build.

## Deploy

If your GitHub repo is already connected to your existing Vercel NOVA project, upload the patch/full build to the same repo and commit to `main`. Vercel will redeploy the same project/domain automatically.

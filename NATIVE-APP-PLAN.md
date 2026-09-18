# NOVA Native App Plan

The current NOVA codebase is a responsive Next.js web/PWA. It can already be installed to the iPhone/iPad Home Screen, but an App Store build should be treated as a native companion rather than pretending the browser has iOS-only APIs.

## Recommended next milestone

1. Keep Next.js/Vercel as the web and Mac experience.
2. Create an iPhone/iPad client that uses the same Supabase account and `app_state` data.
3. Use native Apple authentication/deep links so sign-in returns to the app.
4. Use EventKit for Apple Calendar permission/read access and map those events into NOVA's existing `ExternalCalendarEvent` model.
5. Add native local/push notifications for reliable reminders when NOVA is closed.
6. Reuse the same four theme tokens and product behavior across web and native.

The web build deliberately keeps Apple Calendar live access out until this native layer exists.

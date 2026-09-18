# NOVA V1.2 setup checklist

The code update itself does not require a new Supabase SQL migration. Your existing `app_state` JSON row can store the new settings, themes, routines, project-update history, and profile picture.

## 1. Deploy the code

Upload the V1.2 patch files into the existing GitHub repository and commit them to `main`. Because that repository is already connected to the current Vercel project, the same NOVA domain will be redeployed.

## 2. Email code sign-in for the installed Home Screen app

NOVA now accepts a one-time code directly on the Settings page. This avoids relying on the email link to reopen the installed PWA.

In Supabase:

1. Open **Authentication → Email Templates**.
2. Edit the Magic Link / passwordless sign-in template.
3. Include `{{ .Token }}` somewhere visible in the email body, for example: `Your NOVA sign-in code is {{ .Token }}`.
4. Save.

You can keep the normal confirmation link in the same template if you want both choices.

## 3. Google login + Google Calendar beta

The buttons are already in NOVA, but Google must be configured as an Auth provider in Supabase first.

1. Configure a Google OAuth application for the same production NOVA domain.
2. In **Supabase → Authentication → Providers → Google**, enable Google and add its Client ID / Secret.
3. Make sure the current NOVA production URL is in Supabase's redirect allow list.
4. In NOVA Settings, **Continue with Google** handles account login.
5. **Connect Google Calendar** requests the additional read-only Calendar permission. After connecting, use **Sync Google** to refresh events.

The browser-only calendar beta stores the Google provider access token locally. If Google permission expires, NOVA will ask you to reconnect. A future server/native implementation can make refresh handling more durable.

## 4. Apple login

The Apple sign-in button is implemented, but Apple's provider setup must be completed in Supabase/Apple Developer before it can work. Enable **Apple** under Supabase Authentication providers and configure the Apple Services ID / secret for your NOVA domain.

## 5. Apple Calendar

The current web/PWA build supports `.ics` calendar import. Live access to the iPhone/iPad Apple Calendar is intentionally reserved for the native app version, where NOVA can request EventKit permission directly.

## 6. Time zone

Open **Settings → Your day → Time zone**. `Automatic` uses the device's zone. You can explicitly choose **Pacific Time (Los Angeles)** if you want NOVA to remain on Pacific Time even while browsing elsewhere.

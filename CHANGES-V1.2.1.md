# NOVA V1.2.1

Small behavior and polish fixes from live testing.

- Scheduled **tasks** now auto-complete when their scheduled end time passes, using the NOVA account/device timezone setting. A task with no duration completes when its scheduled start time passes.
- Scheduled **habits/routines never auto-complete or auto-cross**. They still require a personal check.
- Removes the legacy project tagline `An all-in-one planner, with day-to-day tasks and project manager` from existing synced project descriptions. Project headers show only the description the user entered; otherwise the line stays empty.
- Profile photos are center-cropped and exported as a circular transparent PNG, and are also force-clipped to a circle in the UI.

No Supabase schema change is required.

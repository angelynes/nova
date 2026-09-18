# NOVA V1.2.2 — scheduling & polish pass

This patch adds the September 18 feedback items.

## Added

- Custom task durations using minutes, hours, or days.
- Custom routine/habit durations using minutes, hours, or days.
- Duplicate action for existing tasks.
- Duplicate action for existing routines/habits.
- Day timelines can extend into the next calendar day.
  - Day start can be any hour from 12 AM through 11 PM.
  - Day end can be any later hour, including any hour on the following day.
  - Example: Monday can display 12 AM Monday through 4 AM Tuesday.
  - Early Tuesday tasks/routines/calendar events appear in Monday's extended timeline when that window is enabled.
  - Next-day timeline labels are marked with `+1`.
- Longer task durations that cross midnight now auto-complete at the true end time instead of at midnight.

## Changed

- Suggested category palettes are now lighter, softer pastels across Lavender, Minimal, Blush, and Aqua.
- Existing categories using NOVA's old built-in palette colors migrate to the new lighter equivalents. Custom colors are left alone.
- Duration labels now understand multi-hour and multi-day values.
- Long duration time ranges show next-day offsets such as `11:00 PM - 1:00 AM (+1d)`.

## Fixed

- Profile picture controls now remove default button padding and force the image to fill a circular crop.
- Uploaded profile images are center-cropped to a square before syncing; the UI applies the final circular mask.
- Sidebar avatars use centered `object-fit: cover` cropping.

No database migration is required. All new behavior uses the existing `public.app_state` JSON state.

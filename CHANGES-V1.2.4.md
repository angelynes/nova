# NOVA V1.2.4

## Task subtasks

- Normal tasks now support a customizable subtask/checklist section.
- Subtasks can be added, renamed, removed, and checked independently.
- Today shows subtasks beneath unscheduled tasks and compact progress on scheduled cards.
- Project cards show subtasks and their progress.
- Completing every subtask completes the parent task; reopening a subtask reopens the parent task.
- Completing the parent task marks its subtasks complete for that occurrence.
- Duplicated tasks copy the subtask structure but start with fresh completion history.

## Project task ordering

- Tasks in each project Kanban column are now sorted by their saved order.
- Desktop users can drag a task onto another task to reorder it.
- Mobile users can use up/down controls on each project card.
- Moving between To Do / In Progress / Completed still works with drag-and-drop.

## Undated project backlog

- Project tasks may now intentionally have no date.
- The task editor includes an **Undated** control when a project is selected.
- Undated project tasks stay visible in Projects but do not appear on Today or Calendar.
- Standalone non-project tasks still receive a date so they cannot disappear from the planner.
- Project cards show an **Undated** badge when no date is assigned.

## Data / migration

- Planner state version is now 6.
- Task subtask completion state is stored inside the existing `public.app_state` JSON data.
- No Supabase SQL/database migration is required.
- Existing V1.2.x cloud/local state is normalized automatically.

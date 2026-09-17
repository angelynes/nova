-- NOVA V1 cloud-sync schema
-- Run this in Supabase SQL Editor after creating your project.
-- NOVA stores one JSON snapshot per authenticated user. This keeps the
-- personal V1 simple and makes laptop/phone sync reliable without duplicating
-- tasks across multiple tables.

create table if not exists public.app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "Users can read own NOVA state" on public.app_state;
create policy "Users can read own NOVA state"
on public.app_state for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own NOVA state" on public.app_state;
create policy "Users can insert own NOVA state"
on public.app_state for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own NOVA state" on public.app_state;
create policy "Users can update own NOVA state"
on public.app_state for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update on public.app_state to authenticated;

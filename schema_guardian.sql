-- Execute in Supabase SQL editor. Only owner can read/write saved tasks.
create table if not exists public.guardian_saved_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null unique,
  goal text not null,
  shortlist jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists guardian_saved_tasks_user_idx on public.guardian_saved_tasks(user_id,created_at desc);
alter table public.guardian_saved_tasks enable row level security;
drop policy if exists guardian_saved_tasks_own_select on public.guardian_saved_tasks;
create policy guardian_saved_tasks_own_select on public.guardian_saved_tasks for select to authenticated using (auth.uid()=user_id);
drop policy if exists guardian_saved_tasks_own_insert on public.guardian_saved_tasks;
create policy guardian_saved_tasks_own_insert on public.guardian_saved_tasks for insert to authenticated with check (auth.uid()=user_id);

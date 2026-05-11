-- PsyAssist persistence (SQLite db.py → Supabase / Postgres)
-- Requires Supabase Auth: rows keyed by auth.users(id).

create table if not exists public.cases (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  user_name text,
  case_title text,
  client_name text,
  first_session_date text,
  initial_case text not null default '',
  case_context text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'active'
);

create index if not exists cases_user_updated_idx on public.cases (user_id, updated_at desc);

create table if not exists public.supervision_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  total_active_seconds bigint not null default 0 check (total_active_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supervision_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null,
  last_activity_at timestamptz not null,
  active_seconds bigint not null default 0 check (active_seconds >= 0),
  is_open boolean not null default true,
  closed_at timestamptz
);

create index if not exists supervision_sessions_user_open_idx
  on public.supervision_sessions (user_id)
  where is_open = true;

alter table public.cases enable row level security;
alter table public.supervision_progress enable row level security;
alter table public.supervision_sessions enable row level security;

create policy "cases_select_own" on public.cases
  for select using (auth.uid() = user_id);

create policy "cases_insert_own" on public.cases
  for insert with check (auth.uid() = user_id);

create policy "cases_update_own" on public.cases
  for update using (auth.uid() = user_id);

create policy "cases_delete_own" on public.cases
  for delete using (auth.uid() = user_id);

create policy "supervision_progress_select_own" on public.supervision_progress
  for select using (auth.uid() = user_id);

create policy "supervision_progress_insert_own" on public.supervision_progress
  for insert with check (auth.uid() = user_id);

create policy "supervision_progress_update_own" on public.supervision_progress
  for update using (auth.uid() = user_id);

create policy "supervision_sessions_select_own" on public.supervision_sessions
  for select using (auth.uid() = user_id);

create policy "supervision_sessions_insert_own" on public.supervision_sessions
  for insert with check (auth.uid() = user_id);

create policy "supervision_sessions_update_own" on public.supervision_sessions
  for update using (auth.uid() = user_id);

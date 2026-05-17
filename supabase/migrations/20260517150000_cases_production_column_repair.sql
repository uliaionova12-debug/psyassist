-- Production schema repair: columns referenced by save_case / PostgREST insert.
-- Safe to re-run on environments that already applied 20260514120000–20260517140000.

alter table public.cases
  add column if not exists auth_user_id uuid references auth.users (id) on delete cascade;

alter table public.cases
  add column if not exists focus text,
  add column if not exists current_step text,
  add column if not exists current_layer text,
  add column if not exists duration_minutes integer,
  add column if not exists last_insight text,
  add column if not exists current_question text,
  add column if not exists clinical_memory jsonb not null default '{}'::jsonb,
  add column if not exists session_snapshot jsonb;

alter table public.cases
  add column if not exists resume_available boolean generated always as (session_snapshot is not null) stored;

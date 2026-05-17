-- Ensure structured case columns exist (finish save / «Продолжить»).
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

-- RLS ownership policies: see 20260517140000_cases_auth_user_id_rls.sql
-- (production may have user_id bigint; auth.uid() is uuid).

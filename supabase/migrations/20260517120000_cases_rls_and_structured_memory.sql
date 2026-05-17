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

-- Align UPDATE policy with Postgres RLS (USING + WITH CHECK), same as profiles.
drop policy if exists "cases_update_own" on public.cases;

create policy "cases_update_own" on public.cases
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "cases_insert_own" on public.cases;

create policy "cases_insert_own" on public.cases
  for insert
  with check (auth.uid() = user_id);

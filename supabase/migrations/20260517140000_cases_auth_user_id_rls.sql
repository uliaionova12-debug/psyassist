-- Production may have public.cases.user_id as bigint (legacy); auth.uid() is uuid.
-- Ownership for RLS and the app uses auth_user_id (uuid → auth.users).

alter table public.cases
  add column if not exists auth_user_id uuid references auth.users (id) on delete cascade;

-- Backfill when user_id is already uuid (matches repo migrations).
do $$
begin
  if exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'cases'
      and c.column_name = 'user_id'
      and c.udt_name = 'uuid'
  ) then
    update public.cases
    set auth_user_id = user_id
    where auth_user_id is null
      and user_id is not null;
  end if;
end $$;

-- Legacy bigint user_id cannot be mapped to auth.uid() without an external mapping table.
-- Rows with null auth_user_id remain inaccessible via RLS until backfilled manually.

-- Allow new rows without legacy bigint user_id.
do $$
begin
  if exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'cases'
      and c.column_name = 'user_id'
      and c.udt_name = 'int8'
  ) then
    alter table public.cases alter column user_id drop not null;
  end if;
exception
  when others then
    null;
end $$;

create index if not exists cases_auth_user_updated_idx
  on public.cases (auth_user_id, updated_at desc);

drop policy if exists "cases_select_own" on public.cases;
drop policy if exists "cases_insert_own" on public.cases;
drop policy if exists "cases_update_own" on public.cases;
drop policy if exists "cases_delete_own" on public.cases;

create policy "cases_select_own" on public.cases
  for select using (auth.uid() = auth_user_id);

create policy "cases_insert_own" on public.cases
  for insert with check (auth.uid() = auth_user_id);

create policy "cases_update_own" on public.cases
  for update
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

create policy "cases_delete_own" on public.cases
  for delete using (auth.uid() = auth_user_id);

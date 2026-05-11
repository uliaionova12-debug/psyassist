-- Продуктовая аналитика PsyAssist (только Supabase, без внешних SDK).

create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  session_id text,
  event_name text not null,
  event_category text,
  step text,
  case_id uuid,
  payload jsonb
);

create index if not exists product_events_created_at_idx on public.product_events (created_at desc);
create index if not exists product_events_event_name_idx on public.product_events (event_name);
create index if not exists product_events_user_id_idx on public.product_events (user_id)
  where user_id is not null;
create index if not exists product_events_session_id_idx on public.product_events (session_id)
  where session_id is not null;

alter table public.product_events enable row level security;

-- Залогиненный пользователь вставляет только свои строки (user_id = auth.uid()).
create policy "product_events_insert_authenticated"
  on public.product_events
  for insert
  to authenticated
  with check (
    auth.uid() is not null
    and user_id is not null
    and auth.uid() = user_id
  );

-- Анонимная вставка: без привязки к пользователю, но с непустым session_id (генерируется на клиенте).
create policy "product_events_insert_anonymous"
  on public.product_events
  for insert
  to anon
  with check (
    user_id is null
    and session_id is not null
    and length(trim(session_id)) >= 8
  );

-- Чтение только своих событий (диагностика / будущие отчёты в приложении).
create policy "product_events_select_own_authenticated"
  on public.product_events
  for select
  to authenticated
  using (auth.uid() is not null and user_id = auth.uid());

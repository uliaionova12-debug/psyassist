-- Internal founder/QA telemetry (metadata only). Inserts are intended for the service role from trusted API routes.

create table if not exists public.founder_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  session_id text not null,
  payload jsonb not null
);

create index if not exists founder_events_created_at_idx on public.founder_events (created_at desc);
create index if not exists founder_events_session_id_idx on public.founder_events (session_id);

alter table public.founder_events enable row level security;

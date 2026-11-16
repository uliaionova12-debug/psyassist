-- Leads from the client landing /razbor (диагностический разбор).
-- Written only by the server route /api/razbor with the service role; no public access.

create table if not exists public.razbor_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  format text not null check (format in ('individual', 'couple')),
  topic text not null,
  name text not null,
  contact text not null,
  answers jsonb not null default '{}'::jsonb,
  client_map jsonb,
  internal_note jsonb,
  ai_status text not null,
  ip_hash text
);

create index if not exists razbor_leads_created_at_idx on public.razbor_leads (created_at desc);
create index if not exists razbor_leads_ip_hash_created_at_idx on public.razbor_leads (ip_hash, created_at desc);

alter table public.razbor_leads enable row level security;
revoke all on table public.razbor_leads from anon, authenticated;

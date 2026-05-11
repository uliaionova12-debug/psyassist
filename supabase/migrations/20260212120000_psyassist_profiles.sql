-- User profiles: billing + display fields. id = auth.users.id.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text,
  plan_type text not null default 'free'
    check (plan_type in ('free', 'single_case', 'start', 'practice')),
  billing_status text not null default 'none'
    check (billing_status in ('none', 'active', 'past_due', 'canceled')),
  free_intro_used boolean not null default false,
  single_case_credits integer not null default 0 check (single_case_credits >= 0),
  monthly_case_limit integer check (monthly_case_limit is null or monthly_case_limit >= 0),
  monthly_case_used integer not null default 0 check (monthly_case_used >= 0),
  subscription_kind text check (subscription_kind is null or subscription_kind in ('start', 'practice')),
  billing_period_month text not null default (to_char((timezone('utc', now()))::date, 'YYYY-MM')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create or replace function public.set_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_profiles_updated_at();

-- Автосоздание строки профиля при регистрации (security definer обходит RLS).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

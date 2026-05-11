-- Ledger for ЮKassa payments (webhook idempotency) + subscription expiry flags on profiles.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  yookassa_payment_id text not null unique,
  user_id uuid references auth.users (id) on delete set null,
  plan text not null check (plan in ('single_case', 'start', 'practice')),
  amount_value numeric,
  amount_currency text,
  status text not null check (status in ('succeeded', 'unclaimed')),
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists payments_user_id_idx on public.payments (user_id);
create index if not exists payments_created_at_idx on public.payments (created_at desc);

alter table public.payments enable row level security;

-- Authenticated users do not read payments directly; service role bypasses RLS for webhooks.

alter table public.profiles
  add column if not exists unlimited_cases boolean not null default false;

alter table public.profiles
  add column if not exists paid_until timestamptz;

-- Atomic idempotent ledger insert + profile grant (webhook retries stay safe).
create or replace function public.process_yookassa_webhook_payment(
  p_yookassa_payment_id text,
  p_user_id uuid,
  p_plan text,
  p_amount_value numeric,
  p_amount_currency text,
  p_raw jsonb
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count int;
begin
  insert into public.payments (
    yookassa_payment_id,
    user_id,
    plan,
    amount_value,
    amount_currency,
    status,
    raw
  )
  values (
    p_yookassa_payment_id,
    p_user_id,
    p_plan,
    p_amount_value,
    p_amount_currency,
    case when p_user_id is null then 'unclaimed' else 'succeeded' end,
    coalesce(p_raw, '{}'::jsonb)
  )
  on conflict (yookassa_payment_id) do nothing;

  get diagnostics inserted_count = row_count;

  if inserted_count = 0 then
    return json_build_object('code', 'PAYMENT_ALREADY_PROCESSED');
  end if;

  if p_user_id is null then
    return json_build_object('code', 'PAYMENT_RECORDED_UNCLAIMED');
  end if;

  if p_plan = 'single_case' then
    update public.profiles
    set
      plan_type = 'single_case',
      billing_status = 'active',
      single_case_credits = single_case_credits + 1,
      unlimited_cases = false,
      updated_at = now()
    where id = p_user_id;
  elsif p_plan = 'start' then
    update public.profiles
    set
      plan_type = 'start',
      subscription_kind = 'start',
      billing_status = 'active',
      unlimited_cases = false,
      monthly_case_limit = 5,
      monthly_case_used = 0,
      billing_period_month = to_char((timezone('utc', now()))::date, 'YYYY-MM'),
      single_case_credits = single_case_credits + 5,
      paid_until = timezone('utc', now()) + interval '30 days',
      updated_at = now()
    where id = p_user_id;
  elsif p_plan = 'practice' then
    update public.profiles
    set
      plan_type = 'practice',
      subscription_kind = 'practice',
      billing_status = 'active',
      unlimited_cases = true,
      monthly_case_limit = null,
      monthly_case_used = 0,
      billing_period_month = to_char((timezone('utc', now()))::date, 'YYYY-MM'),
      paid_until = timezone('utc', now()) + interval '30 days',
      updated_at = now()
    where id = p_user_id;
  end if;

  return json_build_object('code', 'PAYMENT_GRANTED');
end;
$$;

revoke all on function public.process_yookassa_webhook_payment(text, uuid, text, numeric, text, jsonb) from public;
grant execute on function public.process_yookassa_webhook_payment(text, uuid, text, numeric, text, jsonb) to service_role;

-- PsyAssist billing: подготовка полей профиля (оплата не подключена).
-- После появления таблицы public.profiles раскомментируйте и адаптируйте под вашу схему.

select 1;

-- Планируемые колонки (контракт см. src/lib/billing/billing-types.ts → ProfilesBillingColumns):
--
-- alter table public.profiles add column if not exists plan_type text not null default 'free';
-- alter table public.profiles add column if not exists free_intro_used boolean not null default false;
-- alter table public.profiles add column if not exists single_case_credits integer not null default 0;
-- alter table public.profiles add column if not exists subscription_kind text;
-- alter table public.profiles add column if not exists monthly_case_used integer not null default 0;
-- alter table public.profiles add column if not exists billing_period_month text not null default to_char(now() at time zone 'utc', 'YYYY-MM');

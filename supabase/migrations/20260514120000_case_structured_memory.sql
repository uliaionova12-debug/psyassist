-- Structured case memory for «Мои случаи»: card fields, resume snapshot, future RAG facets.
-- RLS unchanged: existing policies on public.cases already scope by auth.uid() = user_id.

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

comment on column public.cases.focus is 'Last known supervision focus label for list cards.';
comment on column public.cases.current_step is 'Last known SupervisionStep before snapshot save.';
comment on column public.cases.current_layer is 'Depth label or nav context key for cards.';
comment on column public.cases.duration_minutes is 'Parsed therapy duration minutes when available.';
comment on column public.cases.last_insight is 'Short excerpt: reflection or closing takeaway.';
comment on column public.cases.current_question is 'Last module question text when in question_flow.';
comment on column public.cases.clinical_memory is 'Future RAG: context, symptoms, transfer, etc.';
comment on column public.cases.session_snapshot is 'JSON { v, session, pendingAppends } for resume.';
comment on column public.cases.resume_available is 'True when a server snapshot exists for «Продолжить».';

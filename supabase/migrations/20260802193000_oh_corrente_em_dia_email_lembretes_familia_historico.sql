-- Corrente em Dia v3 — ajustes Evolução 02
-- Dia livre de contribuição (1 a 31), lembretes por e-mail com controle de
-- duplicidade e apoio ao histórico/notificações da contribuição familiar.
-- Migration aditiva e idempotente.

create extension if not exists pgcrypto;

create table if not exists public.oh_contribution_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.oh_organizations(id) on delete cascade,
  person_id uuid not null
    references public.oh_people(id) on delete cascade,
  due_date date not null,
  days_before integer not null
    check (days_before in (1, 3, 5, 7)),
  channel text not null default 'email'
    check (channel in ('email')),
  recipient_email text not null,
  status text not null default 'processando'
    check (status in ('processando', 'enviado', 'falhou')),
  provider_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, person_id, due_date, days_before, channel)
);

create index if not exists idx_oh_contribution_reminder_deliveries_due
  on public.oh_contribution_reminder_deliveries (
    due_date,
    status,
    organization_id
  );

alter table public.oh_contribution_reminder_deliveries enable row level security;

comment on table public.oh_contribution_reminder_deliveries is
  'Registra cada lembrete mensal enviado para evitar duplicidade em reexecuções do cron.';

comment on column public.oh_contribution_reminder_deliveries.days_before is
  'Antecedência escolhida pelo Filho da Corrente: 7, 5, 3 ou 1 dia.';

-- A escolha individual passa a aceitar qualquer dia entre 1 e 31. O backend
-- converte automaticamente dias inexistentes para o último dia do mês.
do $$
begin
  if to_regclass('public.oh_contribution_preferences') is not null
     and not exists (
       select 1
       from pg_constraint
       where conname = 'oh_contribution_preferences_preferred_due_day_check'
         and conrelid = 'public.oh_contribution_preferences'::regclass
     ) then
    alter table public.oh_contribution_preferences
      add constraint oh_contribution_preferences_preferred_due_day_check
      check (
        preferred_due_day is null
        or preferred_due_day between 1 and 31
      ) not valid;
  end if;
end $$;

update public.oh_financial_settings
set
  allowed_due_days = array[
    1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,
    17,18,19,20,21,22,23,24,25,26,27,28,29,30,31
  ],
  reminder_days_before = array[7,5,3,1],
  reminder_on_due_date = false,
  reminder_channels = array['email'],
  updated_at = now();

with normalized_preferences as (
  select
    id,
    (
      select coalesce(array_agg(day order by day desc), '{}'::integer[])
      from unnest(coalesce(reminder_days_before, '{}'::integer[])) as day
      where day in (7,5,3,1)
    ) as normalized_days
  from public.oh_contribution_preferences
)
update public.oh_contribution_preferences as preference
set
  reminder_days_before = normalized.normalized_days,
  reminder_channels = case
    when cardinality(normalized.normalized_days) > 0 then array['email']
    else '{}'::text[]
  end,
  updated_at = now()
from normalized_preferences as normalized
where normalized.id = preference.id;

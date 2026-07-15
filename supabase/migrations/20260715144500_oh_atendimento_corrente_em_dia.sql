-- Organização em Harmonia — Atendimento em Harmonia e Corrente em Dia
-- Seguro para rodar mais de uma vez no Supabase SQL Editor.

create unique index if not exists idx_oh_module_settings_org_slug
  on public.oh_module_settings (organization_id, module_slug);

alter table if exists public.oh_consulente_appointments
  add column if not exists recurrence_count integer not null default 1,
  add column if not exists series_id uuid,
  add column if not exists checked_in_at timestamptz,
  add column if not exists completed_at timestamptz;

create table if not exists public.oh_contributions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  person_id uuid references public.oh_people(id) on delete set null,
  contributor_name text,
  amount numeric(12,2) not null default 0,
  due_date date not null default current_date,
  paid_at timestamptz,
  status text not null default 'aguardando_pagamento',
  payment_method text,
  proof_url text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_oh_contributions_org_person_due
  on public.oh_contributions (organization_id, person_id, due_date, status);

create index if not exists idx_oh_contributions_org_status_due
  on public.oh_contributions (organization_id, status, due_date);

with org as (
  select id from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by created_at asc
  limit 1
)
insert into public.oh_module_settings (organization_id, module_slug, enabled, settings)
select
  org.id,
  'atendimento-em-harmonia',
  true,
  jsonb_build_object(
    'recurringEnabled', true,
    'maxRecurringAppointmentsPerConsulente', 2,
    'autoCancelRecurringOnAbsence', true,
    'allowDifferentEntityAfterFirstAppointment', false,
    'allowAlternateEntityWhenUnavailable', true,
    'wednesdayBookingMode', 'coordination',
    'wednesdayAuthorizedPersonIds', jsonb_build_array(),
    'requireRecommendingEntityForWednesday', true,
    'appointmentReturnGuidance', 'Após o primeiro atendimento com uma entidade, caso seja orientado retorno, procure manter a continuidade com a mesma entidade sempre que possível.'
  )
from org
on conflict (organization_id, module_slug) do update set
  enabled = true,
  settings = public.oh_module_settings.settings || excluded.settings,
  updated_at = now();

with org as (
  select id from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by created_at asc
  limit 1
)
insert into public.oh_module_settings (organization_id, module_slug, enabled, settings)
select
  org.id,
  'corrente-em-dia',
  true,
  jsonb_build_object(
    'defaultAmount', 50,
    'familyAmount', 120,
    'defaultDueDays', jsonb_build_array(10),
    'reminderBeforeDays', 3,
    'reminderAfterDays', 2,
    'pixKey', 'tucxacentro@gmail.com',
    'pixReceiverName', 'TUCXA',
    'pixCity', 'CAMPINAS',
    'familyContributionLabel', 'Contribuição familiar',
    'persuasiveText', 'A contribuição mensal ajuda a manter a casa preparada, limpa, organizada e disponível para os trabalhos. Quando cada Filho da Corrente mantém sua parte em dia, a tesouraria ganha previsibilidade e a corrente ganha tranquilidade para servir.'
  )
from org
on conflict (organization_id, module_slug) do update set
  enabled = true,
  settings = public.oh_module_settings.settings || excluded.settings,
  updated_at = now();

-- Entidades genéricas editáveis para ajustar rapidamente a capacidade inicial da recepção.
with org as (
  select id from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by created_at asc
  limit 1
), generic_entities(name, slug, usual_days, entity_type, line, capacity, notes) as (
  values
    ('Entidade Atendimento Segunda/Terça 01', 'entidade-atendimento-segunda-terca-01', array['segunda','terca']::text[], 'Entidade de atendimento', 'Atendimento Filhos de Fora', 1, 'Nome genérico editável para atendimento de segunda e terça.'),
    ('Entidade Atendimento Segunda/Terça 02', 'entidade-atendimento-segunda-terca-02', array['segunda','terca']::text[], 'Entidade de atendimento', 'Atendimento Filhos de Fora', 1, 'Nome genérico editável para atendimento de segunda e terça.'),
    ('Entidade Atendimento Segunda/Terça 03', 'entidade-atendimento-segunda-terca-03', array['segunda','terca']::text[], 'Entidade de atendimento', 'Atendimento Filhos de Fora', 1, 'Nome genérico editável para atendimento de segunda e terça.'),
    ('Entidade Atendimento Segunda/Terça 04', 'entidade-atendimento-segunda-terca-04', array['segunda','terca']::text[], 'Entidade de atendimento', 'Atendimento Filhos de Fora', 1, 'Nome genérico editável para atendimento de segunda e terça.'),
    ('Entidade Atendimento Segunda/Terça 05', 'entidade-atendimento-segunda-terca-05', array['segunda','terca']::text[], 'Entidade de atendimento', 'Atendimento Filhos de Fora', 1, 'Nome genérico editável para atendimento de segunda e terça.'),
    ('Entidade Atendimento Segunda/Terça 06', 'entidade-atendimento-segunda-terca-06', array['segunda','terca']::text[], 'Entidade de atendimento', 'Atendimento Filhos de Fora', 1, 'Nome genérico editável para atendimento de segunda e terça.'),
    ('Entidade Atendimento Segunda/Terça 07', 'entidade-atendimento-segunda-terca-07', array['segunda','terca']::text[], 'Entidade de atendimento', 'Atendimento Filhos de Fora', 1, 'Nome genérico editável para atendimento de segunda e terça.'),
    ('Entidade Atendimento Segunda/Terça 08', 'entidade-atendimento-segunda-terca-08', array['segunda','terca']::text[], 'Entidade de atendimento', 'Atendimento Filhos de Fora', 1, 'Nome genérico editável para atendimento de segunda e terça.'),
    ('Entidade Atendimento Segunda/Terça 09', 'entidade-atendimento-segunda-terca-09', array['segunda','terca']::text[], 'Entidade de atendimento', 'Atendimento Filhos de Fora', 1, 'Nome genérico editável para atendimento de segunda e terça.'),
    ('Entidade Atendimento Segunda/Terça 10', 'entidade-atendimento-segunda-terca-10', array['segunda','terca']::text[], 'Entidade de atendimento', 'Atendimento Filhos de Fora', 1, 'Nome genérico editável para atendimento de segunda e terça.'),
    ('Entidade Quarta Transformação 01', 'entidade-quarta-transformacao-01', array['quarta']::text[], 'Entidade de transformação', 'Tratamento espiritual / transformação', 1, 'Nome genérico editável para atendimento de quarta-feira.'),
    ('Entidade Quarta Transformação 02', 'entidade-quarta-transformacao-02', array['quarta']::text[], 'Entidade de transformação', 'Tratamento espiritual / transformação', 1, 'Nome genérico editável para atendimento de quarta-feira.'),
    ('Entidade Quarta Transformação 03', 'entidade-quarta-transformacao-03', array['quarta']::text[], 'Entidade de transformação', 'Tratamento espiritual / transformação', 1, 'Nome genérico editável para atendimento de quarta-feira.'),
    ('Entidade Quarta Transformação 04', 'entidade-quarta-transformacao-04', array['quarta']::text[], 'Entidade de transformação', 'Tratamento espiritual / transformação', 1, 'Nome genérico editável para atendimento de quarta-feira.'),
    ('Entidade Quarta Transformação 05', 'entidade-quarta-transformacao-05', array['quarta']::text[], 'Entidade de transformação', 'Tratamento espiritual / transformação', 1, 'Nome genérico editável para atendimento de quarta-feira.'),
    ('Entidade Quarta Transformação 06', 'entidade-quarta-transformacao-06', array['quarta']::text[], 'Entidade de transformação', 'Tratamento espiritual / transformação', 1, 'Nome genérico editável para atendimento de quarta-feira.'),
    ('Entidade Quarta Transformação 07', 'entidade-quarta-transformacao-07', array['quarta']::text[], 'Entidade de transformação', 'Tratamento espiritual / transformação', 1, 'Nome genérico editável para atendimento de quarta-feira.'),
    ('Entidade Quarta Transformação 08', 'entidade-quarta-transformacao-08', array['quarta']::text[], 'Entidade de transformação', 'Tratamento espiritual / transformação', 1, 'Nome genérico editável para atendimento de quarta-feira.')
)
insert into public.oh_spiritual_entities (
  organization_id,
  name,
  slug,
  line,
  entity_type,
  usual_days,
  daily_capacity,
  appointment_enabled,
  appointment_notes,
  notes,
  active
)
select
  org.id,
  generic_entities.name,
  generic_entities.slug,
  generic_entities.line,
  generic_entities.entity_type,
  generic_entities.usual_days,
  generic_entities.capacity,
  true,
  'Cadastro inicial genérico. Edite nome, linha e capacidade conforme a organização do Tucxa.',
  generic_entities.notes,
  true
from org
cross join generic_entities
on conflict (organization_id, slug) do update set
  appointment_enabled = true,
  active = true,
  updated_at = now();

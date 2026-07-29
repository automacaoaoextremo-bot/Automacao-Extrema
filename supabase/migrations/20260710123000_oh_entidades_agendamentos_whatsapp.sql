-- Organização em Harmonia — entidades, capacidade de atendimento, agendamentos e suporte WhatsApp
-- Seguro para rodar mais de uma vez no Supabase SQL Editor.

alter table if exists public.oh_spiritual_entities
  add column if not exists daily_capacity integer not null default 4,
  add column if not exists appointment_enabled boolean not null default true,
  add column if not exists appointment_notes text;

update public.oh_spiritual_entities
set daily_capacity = 4
where daily_capacity is null or daily_capacity < 1;

create unique index if not exists idx_oh_spiritual_entities_org_slug
  on public.oh_spiritual_entities (organization_id, slug);

create table if not exists public.oh_consulente_appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  person_id uuid references public.oh_people(id) on delete set null,
  entity_id uuid references public.oh_spiritual_entities(id) on delete set null,
  recommended_by_entity_id uuid references public.oh_spiritual_entities(id) on delete set null,
  scheduled_by_person_id uuid references public.oh_people(id) on delete set null,
  event_id uuid references public.agv_events(id) on delete set null,
  consulente_name text not null,
  whatsapp text,
  email text,
  appointment_date date not null,
  appointment_time text,
  is_recurring boolean not null default false,
  status text not null default 'solicitado',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_oh_consulente_appointments_entity_date
  on public.oh_consulente_appointments (organization_id, entity_id, appointment_date, status);

create index if not exists idx_oh_consulente_appointments_contact
  on public.oh_consulente_appointments (organization_id, lower(email), whatsapp, is_recurring, status);

create unique index if not exists idx_oh_module_settings_org_slug
  on public.oh_module_settings (organization_id, module_slug);

insert into public.oh_module_settings (organization_id, module_slug, enabled, settings)
select
  org.id,
  'agenda-viva',
  true,
  jsonb_build_object(
    'maxRecurringAppointmentsPerConsulente', 2,
    'autoCancelRecurringOnAbsence', true,
    'wednesdayBookingMode', 'coordination',
    'wednesdayAuthorizedPersonIds', jsonb_build_array(),
    'requireRecommendingEntityForWednesday', true,
    'appointmentReturnGuidance', 'Após o primeiro atendimento com uma entidade, caso seja orientado o retorno, é importante voltar com a mesma entidade para preservar a continuidade do cuidado.'
  )
from public.oh_organizations org
where org.slug = 'tucxa' or org.name ilike '%tucxa%'
on conflict (organization_id, module_slug) do update set
  enabled = true,
  settings = public.oh_module_settings.settings || excluded.settings,
  updated_at = now();

with org as (
  select id from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by created_at asc
  limit 1
), entidades(name, slug, line, entity_type, usual_days, notes) as (
  values
    ('Pedra do Oriente', 'pedra-do-oriente', 'Linha do Oriente', 'Entidade de atendimento', array['terca']::text[], 'Atendimento aos filhos de fora às terças-feiras.'),
    ('Rio Nascente', 'rio-nascente', 'Linha das Águas', 'Entidade de atendimento', array['terca']::text[], 'Atendimento aos filhos de fora às terças-feiras.'),
    ('Luz de Ossosi', 'luz-de-ossosi', 'Oxóssi', 'Entidade de atendimento', array['terca','quinta']::text[], 'Atendimento às terças e apoio nos trabalhos de quinta.'),
    ('Flor da Lua', 'flor-da-lua', 'Linha das Águas', 'Entidade de atendimento', array['terca']::text[], 'Atendimento aos filhos de fora às terças-feiras.'),
    ('Ogum de Lei', 'ogum-de-lei', 'Ogum', 'Entidade de atendimento', array['terca']::text[], 'Atendimento aos filhos de fora às terças-feiras.'),
    ('Tupiná', 'tupina', 'Oxóssi', 'Entidade de atendimento', array['terca']::text[], 'Atendimento aos filhos de fora às terças-feiras.'),
    ('Dr. Luiz Teixeira', 'dr-luiz-teixeira', 'Corrente Médica', 'Entidade de transformação', array['quarta']::text[], 'Atendimento de quarta-feira mediante encaminhamento.'),
    ('Dr. Alexandre', 'dr-alexandre', 'Corrente Médica', 'Entidade de transformação', array['quarta']::text[], 'Atendimento de quarta-feira mediante encaminhamento.'),
    ('Dr. Alonso', 'dr-alonso', 'Corrente Médica', 'Entidade de transformação', array['quarta']::text[], 'Atendimento de quarta-feira mediante encaminhamento.'),
    ('Dra. Sandra', 'dra-sandra', 'Corrente Médica', 'Entidade de transformação', array['quarta']::text[], 'Atendimento de quarta-feira mediante encaminhamento.'),
    ('Dr. Augusto', 'dr-augusto', 'Corrente Médica', 'Entidade de transformação', array['quarta']::text[], 'Atendimento de quarta-feira mediante encaminhamento.'),
    ('Flor de Lotus', 'flor-de-lotus', 'Linha das Águas', 'Entidade de atendimento', array['quinta']::text[], 'Atendimento aos Filhos da Corrente nas quintas-feiras.'),
    ('Guerreiro', 'guerreiro', 'Ogum', 'Entidade de atendimento', array['quinta']::text[], 'Atendimento aos Filhos da Corrente nas quintas-feiras.')
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
  entidades.name,
  entidades.slug,
  entidades.line,
  entidades.entity_type,
  entidades.usual_days,
  4,
  true,
  'Capacidade inicial de 4 consulentes por dia. Após primeiro atendimento, orientar retorno com a mesma entidade quando houver encaminhamento.',
  entidades.notes,
  true
from org
cross join entidades
on conflict (organization_id, slug) do update set
  name = excluded.name,
  line = coalesce(excluded.line, public.oh_spiritual_entities.line),
  entity_type = coalesce(excluded.entity_type, public.oh_spiritual_entities.entity_type),
  usual_days = excluded.usual_days,
  daily_capacity = coalesce(public.oh_spiritual_entities.daily_capacity, 4),
  appointment_enabled = true,
  appointment_notes = coalesce(public.oh_spiritual_entities.appointment_notes, excluded.appointment_notes),
  notes = coalesce(public.oh_spiritual_entities.notes, excluded.notes),
  active = true,
  updated_at = now();

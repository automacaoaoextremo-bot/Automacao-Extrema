-- Evoluções do Primeiro Acesso, classificação da Agenda Viva e simulação de acesso.

create table if not exists public.oh_first_access_validation_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.oh_organizations(id) on delete cascade,
  person_id uuid references public.oh_people(id) on delete set null,
  status text not null default 'pendente_validacao',
  full_name text,
  whatsapp text,
  email text,
  function_slugs text[] not null default '{}',
  agenda_slugs text[] not null default '{}',
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_oh_first_access_validation_org_status
  on public.oh_first_access_validation_requests (organization_id, status, created_at desc);

create index if not exists idx_oh_first_access_validation_person
  on public.oh_first_access_validation_requests (person_id);

create index if not exists idx_oh_memberships_org_person_status
  on public.oh_memberships (organization_id, person_id, status);

-- Garante configuração padrão para validação do Primeiro Acesso e simulação.
insert into public.oh_module_settings (organization_id, module_slug, enabled, settings)
select
  id,
  'agenda-viva',
  true,
  jsonb_build_object(
    'maxRecurringAppointmentsPerConsulente', 2,
    'autoCancelRecurringOnAbsence', true,
    'wednesdayBookingMode', 'coordination',
    'wednesdayAuthorizedPersonIds', '[]'::jsonb,
    'requireRecommendingEntityForWednesday', true,
    'appointmentReturnGuidance', 'Após o primeiro atendimento com uma entidade, se houver orientação de retorno, procure voltar com a mesma entidade para preservar a continuidade do cuidado.',
    'accessValidationReviewerEmails', '',
    'accessValidationReviewerPersonIds', '[]'::jsonb,
    'accessSimulationPersonIds', '[]'::jsonb,
    'accessCopyEmail', 'automacao.ao.extremo@gmail.com'
  )
from public.oh_organizations
where slug = 'tucxa'
on conflict (organization_id, module_slug) do update
set
  settings = public.oh_module_settings.settings || jsonb_build_object(
    'accessValidationReviewerEmails', coalesce(public.oh_module_settings.settings->>'accessValidationReviewerEmails', ''),
    'accessValidationReviewerPersonIds', coalesce(public.oh_module_settings.settings->'accessValidationReviewerPersonIds', '[]'::jsonb),
    'accessSimulationPersonIds', coalesce(public.oh_module_settings.settings->'accessSimulationPersonIds', '[]'::jsonb),
    'accessCopyEmail', coalesce(public.oh_module_settings.settings->>'accessCopyEmail', 'automacao.ao.extremo@gmail.com')
  ),
  updated_at = now();

-- Classificação inicial dos eventos para permitir filtros por Umbanda e Outros.
update public.agv_events
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
  'eventClassification',
  case
    when coalesce(event_type, '') in ('atendimento-filhos-fora', 'transformacao', 'filhos-corrente', 'gira', 'trabalho-espiritual') then 'umbanda'
    when coalesce(group_slug, '') ilike '%grupo%' then 'umbanda'
    when coalesce(title, '') ilike '%atendimento%' then 'umbanda'
    when coalesce(title, '') ilike '%transforma%' then 'umbanda'
    when coalesce(title, '') ilike '%corrente%' then 'umbanda'
    when coalesce(title, '') ilike '%sementinha%' then 'sementinha'
    when coalesce(title, '') ilike '%estudo%' then 'estudos'
    else 'outros'
  end,
  'event_classification',
  case
    when coalesce(event_type, '') in ('atendimento-filhos-fora', 'transformacao', 'filhos-corrente', 'gira', 'trabalho-espiritual') then 'umbanda'
    when coalesce(group_slug, '') ilike '%grupo%' then 'umbanda'
    when coalesce(title, '') ilike '%atendimento%' then 'umbanda'
    when coalesce(title, '') ilike '%transforma%' then 'umbanda'
    when coalesce(title, '') ilike '%corrente%' then 'umbanda'
    when coalesce(title, '') ilike '%sementinha%' then 'sementinha'
    when coalesce(title, '') ilike '%estudo%' then 'estudos'
    else 'outros'
  end
)
where metadata->>'eventClassification' is null;

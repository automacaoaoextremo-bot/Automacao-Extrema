-- Organização em Harmonia / TUCXA
-- Atendimento, próximos agendamentos no login, consulta operacional da Recepção
-- e encerramento correto das atualizações cadastrais aprovadas.
-- Migration aditiva e idempotente.

create table if not exists public.oh_appointment_audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  appointment_id uuid references public.oh_consulente_appointments(id) on delete set null,
  actor_person_id uuid references public.oh_people(id) on delete set null,
  action text not null,
  snapshot jsonb not null default '{}'::jsonb,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_oh_appointment_audit_log_org_created
  on public.oh_appointment_audit_log (organization_id, created_at desc);

create index if not exists idx_oh_appointment_audit_log_appointment
  on public.oh_appointment_audit_log (appointment_id, created_at desc);

alter table public.oh_appointment_audit_log enable row level security;

-- A consulta é feita exclusivamente pelas APIs protegidas com service_role.
revoke all on table public.oh_appointment_audit_log from anon, authenticated;
grant all on table public.oh_appointment_audit_log to service_role;

-- Mantém índices eficientes para os filtros e a paginação da Recepção.
create index if not exists idx_oh_consulente_appointments_reception_range
  on public.oh_consulente_appointments (
    organization_id,
    appointment_date,
    appointment_time,
    entity_id,
    status
  );

create index if not exists idx_oh_consulente_appointments_reception_person
  on public.oh_consulente_appointments (
    organization_id,
    person_id,
    appointment_date desc
  );

-- Registra as preferências funcionais sem substituir configurações já definidas.
update public.oh_module_settings settings
set settings = coalesce(settings.settings, '{}'::jsonb) || jsonb_build_object(
      'showUpcomingAppointmentsOnLoginDefault',
      case
        when jsonb_typeof(settings.settings->'showUpcomingAppointmentsOnLoginDefault') = 'boolean'
          then (settings.settings->>'showUpcomingAppointmentsOnLoginDefault')::boolean
        else true
      end,
      'receptionAppointmentsPageSize',
      case
        when coalesce(settings.settings->>'receptionAppointmentsPageSize', '') ~ '^[0-9]+$'
          then greatest(3, least(8, (settings.settings->>'receptionAppointmentsPageSize')::integer))
        else 4
      end,
      'receptionAppointmentsGroupModes', jsonb_build_array('date', 'entity'),
      'receptionAppointmentsCanEdit', true,
      'receptionAppointmentsCanCancel', true,
      'receptionAppointmentsCanDelete', true,
      'receptionAppointmentsDeleteRequiresText', 'EXCLUIR'
    ),
    updated_at = now()
from public.oh_organizations organization
where settings.organization_id = organization.id
  and (organization.slug = 'tucxa' or organization.name ilike '%tucxa%')
  and settings.module_slug in ('agenda-viva', 'atendimento-em-harmonia');

-- Corrige solicitações de atualização já aprovadas que ainda estavam com status
-- "ativo" e, por isso, continuavam oferecendo o botão "Aprovar alterações".
update public.oh_first_access_validation_requests request
set status = 'aprovado',
    updated_at = now()
where request.status = 'ativo'
  and request.summary->>'requestType' = 'profile_update'
  and exists (
    select 1
    from public.oh_memberships membership
    where membership.organization_id = request.organization_id
      and membership.person_id = request.person_id
      and membership.active = true
      and membership.status = 'ativo'
      and membership.agenda_viva_profile->>'profileUpdateStatus' = 'aprovado'
  );

-- Remove o pedido temporário de perfis já aprovados quando ele ficou preservado
-- por uma versão anterior da aplicação.
update public.oh_memberships membership
set agenda_viva_profile = coalesce(membership.agenda_viva_profile, '{}'::jsonb)
      - 'pendingProfileUpdate'
      - 'pendingProfileUpdateAt',
    updated_at = now()
where membership.active = true
  and membership.status = 'ativo'
  and membership.agenda_viva_profile->>'profileUpdateStatus' = 'aprovado'
  and (
    membership.agenda_viva_profile ? 'pendingProfileUpdate'
    or membership.agenda_viva_profile ? 'pendingProfileUpdateAt'
  );

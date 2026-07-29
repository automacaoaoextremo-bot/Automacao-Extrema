-- Organização em Harmonia / TUCXA
-- Cabeçalho autenticado, consulta da Recepção e revalidação cadastral.
-- Migration aditiva e idempotente.

create index if not exists idx_oh_consulente_appointments_org_date_time
  on public.oh_consulente_appointments (
    organization_id,
    appointment_date,
    appointment_time
  );

create index if not exists idx_oh_consulente_appointments_org_channel_date
  on public.oh_consulente_appointments (
    organization_id,
    booking_channel,
    appointment_date
  );

create index if not exists idx_oh_first_access_validation_requests_person_updated
  on public.oh_first_access_validation_requests (
    organization_id,
    person_id,
    updated_at desc
  );

-- Garante que uma atualização cadastral pendente não bloqueie o acesso
-- que já havia sido aprovado anteriormente.
update public.oh_memberships membership
set active = true,
    status = 'ativo',
    agenda_viva_profile = coalesce(membership.agenda_viva_profile, '{}'::jsonb)
      || jsonb_build_object(
        'validationStatus', 'ativo',
        'profileUpdateStatus', 'pendente_validacao'
      ),
    updated_at = now()
where coalesce(membership.agenda_viva_profile->>'profileUpdateStatus', '') = 'pendente_validacao';

-- Registra a estratégia adotada: o perfil aprovado continua ativo e
-- as alterações aguardam aprovação antes de liberar novas permissões.
update public.oh_module_settings settings
set settings = coalesce(settings.settings, '{}'::jsonb)
      || jsonb_build_object(
        'profileUpdateApprovalMode', 'keep-approved-profile-active',
        'receptionAppointmentHistoryEnabled', true,
        'receptionAppointmentDefaultRange', 'upcoming'
      ),
    updated_at = now()
where settings.organization_id in (
    select organization.id
    from public.oh_organizations organization
    where organization.slug = 'tucxa'
       or organization.name ilike '%tucxa%'
  )
  and settings.module_slug in ('agenda-viva', 'atendimento-em-harmonia');

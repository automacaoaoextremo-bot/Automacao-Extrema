-- Organização em Harmonia - correção de status do Primeiro Acesso
-- Objetivo:
-- 1) Base Única cadastrada não deve aparecer como acesso aprovado automaticamente.
-- 2) Filho da Corrente só é aprovado quando há solicitação de Primeiro Acesso aprovada.
-- 3) Manter como aprovado apenas quem tem pedido real aprovado.

update oh_memberships membership
set
  active = false,
  status = 'pendente_primeiro_acesso',
  agenda_viva_profile = coalesce(membership.agenda_viva_profile, '{}'::jsonb) || jsonb_build_object(
    'validationStatus', 'pendente_primeiro_acesso',
    'requiresFirstAccess', true,
    'statusAdjustedAt', now()
  ),
  updated_at = now()
where membership.status = 'ativo'
  and coalesce(membership.agenda_viva_profile->>'source', '') <> 'primeiro_acesso_filho_corrente'
  and not exists (
    select 1
    from oh_first_access_validation_requests request
    where request.organization_id = membership.organization_id
      and request.person_id = membership.person_id
      and request.status = 'ativo'
  )
  and exists (
    select 1
    from oh_roles role
    where role.id = membership.role_id
      and role.organization_id = membership.organization_id
      and role.slug in (
        'filho-da-corrente',
        'cavalinho',
        'cambono',
        'voluntario-sementinha',
        'voluntario-eventos',
        'membro'
      )
  );

update oh_memberships membership
set
  active = true,
  status = 'ativo',
  agenda_viva_profile = coalesce(membership.agenda_viva_profile, '{}'::jsonb) || jsonb_build_object(
    'source', 'primeiro_acesso_filho_corrente',
    'validationStatus', 'ativo',
    'requiresFirstAccess', false
  ),
  updated_at = now()
where exists (
  select 1
  from oh_first_access_validation_requests request
  where request.organization_id = membership.organization_id
    and request.person_id = membership.person_id
    and request.status = 'ativo'
);

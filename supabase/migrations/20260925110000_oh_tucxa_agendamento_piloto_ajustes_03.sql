-- Organização em Harmonia / TUCXA
-- Piloto de agendamentos — Ajustes 03 (25/09/2026)
--
-- Normaliza os acessos já provisionados pelo piloto para o papel-base
-- "Filho da Corrente". As funções operacionais (Recepção, Cavalinho etc.)
-- continuam armazenadas no agenda_viva_profile.
--
-- Nenhum nome, telefone ou senha pessoal é gravado nesta migration.

with tucxa as (
  select id
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by case when slug = 'tucxa' then 0 else 1 end, created_at asc
  limit 1
), filho_role as (
  select role.id, role.organization_id
  from public.oh_roles role
  join tucxa on tucxa.id = role.organization_id
  where role.slug in ('filho-da-corrente', 'filho-corrente')
    and role.active = true
  order by case when role.slug = 'filho-da-corrente' then 0 else 1 end, role.created_at asc
  limit 1
)
update public.oh_memberships membership
set
  role_id = filho_role.id,
  updated_at = now()
from filho_role
where membership.organization_id = filho_role.organization_id
  and (
    lower(coalesce(membership.agenda_viva_profile->>'source', '')) = 'tucxa_agendamento_piloto_01'
    or lower(coalesce(membership.agenda_viva_profile->>'pilotAccessKind', '')) in ('recepcao', 'cavalinho')
  )
  and membership.role_id is distinct from filho_role.id;

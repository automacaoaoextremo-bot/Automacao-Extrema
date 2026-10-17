-- TUCXA / Ajuste 77
-- LIMPEZA OPCIONAL/RECOMENDADA DA FLAG ANTIGA
-- firstAppointmentMustBeFirstTime
--
-- A regra "primeiro cadastro no sistema = Primeira Vez" foi removida.
-- O código do Ajuste 77 já ignora essa flag; este arquivo apenas limpa
-- o dado legado para evitar interpretações futuras incorretas.
--
-- O arquivo termina com ROLLBACK por segurança.

-- PRÉVIA
select
  m.id as membership_id,
  p.id as person_id,
  p.full_name,
  coalesce(p.normalized_whatsapp, p.whatsapp) as whatsapp,
  m.agenda_viva_profile ->> 'firstAppointmentMustBeFirstTime' as valor_atual
from public.oh_memberships m
join public.oh_people p
  on p.id = m.person_id
 and p.organization_id = m.organization_id
where m.organization_id = 'eef419a8-85ac-4bef-8739-95278a17f294'::uuid
  and coalesce(m.agenda_viva_profile, '{}'::jsonb) ? 'firstAppointmentMustBeFirstTime'
order by p.full_name;

begin;

update public.oh_memberships
set
  agenda_viva_profile = coalesce(agenda_viva_profile, '{}'::jsonb) - 'firstAppointmentMustBeFirstTime',
  updated_at = now()
where organization_id = 'eef419a8-85ac-4bef-8739-95278a17f294'::uuid
  and coalesce(agenda_viva_profile, '{}'::jsonb) ? 'firstAppointmentMustBeFirstTime';

-- Conferência dentro da transação: esperado 0 linhas.
select
  m.id,
  p.full_name,
  m.agenda_viva_profile ->> 'firstAppointmentMustBeFirstTime' as valor_remanescente
from public.oh_memberships m
join public.oh_people p on p.id = m.person_id
where m.organization_id = 'eef419a8-85ac-4bef-8739-95278a17f294'::uuid
  and coalesce(m.agenda_viva_profile, '{}'::jsonb) ? 'firstAppointmentMustBeFirstTime';

rollback;

-- Após conferir, substitua ROLLBACK por COMMIT e execute novamente.

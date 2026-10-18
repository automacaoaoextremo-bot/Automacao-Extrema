-- TUCXA / Ajuste 77
-- DIAGNÓSTICO SOMENTE LEITURA.
-- Nenhum INSERT/UPDATE/DELETE é executado neste arquivo.
--
-- Verifica:
-- 1) flags antigas firstAppointmentMustBeFirstTime;
-- 2) o agendamento de Francisca Eliziane em 19/10/2026;
-- 3) registros de Chegou/ordem/encaminhamento de teste em 13/10/2026.

-- ============================================================
-- 1. FLAG ANTIGA "PRIMEIRO CADASTRO = PRIMEIRA VEZ"
-- ============================================================
select
  m.id as membership_id,
  p.id as person_id,
  p.full_name,
  coalesce(p.normalized_whatsapp, p.whatsapp) as whatsapp,
  m.agenda_viva_profile ->> 'firstAppointmentMustBeFirstTime' as first_appointment_must_be_first_time,
  m.updated_at
from public.oh_memberships m
join public.oh_people p
  on p.id = m.person_id
 and p.organization_id = m.organization_id
where m.organization_id = 'eef419a8-85ac-4bef-8739-95278a17f294'::uuid
  and m.active = true
  and coalesce(m.agenda_viva_profile, '{}'::jsonb) ? 'firstAppointmentMustBeFirstTime'
order by p.full_name;

-- ============================================================
-- 2. FRANCISCA ELIZIANE - 19/10/2026
-- Copie o appointment_id desta consulta para o script de correção.
-- ============================================================
select
  a.id as appointment_id,
  a.person_id,
  p.full_name as pessoa_cadastrada,
  a.consulente_name,
  coalesce(p.normalized_whatsapp, p.whatsapp, a.whatsapp) as whatsapp,
  a.appointment_date,
  a.status,
  a.confirmation_status,
  a.entity_id as entidade_atual_id,
  e.name as entidade_atual,
  a.metadata ->> 'firstTimeAppointment' as first_time_appointment,
  a.metadata ->> 'firstTimeIndicatorActive' as first_time_indicator_active,
  a.metadata ->> 'firstTimeOriginalEntityId' as first_time_original_entity_id,
  a.metadata ->> 'firstTimeOriginalEntityName' as first_time_original_entity_name,
  pref.default_entity_id as entidade_padrao_id,
  ep.name as entidade_padrao,
  c.id as change_id,
  c.previous_entity_id,
  prev.name as entidade_anterior,
  c.new_entity_id,
  nxt.name as entidade_nova,
  c.reason as motivo_troca,
  c.changed_at
from public.oh_consulente_appointments a
left join public.oh_people p
  on p.id = a.person_id
 and p.organization_id = a.organization_id
left join public.oh_spiritual_entities e
  on e.id = a.entity_id
 and e.organization_id = a.organization_id
left join public.oh_tucxa_pilot_person_preferences pref
  on pref.organization_id = a.organization_id
 and pref.person_id = a.person_id
left join public.oh_spiritual_entities ep
  on ep.id = pref.default_entity_id
 and ep.organization_id = a.organization_id
left join public.oh_tucxa_appointment_entity_changes c
  on c.organization_id = a.organization_id
 and c.appointment_id = a.id
left join public.oh_spiritual_entities prev
  on prev.id = c.previous_entity_id
 and prev.organization_id = a.organization_id
left join public.oh_spiritual_entities nxt
  on nxt.id = c.new_entity_id
 and nxt.organization_id = a.organization_id
where a.organization_id = 'eef419a8-85ac-4bef-8739-95278a17f294'::uuid
  and a.appointment_date = date '2026-10-19'
  and lower(regexp_replace(trim(coalesce(a.consulente_name, '')), '\s+', ' ', 'g')) = 'francisca eliziane'
order by c.changed_at nulls last, c.id nulls last;

-- ============================================================
-- 3. TESTES DE CHEGADA/ORDEM - 13/10/2026
-- Esta consulta NÃO altera nada.
-- ============================================================
select
  a.id,
  a.person_id,
  a.consulente_name,
  coalesce(p.normalized_whatsapp, p.whatsapp, a.whatsapp) as whatsapp,
  a.appointment_date,
  e.name as entidade,
  a.status,
  a.confirmation_status,
  a.arrival_status,
  a.arrival_order,
  a.arrived_at,
  a.arrival_registered_by_person_id,
  a.forwarded_at,
  a.forwarded_by_person_id,
  a.metadata ->> 'order' as ordem_de_agendamento_preservada
from public.oh_consulente_appointments a
left join public.oh_people p
  on p.id = a.person_id
 and p.organization_id = a.organization_id
left join public.oh_spiritual_entities e
  on e.id = a.entity_id
 and e.organization_id = a.organization_id
where a.organization_id = 'eef419a8-85ac-4bef-8739-95278a17f294'::uuid
  and a.appointment_date = date '2026-10-13'
  and (
    a.arrival_status in ('arrived', 'absent')
    or a.arrival_order is not null
    or a.arrived_at is not null
    or a.arrival_registered_by_person_id is not null
    or a.forwarded_at is not null
    or a.forwarded_by_person_id is not null
  )
order by e.name nulls last, a.arrival_order nulls last, a.consulente_name;

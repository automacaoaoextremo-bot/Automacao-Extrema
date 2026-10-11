-- TUCXA / Organização em Harmonia - Ajuste 69
-- Diagnóstico SOMENTE LEITURA: Primeira Vez realocada pela Recepção.
-- Não altera nenhum dado.

with org as (
  select id
  from public.oh_organizations
  where lower(coalesce(slug, '')) = 'tucxa'
     or lower(coalesce(name, '')) like '%tucxa%'
  order by case when lower(coalesce(slug, '')) = 'tucxa' then 0 else 1 end
  limit 1
),
first_time_entities as (
  select e.id, e.name
  from public.oh_spiritual_entities e
  join org o on o.id = e.organization_id
  where lower(coalesce(e.name, '') || ' ' || coalesce(e.slug, '')) like '%primeira%vez%'
),
latest_change as (
  select distinct on (c.appointment_id)
    c.appointment_id,
    c.previous_entity_id,
    c.new_entity_id,
    c.reason,
    c.change_mode,
    c.changed_by_person_id,
    c.changed_at
  from public.oh_tucxa_appointment_entity_changes c
  join org o on o.id = c.organization_id
  order by c.appointment_id, c.changed_at desc, c.id desc
)
select
  'PRIMEIRA_VEZ_REALOCADA' as auditoria,
  a.id as appointment_id,
  a.appointment_date,
  coalesce(p.full_name, a.consulente_name) as consulente,
  a.person_id,
  coalesce(a.metadata->>'firstTimeAppointment', 'false') as first_time_appointment,
  coalesce(a.metadata->>'firstTimeIndicatorActive', 'false') as first_time_indicator_active,
  a.metadata->>'firstTimeOriginalEntityId' as first_time_original_entity_id,
  a.metadata->>'firstTimeOriginalEntityName' as first_time_original_entity_name,
  current_entity.name as entidade_atual,
  previous_entity.name as entidade_anterior_ultima_troca,
  lc.reason as motivo_ultima_troca,
  lc.change_mode as modo_ultima_troca,
  lc.changed_at as ultima_troca_em,
  pref_entity.name as entidade_padrao_atual
from public.oh_consulente_appointments a
join org o on o.id = a.organization_id
left join public.oh_people p on p.id = a.person_id
left join public.oh_spiritual_entities current_entity on current_entity.id = a.entity_id
left join latest_change lc on lc.appointment_id = a.id
left join public.oh_spiritual_entities previous_entity on previous_entity.id = lc.previous_entity_id
left join public.oh_tucxa_pilot_person_preferences pref
  on pref.organization_id = a.organization_id and pref.person_id = a.person_id
left join public.oh_spiritual_entities pref_entity on pref_entity.id = pref.default_entity_id
where a.metadata->>'firstTimeAppointment' = 'true'
  and exists (
    select 1
    from first_time_entities f
    where f.id::text = a.metadata->>'firstTimeOriginalEntityId'
       or f.id = lc.previous_entity_id
  )
  and a.entity_id not in (select id from first_time_entities)
order by a.appointment_date desc, consulente;

-- Deve retornar ZERO linhas.
-- Uma troca que saiu de Primeira Vez nunca pode perder a marca histórica.
with org as (
  select id
  from public.oh_organizations
  where lower(coalesce(slug, '')) = 'tucxa'
     or lower(coalesce(name, '')) like '%tucxa%'
  order by case when lower(coalesce(slug, '')) = 'tucxa' then 0 else 1 end
  limit 1
),
first_time_entities as (
  select e.id
  from public.oh_spiritual_entities e
  join org o on o.id = e.organization_id
  where lower(coalesce(e.name, '') || ' ' || coalesce(e.slug, '')) like '%primeira%vez%'
)
select
  'ERRO_MARCA_PRIMEIRA_VEZ_PERDIDA' as auditoria,
  c.appointment_id,
  c.previous_entity_id,
  c.new_entity_id,
  c.changed_at,
  a.metadata
from public.oh_tucxa_appointment_entity_changes c
join org o on o.id = c.organization_id
join public.oh_consulente_appointments a on a.id = c.appointment_id
where c.previous_entity_id in (select id from first_time_entities)
  and coalesce((a.metadata->>'firstTimeAppointment')::boolean, false) is not true
order by c.changed_at desc;

-- Deve retornar ZERO linhas para Primeira Vez como Entidade padrão definitiva.
-- A Entidade de destino da realocação é que pode assumir o padrão.
with org as (
  select id
  from public.oh_organizations
  where lower(coalesce(slug, '')) = 'tucxa'
     or lower(coalesce(name, '')) like '%tucxa%'
  order by case when lower(coalesce(slug, '')) = 'tucxa' then 0 else 1 end
  limit 1
),
first_time_entities as (
  select e.id, e.name
  from public.oh_spiritual_entities e
  join org o on o.id = e.organization_id
  where lower(coalesce(e.name, '') || ' ' || coalesce(e.slug, '')) like '%primeira%vez%'
)
select
  'ERRO_PRIMEIRA_VEZ_COMO_PADRAO' as auditoria,
  pref.person_id,
  p.full_name,
  p.whatsapp,
  e.name as entidade_padrao
from public.oh_tucxa_pilot_person_preferences pref
join org o on o.id = pref.organization_id
join first_time_entities e on e.id = pref.default_entity_id
left join public.oh_people p on p.id = pref.person_id
order by p.full_name;

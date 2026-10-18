-- TUCXA / Agendamento Piloto — validação do Ajuste 51
-- Somente leitura.

-- 1) A ordem gravada deve ser exatamente o row_number por created_at/id.
with expected as (
  select
    a.id,
    a.organization_id,
    a.appointment_date,
    a.entity_id,
    a.consulente_name,
    a.status,
    a.created_at,
    (a.metadata->>'order')::integer as stored_order,
    row_number() over (
      partition by a.organization_id, a.appointment_date, a.entity_id
      order by a.created_at asc, a.id asc
    )::integer as expected_order
  from public.oh_consulente_appointments a
  where a.entity_id is not null
)
select *
from expected
where stored_order is distinct from expected_order
order by appointment_date, entity_id, expected_order;

-- Esperado: 0 linhas.

-- 2) Conferência visual de 05 e 06/10/2026.
select
  a.appointment_date as data,
  e.name as entidade,
  a.consulente_name as consulente,
  a.status,
  a.created_at as incluido_em,
  a.metadata->>'order' as ordem,
  a.metadata->>'confirmed_order' as ordem_confirmada,
  a.metadata->>'orderRepairVersion' as reparo
from public.oh_consulente_appointments a
left join public.oh_spiritual_entities e on e.id = a.entity_id
where a.appointment_date in (date '2026-10-05', date '2026-10-06')
order by a.appointment_date, e.name, a.created_at, a.id;

-- 3) Duplicidades de ordem: esperado 0 linhas.
select
  organization_id,
  appointment_date,
  entity_id,
  metadata->>'order' as ordem,
  count(*) as quantidade
from public.oh_consulente_appointments
where entity_id is not null
  and coalesce(metadata->>'order', '') ~ '^[0-9]+$'
group by organization_id, appointment_date, entity_id, metadata->>'order'
having count(*) > 1
order by appointment_date, entity_id, ordem;

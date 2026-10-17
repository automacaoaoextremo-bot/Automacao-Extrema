-- TUCXA / Ajuste 77
-- LIMPEZA CONTROLADA DOS TESTES DE 13/10/2026
--
-- Remove somente os efeitos operacionais de teste:
-- - Chegou / Não Chegou;
-- - ordem de chegada;
-- - data/ator do registro de chegada;
-- - encaminhamento dependente da chegada.
--
-- NÃO exclui agendamentos.
-- NÃO altera confirmação, cancelamento, Entidade ou dados do Consulente.
-- NÃO altera metadata.order (ordem cronológica do AGENDAMENTO).
--
-- Rode primeiro o BLOCO 1.
-- O BLOCO 2 termina com ROLLBACK por segurança.

-- ============================================================
-- BLOCO 1 - PRÉVIA (SOMENTE SELECT)
-- ============================================================
select
  a.id,
  a.person_id,
  a.consulente_name,
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
left join public.oh_spiritual_entities e
  on e.id = a.entity_id
 and e.organization_id = a.organization_id
where a.organization_id = 'eef419a8-85ac-4bef-8739-95278a17f294'::uuid
  and a.appointment_date = date '2026-10-13'
  and a.status <> 'cancelado'
  and (
    a.arrival_status in ('arrived', 'absent')
    or a.arrival_order is not null
    or a.arrived_at is not null
    or a.arrival_registered_by_person_id is not null
    or a.forwarded_at is not null
    or a.forwarded_by_person_id is not null
  )
order by e.name nulls last, a.arrival_order nulls last, a.consulente_name;

-- ============================================================
-- BLOCO 2 - LIMPEZA
-- ============================================================
begin;

update public.oh_consulente_appointments
set
  arrival_status = 'pending',
  arrival_order = null,
  arrived_at = null,
  arrival_registered_by_person_id = null,
  forwarded_at = null,
  forwarded_by_person_id = null,
  status = case
    when confirmation_status = 'confirmed' then 'confirmado'
    when status in ('presente', 'ausente') then 'solicitado'
    else status
  end,
  updated_at = now()
where organization_id = 'eef419a8-85ac-4bef-8739-95278a17f294'::uuid
  and appointment_date = date '2026-10-13'
  and status <> 'cancelado'
  and (
    arrival_status in ('arrived', 'absent')
    or arrival_order is not null
    or arrived_at is not null
    or arrival_registered_by_person_id is not null
    or forwarded_at is not null
    or forwarded_by_person_id is not null
  );

-- Conferência dentro da transação.
select
  id,
  consulente_name,
  status,
  confirmation_status,
  arrival_status,
  arrival_order,
  arrived_at,
  arrival_registered_by_person_id,
  forwarded_at,
  forwarded_by_person_id,
  metadata ->> 'order' as ordem_de_agendamento_preservada
from public.oh_consulente_appointments
where organization_id = 'eef419a8-85ac-4bef-8739-95278a17f294'::uuid
  and appointment_date = date '2026-10-13'
order by consulente_name;

-- SEGURANÇA: por padrão não aplica.
rollback;

-- Após conferir que somente dados de teste serão limpos:
-- substitua ROLLBACK por COMMIT e execute novamente o BLOCO 2.

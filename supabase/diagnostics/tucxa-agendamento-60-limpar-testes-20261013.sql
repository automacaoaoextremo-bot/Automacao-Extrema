-- TUCXA / Ajuste 60
-- Limpeza CONTROLADA dos testes operacionais de Triagem em 13/10/2026.
--
-- OBJETIVO:
-- Remover somente os efeitos de teste de:
--   - botão "Chegou";
--   - ordem de chegada informada pelo Caderno;
--   - Encaminhamento.
--
-- NÃO exclui agendamentos.
-- NÃO altera Entidade.
-- NÃO remove confirmação.
-- NÃO altera a ordem de AGENDAMENTO armazenada em metadata.
--
-- Execute PRIMEIRO apenas o BLOCO 1 (SELECT) e confira as linhas.
-- Só depois execute o BLOCO 2 (transação de UPDATE).

-- ============================================================
-- BLOCO 1 — PRÉVIA: NENHUMA ALTERAÇÃO
-- ============================================================
select
  a.id,
  a.appointment_date,
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
  a.metadata
from public.oh_consulente_appointments a
left join public.oh_spiritual_entities e
  on e.id = a.entity_id
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

-- ============================================================
-- BLOCO 2 — LIMPEZA
-- Rode somente depois de conferir o SELECT acima.
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

-- Conferência dentro da mesma transação.
select
  id,
  appointment_date,
  consulente_name,
  status,
  confirmation_status,
  arrival_status,
  arrival_order,
  arrived_at,
  forwarded_at
from public.oh_consulente_appointments
where organization_id = 'eef419a8-85ac-4bef-8739-95278a17f294'::uuid
  and appointment_date = date '2026-10-13'
order by consulente_name;

-- Se a conferência estiver correta, substitua ROLLBACK por COMMIT.
rollback;

-- Para aplicar de verdade, após validar a prévia e a conferência:
-- 1. execute novamente o BLOCO 2;
-- 2. troque a última linha de ROLLBACK para COMMIT.

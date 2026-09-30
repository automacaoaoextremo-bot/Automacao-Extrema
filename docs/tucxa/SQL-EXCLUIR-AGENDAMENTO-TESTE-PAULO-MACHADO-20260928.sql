-- TUCXA / Agendamento 14
-- Exclusão controlada do agendamento de TESTE de Paulo Machado em 28/09/2026.
--
-- Segurança:
-- 1) procura Paulo Machado + data + Entidade Guerreiro;
-- 2) exige encontrar EXATAMENTE 1 agendamento;
-- 3) grava snapshot no audit log;
-- 4) exclui o agendamento; tabelas filhas com ON DELETE CASCADE acompanham a exclusão;
-- 5) o audit log preserva o registro e seu appointment_id passa a NULL por ON DELETE SET NULL.
--
-- Antes de executar, rode primeiro apenas a consulta de conferência abaixo.

select
  appointment.id,
  person.full_name,
  appointment.appointment_date,
  appointment.appointment_time,
  appointment.status,
  appointment.confirmation_status,
  appointment.arrival_status,
  appointment.arrival_order,
  entity.name as entity_name
from public.oh_consulente_appointments appointment
join public.oh_people person
  on person.id = appointment.person_id
left join public.oh_spiritual_entities entity
  on entity.id = appointment.entity_id
where person.full_name ilike 'Paulo Machado'
  and appointment.appointment_date = date '2026-09-28'
  and coalesce(entity.name, '') ilike 'Guerreiro';

-- Se e somente se a consulta acima retornar o único agendamento de teste correto,
-- execute o bloco abaixo inteiro.

do $$
declare
  v_appointment public.oh_consulente_appointments%rowtype;
  v_count integer;
begin
  select count(*)
    into v_count
  from public.oh_consulente_appointments appointment
  join public.oh_people person
    on person.id = appointment.person_id
  left join public.oh_spiritual_entities entity
    on entity.id = appointment.entity_id
  where person.full_name ilike 'Paulo Machado'
    and appointment.appointment_date = date '2026-09-28'
    and coalesce(entity.name, '') ilike 'Guerreiro';

  if v_count <> 1 then
    raise exception
      'Exclusão abortada: esperado exatamente 1 agendamento de Paulo Machado em 28/09/2026 com Guerreiro; encontrados %.',
      v_count;
  end if;

  select appointment.*
    into v_appointment
  from public.oh_consulente_appointments appointment
  join public.oh_people person
    on person.id = appointment.person_id
  left join public.oh_spiritual_entities entity
    on entity.id = appointment.entity_id
  where person.full_name ilike 'Paulo Machado'
    and appointment.appointment_date = date '2026-09-28'
    and coalesce(entity.name, '') ilike 'Guerreiro'
  limit 1;

  insert into public.oh_appointment_audit_log (
    organization_id,
    appointment_id,
    actor_person_id,
    action,
    snapshot,
    details
  )
  values (
    v_appointment.organization_id,
    v_appointment.id,
    null,
    'delete_test_appointment_ag14',
    to_jsonb(v_appointment),
    jsonb_build_object(
      'reason', 'Exclusão manual do agendamento de teste solicitado no Agendamento-14',
      'person', 'Paulo Machado',
      'appointment_date', '2026-09-28',
      'entity', 'Guerreiro'
    )
  );

  delete from public.oh_consulente_appointments
  where id = v_appointment.id
    and organization_id = v_appointment.organization_id;

  raise notice 'Agendamento de teste removido com segurança. ID original: %', v_appointment.id;
end
$$;

-- Conferência final: deve retornar zero linhas.
select
  appointment.id,
  person.full_name,
  appointment.appointment_date,
  entity.name as entity_name
from public.oh_consulente_appointments appointment
join public.oh_people person
  on person.id = appointment.person_id
left join public.oh_spiritual_entities entity
  on entity.id = appointment.entity_id
where person.full_name ilike 'Paulo Machado'
  and appointment.appointment_date = date '2026-09-28'
  and coalesce(entity.name, '') ilike 'Guerreiro';

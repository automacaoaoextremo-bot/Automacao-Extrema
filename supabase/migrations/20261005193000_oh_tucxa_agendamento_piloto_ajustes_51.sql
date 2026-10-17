-- Organização em Harmonia / TUCXA
-- Agendamento Piloto — Ajustes 51
-- Regra definitiva de ordem: data/hora ORIGINAL de inclusão (created_at).
-- Quem agendou primeiro aparece primeiro, independentemente de confirmação,
-- cancelamento posterior ou troca de Entidade.

begin;

-- A proteção anterior considerava apenas status ativos e a migration 50
-- priorizava metadata.order antes de created_at. Ambas as regras são
-- substituídas pela cronologia original do agendamento.
drop index if exists public.oh_consulente_appointments_active_entity_order_uidx;
drop index if exists public.oh_consulente_appointments_entity_order_uidx;

-- Repara todo o histórico. Primeiro usa uma faixa temporária negativa para
-- impedir colisões durante a renumeração; depois grava 1..N por created_at/id.
with numbered as (
  select
    a.id,
    row_number() over (
      partition by a.organization_id, a.appointment_date, a.entity_id
      order by a.created_at asc, a.id asc
    )::integer as rn
  from public.oh_consulente_appointments a
  where a.entity_id is not null
)
update public.oh_consulente_appointments a
set metadata = coalesce(a.metadata, '{}'::jsonb) || jsonb_build_object(
      'order', -1000000 - n.rn,
      'confirmed_order', -1000000 - n.rn
    )
from numbered n
where a.id = n.id;

with ranked as (
  select
    a.id,
    row_number() over (
      partition by a.organization_id, a.appointment_date, a.entity_id
      order by a.created_at asc, a.id asc
    )::integer as new_order
  from public.oh_consulente_appointments a
  where a.entity_id is not null
)
update public.oh_consulente_appointments a
set metadata = coalesce(a.metadata, '{}'::jsonb) || jsonb_build_object(
      'order', r.new_order,
      'confirmed_order', r.new_order,
      'orderRepairedAt', now(),
      'orderRepairVersion', 'ajustes-51-created-at'
    ),
    updated_at = now()
from ranked r
where a.id = r.id;

-- A ordem passa a ser única inclusive para cancelados. Assim uma vaga liberada
-- não reutiliza a posição histórica de quem havia agendado antes.
create unique index oh_consulente_appointments_entity_order_uidx
  on public.oh_consulente_appointments (
    organization_id,
    appointment_date,
    entity_id,
    ((metadata->>'order')::integer)
  )
  where entity_id is not null
    and coalesce(metadata->>'order', '') ~ '^[0-9]+$';

-- Recalcula uma Entidade/data pela cronologia original. A fase negativa evita
-- colisões com o índice único durante o próprio UPDATE.
create or replace function public.oh_tucxa_resequence_appointment_orders(
  p_organization_id uuid,
  p_appointment_date date,
  p_entity_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_organization_id is null or p_appointment_date is null or p_entity_id is null then
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      concat_ws(':', p_organization_id::text, p_entity_id::text, p_appointment_date::text),
      0
    )
  );

  with numbered as (
    select a.id,
           row_number() over (order by a.created_at asc, a.id asc)::integer as rn
    from public.oh_consulente_appointments a
    where a.organization_id = p_organization_id
      and a.appointment_date = p_appointment_date
      and a.entity_id = p_entity_id
  )
  update public.oh_consulente_appointments a
     set metadata = coalesce(a.metadata, '{}'::jsonb) || jsonb_build_object(
           'order', -1000000 - n.rn,
           'confirmed_order', -1000000 - n.rn
         )
    from numbered n
   where a.id = n.id;

  with ranked as (
    select a.id,
           row_number() over (order by a.created_at asc, a.id asc)::integer as new_order
    from public.oh_consulente_appointments a
    where a.organization_id = p_organization_id
      and a.appointment_date = p_appointment_date
      and a.entity_id = p_entity_id
  )
  update public.oh_consulente_appointments a
     set metadata = coalesce(a.metadata, '{}'::jsonb) || jsonb_build_object(
           'order', r.new_order,
           'confirmed_order', r.new_order,
           'orderRepairedAt', now(),
           'orderRepairVersion', 'ajustes-51-created-at'
         ),
         updated_at = now()
    from ranked r
   where a.id = r.id;
end;
$$;

revoke all on function public.oh_tucxa_resequence_appointment_orders(uuid, date, uuid) from public;
grant execute on function public.oh_tucxa_resequence_appointment_orders(uuid, date, uuid) to service_role;

-- Toda troca de Entidade dispara a recomposição tanto da origem quanto do
-- destino. O created_at não é alterado, portanto a pessoa entra exatamente na
-- posição correspondente ao momento em que fez o agendamento original.
create or replace function public.oh_tucxa_resequence_after_entity_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group record;
begin
  for v_group in
    select distinct organization_id, appointment_date, entity_id
    from (
      select o.organization_id, o.appointment_date, o.entity_id
      from old_rows o
      join new_rows n on n.id = o.id
      where o.entity_id is distinct from n.entity_id and o.entity_id is not null
      union all
      select n.organization_id, n.appointment_date, n.entity_id
      from old_rows o
      join new_rows n on n.id = o.id
      where o.entity_id is distinct from n.entity_id and n.entity_id is not null
    ) x
  loop
    perform public.oh_tucxa_resequence_appointment_orders(
      v_group.organization_id,
      v_group.appointment_date,
      v_group.entity_id
    );
  end loop;
  return null;
end;
$$;

drop trigger if exists oh_tucxa_resequence_after_entity_change_trg
  on public.oh_consulente_appointments;

create trigger oh_tucxa_resequence_after_entity_change_trg
after update on public.oh_consulente_appointments
referencing old table as old_rows new table as new_rows
for each statement
execute function public.oh_tucxa_resequence_after_entity_change();

-- A reserva nova não pode usar count(ativos)+1, pois isso reutilizaria a ordem
-- de um cancelado. Substituímos somente a função de reserva, mantendo as demais
-- regras do Ajuste 21 e calculando a próxima ordem como MAX histórico + 1.
create or replace function public.oh_tucxa_pilot_reserve_appointment(
  p_organization_id uuid,
  p_person_id uuid,
  p_entity_id uuid,
  p_appointment_date date,
  p_scheduled_by_person_id uuid,
  p_booking_channel text,
  p_consulente_name text,
  p_whatsapp text,
  p_email text,
  p_notes text,
  p_confirmation_token_hash text,
  p_confirmation_expires_at timestamptz,
  p_appointment_time text default '20:00'
)
returns table (
  appointment_id uuid,
  confirmed_order integer,
  confirmed_capacity integer,
  confirmed_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_weekday text;
  v_occurrence integer;
  v_capacity integer;
  v_available boolean := true;
  v_override_available boolean;
  v_override_capacity integer;
  v_booked integer := 0;
  v_order integer := 1;
  v_id uuid;
begin
  if p_organization_id is null or p_entity_id is null or p_appointment_date is null then
    raise exception using message = 'INVALID_APPOINTMENT_CONTEXT';
  end if;

  v_weekday := case extract(isodow from p_appointment_date)
    when 1 then 'segunda'
    when 2 then 'terca'
    else ''
  end;
  v_occurrence := ((extract(day from p_appointment_date)::integer - 1) / 7) + 1;

  if v_weekday = '' then
    raise exception using message = 'PILOT_DATE_NOT_ALLOWED';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      concat_ws(':', p_organization_id::text, p_entity_id::text, p_appointment_date::text),
      0
    )
  );

  select greatest(1, coalesce(schedule.default_capacity, entity.daily_capacity, 4))
    into v_capacity
  from public.oh_tucxa_pilot_entity_schedule schedule
  join public.oh_spiritual_entities entity
    on entity.id = schedule.entity_id
   and entity.organization_id = schedule.organization_id
  where schedule.organization_id = p_organization_id
    and schedule.entity_id = p_entity_id
    and schedule.weekday = v_weekday
    and schedule.month_occurrence = v_occurrence
    and schedule.active = true
    and entity.active = true
    and entity.appointment_enabled = true
  limit 1;

  if v_capacity is null then
    raise exception using message = 'PILOT_ENTITY_NOT_SCHEDULED';
  end if;

  select override.available, override.capacity
    into v_override_available, v_override_capacity
  from public.oh_tucxa_pilot_entity_overrides override
  where override.organization_id = p_organization_id
    and override.entity_id = p_entity_id
    and p_appointment_date between override.starts_on and override.ends_on
  order by override.created_at desc
  limit 1;

  if found then
    v_available := coalesce(v_override_available, true);
    v_capacity := greatest(1, coalesce(v_override_capacity, v_capacity));
  end if;

  if coalesce(v_available, true) is not true then
    raise exception using message = 'PILOT_ENTITY_SUSPENDED';
  end if;

  if p_person_id is not null and exists (
    select 1
    from public.oh_consulente_appointments appointment
    where appointment.organization_id = p_organization_id
      and appointment.person_id = p_person_id
      and appointment.appointment_date = p_appointment_date
      and appointment.status in ('solicitado','confirmado','aprovado','presente','concluido')
  ) then
    raise exception using message = 'PILOT_DUPLICATE_PERSON_DATE';
  end if;

  select count(*)::integer
    into v_booked
  from public.oh_consulente_appointments appointment
  where appointment.organization_id = p_organization_id
    and appointment.entity_id = p_entity_id
    and appointment.appointment_date = p_appointment_date
    and appointment.status in ('solicitado','confirmado','aprovado','presente','concluido');

  if v_booked >= greatest(1, v_capacity) then
    raise exception using message = 'PILOT_NO_AVAILABILITY';
  end if;

  select coalesce(max(
    case
      when coalesce(appointment.metadata->>'order', '') ~ '^[0-9]+$'
        then (appointment.metadata->>'order')::integer
      else 0
    end
  ), 0) + 1
    into v_order
  from public.oh_consulente_appointments appointment
  where appointment.organization_id = p_organization_id
    and appointment.entity_id = p_entity_id
    and appointment.appointment_date = p_appointment_date;

  insert into public.oh_consulente_appointments (
    organization_id, person_id, entity_id, scheduled_by_person_id,
    consulente_name, whatsapp, email, appointment_date, appointment_time,
    status, booking_channel, notes, confirmation_status,
    confirmation_token_hash, confirmation_expires_at, metadata
  ) values (
    p_organization_id, p_person_id, p_entity_id, p_scheduled_by_person_id,
    coalesce(nullif(trim(p_consulente_name), ''), 'Filho de Fora/Consulente'),
    nullif(trim(coalesce(p_whatsapp, '')), ''),
    nullif(trim(coalesce(p_email, '')), ''),
    p_appointment_date,
    coalesce(nullif(trim(p_appointment_time), ''), '20:00'),
    'solicitado',
    coalesce(nullif(trim(p_booking_channel), ''), 'piloto'),
    nullif(trim(coalesce(p_notes, '')), ''),
    'pending',
    nullif(trim(coalesce(p_confirmation_token_hash, '')), ''),
    p_confirmation_expires_at,
    jsonb_build_object(
      'pilot', true,
      'order', v_order,
      'confirmed_order', v_order,
      'pilot_month_occurrence', v_occurrence,
      'pilot_weekday', v_weekday
    )
  ) returning id into v_id;

  return query
  select v_id, v_order, greatest(1, v_capacity), 'solicitado'::text;
end;
$$;

revoke all on function public.oh_tucxa_pilot_reserve_appointment(
  uuid, uuid, uuid, date, uuid, text, text, text, text, text, text, timestamptz, text
) from public;
grant execute on function public.oh_tucxa_pilot_reserve_appointment(
  uuid, uuid, uuid, date, uuid, text, text, text, text, text, text, timestamptz, text
) to service_role;

comment on function public.oh_tucxa_pilot_reserve_appointment(
  uuid, uuid, uuid, date, uuid, text, text, text, text, text, text, timestamptz, text
) is 'Reserva do piloto com ordem histórica cronológica por created_at. Ajuste 51.';

commit;

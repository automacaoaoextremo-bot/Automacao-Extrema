-- Organizacao em Harmonia / TUCXA
-- Agendamentos dos Filhos da Corrente e agendamento de Consulentes pela Recepcao.
-- Migration aditiva: preserva registros e historico existentes.

alter table if exists public.oh_people
  add column if not exists registration_source text,
  add column if not exists created_by_person_id uuid references public.oh_people(id) on delete set null;

alter table if exists public.oh_consulente_appointments
  add column if not exists booking_channel text not null default 'consulente',
  add column if not exists created_by_function text;

create index if not exists idx_oh_people_org_whatsapp_normalized
  on public.oh_people (
    organization_id,
    regexp_replace(coalesce(whatsapp, ''), '[^0-9]', '', 'g')
  );

create index if not exists idx_oh_consulente_appointments_scheduler_date
  on public.oh_consulente_appointments (
    organization_id,
    scheduled_by_person_id,
    appointment_date,
    appointment_time
  );

create index if not exists idx_oh_consulente_appointments_channel_date
  on public.oh_consulente_appointments (
    organization_id,
    booking_channel,
    appointment_date,
    appointment_time
  );

update public.oh_consulente_appointments appointment
set booking_channel = case
      when coalesce(appointment.metadata->>'source', '') ilike '%recepcao%' then 'recepcao'
      when coalesce(appointment.metadata->>'source', '') ilike '%filho_corrente%' then 'filho_corrente'
      else coalesce(nullif(appointment.booking_channel, ''), 'consulente')
    end
where appointment.booking_channel is null
   or appointment.booking_channel = ''
   or coalesce(appointment.metadata->>'source', '') ilike '%recepcao%'
   or coalesce(appointment.metadata->>'source', '') ilike '%filho_corrente%';

create or replace function public.oh_reserve_appointment_on_behalf(
  p_organization_id uuid,
  p_person_id uuid,
  p_entity_id uuid,
  p_event_id uuid,
  p_appointment_date date,
  p_appointment_time text,
  p_consulente_name text,
  p_whatsapp text,
  p_email text,
  p_notes text,
  p_capacity integer,
  p_idempotency_key text,
  p_scheduled_by_person_id uuid,
  p_booking_channel text,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  appointment_id uuid,
  confirmed_date date,
  confirmed_time text,
  confirmed_status text,
  confirmed_order integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserved record;
  v_channel text := lower(trim(coalesce(p_booking_channel, '')));
begin
  if p_scheduled_by_person_id is null then
    raise exception using message = 'INVALID_SCHEDULER';
  end if;

  if v_channel not in ('filho_corrente', 'recepcao') then
    raise exception using message = 'INVALID_BOOKING_CHANNEL';
  end if;

  if not exists (
    select 1
    from public.oh_people scheduler
    where scheduler.id = p_scheduled_by_person_id
      and scheduler.organization_id = p_organization_id
      and scheduler.active = true
  ) then
    raise exception using message = 'INVALID_SCHEDULER';
  end if;

  select *
    into v_reserved
  from public.oh_reserve_consulente_appointment(
    p_organization_id,
    p_person_id,
    p_entity_id,
    p_event_id,
    p_appointment_date,
    p_appointment_time,
    p_consulente_name,
    p_whatsapp,
    p_email,
    p_notes,
    p_capacity,
    p_idempotency_key,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'scheduled_by_person_id', p_scheduled_by_person_id,
      'booking_channel', v_channel
    )
  );

  update public.oh_consulente_appointments appointment
  set scheduled_by_person_id = p_scheduled_by_person_id,
      booking_channel = v_channel,
      created_by_function = case when v_channel = 'recepcao' then 'recepcao' else 'filho_corrente' end,
      metadata = coalesce(appointment.metadata, '{}'::jsonb) || jsonb_build_object(
        'scheduled_by_person_id', p_scheduled_by_person_id,
        'booking_channel', v_channel,
        'scheduled_on_behalf_at', now()
      ),
      updated_at = now()
  where appointment.id = v_reserved.appointment_id
    and appointment.organization_id = p_organization_id;

  return query
  select
    v_reserved.appointment_id::uuid,
    v_reserved.confirmed_date::date,
    v_reserved.confirmed_time::text,
    v_reserved.confirmed_status::text,
    v_reserved.confirmed_order::integer;
end;
$$;

revoke all on function public.oh_reserve_appointment_on_behalf(
  uuid, uuid, uuid, uuid, date, text, text, text, text, text,
  integer, text, uuid, text, jsonb
) from public;

grant execute on function public.oh_reserve_appointment_on_behalf(
  uuid, uuid, uuid, uuid, date, text, text, text, text, text,
  integer, text, uuid, text, jsonb
) to service_role;

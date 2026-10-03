-- TUCXA - Agendamento piloto - Ajustes 31
-- Encaminhamento e registro manual da ordem de chegada na visão Caderno.

alter table public.oh_consulente_appointments
  add column if not exists forwarded_at timestamptz,
  add column if not exists forwarded_by_person_id uuid references public.oh_people(id) on delete set null;

create index if not exists idx_oh_consulente_appointments_forwarded
  on public.oh_consulente_appointments (organization_id, appointment_date, forwarded_at);

create or replace function public.oh_tucxa_pilot_set_arrival_order(
  p_organization_id uuid,
  p_appointment_id uuid,
  p_actor_person_id uuid,
  p_arrival_order integer
)
returns table (
  appointment_id uuid,
  confirmed_arrival_status text,
  confirmed_arrival_order integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date;
begin
  if p_arrival_order is null or p_arrival_order < 1 then
    raise exception using message = 'INVALID_ARRIVAL_ORDER';
  end if;

  select appointment_date
    into v_date
  from public.oh_consulente_appointments
  where id = p_appointment_id
    and organization_id = p_organization_id
  for update;

  if v_date is null then
    raise exception using message = 'APPOINTMENT_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(concat_ws(':', p_organization_id::text, v_date::text, 'arrival'), 0));

  if exists (
    select 1
    from public.oh_consulente_appointments
    where organization_id = p_organization_id
      and appointment_date = v_date
      and arrival_status = 'arrived'
      and arrival_order = p_arrival_order
      and id <> p_appointment_id
  ) then
    raise exception using message = 'ARRIVAL_ORDER_IN_USE';
  end if;

  update public.oh_consulente_appointments
  set arrival_status = 'arrived',
      arrived_at = coalesce(arrived_at, now()),
      arrival_order = p_arrival_order,
      arrival_registered_by_person_id = p_actor_person_id,
      status = case when status in ('solicitado','confirmado','aprovado') then 'presente' else status end,
      updated_at = now()
  where id = p_appointment_id
    and organization_id = p_organization_id;

  return query select p_appointment_id, 'arrived'::text, p_arrival_order;
end;
$$;

revoke all on function public.oh_tucxa_pilot_set_arrival_order(uuid, uuid, uuid, integer) from public;
grant execute on function public.oh_tucxa_pilot_set_arrival_order(uuid, uuid, uuid, integer) to service_role;

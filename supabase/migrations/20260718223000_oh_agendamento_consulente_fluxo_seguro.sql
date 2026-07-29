-- Organização em Harmonia / TUCXA
-- Fluxo seguro de agendamento do Consulente, contato por e-mail e consentimento.
-- Migration aditiva e idempotente: não remove dados existentes.

alter table if exists public.oh_people
  add column if not exists notification_email text,
  add column if not exists communications_opt_in boolean not null default false,
  add column if not exists communications_opt_in_at timestamptz,
  add column if not exists communications_opt_in_source text,
  add column if not exists communications_opt_out_at timestamptz;

alter table if exists public.oh_consulente_appointments
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_oh_consulente_appointments_slot
  on public.oh_consulente_appointments (
    organization_id,
    entity_id,
    appointment_date,
    appointment_time,
    status
  );

create index if not exists idx_oh_consulente_appointments_person_date
  on public.oh_consulente_appointments (
    organization_id,
    person_id,
    appointment_date,
    appointment_time
  );

create unique index if not exists idx_oh_consulente_appointments_person_unique_slot
  on public.oh_consulente_appointments (
    organization_id,
    person_id,
    appointment_date,
    appointment_time
  )
  where person_id is not null
    and status not in ('cancelado', 'cancelamento_solicitado', 'ausente');

create or replace function public.oh_reserve_consulente_appointment(
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
  v_existing public.oh_consulente_appointments%rowtype;
  v_booked integer := 0;
  v_order integer := 1;
  v_inserted public.oh_consulente_appointments%rowtype;
begin
  if p_organization_id is null or p_person_id is null or p_entity_id is null then
    raise exception using message = 'INVALID_APPOINTMENT_CONTEXT';
  end if;

  if p_appointment_date is null or coalesce(trim(p_appointment_time), '') = '' then
    raise exception using message = 'INVALID_APPOINTMENT_PERIOD';
  end if;

  if coalesce(p_capacity, 0) < 1 then
    raise exception using message = 'INVALID_APPOINTMENT_CAPACITY';
  end if;

  -- Serializa as reservas do mesmo período/entidade e elimina a corrida pela última vaga.
  perform pg_advisory_xact_lock(
    hashtextextended(
      concat_ws(
        ':',
        p_organization_id::text,
        p_entity_id::text,
        p_appointment_date::text,
        trim(p_appointment_time)
      ),
      0
    )
  );

  if coalesce(trim(p_idempotency_key), '') <> '' then
    select appointment.*
      into v_existing
    from public.oh_consulente_appointments appointment
    where appointment.organization_id = p_organization_id
      and appointment.person_id = p_person_id
      and appointment.metadata->>'idempotency_key' = trim(p_idempotency_key)
    order by appointment.created_at desc
    limit 1;

    if v_existing.id is not null then
      return query
      select
        v_existing.id,
        v_existing.appointment_date,
        v_existing.appointment_time,
        v_existing.status,
        coalesce((v_existing.metadata->>'order')::integer, 1);
      return;
    end if;
  end if;

  if exists (
    select 1
    from public.oh_consulente_appointments appointment
    where appointment.organization_id = p_organization_id
      and appointment.person_id = p_person_id
      and appointment.appointment_date = p_appointment_date
      and coalesce(appointment.appointment_time, '') = trim(p_appointment_time)
      and appointment.status not in ('cancelado', 'cancelamento_solicitado', 'ausente')
  ) then
    raise exception using message = 'DUPLICATE_APPOINTMENT';
  end if;

  select count(*)::integer
    into v_booked
  from public.oh_consulente_appointments appointment
  where appointment.organization_id = p_organization_id
    and appointment.entity_id = p_entity_id
    and appointment.appointment_date = p_appointment_date
    and coalesce(appointment.appointment_time, '') = trim(p_appointment_time)
    and appointment.status not in ('cancelado', 'cancelamento_solicitado', 'ausente');

  if v_booked >= p_capacity then
    raise exception using message = 'NO_AVAILABILITY';
  end if;

  v_order := v_booked + 1;

  insert into public.oh_consulente_appointments (
    organization_id,
    person_id,
    entity_id,
    event_id,
    consulente_name,
    whatsapp,
    email,
    appointment_date,
    appointment_time,
    is_recurring,
    recurrence_count,
    status,
    notes,
    metadata,
    updated_at
  )
  values (
    p_organization_id,
    p_person_id,
    p_entity_id,
    p_event_id,
    trim(p_consulente_name),
    nullif(trim(coalesce(p_whatsapp, '')), ''),
    nullif(lower(trim(coalesce(p_email, ''))), ''),
    p_appointment_date,
    trim(p_appointment_time),
    false,
    1,
    'confirmado',
    nullif(trim(coalesce(p_notes, '')), ''),
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'order', v_order,
      'idempotency_key', nullif(trim(coalesce(p_idempotency_key, '')), ''),
      'reserved_at', now()
    ),
    now()
  )
  returning * into v_inserted;

  return query
  select
    v_inserted.id,
    v_inserted.appointment_date,
    v_inserted.appointment_time,
    v_inserted.status,
    v_order;
exception
  when unique_violation then
    raise exception using message = 'DUPLICATE_APPOINTMENT';
end;
$$;

revoke all on function public.oh_reserve_consulente_appointment(
  uuid, uuid, uuid, uuid, date, text, text, text, text, text, integer, text, jsonb
) from public;

grant execute on function public.oh_reserve_consulente_appointment(
  uuid, uuid, uuid, uuid, date, text, text, text, text, text, integer, text, jsonb
) to service_role;

-- Organização em Harmonia / TUCXA
-- Edição e cancelamento lógico de agendamentos + regra de ocorrências mensais.
-- Migration aditiva: preserva registros e mantém compatibilidade com eventos antigos.

alter table if exists public.oh_consulente_appointments
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by_person_id uuid references public.oh_people(id) on delete set null,
  add column if not exists cancellation_reason text;

create index if not exists idx_oh_consulente_appointments_person_status_date
  on public.oh_consulente_appointments (
    organization_id,
    person_id,
    status,
    appointment_date,
    appointment_time
  );

-- Acrescenta a antecedência padrão de 24 horas sem sobrescrever uma configuração já definida.
update public.oh_module_settings
set settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object(
      'appointmentEditCutoffMinutes',
      case
        when coalesce(settings->>'appointmentEditCutoffMinutes', '') ~ '^[0-9]+$'
          then (settings->>'appointmentEditCutoffMinutes')::integer
        else 1440
      end
    ),
    updated_at = now()
where module_slug in ('agenda-viva', 'atendimento-em-harmonia');

-- Nos eventos recorrentes de atendimento a Consulentes/Filhos de Fora,
-- configura 1ª a 4ª ocorrências do mês quando a regra ainda não foi cadastrada.
-- A regra fica no próprio evento e, portanto, pode ser reutilizada por todos os calendários.
update public.agv_events event
set metadata = coalesce(event.metadata, '{}'::jsonb) || jsonb_build_object(
      'allowedMonthOccurrences', jsonb_build_array(1, 2, 3, 4),
      'allowed_month_occurrences', jsonb_build_array(1, 2, 3, 4)
    ),
    updated_at = now()
where event.organization_id in (
    select organization.id
    from public.oh_organizations organization
    where organization.slug = 'tucxa'
       or organization.name ilike '%tucxa%'
  )
  and (
    upper(coalesce(event.recurrence_rule, '')) like '%BYDAY=MO%'
    or upper(coalesce(event.recurrence_rule, '')) like '%BYDAY=TU%'
  )
  and not (coalesce(event.metadata, '{}'::jsonb) ? 'allowedMonthOccurrences')
  and not (coalesce(event.metadata, '{}'::jsonb) ? 'allowed_month_occurrences')
  and (
    lower(coalesce(event.group_slug, '')) in (
      'atendimento-segunda', 'atendimento-terca',
      'grupo-segunda-feira', 'grupo-terca-feira',
      'segunda', 'terca'
    )
    or lower(coalesce(event.event_type, '')) in (
      'atendimento-segunda', 'atendimento-terca',
      'grupo-segunda-feira', 'grupo-terca-feira',
      'segunda', 'terca'
    )
    or lower(coalesce(event.title, '')) like '%filhos de fora%'
    or lower(coalesce(event.title, '')) like '%consulente%'
  )
  and lower(
    coalesce(
      event.metadata->>'audience',
      event.metadata->>'publico',
      event.metadata->>'targetAudience',
      ''
    )
  ) not in ('filhos-corrente', 'filhos_corrente', 'somente filhos da corrente');

create or replace function public.oh_reschedule_consulente_appointment(
  p_appointment_id uuid,
  p_organization_id uuid,
  p_person_id uuid,
  p_entity_id uuid,
  p_event_id uuid,
  p_appointment_date date,
  p_appointment_time text,
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
  v_current public.oh_consulente_appointments%rowtype;
  v_booked integer := 0;
  v_order integer := 1;
  v_updated public.oh_consulente_appointments%rowtype;
begin
  if p_appointment_id is null
     or p_organization_id is null
     or p_person_id is null
     or p_entity_id is null then
    raise exception using message = 'INVALID_APPOINTMENT_CONTEXT';
  end if;

  if p_appointment_date is null or coalesce(trim(p_appointment_time), '') = '' then
    raise exception using message = 'INVALID_APPOINTMENT_PERIOD';
  end if;

  if coalesce(p_capacity, 0) < 1 then
    raise exception using message = 'INVALID_APPOINTMENT_CAPACITY';
  end if;

  select appointment.*
    into v_current
  from public.oh_consulente_appointments appointment
  where appointment.id = p_appointment_id
    and appointment.organization_id = p_organization_id
    and appointment.person_id = p_person_id
  for update;

  if v_current.id is null then
    raise exception using message = 'APPOINTMENT_NOT_FOUND';
  end if;

  if v_current.status in ('cancelado', 'cancelamento_solicitado', 'ausente') then
    raise exception using message = 'APPOINTMENT_NOT_EDITABLE';
  end if;

  -- Repetir a mesma requisição devolve a alteração já confirmada.
  if coalesce(trim(p_idempotency_key), '') <> ''
     and v_current.metadata->>'last_reschedule_idempotency_key' = trim(p_idempotency_key) then
    return query
    select
      v_current.id,
      v_current.appointment_date,
      v_current.appointment_time,
      v_current.status,
      coalesce((v_current.metadata->>'order')::integer, 1);
    return;
  end if;

  -- Serializa alterações para a nova combinação de entidade/data/período.
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

  if exists (
    select 1
    from public.oh_consulente_appointments appointment
    where appointment.organization_id = p_organization_id
      and appointment.person_id = p_person_id
      and appointment.id <> p_appointment_id
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
    and appointment.id <> p_appointment_id
    and appointment.appointment_date = p_appointment_date
    and coalesce(appointment.appointment_time, '') = trim(p_appointment_time)
    and appointment.status not in ('cancelado', 'cancelamento_solicitado', 'ausente');

  if v_booked >= p_capacity then
    raise exception using message = 'NO_AVAILABILITY';
  end if;

  v_order := v_booked + 1;

  update public.oh_consulente_appointments appointment
  set entity_id = p_entity_id,
      event_id = p_event_id,
      appointment_date = p_appointment_date,
      appointment_time = trim(p_appointment_time),
      status = 'confirmado',
      cancelled_at = null,
      cancelled_by_person_id = null,
      cancellation_reason = null,
      metadata = coalesce(appointment.metadata, '{}'::jsonb)
        || coalesce(p_metadata, '{}'::jsonb)
        || jsonb_build_object(
          'order', v_order,
          'rescheduled_at', now(),
          'previous_entity_id', v_current.entity_id,
          'previous_event_id', v_current.event_id,
          'previous_appointment_date', v_current.appointment_date,
          'previous_appointment_time', v_current.appointment_time,
          'last_reschedule_idempotency_key', nullif(trim(coalesce(p_idempotency_key, '')), '')
        ),
      updated_at = now()
  where appointment.id = p_appointment_id
    and appointment.organization_id = p_organization_id
    and appointment.person_id = p_person_id
  returning appointment.* into v_updated;

  return query
  select
    v_updated.id,
    v_updated.appointment_date,
    v_updated.appointment_time,
    v_updated.status,
    v_order;
exception
  when unique_violation then
    raise exception using message = 'DUPLICATE_APPOINTMENT';
end;
$$;

revoke all on function public.oh_reschedule_consulente_appointment(
  uuid, uuid, uuid, uuid, uuid, date, text, integer, text, jsonb
) from public;

grant execute on function public.oh_reschedule_consulente_appointment(
  uuid, uuid, uuid, uuid, uuid, date, text, integer, text, jsonb
) to service_role;

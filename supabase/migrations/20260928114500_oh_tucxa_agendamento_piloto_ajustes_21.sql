-- Organização em Harmonia / TUCXA
-- Agendamento Piloto — Ajustes 21
-- 28/09/2026
-- 1) separa a pessoa atendida do titular do WhatsApp em agendamentos para terceiros;
-- 2) registra justificativa e anexo opcional no cancelamento.

alter table if exists public.oh_consulente_appointments
  add column if not exists source_contact_person_id uuid references public.oh_people(id) on delete set null,
  add column if not exists cancellation_attachment_path text,
  add column if not exists cancellation_attachment_name text,
  add column if not exists cancellation_attachment_type text;

create index if not exists idx_oh_consulente_appointments_source_contact
  on public.oh_consulente_appointments (organization_id, source_contact_person_id, appointment_date);

insert into storage.buckets (id, name, public)
values ('tucxa-agendamento-cancelamentos', 'tucxa-agendamento-cancelamentos', false)
on conflict (id) do update set public = false;

comment on column public.oh_consulente_appointments.source_contact_person_id is
  'Pessoa cadastrada que originou/recebe as comunicações quando o atendimento é para terceiro.';
comment on column public.oh_consulente_appointments.cancellation_attachment_path is
  'Caminho privado do anexo opcional do cancelamento no Storage.';

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

  -- IMPORTANTE:
  -- Um SELECT ... INTO sem linhas zera os alvos em PL/pgSQL. A versão anterior
  -- escrevia diretamente em v_available/v_capacity; quando não havia override,
  -- v_capacity passava a NULL e greatest(1, v_capacity) fazia a reserva operar
  -- como se a capacidade fosse 1. Isso fazia a tela exibir, por exemplo, 3 vagas
  -- enquanto a RPC recusava o segundo agendamento.
  select override.available,
         override.capacity
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

  v_order := v_booked + 1;

  insert into public.oh_consulente_appointments (
    organization_id,
    person_id,
    entity_id,
    scheduled_by_person_id,
    consulente_name,
    whatsapp,
    email,
    appointment_date,
    appointment_time,
    status,
    booking_channel,
    notes,
    confirmation_status,
    confirmation_token_hash,
    confirmation_expires_at,
    metadata
  ) values (
    p_organization_id,
    p_person_id,
    p_entity_id,
    p_scheduled_by_person_id,
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
  select
    v_id,
    v_order,
    greatest(1, v_capacity),
    'solicitado'::text;
end;
$$;


-- A função continua restrita ao service role.
revoke all on function public.oh_tucxa_pilot_reserve_appointment(
  uuid, uuid, uuid, date, uuid, text, text, text, text, text, text, timestamptz, text
) from public;
grant execute on function public.oh_tucxa_pilot_reserve_appointment(
  uuid, uuid, uuid, date, uuid, text, text, text, text, text, text, timestamptz, text
) to service_role;

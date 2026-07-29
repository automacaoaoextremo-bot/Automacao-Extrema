-- Organizacao em Harmonia / TUCXA
-- Confirmacao de presenca, evento especial para todos os grupos, telefone canonico
-- e campos do atendimento de quarta-feira pela Recepcao.
-- Migration aditiva: preserva historico e nao remove registros.

alter table if exists public.oh_people
  add column if not exists normalized_whatsapp text;

update public.oh_people
set normalized_whatsapp = case
  when regexp_replace(coalesce(whatsapp, ''), '[^0-9]', '', 'g') like '55%'
    and length(regexp_replace(coalesce(whatsapp, ''), '[^0-9]', '', 'g')) >= 12
  then substring(regexp_replace(coalesce(whatsapp, ''), '[^0-9]', '', 'g') from 3)
  else regexp_replace(coalesce(whatsapp, ''), '[^0-9]', '', 'g')
end
where normalized_whatsapp is null or normalized_whatsapp = '';

create or replace function public.oh_normalize_br_phone(p_value text)
returns text
language plpgsql
immutable
as $$
declare
  v_digits text := regexp_replace(coalesce(p_value, ''), '[^0-9]', '', 'g');
begin
  while length(v_digits) > 11 and left(v_digits, 1) = '0' loop
    v_digits := substring(v_digits from 2);
  end loop;
  if length(v_digits) >= 12 and left(v_digits, 2) = '55' then
    v_digits := substring(v_digits from 3);
  end if;
  if length(v_digits) > 11 then
    v_digits := right(v_digits, 11);
  end if;
  return v_digits;
end;
$$;

create or replace function public.oh_people_sync_normalized_whatsapp()
returns trigger
language plpgsql
as $$
begin
  new.normalized_whatsapp := public.oh_normalize_br_phone(new.whatsapp);
  return new;
end;
$$;

drop trigger if exists trg_oh_people_sync_normalized_whatsapp on public.oh_people;
create trigger trg_oh_people_sync_normalized_whatsapp
before insert or update of whatsapp on public.oh_people
for each row execute function public.oh_people_sync_normalized_whatsapp();

create index if not exists idx_oh_people_org_normalized_whatsapp
  on public.oh_people (organization_id, normalized_whatsapp)
  where normalized_whatsapp is not null and normalized_whatsapp <> '';

alter table if exists public.oh_consulente_appointments
  add column if not exists age_at_appointment integer,
  add column if not exists treatment_need text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'oh_consulente_appointments_age_valid'
      and conrelid = 'public.oh_consulente_appointments'::regclass
  ) then
    alter table public.oh_consulente_appointments
      add constraint oh_consulente_appointments_age_valid
      check (age_at_appointment is null or age_at_appointment between 0 and 120);
  end if;
end $$;

create table if not exists public.oh_event_attendance_confirmations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  event_id uuid not null references public.agv_events(id) on delete cascade,
  occurrence_date date not null,
  person_id uuid not null references public.oh_people(id) on delete cascade,
  group_slug text,
  status text not null check (status in ('confirmed', 'cannot_attend')),
  responded_at timestamptz not null default now(),
  response_source text not null default 'filho_corrente',
  checked_in_at timestamptz,
  checked_in_by_person_id uuid references public.oh_people(id) on delete set null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, event_id, occurrence_date, person_id)
);

create index if not exists idx_oh_event_attendance_event_date
  on public.oh_event_attendance_confirmations (organization_id, event_id, occurrence_date, status);
create index if not exists idx_oh_event_attendance_person_date
  on public.oh_event_attendance_confirmations (organization_id, person_id, occurrence_date);

create or replace function public.oh_reserve_reception_appointment(
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
  p_metadata jsonb default '{}'::jsonb,
  p_recommended_by_entity_id uuid default null,
  p_age_at_appointment integer default null,
  p_treatment_need text default null
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
begin
  if lower(trim(coalesce(p_booking_channel, ''))) <> 'recepcao' then
    raise exception using message = 'RECEPTION_REQUIRED';
  end if;
  if p_age_at_appointment is not null and (p_age_at_appointment < 0 or p_age_at_appointment > 120) then
    raise exception using message = 'INVALID_AGE';
  end if;

  select * into v_reserved
  from public.oh_reserve_appointment_on_behalf(
    p_organization_id, p_person_id, p_entity_id, p_event_id,
    p_appointment_date, p_appointment_time, p_consulente_name,
    p_whatsapp, p_email, p_notes, p_capacity, p_idempotency_key,
    p_scheduled_by_person_id, 'recepcao',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'recommended_by_entity_id', p_recommended_by_entity_id,
      'age_at_appointment', p_age_at_appointment,
      'treatment_need', p_treatment_need
    )
  );

  update public.oh_consulente_appointments appointment
  set recommended_by_entity_id = p_recommended_by_entity_id,
      age_at_appointment = p_age_at_appointment,
      treatment_need = nullif(trim(coalesce(p_treatment_need, '')), ''),
      metadata = coalesce(appointment.metadata, '{}'::jsonb) || jsonb_build_object(
        'recommended_by_entity_id', p_recommended_by_entity_id,
        'age_at_appointment', p_age_at_appointment,
        'treatment_need', nullif(trim(coalesce(p_treatment_need, '')), ''),
        'reception_recorded_at', now()
      ),
      updated_at = now()
  where appointment.id = v_reserved.appointment_id
    and appointment.organization_id = p_organization_id;

  return query select
    v_reserved.appointment_id::uuid,
    v_reserved.confirmed_date::date,
    v_reserved.confirmed_time::text,
    v_reserved.confirmed_status::text,
    v_reserved.confirmed_order::integer;
end;
$$;

revoke all on function public.oh_reserve_reception_appointment(
  uuid, uuid, uuid, uuid, date, text, text, text, text, text,
  integer, text, uuid, text, jsonb, uuid, integer, text
) from public;

grant execute on function public.oh_reserve_reception_appointment(
  uuid, uuid, uuid, uuid, date, text, text, text, text, text,
  integer, text, uuid, text, jsonb, uuid, integer, text
) to service_role;

-- Ativa confirmacao de presenca para os trabalhos regulares de quinta dos grupos.
update public.agv_events event
set metadata = coalesce(event.metadata, '{}'::jsonb) || jsonb_build_object(
      'attendanceConfirmationRequired', true,
      'allowOptionalEntityAppointment', true
    ),
    updated_at = now()
where upper(coalesce(event.recurrence_rule, '')) like '%BYDAY=TH%'
  and (
    lower(coalesce(event.title, '') || ' ' || coalesce(event.event_type, '') || ' ' || coalesce(event.group_slug, '')) like '%grupo%1%'
    or lower(coalesce(event.title, '') || ' ' || coalesce(event.event_type, '') || ' ' || coalesce(event.group_slug, '')) like '%grupo%2%'
  );

-- Configura o trabalho pontual de retorno das ferias para todos os grupos.
update public.agv_events event
set metadata = coalesce(event.metadata, '{}'::jsonb) || jsonb_build_object(
      'thursdayGroupScope', jsonb_build_array('grupo-1', 'grupo-2'),
      'allThursdayGroups', true,
      'attendanceConfirmationRequired', true,
      'allowOptionalEntityAppointment', true,
      'overrideRegularGroupSchedule', true
    ),
    updated_at = now()
where event.title ilike '%Trabalho para todos os Cavalinhos e Cambonos%Retorno F%rias Julho%'
  and (event.starts_at at time zone 'America/Sao_Paulo')::date = date '2026-07-30';

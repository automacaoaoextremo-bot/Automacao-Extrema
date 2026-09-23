-- Organização em Harmonia / TUCXA
-- Piloto de agendamentos de Filhos de Fora/Consulentes — setembro/2026.
--
-- Objetivos:
-- 1. calendário de Entidades por segunda/terça e ocorrência do mês;
-- 2. capacidade máxima por Entidade/dia;
-- 3. suspensão/disponibilização por data ou período;
-- 4. confirmação segura por link até o horário-limite;
-- 5. base para envio de SMS sem armazenar o token puro no banco.
--
-- Migration aditiva e idempotente. Não remove histórico existente.

alter table if exists public.oh_consulente_appointments
  add column if not exists confirmation_status text not null default 'not_required',
  add column if not exists confirmation_token_hash text,
  add column if not exists confirmation_expires_at timestamptz,
  add column if not exists confirmation_sent_at timestamptz,
  add column if not exists confirmation_channel text,
  add column if not exists confirmed_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'oh_consulente_appointments_confirmation_status_check'
      and conrelid = 'public.oh_consulente_appointments'::regclass
  ) then
    alter table public.oh_consulente_appointments
      add constraint oh_consulente_appointments_confirmation_status_check
      check (confirmation_status in ('not_required','pending','confirmed','declined','expired'));
  end if;
end
$$;

create unique index if not exists idx_oh_consulente_appointments_confirmation_token
  on public.oh_consulente_appointments (confirmation_token_hash)
  where confirmation_token_hash is not null;

create index if not exists idx_oh_consulente_appointments_confirmation_pending
  on public.oh_consulente_appointments (organization_id, appointment_date, confirmation_status)
  where confirmation_status = 'pending';

create table if not exists public.oh_tucxa_pilot_entity_schedule (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  entity_id uuid not null references public.oh_spiritual_entities(id) on delete cascade,
  weekday text not null check (weekday in ('segunda','terca')),
  month_occurrence integer not null check (month_occurrence between 1 and 5),
  default_capacity integer not null default 4 check (default_capacity >= 1),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, entity_id, weekday, month_occurrence)
);

create index if not exists idx_oh_tucxa_pilot_entity_schedule_lookup
  on public.oh_tucxa_pilot_entity_schedule (organization_id, weekday, month_occurrence, active);

create table if not exists public.oh_tucxa_pilot_entity_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  entity_id uuid not null references public.oh_spiritual_entities(id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  available boolean not null default true,
  capacity integer check (capacity is null or capacity >= 1),
  reason text,
  created_by_person_id uuid references public.oh_people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create index if not exists idx_oh_tucxa_pilot_entity_overrides_lookup
  on public.oh_tucxa_pilot_entity_overrides (organization_id, entity_id, starts_on, ends_on, created_at desc);

alter table public.oh_tucxa_pilot_entity_schedule enable row level security;
alter table public.oh_tucxa_pilot_entity_overrides enable row level security;

-- As tabelas do piloto são acessadas pelas rotas de servidor com service role.
-- Não são criadas policies de acesso direto pelo navegador.

with tucxa as (
  select id
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by created_at asc
  limit 1
), entities(name, slug, usual_days, line, entity_type, notes) as (
  values
    ('Ubirajara', 'ubirajara', array['segunda']::text[], 'Atendimento Filhos de Fora', 'Entidade de atendimento', 'Piloto de agendamentos.'),
    ('Aruando', 'aruando', array['segunda']::text[], 'Atendimento Filhos de Fora', 'Entidade de atendimento', 'Piloto de agendamentos.'),
    ('Raio de Luz', 'raio-de-luz', array['segunda']::text[], 'Atendimento Filhos de Fora', 'Entidade de atendimento', 'Piloto de agendamentos.'),
    ('Frei Francisco', 'frei-francisco', array['segunda']::text[], 'Atendimento Filhos de Fora', 'Entidade de atendimento', 'Piloto de agendamentos.'),
    ('Aymore', 'aymore', array['segunda']::text[], 'Atendimento Filhos de Fora', 'Entidade de atendimento', 'Piloto de agendamentos.'),
    ('Raio de Sol', 'raio-de-sol', array['segunda']::text[], 'Atendimento Filhos de Fora', 'Entidade de atendimento', 'Piloto de agendamentos.'),
    ('Madre Antonieta', 'madre-antonieta', array['segunda']::text[], 'Atendimento Filhos de Fora', 'Entidade de atendimento', 'Piloto de agendamentos.'),
    ('Flor de Lotus', 'flor-de-lotus', array['segunda']::text[], 'Linha das Águas', 'Entidade de atendimento', 'Piloto de agendamentos.'),
    ('Flexa da Mata', 'flexa-da-mata', array['segunda','terca']::text[], 'Atendimento Filhos de Fora', 'Entidade de atendimento', 'Piloto de agendamentos.'),
    ('Lança Dourada', 'lanca-dourada', array['segunda']::text[], 'Atendimento Filhos de Fora', 'Entidade de atendimento', 'Piloto de agendamentos.'),
    ('Sol Azul', 'sol-azul', array['segunda']::text[], 'Atendimento Filhos de Fora', 'Entidade de atendimento', 'Piloto de agendamentos.'),
    ('Luar da Mata', 'luar-da-mata', array['segunda']::text[], 'Atendimento Filhos de Fora', 'Entidade de atendimento', 'Piloto de agendamentos.'),
    ('Tia Margarida', 'tia-margarida', array['segunda']::text[], 'Atendimento Filhos de Fora', 'Entidade de atendimento', 'Piloto de agendamentos.'),
    ('Guerreiro', 'guerreiro', array['segunda','terca']::text[], 'Ogum', 'Entidade de atendimento', 'Piloto de agendamentos.'),
    ('Dra. Sandra', 'dra-sandra', array['segunda']::text[], 'Corrente Médica', 'Entidade de atendimento', 'Piloto de agendamentos.'),
    ('Dr. Alexandre', 'dr-alexandre', array['segunda']::text[], 'Corrente Médica', 'Entidade de atendimento', 'Piloto de agendamentos.'),
    ('Passes', 'passes', array['segunda']::text[], 'Atendimento Filhos de Fora', 'Atendimento', 'Piloto de agendamentos.'),
    ('Primeira Vez', 'primeira-vez', array['segunda','terca']::text[], 'Atendimento Filhos de Fora', 'Acolhimento', 'Piloto de agendamentos.'),
    ('Luz de Oxossi', 'luz-de-ossosi', array['terca']::text[], 'Oxóssi', 'Entidade de atendimento', 'Nome de exibição atualizado para o piloto; slug legado preservado.'),
    ('Rio Nascente', 'rio-nascente', array['terca']::text[], 'Linha das Águas', 'Entidade de atendimento', 'Piloto de agendamentos.'),
    ('Pai Joaquim', 'pai-joaquim', array['terca']::text[], 'Atendimento Filhos de Fora', 'Entidade de atendimento', 'Piloto de agendamentos.'),
    ('Flexa de Luz', 'flexa-de-luz', array['terca']::text[], 'Atendimento Filhos de Fora', 'Entidade de atendimento', 'Piloto de agendamentos.'),
    ('Pedra do Oriente', 'pedra-do-oriente', array['terca']::text[], 'Linha do Oriente', 'Entidade de atendimento', 'Piloto de agendamentos.'),
    ('Flor da Lua', 'flor-da-lua', array['terca']::text[], 'Linha das Águas', 'Entidade de atendimento', 'Piloto de agendamentos.'),
    ('Tupiná', 'tupina', array['terca']::text[], 'Oxóssi', 'Entidade de atendimento', 'Piloto de agendamentos.'),
    ('Ubiratan', 'ubiratan', array['terca']::text[], 'Atendimento Filhos de Fora', 'Entidade de atendimento', 'Piloto de agendamentos.'),
    ('Preta V. Aruanda', 'preta-v-aruanda', array['terca']::text[], 'Atendimento Filhos de Fora', 'Entidade de atendimento', 'Piloto de agendamentos.'),
    ('Dr. Augusto', 'dr-augusto', array['terca']::text[], 'Corrente Médica', 'Entidade de atendimento', 'Piloto de agendamentos.'),
    ('Pajé', 'paje', array['terca']::text[], 'Atendimento Filhos de Fora', 'Entidade de atendimento', 'Piloto de agendamentos.'),
    ('Passes - Irmã Paula', 'passes-irma-paula', array['terca']::text[], 'Atendimento Filhos de Fora', 'Atendimento', 'Piloto de agendamentos.'),
    ('Passes - Flexador', 'passes-flexador', array['terca']::text[], 'Atendimento Filhos de Fora', 'Atendimento', 'Piloto de agendamentos.')
)
insert into public.oh_spiritual_entities (
  organization_id,
  name,
  slug,
  line,
  entity_type,
  usual_days,
  daily_capacity,
  appointment_enabled,
  appointment_notes,
  notes,
  active
)
select
  tucxa.id,
  entities.name,
  entities.slug,
  entities.line,
  entities.entity_type,
  entities.usual_days,
  4,
  true,
  'Piloto TUCXA: disponibilidade final depende do dia e da ocorrência da semana no mês.',
  entities.notes,
  true
from tucxa
cross join entities
on conflict (organization_id, slug) do update set
  name = excluded.name,
  line = coalesce(public.oh_spiritual_entities.line, excluded.line),
  entity_type = coalesce(public.oh_spiritual_entities.entity_type, excluded.entity_type),
  usual_days = (
    select array_agg(distinct day_value order by day_value)
    from unnest(coalesce(public.oh_spiritual_entities.usual_days, '{}'::text[]) || excluded.usual_days) day_value
  ),
  daily_capacity = greatest(1, coalesce(public.oh_spiritual_entities.daily_capacity, excluded.daily_capacity, 4)),
  appointment_enabled = true,
  appointment_notes = coalesce(public.oh_spiritual_entities.appointment_notes, excluded.appointment_notes),
  notes = coalesce(public.oh_spiritual_entities.notes, excluded.notes),
  active = true,
  updated_at = now();

-- Calendário informado para o piloto.
with tucxa as (
  select id
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by created_at asc
  limit 1
), calendar(weekday, occurrences, slug) as (
  values
    -- Segunda — 1ª e 3ª semanas
    ('segunda', array[1,3]::integer[], 'ubirajara'),
    ('segunda', array[1,3]::integer[], 'aruando'),
    ('segunda', array[1,3]::integer[], 'raio-de-luz'),
    ('segunda', array[1,3]::integer[], 'frei-francisco'),
    ('segunda', array[1,3]::integer[], 'aymore'),
    ('segunda', array[1,3]::integer[], 'raio-de-sol'),
    ('segunda', array[1,3]::integer[], 'madre-antonieta'),
    ('segunda', array[1,3]::integer[], 'flor-de-lotus'),
    ('segunda', array[1,3]::integer[], 'flexa-da-mata'),
    ('segunda', array[1,3]::integer[], 'lanca-dourada'),
    ('segunda', array[1,3]::integer[], 'sol-azul'),
    ('segunda', array[1,3]::integer[], 'luar-da-mata'),
    ('segunda', array[1,3]::integer[], 'guerreiro'),
    ('segunda', array[1,3]::integer[], 'dra-sandra'),
    ('segunda', array[1,3]::integer[], 'passes'),
    ('segunda', array[1,3]::integer[], 'dr-alexandre'),
    ('segunda', array[1,3]::integer[], 'primeira-vez'),

    -- Segunda — 2ª e 4ª semanas
    ('segunda', array[2,4]::integer[], 'ubirajara'),
    ('segunda', array[2,4]::integer[], 'aruando'),
    ('segunda', array[2,4]::integer[], 'raio-de-luz'),
    ('segunda', array[2,4]::integer[], 'frei-francisco'),
    ('segunda', array[2,4]::integer[], 'aymore'),
    ('segunda', array[2,4]::integer[], 'raio-de-sol'),
    ('segunda', array[2,4]::integer[], 'madre-antonieta'),
    ('segunda', array[2,4]::integer[], 'flor-de-lotus'),
    ('segunda', array[2,4]::integer[], 'flexa-da-mata'),
    ('segunda', array[2,4]::integer[], 'lanca-dourada'),
    ('segunda', array[2,4]::integer[], 'sol-azul'),
    ('segunda', array[2,4]::integer[], 'tia-margarida'),
    ('segunda', array[2,4]::integer[], 'guerreiro'),
    ('segunda', array[2,4]::integer[], 'dr-alexandre'),
    ('segunda', array[2,4]::integer[], 'passes'),
    ('segunda', array[2,4]::integer[], 'primeira-vez'),

    -- Terça — 1ª e 3ª semanas
    ('terca', array[1,3]::integer[], 'luz-de-ossosi'),
    ('terca', array[1,3]::integer[], 'rio-nascente'),
    ('terca', array[1,3]::integer[], 'pai-joaquim'),
    ('terca', array[1,3]::integer[], 'flexa-de-luz'),
    ('terca', array[1,3]::integer[], 'pedra-do-oriente'),
    ('terca', array[1,3]::integer[], 'flor-da-lua'),
    ('terca', array[1,3]::integer[], 'tupina'),
    ('terca', array[1,3]::integer[], 'flexa-da-mata'),
    ('terca', array[1,3]::integer[], 'preta-v-aruanda'),
    ('terca', array[1,3]::integer[], 'dr-augusto'),
    ('terca', array[1,3]::integer[], 'guerreiro'),
    ('terca', array[1,3]::integer[], 'paje'),
    ('terca', array[1,3]::integer[], 'primeira-vez'),
    ('terca', array[1,3]::integer[], 'passes-irma-paula'),
    ('terca', array[1,3]::integer[], 'passes-flexador'),

    -- Terça — 2ª e 4ª semanas
    ('terca', array[2,4]::integer[], 'luz-de-ossosi'),
    ('terca', array[2,4]::integer[], 'rio-nascente'),
    ('terca', array[2,4]::integer[], 'flexa-de-luz'),
    ('terca', array[2,4]::integer[], 'pedra-do-oriente'),
    ('terca', array[2,4]::integer[], 'flor-da-lua'),
    ('terca', array[2,4]::integer[], 'tupina'),
    ('terca', array[2,4]::integer[], 'ubiratan'),
    ('terca', array[2,4]::integer[], 'flexa-da-mata'),
    ('terca', array[2,4]::integer[], 'dr-augusto'),
    ('terca', array[2,4]::integer[], 'guerreiro'),
    ('terca', array[2,4]::integer[], 'primeira-vez'),
    ('terca', array[2,4]::integer[], 'passes-irma-paula'),
    ('terca', array[2,4]::integer[], 'passes-flexador')
), expanded as (
  select calendar.weekday, unnest(calendar.occurrences) as month_occurrence, calendar.slug
  from calendar
)
insert into public.oh_tucxa_pilot_entity_schedule (
  organization_id,
  entity_id,
  weekday,
  month_occurrence,
  default_capacity,
  active,
  notes
)
select
  tucxa.id,
  entity.id,
  expanded.weekday,
  expanded.month_occurrence,
  greatest(1, coalesce(entity.daily_capacity, 4)),
  true,
  'Calendário inicial do piloto informado em 23/09/2026.'
from tucxa
join expanded on true
join public.oh_spiritual_entities entity
  on entity.organization_id = tucxa.id
 and entity.slug = expanded.slug
on conflict (organization_id, entity_id, weekday, month_occurrence) do update set
  active = true,
  default_capacity = greatest(1, coalesce(public.oh_tucxa_pilot_entity_schedule.default_capacity, excluded.default_capacity, 4)),
  notes = excluded.notes,
  updated_at = now();

-- Configuração funcional do piloto.
with tucxa as (
  select id
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by created_at asc
  limit 1
)
insert into public.oh_module_settings (organization_id, module_slug, enabled, settings)
select
  tucxa.id,
  'atendimento-em-harmonia',
  true,
  jsonb_build_object(
    'pilotAppointmentsEnabled', true,
    'pilotConfirmationCutoff', '16:00',
    'pilotAppointmentTime', '20:00',
    'pilotArrivalWindow', '18:30–19:20',
    'pilotDaysAhead', 90,
    'pilotSmsEnabled', true
  )
from tucxa
on conflict (organization_id, module_slug) do update set
  enabled = true,
  settings = coalesce(public.oh_module_settings.settings, '{}'::jsonb) || excluded.settings,
  updated_at = now();

-- Reserva atômica para qualquer fluxo do piloto (Recepção ou Consulente).
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
  v_booked integer := 0;
  v_order integer := 1;
  v_id uuid;
begin
  if p_organization_id is null or p_person_id is null or p_entity_id is null or p_appointment_date is null then
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
    hashtextextended(concat_ws(':', p_organization_id::text, p_entity_id::text, p_appointment_date::text), 0)
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

  select override.available,
         coalesce(override.capacity, v_capacity)
    into v_available, v_capacity
  from public.oh_tucxa_pilot_entity_overrides override
  where override.organization_id = p_organization_id
    and override.entity_id = p_entity_id
    and p_appointment_date between override.starts_on and override.ends_on
  order by override.created_at desc
  limit 1;

  if coalesce(v_available, true) is not true then
    raise exception using message = 'PILOT_ENTITY_SUSPENDED';
  end if;

  if exists (
    select 1
    from public.oh_consulente_appointments appointment
    where appointment.organization_id = p_organization_id
      and appointment.person_id = p_person_id
      and appointment.appointment_date = p_appointment_date
      and appointment.status not in ('cancelado','cancelamento_solicitado','ausente')
  ) then
    raise exception using message = 'PILOT_DUPLICATE_PERSON_DATE';
  end if;

  select count(*)::integer
    into v_booked
  from public.oh_consulente_appointments appointment
  where appointment.organization_id = p_organization_id
    and appointment.entity_id = p_entity_id
    and appointment.appointment_date = p_appointment_date
    and appointment.status not in ('cancelado','cancelamento_solicitado','ausente');

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

  return query select v_id, v_order, greatest(1, v_capacity), 'solicitado'::text;
end;
$$;

revoke all on function public.oh_tucxa_pilot_reserve_appointment(
  uuid, uuid, uuid, date, uuid, text, text, text, text, text, text, timestamptz, text
) from public;

grant execute on function public.oh_tucxa_pilot_reserve_appointment(
  uuid, uuid, uuid, date, uuid, text, text, text, text, text, text, timestamptz, text
) to service_role;

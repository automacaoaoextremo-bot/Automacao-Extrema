-- Organização em Harmonia / TUCXA
-- Piloto de agendamentos — Ajustes 01 (23/09/2026)
--
-- Escopo:
-- 1. login único e primeiro acesso para o piloto;
-- 2. estrutura para cadastro-base de Cavalinhos e pessoas da Recepção;
-- 3. vínculo Cavalinho <-> Entidade via provisionamento local;
-- 4. preferências por pessoa (Entidade padrão, lembretes e resumos);
-- 5. configuração do modo de visualização e ordem de atendimento;
-- 6. registro de chegada/ausência.
--
-- IMPORTANTE: esta migration NÃO cria usuários em auth.users e NÃO contém senha.
-- Os usuários são provisionados pelo script scripts/tucxa-provisionar-agendamento-piloto-01.mjs,
-- com senha temporária informada somente no momento da execução.

alter table if exists public.oh_consulente_appointments
  add column if not exists arrival_status text not null default 'pending',
  add column if not exists arrived_at timestamptz,
  add column if not exists arrival_order integer,
  add column if not exists arrival_registered_by_person_id uuid references public.oh_people(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'oh_consulente_appointments_arrival_status_check'
      and conrelid = 'public.oh_consulente_appointments'::regclass
  ) then
    alter table public.oh_consulente_appointments
      add constraint oh_consulente_appointments_arrival_status_check
      check (arrival_status in ('pending','arrived','absent'));
  end if;
end
$$;

create index if not exists idx_oh_consulente_appointments_arrival
  on public.oh_consulente_appointments (organization_id, appointment_date, arrival_status, arrival_order);

create table if not exists public.oh_tucxa_pilot_person_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  person_id uuid not null references public.oh_people(id) on delete cascade,
  default_entity_id uuid references public.oh_spiritual_entities(id) on delete set null,
  reminder_sms_enabled boolean not null default true,
  reminder_offsets_hours integer[] not null default array[24]::integer[],
  reception_summary_channels text[] not null default '{}'::text[],
  reception_summary_view_mode text not null default 'both',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, person_id),
  check (reception_summary_view_mode in ('entity_day','day_entity','both'))
);

create index if not exists idx_oh_tucxa_pilot_person_preferences_entity
  on public.oh_tucxa_pilot_person_preferences (organization_id, default_entity_id);

alter table public.oh_tucxa_pilot_person_preferences enable row level security;
-- O piloto acessa as preferências apenas pelas rotas de servidor com service role.

-- Configurações funcionais adicionais do piloto.
with tucxa as (
  select id
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by case when slug = 'tucxa' then 0 else 1 end, created_at asc
  limit 1
)
insert into public.oh_module_settings (organization_id, module_slug, enabled, settings)
select
  tucxa.id,
  'atendimento-em-harmonia',
  true,
  jsonb_build_object(
    'pilotPublicLandingEnabled', true,
    'pilotSelfServiceViewMode', 'both',
    'pilotUseDefaultEntity', false,
    'pilotAllowDifferentEntity', true,
    'pilotServiceOrderMode', 'booking',
    'pilotConfirmationReminderOffsetsHours', jsonb_build_array(24, 4),
    'pilotDoorClosesAt', '19:20',
    'pilotDoorReopensAt', '20:00',
    'pilotEndTime', '21:40'
  )
from tucxa
on conflict (organization_id, module_slug) do update set
  enabled = true,
  settings = coalesce(public.oh_module_settings.settings, '{}'::jsonb) || excluded.settings,
  updated_at = now();

-- Garante a função-base Filho da Corrente para os acessos iniciais do piloto.
with tucxa as (
  select id
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by case when slug = 'tucxa' then 0 else 1 end, created_at asc
  limit 1
)
insert into public.oh_roles (organization_id, name, slug, description, active, is_system)
select tucxa.id, 'Filho da Corrente', 'filho-da-corrente', 'Acesso dos Filhos da Corrente do Tucxa.', true, false
from tucxa
on conflict (organization_id, slug) do update set
  name = excluded.name,
  active = true,
  updated_at = now();

-- Entidades citadas no Ajuste 01 que ainda não estavam no calendário do piloto.
-- Como o documento não informa os dias de atendimento dessas três Entidades,
-- elas são cadastradas INATIVAS para agendamento até a Recepção definir o calendário.
with tucxa as (
  select id
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by case when slug = 'tucxa' then 0 else 1 end, created_at asc
  limit 1
), missing(name, slug) as (
  values
    ('Mata Verde', 'mata-verde'),
    ('Passe - Jupira', 'passe-jupira'),
    ('Passe - Araribóia', 'passe-arariboia')
)
insert into public.oh_spiritual_entities (
  organization_id, name, slug, line, entity_type, usual_days,
  daily_capacity, appointment_enabled, appointment_notes, notes, active
)
select
  tucxa.id,
  missing.name,
  missing.slug,
  'A definir',
  'Entidade de atendimento',
  '{}'::text[],
  4,
  false,
  'Calendário de atendimento ainda não informado no documento Agendamento-01.',
  'Cadastro criado para associar o Cavalinho. Ativar somente após definir o calendário correto.',
  false
from tucxa
cross join missing
on conflict (organization_id, slug) do nothing;

-- Os nomes, telefones e vínculos individuais do piloto NÃO são gravados nesta migration.
-- O provisionamento é executado localmente com scripts/tucxa-provisionar-agendamento-piloto-01.mjs
-- e um arquivo local ignorado pelo Git, para evitar persistir dados pessoais no histórico do repositório.

-- Marcação atômica de chegada/ausência.
create or replace function public.oh_tucxa_pilot_mark_arrival(
  p_organization_id uuid,
  p_appointment_id uuid,
  p_actor_person_id uuid,
  p_arrival_status text
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
  v_order integer;
  v_status text := lower(trim(coalesce(p_arrival_status, '')));
begin
  if v_status not in ('arrived','absent','pending') then
    raise exception using message = 'INVALID_ARRIVAL_STATUS';
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

  if v_status = 'arrived' then
    perform pg_advisory_xact_lock(hashtextextended(concat_ws(':', p_organization_id::text, v_date::text, 'arrival'), 0));
    select coalesce(max(arrival_order), 0) + 1
      into v_order
    from public.oh_consulente_appointments
    where organization_id = p_organization_id
      and appointment_date = v_date
      and arrival_status = 'arrived';
  else
    v_order := null;
  end if;

  update public.oh_consulente_appointments
  set arrival_status = v_status,
      arrived_at = case when v_status = 'arrived' then now() else null end,
      arrival_order = v_order,
      arrival_registered_by_person_id = p_actor_person_id,
      status = case
        when v_status = 'arrived' and status in ('solicitado','confirmado','aprovado') then 'presente'
        when v_status = 'absent' and status not in ('cancelado','concluido') then 'ausente'
        else status
      end,
      updated_at = now()
  where id = p_appointment_id
    and organization_id = p_organization_id;

  return query select p_appointment_id, v_status, v_order;
end;
$$;

revoke all on function public.oh_tucxa_pilot_mark_arrival(uuid, uuid, uuid, text) from public;
grant execute on function public.oh_tucxa_pilot_mark_arrival(uuid, uuid, uuid, text) to service_role;

-- Log de lembretes do piloto para evitar envios duplicados pelo agendador.
create table if not exists public.oh_tucxa_pilot_notification_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  appointment_id uuid not null references public.oh_consulente_appointments(id) on delete cascade,
  person_id uuid references public.oh_people(id) on delete set null,
  channel text not null check (channel in ('sms','email')),
  notification_type text not null,
  scheduled_offset_hours integer,
  status text not null default 'sent' check (status in ('sent','failed')),
  provider text,
  provider_message_id text,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (appointment_id, channel, notification_type, scheduled_offset_hours)
);

create index if not exists idx_oh_tucxa_pilot_notification_log_lookup
  on public.oh_tucxa_pilot_notification_log (organization_id, appointment_id, notification_type, channel);

alter table public.oh_tucxa_pilot_notification_log enable row level security;
-- O log é usado somente pelas rotas de servidor com service role.

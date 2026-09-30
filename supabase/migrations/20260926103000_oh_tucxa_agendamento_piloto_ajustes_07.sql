-- Organização em Harmonia / TUCXA
-- Agendamento — Ajustes 07 (26/09/2026)
--
-- 1. preferências de Entidade passam a ser individuais por Consulente;
-- 2. WhatsApp/BotConversa substitui SMS para confirmações/lembretes;
-- 3. visualização futura do Consulente permanece sempre com Data e Entidade;
-- 4. preserva colunas antigas para compatibilidade, mas desabilita SMS no piloto.

alter table if exists public.oh_tucxa_pilot_person_preferences
  add column if not exists allow_different_entity boolean not null default false,
  add column if not exists reminder_whatsapp_enabled boolean not null default true;

-- Migra a intenção dos lembretes antigos sem apagar o histórico da coluna SMS.
update public.oh_tucxa_pilot_person_preferences
set reminder_whatsapp_enabled = coalesce(reminder_sms_enabled, true)
where reminder_whatsapp_enabled is distinct from coalesce(reminder_sms_enabled, true);

-- Para cadastros que já possuem chegada registrada no piloto, usa o primeiro
-- atendimento real com Entidade que não seja Passe como Entidade padrão.
with first_attendance as (
  select distinct on (appointment.organization_id, appointment.person_id)
    appointment.organization_id,
    appointment.person_id,
    appointment.entity_id
  from public.oh_consulente_appointments appointment
  join public.oh_spiritual_entities entity
    on entity.id = appointment.entity_id
   and entity.organization_id = appointment.organization_id
  where appointment.person_id is not null
    and appointment.entity_id is not null
    and appointment.arrival_status = 'arrived'
    and lower(
      translate(
        coalesce(entity.slug, '') || ' ' || coalesce(entity.name, ''),
        'áàâãäéèêëíìîïóòôõöúùûüç',
        'aaaaaeeeeiiiiooooouuuuc'
      )
    ) not like '%passe%'
  order by
    appointment.organization_id,
    appointment.person_id,
    appointment.appointment_date asc,
    appointment.arrived_at asc nulls last,
    appointment.created_at asc
)
insert into public.oh_tucxa_pilot_person_preferences (
  organization_id,
  person_id,
  default_entity_id,
  allow_different_entity,
  reminder_whatsapp_enabled
)
select
  first_attendance.organization_id,
  first_attendance.person_id,
  first_attendance.entity_id,
  false,
  true
from first_attendance
on conflict (organization_id, person_id)
do update
set default_entity_id = coalesce(
      public.oh_tucxa_pilot_person_preferences.default_entity_id,
      excluded.default_entity_id
    ),
    updated_at = now();

-- Nos resumos da Recepção, WhatsApp substitui SMS.
update public.oh_tucxa_pilot_person_preferences
set reception_summary_channels = array(
  select distinct case when lower(channel) = 'sms' then 'whatsapp' else lower(channel) end
  from unnest(coalesce(reception_summary_channels, '{}'::text[])) as channel
  where lower(channel) in ('email', 'sms', 'whatsapp')
),
updated_at = now();

-- Configurações globais que deixam de ser escolhas da Recepção.
with tucxa as (
  select id
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by case when slug = 'tucxa' then 0 else 1 end, created_at asc
  limit 1
)
update public.oh_module_settings settings_row
set settings = coalesce(settings_row.settings, '{}'::jsonb)
  || jsonb_build_object(
    'pilotSelfServiceViewMode', 'both',
    'pilotUseDefaultEntity', true,
    'pilotAllowDifferentEntity', false,
    'pilotSmsEnabled', false,
    'pilotNotificationChannel', 'whatsapp_botconversa'
  ),
  updated_at = now()
from tucxa
where settings_row.organization_id = tucxa.id
  and settings_row.module_slug = 'atendimento-em-harmonia';

comment on column public.oh_tucxa_pilot_person_preferences.allow_different_entity is
  'Definido individualmente pela Recepção. Por padrão o Consulente permanece com a Entidade padrão.';

comment on column public.oh_tucxa_pilot_person_preferences.reminder_whatsapp_enabled is
  'Permite lembretes de confirmação pelo WhatsApp/BotConversa.';

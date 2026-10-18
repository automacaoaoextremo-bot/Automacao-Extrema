-- OeH / TUCXA - Agendamento piloto - Ajustes 48
-- Libera o piloto para Consulentes, registra a preferência de abertura dos
-- próximos agendamentos e garante a 4a terça-feira para Rio Nascente.

alter table public.oh_tucxa_pilot_person_preferences
  add column if not exists consulente_open_upcoming_on_login boolean not null default true;

comment on column public.oh_tucxa_pilot_person_preferences.consulente_open_upcoming_on_login is
  'Consulente: abrir automaticamente os próximos agendamentos após o login.';

update public.oh_module_settings
set settings = coalesce(settings, '{}'::jsonb)
  || jsonb_build_object(
    'pilotRolloutStage', 'consulente',
    'pilotSelfServiceEnabled', true,
    'pilotUseDefaultEntity', true,
    'pilotAllowDifferentEntity', false
  ),
  updated_at = now()
where module_slug = 'atendimento-em-harmonia'
  and organization_id in (
    select id from public.oh_organizations
    where lower(coalesce(slug, '')) = 'tucxa' or lower(coalesce(name, '')) like '%tucxa%'
  );

-- Agendamento-48: Rio Nascente deve aparecer na 4a terça-feira (ex.: 27/10/2026).
update public.oh_spiritual_entities
set active = true,
    appointment_enabled = true,
    updated_at = now()
where slug = 'rio-nascente'
  and organization_id in (
    select id from public.oh_organizations
    where lower(coalesce(slug, '')) = 'tucxa' or lower(coalesce(name, '')) like '%tucxa%'
  );

insert into public.oh_tucxa_pilot_entity_schedule
  (organization_id, entity_id, weekday, month_occurrence, default_capacity, active)
select e.organization_id, e.id, 'terca', 4, greatest(coalesce(e.daily_capacity, 4), 1), true
from public.oh_spiritual_entities e
where e.slug = 'rio-nascente'
  and e.active = true
on conflict (organization_id, entity_id, weekday, month_occurrence)
do update set
  active = true,
  default_capacity = greatest(coalesce(excluded.default_capacity, public.oh_tucxa_pilot_entity_schedule.default_capacity, 4), 1),
  updated_at = now();

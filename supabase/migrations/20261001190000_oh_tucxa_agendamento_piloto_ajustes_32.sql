-- Agendamento-32: controle idempotente dos resumos operacionais programados.
create table if not exists public.oh_tucxa_pilot_daily_dispatches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  dispatch_date date not null,
  audience text not null check (audience in ('cavalinho','reception')),
  recipient_person_id uuid not null references public.oh_people(id) on delete cascade,
  sent_at timestamptz,
  status text not null default 'pending' check (status in ('pending','sent','error')),
  detail text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, dispatch_date, audience, recipient_person_id)
);
create index if not exists idx_oh_tucxa_pilot_daily_dispatches_date on public.oh_tucxa_pilot_daily_dispatches (organization_id, dispatch_date, audience);
alter table public.oh_tucxa_pilot_daily_dispatches enable row level security;

with tucxa as (select id from public.oh_organizations where slug='tucxa' or name ilike '%tucxa%' order by case when slug='tucxa' then 0 else 1 end limit 1)
update public.oh_module_settings s set settings = coalesce(s.settings,'{}'::jsonb) || jsonb_build_object(
 'pilotCavalinhoDailyWhatsappEnabled', false, 'pilotCavalinhoDailyWhatsappTime', '12:00',
 'pilotReceptionDailyWhatsappEnabled', false, 'pilotReceptionDailyWhatsappTime', '12:00'
), updated_at=now() from tucxa where s.organization_id=tucxa.id and s.module_slug='atendimento-em-harmonia';

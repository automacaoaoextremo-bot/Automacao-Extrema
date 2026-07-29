-- Organização em Harmonia / Agenda Viva
-- Separa a publicação Ativo/Inativo do fluxo de aprovação Aprovado/Reprovado.

alter table if exists public.agv_events
  add column if not exists active boolean not null default true;

update public.agv_events
set active = true
where active is null;

create index if not exists idx_agv_events_org_active_starts
  on public.agv_events (organization_id, active, starts_at);

comment on column public.agv_events.active is
  'Controla se o evento está ativo e pode ser publicado, independentemente do status de aprovação.';

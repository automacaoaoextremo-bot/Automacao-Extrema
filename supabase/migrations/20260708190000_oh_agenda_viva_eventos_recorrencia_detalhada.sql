-- Organização em Harmonia — Agenda Viva com recorrência e detalhes de horário.
-- Seguro para rodar mais de uma vez no Supabase SQL Editor.

alter table if exists public.agv_events
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists all_day boolean not null default false,
  add column if not exists recurrence_rule text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_agv_events_organization_status_starts
  on public.agv_events (organization_id, status, starts_at);

create index if not exists idx_agv_events_recurrence
  on public.agv_events (organization_id, recurrence_rule)
  where recurrence_rule is not null;

-- Marca registros já existentes de trabalho geral como obrigatórios para todos,
-- para que não apareçam no primeiro acesso dos Filhos da Corrente.
update public.agv_events
set metadata = coalesce(metadata, '{}'::jsonb) || '{"mandatoryForAll": true, "requiredForAllFilhosDaCorrente": true}'::jsonb,
    updated_at = now()
where organization_id in (select id from public.oh_organizations where slug = 'tucxa' or name ilike '%tucxa%')
  and (
    lower(coalesce(title, '')) like '%todos os cavalinhos%'
    or lower(coalesce(title, '')) like '%todos os filhos%'
    or lower(coalesce(notes, '')) like '%todos os cavalinhos%'
    or lower(coalesce(notes, '')) like '%todos os filhos%'
  );

-- Organização em Harmonia - Agenda Viva
-- Evolução de layout, localidade, público e ordenação do Primeiro Acesso

alter table if exists public.agv_events
  add column if not exists location_id uuid;

create index if not exists agv_events_location_id_idx
  on public.agv_events(location_id);

create index if not exists agv_events_organization_status_starts_idx
  on public.agv_events(organization_id, status, starts_at);

-- Não força constraint para evitar falha caso o ambiente ainda esteja com nomes ou chaves diferentes.
-- A relação lógica é armazenada em agv_events.location_id e também espelhada no metadata.

update public.agv_events
set metadata = coalesce(metadata, '{}'::jsonb)
  || jsonb_build_object(
    'firstAccessEnabled', coalesce(metadata -> 'firstAccessEnabled', metadata -> 'first_access_enabled', 'true'::jsonb),
    'first_access_enabled', coalesce(metadata -> 'firstAccessEnabled', metadata -> 'first_access_enabled', 'true'::jsonb),
    'audience', coalesce(nullif(metadata ->> 'audience', ''), nullif(metadata ->> 'publico', ''), 'filhos-corrente'),
    'publico', coalesce(nullif(metadata ->> 'audience', ''), nullif(metadata ->> 'publico', ''), 'filhos-corrente')
  )
where metadata is null
   or metadata ? 'firstAccessEnabled'
   or metadata ? 'first_access_enabled'
   or not (metadata ? 'audience');

-- Ajustes de localidade e horário nos eventos oficiais conhecidos, sem sobrescrever dados já preenchidos manualmente.
update public.agv_events
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('locationLabel', coalesce(nullif(location, ''), 'TUCXA')),
    location = coalesce(nullif(location, ''), 'TUCXA'),
    updated_at = now()
where (title ilike '%Caminhada TUCXA%' or title ilike '%Grupo de Estudos%' or title ilike '%Dia do Filme%' or title ilike '%Mostra Cultural%' or title ilike '%Clube do Livro%' or title ilike '%Encerramento Anual%')
and organization_id in (select id from public.oh_organizations where slug = 'tucxa' or lower(name) like '%tucxa%');

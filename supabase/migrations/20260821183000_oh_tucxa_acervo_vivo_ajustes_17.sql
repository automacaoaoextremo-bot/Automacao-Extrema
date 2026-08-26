-- TUCXA / Acervo Vivo — Ajustes e Evoluções 17
-- Mobile, acesso público sem login, autoempréstimo por QR Code, notificações,
-- documentos institucionais, Folha Verde por ano/memória anual e saneamento da trilha inicial.

create extension if not exists pgcrypto;

create table if not exists public.oh_acervo_folha_years (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  year integer not null check (year between 1900 and 2200),
  summary text,
  highlights text[] not null default '{}'::text[],
  events jsonb not null default '[]'::jsonb,
  photos jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, year),
  check (jsonb_typeof(events) = 'array'),
  check (jsonb_typeof(photos) = 'array')
);

create index if not exists idx_oh_acervo_folha_years_org_year
  on public.oh_acervo_folha_years (organization_id, year desc)
  where active = true;

alter table public.oh_acervo_folha_years enable row level security;

comment on table public.oh_acervo_folha_years is
  'Memória anual do Folha Verde: resumo, destaques, eventos e fotos por ano.';

do $$
declare
  tucxa_id uuid;
  v_trail_id uuid;
  regulamento_id uuid;
  procedimentos_id uuid;
  resource_row record;
begin
  select site.organization_id into tucxa_id
  from public.oh_client_site_settings site
  where site.public_slug = 'tucxa'
    and coalesce(site.active, true) = true
  order by site.updated_at desc nulls last
  limit 1;

  if tucxa_id is null then
    select id into tucxa_id
    from public.oh_organizations
    where slug = 'tucxa'
    order by created_at asc
    limit 1;
  end if;

  if tucxa_id is null then
    select id into tucxa_id
    from public.oh_organizations
    where name ilike '%tucxa%'
    order by created_at desc
    limit 1;
  end if;

  if tucxa_id is null then
    raise notice 'Acervo Vivo Ajuste 17: organização TUCXA não localizada.';
    return;
  end if;

  -- Configurações novas ficam no JSON atual para não quebrar instalações existentes.
  update public.oh_acervo_settings
     set metadata = coalesce(metadata, '{}'::jsonb)
       || jsonb_build_object(
            'pickup_location', coalesce(nullif(metadata ->> 'pickup_location', ''), 'Tucxa 1'),
            'self_service_enabled', case when lower(coalesce(metadata ->> 'self_service_enabled','')) in ('true','false') then (metadata ->> 'self_service_enabled')::boolean else true end,
            'notification_emails', case
              when jsonb_typeof(metadata -> 'notification_emails') = 'array' then metadata -> 'notification_emails'
              else '[]'::jsonb
            end
          ),
         updated_at = now()
   where organization_id = tucxa_id;

  -- Garante os documentos oficiais sem criar uma segunda cópia lógica do mesmo material.
  select id into regulamento_id
  from public.oh_acervo_resources
  where organization_id = tucxa_id
    and lower(title) = lower('Regulamento do Tucxa 2025')
  order by created_at asc
  limit 1;

  if regulamento_id is null then
    insert into public.oh_acervo_resources (
      organization_id, resource_type, title, description, subjects, audience,
      governance_status, active, metadata
    ) values (
      tucxa_id, 'regulamento', 'Regulamento do Tucxa 2025',
      'Documento institucional oficial do Tucxa, incluindo regras de funcionamento e da Biblioteca.',
      array['regulamento','biblioteca','entrada na corrente']::text[],
      array['filhos da corrente','filhos de fora']::text[],
      'vigente', true, jsonb_build_object('source','ajustes-17','year',2025)
    ) returning id into regulamento_id;
  else
    update public.oh_acervo_resources
       set governance_status = 'vigente', active = true,
           metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('year',2025),
           updated_at = now()
     where id = regulamento_id;
  end if;

  select id into procedimentos_id
  from public.oh_acervo_resources
  where organization_id = tucxa_id
    and lower(title) = lower('Procedimentos e Orientações Básicas do Tucxa 2025')
  order by created_at asc
  limit 1;

  if procedimentos_id is null then
    insert into public.oh_acervo_resources (
      organization_id, resource_type, title, description, subjects, audience,
      governance_status, active, metadata
    ) values (
      tucxa_id, 'procedimento', 'Procedimentos e Orientações Básicas do Tucxa 2025',
      'Documento institucional oficial com orientações de preparo, trabalhos, mediunidade e convivência na Casa.',
      array['procedimentos','mediunidade','umbanda']::text[],
      array['filhos da corrente']::text[],
      'vigente', true, jsonb_build_object('source','ajustes-17','year',2025)
    ) returning id into procedimentos_id;
  else
    update public.oh_acervo_resources
       set governance_status = 'vigente', active = true,
           metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('year',2025),
           updated_at = now()
     where id = procedimentos_id;
  end if;

  -- Uma única versão vigente para cada PDF institucional. A URL é sempre assinada no servidor.
  update public.oh_acervo_resource_versions
     set is_current = false
   where organization_id = tucxa_id
     and resource_id in (regulamento_id, procedimentos_id)
     and version_label <> '2025 oficial';

  insert into public.oh_acervo_resource_versions (
    organization_id, resource_id, version_label, effective_date, storage_path,
    is_current, notes, metadata
  ) values (
    tucxa_id, regulamento_id, '2025 oficial', date '2025-01-01',
    'documentos/2025/REGULAMENTO_DO_TUCXA_2025.pdf', true,
    'Arquivo oficial armazenado no bucket privado tucxa-acervo-vivo.',
    jsonb_build_object('source','ajustes-17','original_file_name','REGULAMENTO_DO_TUCXA_2025.pdf')
  )
  on conflict (resource_id, version_label) do update set
    effective_date = excluded.effective_date,
    storage_path = excluded.storage_path,
    is_current = true,
    notes = excluded.notes,
    metadata = public.oh_acervo_resource_versions.metadata || excluded.metadata;

  insert into public.oh_acervo_resource_versions (
    organization_id, resource_id, version_label, effective_date, storage_path,
    is_current, notes, metadata
  ) values (
    tucxa_id, procedimentos_id, '2025 oficial', date '2025-01-01',
    'documentos/2025/PROCEDIMENTOS_DO_TUCXA_2025.pdf', true,
    'Arquivo oficial armazenado no bucket privado tucxa-acervo-vivo.',
    jsonb_build_object('source','ajustes-17','original_file_name','PROCEDIMENTOS_DO_TUCXA_2025.pdf')
  )
  on conflict (resource_id, version_label) do update set
    effective_date = excluded.effective_date,
    storage_path = excluded.storage_path,
    is_current = true,
    notes = excluded.notes,
    metadata = public.oh_acervo_resource_versions.metadata || excluded.metadata;

  -- Corrige o caso visual em que Regulamento/Procedimentos apareciam repetidos porque
  -- havia recursos duplicados com o mesmo título. Itens de trilha apontam para o registro canônico.
  for resource_row in
    select id, title
    from public.oh_acervo_resources
    where organization_id = tucxa_id
      and id not in (regulamento_id, procedimentos_id)
      and lower(title) in (
        lower('Regulamento do Tucxa 2025'),
        lower('Procedimentos e Orientações Básicas do Tucxa 2025')
      )
  loop
    update public.oh_acervo_trail_items
       set resource_id = case
         when lower(resource_row.title) = lower('Regulamento do Tucxa 2025') then regulamento_id
         else procedimentos_id
       end
     where organization_id = tucxa_id
       and resource_id = resource_row.id
       and not exists (
         select 1
         from public.oh_acervo_trail_items existing
         where existing.trail_id = public.oh_acervo_trail_items.trail_id
           and existing.resource_id = case
             when lower(resource_row.title) = lower('Regulamento do Tucxa 2025') then regulamento_id
             else procedimentos_id
           end
       );

    delete from public.oh_acervo_trail_items
     where organization_id = tucxa_id
       and resource_id = resource_row.id;

    delete from public.oh_acervo_resource_versions
     where organization_id = tucxa_id
       and resource_id = resource_row.id;

    delete from public.oh_acervo_resources
     where organization_id = tucxa_id
       and id = resource_row.id;
  end loop;

  select id into v_trail_id
  from public.oh_acervo_trails
  where organization_id = tucxa_id
    and slug = 'comecando-no-tucxa'
  limit 1;

  if v_trail_id is not null then
    insert into public.oh_acervo_trail_items (
      organization_id, trail_id, item_type, resource_id, sort_order, required, note
    ) values
      (tucxa_id, v_trail_id, 'resource', regulamento_id, 10, true, 'Documento institucional recomendado para começar.'),
      (tucxa_id, v_trail_id, 'resource', procedimentos_id, 20, true, 'Orientações práticas e institucionais recomendadas para começar.')
    on conflict do nothing;

    update public.oh_acervo_trail_items
       set sort_order = case resource_id
         when regulamento_id then 10
         when procedimentos_id then 20
         else sort_order
       end
     where organization_id = tucxa_id
       and public.oh_acervo_trail_items.trail_id = v_trail_id
       and resource_id in (regulamento_id, procedimentos_id);
  end if;

  -- Cria automaticamente a estrutura anual para todos os anos já indexados no Folha Verde.
  insert into public.oh_acervo_folha_years (organization_id, year)
  select distinct
    tucxa_id,
    nullif(resource.metadata ->> 'year','')::integer
  from public.oh_acervo_resources resource
  where resource.organization_id = tucxa_id
    and resource.resource_type = 'folha_verde'
    and nullif(resource.metadata ->> 'year','') ~ '^(19|20)[0-9]{2}$'
  on conflict (organization_id, year) do nothing;
end $$;

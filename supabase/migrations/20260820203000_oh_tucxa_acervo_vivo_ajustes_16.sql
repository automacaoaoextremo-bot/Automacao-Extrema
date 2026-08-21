-- TUCXA / Acervo Vivo — Ajustes 16
-- PDFs do Folha Verde no Supabase Storage, ordem cronológica decrescente
-- e ajustes de apoio ao fluxo reserva -> retirada física -> empréstimo.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tucxa-acervo-vivo',
  'tucxa-acervo-vivo',
  false,
  31457280,
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
declare
  tucxa_id uuid;
  folha_trail_id uuid;
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
    raise notice 'Acervo Vivo Ajuste 16: organização TUCXA não localizada.';
    return;
  end if;

  -- Cada versão já possui no metadata o caminho original dentro do ZIP 2025e2026.
  -- O script de upload preserva esse caminho sob o prefixo folha-verde/.
  update public.oh_acervo_resource_versions version
     set storage_path = 'folha-verde/' || (version.metadata ->> 'original_zip_path'),
         effective_date = make_date(
           nullif(resource.metadata ->> 'year', '')::integer,
           nullif(resource.metadata ->> 'month', '')::integer,
           1
         ),
         notes = 'PDF armazenado no bucket privado tucxa-acervo-vivo. O sistema gera link temporário para leitura.'
    from public.oh_acervo_resources resource
   where version.organization_id = tucxa_id
     and resource.id = version.resource_id
     and resource.organization_id = tucxa_id
     and resource.resource_type = 'folha_verde'
     and coalesce(version.metadata ->> 'original_zip_path', '') <> '';

  update public.oh_acervo_resources
     set governance_status = 'vigente',
         updated_at = now()
   where organization_id = tucxa_id
     and resource_type = 'folha_verde'
     and active = true;

  -- Mantém a trilha Folha Verde com as edições mais recentes primeiro.
  select id into folha_trail_id
  from public.oh_acervo_trails
  where organization_id = tucxa_id
    and slug = 'folha-verde-edicoes'
  limit 1;

  if folha_trail_id is not null then
    update public.oh_acervo_trail_items item
       set sort_order = 999999 - (
         coalesce(nullif(resource.metadata ->> 'year', '')::integer, 0) * 100
         + coalesce(nullif(resource.metadata ->> 'month', '')::integer, 0)
       )
      from public.oh_acervo_resources resource
     where item.organization_id = tucxa_id
       and item.trail_id = folha_trail_id
       and item.resource_id = resource.id
       and resource.organization_id = tucxa_id
       and resource.resource_type = 'folha_verde';
  end if;

  -- Sem alteração automática nas regras configuradas pelo Gestor Acervo Vivo - Biblioteca.
  -- No fluxo do Ajuste 16: aguardando = fila; disponivel = exemplar separado para retirada;
  -- atendida = retirada confirmada pela Recepção e empréstimo criado.
end $$;

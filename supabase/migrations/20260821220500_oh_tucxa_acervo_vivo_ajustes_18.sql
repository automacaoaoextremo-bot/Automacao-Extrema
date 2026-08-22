-- TUCXA / Acervo Vivo - Ajustes e Evolucoes 18
-- Manual para Cambonos, trilha do Folha Verde e exibicao ano -> edicoes.

begin;

do $$
declare
  tucxa_id uuid;
  manual_id uuid;
  cambono_trail_id uuid;
  folha_trail_id uuid;
begin
  select id into tucxa_id
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by created_at desc
  limit 1;

  if tucxa_id is null then
    raise exception 'Organizacao Tucxa nao localizada.';
  end if;

  select id into manual_id
  from public.oh_acervo_resources
  where organization_id = tucxa_id
    and lower(title) = lower('Manual para Cambonos 2025')
  order by created_at
  limit 1;

  if manual_id is null then
    insert into public.oh_acervo_resources (
      organization_id, resource_type, title, description, subjects, audience,
      governance_status, active, metadata
    ) values (
      tucxa_id,
      'manual',
      'Manual para Cambonos 2025',
      'Responsabilidades, materiais, sigilo, conduta e atuacao dos cambonos.',
      array['cambonagem','atendimento','responsabilidade']::text[],
      array['cambonos','filhos da corrente']::text[],
      'vigente',
      true,
      jsonb_build_object('source','ajustes-18','year',2025)
    ) returning id into manual_id;
  else
    update public.oh_acervo_resources
       set resource_type = 'manual',
           governance_status = 'vigente',
           active = true,
           metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('source','ajustes-18','year',2025),
           updated_at = now()
     where id = manual_id;
  end if;

  update public.oh_acervo_resource_versions
     set is_current = false
   where organization_id = tucxa_id
     and resource_id = manual_id;

  insert into public.oh_acervo_resource_versions (
    organization_id, resource_id, version_label, effective_date, storage_path,
    is_current, notes, metadata
  ) values (
    tucxa_id,
    manual_id,
    '2025 oficial',
    date '2025-01-01',
    'documentos/2025/MANUAL_CAMBONOS_2025.pdf',
    true,
    'Arquivo oficial armazenado no bucket privado tucxa-acervo-vivo.',
    jsonb_build_object('source','ajustes-18','original_file_name','MANUAL CAMBONOS 2025.pdf')
  )
  on conflict (resource_id, version_label) do update set
    effective_date = excluded.effective_date,
    storage_path = excluded.storage_path,
    is_current = true,
    notes = excluded.notes,
    metadata = coalesce(public.oh_acervo_resource_versions.metadata, '{}'::jsonb) || excluded.metadata;

  select id into cambono_trail_id
  from public.oh_acervo_trails
  where organization_id = tucxa_id
    and slug = 'cambonagem-atendimento-responsabilidade'
  limit 1;

  if cambono_trail_id is not null then
    insert into public.oh_acervo_trail_items (
      organization_id, trail_id, item_type, resource_id, sort_order, required, note
    ) values (
      tucxa_id, cambono_trail_id, 'resource', manual_id, 10, true,
      'Manual oficial recomendado para a trilha de Cambonagem.'
    ) on conflict do nothing;

    update public.oh_acervo_trail_items
       set sort_order = 10,
           required = true,
           note = 'Manual oficial recomendado para a trilha de Cambonagem.'
     where organization_id = tucxa_id
       and trail_id = cambono_trail_id
       and resource_id = manual_id;
  end if;

  select id into folha_trail_id
  from public.oh_acervo_trails
  where organization_id = tucxa_id
    and slug = 'folha-verde-edicoes'
  limit 1;

  if folha_trail_id is not null then
    update public.oh_acervo_trails
       set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
             'display_mode','year_month_popup',
             'source','ajustes-18'
           ),
           updated_at = now()
     where id = folha_trail_id;

    insert into public.oh_acervo_trail_items (
      organization_id, trail_id, item_type, resource_id, sort_order, required, note
    )
    select tucxa_id, folha_trail_id, 'resource', r.id, 100, false,
           'Edicao historica do Folha Verde.'
    from public.oh_acervo_resources r
    where r.organization_id = tucxa_id
      and r.resource_type = 'folha_verde'
      and r.active = true
      and not exists (
        select 1
        from public.oh_acervo_trail_items ti
        where ti.trail_id = folha_trail_id
          and ti.resource_id = r.id
      );
  end if;
end $$;

commit;

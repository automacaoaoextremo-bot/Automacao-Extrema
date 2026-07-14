-- Organização em Harmonia / Agenda Viva
-- Cadastros auxiliares para públicos, classificações e responsáveis.
-- As preferências ficam no JSON de oh_module_settings.settings, evitando mudanças estruturais.

do $$
declare
  v_org_id uuid;
  v_settings jsonb;
begin
  select id into v_org_id
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by case when slug = 'tucxa' then 0 else 1 end, created_at desc
  limit 1;

  if v_org_id is null then
    return;
  end if;

  insert into public.oh_module_settings (organization_id, module_slug, enabled, settings)
  values (v_org_id, 'agenda-viva', true, '{}'::jsonb)
  on conflict (organization_id, module_slug)
  do update set enabled = true, updated_at = now();

  select coalesce(settings, '{}'::jsonb) into v_settings
  from public.oh_module_settings
  where organization_id = v_org_id and module_slug = 'agenda-viva'
  limit 1;

  if not (v_settings ? 'agendaCatalogs') then
    v_settings := jsonb_set(
      v_settings,
      '{agendaCatalogs}',
      jsonb_build_object(
        'audiences', jsonb_build_array(
          jsonb_build_object('id','filhos-corrente','value','filhos-corrente','label','Somente Filhos da Corrente','active',true,'archived',false),
          jsonb_build_object('id','consulentes','value','consulentes','label','Consulentes / Filhos de Fora','active',true,'archived',false),
          jsonb_build_object('id','todos','value','todos','label','Filhos da Corrente e Consulentes','active',true,'archived',false)
        ),
        'classifications', jsonb_build_array(
          jsonb_build_object('id','umbanda','value','umbanda','label','Umbanda','active',true,'archived',false),
          jsonb_build_object('id','outros','value','outros','label','Outros','active',true,'archived',false),
          jsonb_build_object('id','sementinha','value','sementinha','label','Sementinha','active',true,'archived',false),
          jsonb_build_object('id','estudos','value','estudos','label','Estudos','active',true,'archived',false),
          jsonb_build_object('id','social','value','social','label','Social / comunidade','active',true,'archived',false)
        ),
        'responsiblePersonIds', '[]'::jsonb
      ),
      true
    );

    update public.oh_module_settings
    set settings = v_settings, updated_at = now()
    where organization_id = v_org_id and module_slug = 'agenda-viva';
  end if;
end $$;

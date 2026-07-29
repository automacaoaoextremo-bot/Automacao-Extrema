begin;

do $$
declare
  tucxa_id uuid;
begin
  select organization.id
    into tucxa_id
  from public.oh_organizations organization
  where organization.slug = 'tucxa'
     or organization.name ilike '%tucxa%'
  order by case when organization.slug = 'tucxa' then 0 else 1 end, organization.created_at desc
  limit 1;

  if tucxa_id is null then
    raise notice 'Organizacao TUCXA nao localizada. Nenhum dado foi alterado.';
    return;
  end if;

  -- Reforca a classificacao do trabalho especial que ocorre antes do retorno
  -- das ferias. O codigo usa os metadados abaixo; o titulo fica somente como
  -- compatibilidade para o registro ja existente.
  update public.agv_events event
     set active = true,
         status = 'aprovado',
         metadata = coalesce(event.metadata, '{}'::jsonb) || jsonb_build_object(
           'specialEventType', 'retorno-ferias',
           'special_event_type', 'retorno-ferias',
           'specialPanelLabel', 'Atendimento Retorno Ferias',
           'special_panel_label', 'Atendimento Retorno Ferias',
           'allThursdayGroups', true,
           'all_thursday_groups', true,
           'thursdayGroupScope', jsonb_build_array('grupo-1', 'grupo-2'),
           'thursday_group_scope', jsonb_build_array('grupo-1', 'grupo-2'),
           'overrideRegularGroupSchedule', true,
           'override_regular_group_schedule', true,
           'attendanceConfirmationRequired', true,
           'attendance_confirmation_required', true,
           'allowOptionalEntityAppointment', true,
           'allow_optional_entity_appointment', true,
           'continuesDuringVacation', true,
           'blocksAppointments', false
         ),
         updated_at = now()
   where event.organization_id = tucxa_id
     and (
       (event.starts_at at time zone 'America/Sao_Paulo')::date = date '2026-07-30'
       or event.metadata->>'specialEventType' = 'retorno-ferias'
       or event.metadata->>'special_event_type' = 'retorno-ferias'
       or event.title ilike '%Retorno Férias%'
       or event.title ilike '%Retorno Ferias%'
     );

  -- Este evento pontual terminou em 21/07/2026. Ele permanece no historico,
  -- mas deixa de ser apresentado como opcao para novas selecoes do cadastro.
  update public.agv_events event
     set metadata = coalesce(event.metadata, '{}'::jsonb) || jsonb_build_object(
           'firstAccessEnabled', false,
           'first_access_enabled', false,
           'firstAccessClosedReason', 'evento_encerrado',
           'firstAccessClosedAt', '2026-07-22'
         ),
         updated_at = now()
   where event.organization_id = tucxa_id
     and (
       event.title ilike '%Mostra Cultural e Clube do Livro%'
       or event.group_slug = 'mostra-cultural-clube-livro'
     )
     and (event.starts_at at time zone 'America/Sao_Paulo')::date <= date '2026-07-21';

  -- Mantem o e-mail de copia administrativa configurado para as notificacoes
  -- de Primeiro Acesso e atualizacao cadastral.
  insert into public.oh_module_settings (organization_id, module_slug, enabled, settings)
  values (
    tucxa_id,
    'agenda-viva',
    true,
    jsonb_build_object(
      'accessCopyEmail', 'automacao.ao.extremo@gmail.com',
      'profileUpdateValidationEnabled', true
    )
  )
  on conflict (organization_id, module_slug)
  do update set
    settings = coalesce(public.oh_module_settings.settings, '{}'::jsonb)
      || jsonb_build_object(
        'accessCopyEmail', coalesce(
          nullif(public.oh_module_settings.settings->>'accessCopyEmail', ''),
          'automacao.ao.extremo@gmail.com'
        ),
        'profileUpdateValidationEnabled', true
      ),
    updated_at = now();
end $$;

commit;

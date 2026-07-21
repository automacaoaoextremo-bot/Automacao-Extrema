-- Organização em Harmonia / TUCXA
-- Corrige função principal do Primeiro Acesso e reforça o evento especial de retorno das férias.

do $$
declare
  tucxa_id uuid;
  filho_role_id uuid;
  cavalinho_role_id uuid;
begin
  select id
    into tucxa_id
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by case when slug = 'tucxa' then 0 else 1 end
  limit 1;

  if tucxa_id is null then
    return;
  end if;

  select id
    into filho_role_id
  from public.oh_roles
  where organization_id = tucxa_id
    and slug = 'filho-da-corrente'
    and active = true
  limit 1;

  select id
    into cavalinho_role_id
  from public.oh_roles
  where organization_id = tucxa_id
    and slug = 'cavalinho'
  limit 1;

  -- O vínculo principal de quem entrou pelo Primeiro Acesso é Filho da Corrente.
  -- Cavalinho permanece somente quando a pessoa o selecionou explicitamente.
  if filho_role_id is not null then
    update public.oh_memberships membership
       set role_id = filho_role_id,
           updated_at = now()
     where membership.organization_id = tucxa_id
       and (
         membership.agenda_viva_profile->>'source' = 'primeiro_acesso_filho_corrente'
         or membership.agenda_viva_profile ? 'submittedAt'
         or membership.agenda_viva_profile ? 'validationStatus'
       )
       and (
         membership.role_id is null
         or membership.role_id = cavalinho_role_id
       )
       and lower(coalesce(membership.agenda_viva_profile->>'isCavalinho', 'false'))
           not in ('true', '1', 'sim', 'yes')
       and not exists (
         select 1
         from jsonb_array_elements(
           case
             when jsonb_typeof(membership.agenda_viva_profile->'selectedFunctions') = 'array'
               then membership.agenda_viva_profile->'selectedFunctions'
             else '[]'::jsonb
           end
         ) as function_item
         where lower(coalesce(function_item->>'slug', '')) = 'cavalinho'
            or lower(coalesce(function_item->>'label', '')) = 'cavalinho'
       );
  end if;

  -- O evento de 30/07/2026 é uma quinta especial para todos os Filhos da Corrente.
  -- A identificação futura deve ser feita pelos metadados, não pelo título.
  update public.agv_events event
     set metadata = coalesce(event.metadata, '{}'::jsonb) || jsonb_build_object(
           'thursdayGroupScope', jsonb_build_array('grupo-1', 'grupo-2'),
           'allThursdayGroups', true,
           'attendanceConfirmationRequired', true,
           'allowOptionalEntityAppointment', true,
           'overrideRegularGroupSchedule', true,
           'specialPanelLabel', 'Atendimento Retorno Férias',
           'specialEventType', 'retorno-ferias'
         ),
         updated_at = now()
   where event.organization_id = tucxa_id
     and (event.starts_at at time zone 'America/Sao_Paulo')::date = date '2026-07-30'
     and (
       event.title ilike '%Trabalho para todos os Cavalinhos e Cambonos%'
       or event.event_type ilike '%trabalho-cavalinhos-cambonos%'
       or event.group_slug ilike '%trabalho-cavalinhos-cambonos%'
     );
end
$$;

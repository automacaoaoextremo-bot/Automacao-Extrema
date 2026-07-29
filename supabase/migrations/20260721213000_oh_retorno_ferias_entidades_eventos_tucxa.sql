-- Organização em Harmonia / TUCXA
-- Retorno das férias, vínculos pessoa-entidade e coleção Eventos do TUCXA.
-- Migration aditiva e idempotente.

create index if not exists idx_oh_person_entity_links_person_active
  on public.oh_person_entity_links (organization_id, person_id, active);

create index if not exists idx_oh_person_entity_links_entity_active
  on public.oh_person_entity_links (organization_id, entity_id, active);

-- Normaliza eventuais dados antigos antes de criar a restrição de uma única
-- entidade principal por pessoa. O vínculo mais recentemente atualizado é mantido.
with ranked_primary_links as (
  select
    link.id,
    row_number() over (
      partition by link.organization_id, link.person_id
      order by link.updated_at desc nulls last, link.created_at desc nulls last, link.id
    ) as position
  from public.oh_person_entity_links link
  where link.active = true
    and link.is_primary_for_attendance = true
    and link.relationship_type = 'recebe'
)
update public.oh_person_entity_links link
   set is_primary_for_attendance = false,
       updated_at = now()
  from ranked_primary_links ranked
 where link.id = ranked.id
   and ranked.position > 1;

create unique index if not exists idx_oh_person_entity_links_primary_attendance
  on public.oh_person_entity_links (organization_id, person_id)
  where active = true
    and is_primary_for_attendance = true
    and relationship_type = 'recebe';

do $$
declare
  tucxa_id uuid;
  default_location text := 'Tucxa';
  event_date date;
  event_title text;
  event_status text;
  event_active boolean;
  event_notes text;
  event_row record;
begin
  select organization.id
    into tucxa_id
  from public.oh_organizations organization
  where organization.slug = 'tucxa'
     or organization.name ilike '%tucxa%'
  order by case when organization.slug = 'tucxa' then 0 else 1 end
  limit 1;

  if tucxa_id is null then
    return;
  end if;

  -- Reforça o evento especial de retorno das férias. A data local é usada
  -- para evitar falhas causadas pela conversão de fuso do timestamptz.
  update public.agv_events event
     set status = 'aprovado',
         active = true,
         metadata = coalesce(event.metadata, '{}'::jsonb) || jsonb_build_object(
           'thursdayGroupScope', jsonb_build_array('grupo-1', 'grupo-2'),
           'thursday_group_scope', jsonb_build_array('grupo-1', 'grupo-2'),
           'allThursdayGroups', true,
           'all_thursday_groups', true,
           'attendanceConfirmationRequired', true,
           'attendance_confirmation_required', true,
           'allowOptionalEntityAppointment', true,
           'allow_optional_entity_appointment', true,
           'overrideRegularGroupSchedule', true,
           'override_regular_group_schedule', true,
           'specialPanelLabel', 'Atendimento Retorno Férias',
           'special_panel_label', 'Atendimento Retorno Férias',
           'specialEventType', 'retorno-ferias',
           'special_event_type', 'retorno-ferias',
           'audience', 'filhos-corrente',
           'publico', 'filhos-corrente',
           'targetAudience', 'filhos-corrente'
         ),
         updated_at = now()
   where event.organization_id = tucxa_id
     and (
       (event.starts_at at time zone 'America/Sao_Paulo')::date = date '2026-07-30'
       or event.metadata->>'specialEventType' = 'retorno-ferias'
       or event.metadata->>'special_event_type' = 'retorno-ferias'
     )
     and (
       event.title ilike '%Retorno Férias%'
       or event.title ilike '%Retorno Ferias%'
       or event.metadata->>'specialEventType' = 'retorno-ferias'
       or event.metadata->>'special_event_type' = 'retorno-ferias'
     );

  -- Classifica datas do calendário físico como uma coleção independente.
  -- O horário não aparece no calendário: os registros são de dia inteiro e
  -- recebem timeUndefined = true. O público inicial é Filhos da Corrente.
  for event_row in
    select *
    from (values
      (date '2026-02-21', 'Pizza', 'aprovado', true, null::text),
      (date '2026-04-25', 'Feijoada São Jorge', 'aprovado', true, null::text),
      (date '2026-06-14', 'Festa Junina', 'aprovado', true, null::text),
      (date '2026-08-08', 'Pizza', 'aprovado', true, null::text),
      -- A data de 19/09 está riscada no calendário físico. É mantida apenas
      -- como histórico, inativa e reprovada, sem publicação nas agendas.
      (date '2026-09-19', 'Rodízio de Pizza', 'reprovado', false, 'Data riscada no calendário físico de 2026; registro mantido inativo para histórico.'),
      (date '2026-10-17', 'Pizza', 'aprovado', true, null::text),
      (date '2026-11-15', 'Confraternização', 'aprovado', true, null::text)
    ) as calendar_event(event_date, event_title, event_status, event_active, event_notes)
  loop
    event_date := event_row.event_date;
    event_title := event_row.event_title;
    event_status := event_row.event_status;
    event_active := event_row.event_active;
    event_notes := event_row.event_notes;

    -- Se já existe um evento no mesmo dia e com o mesmo título, apenas
    -- acrescenta a taxonomia da coleção, sem duplicar o registro.
    update public.agv_events event
       set metadata = coalesce(event.metadata, '{}'::jsonb) || jsonb_build_object(
             'eventClassification', 'social',
             'event_classification', 'social',
             'classification', 'social',
             'classificacao', 'social',
             'eventCollection', 'eventos-tucxa',
             'event_collection', 'eventos-tucxa',
             'calendarColorKey', 'eventos-tucxa',
             'calendar_color_key', 'eventos-tucxa',
             'timeUndefined', true,
             'time_undefined', true,
             'audience', 'filhos-corrente',
             'publico', 'filhos-corrente',
             'targetAudience', 'filhos-corrente',
             'sourceCalendar', 'calendario-fisico-tucxa-2026'
           ),
           updated_at = now()
     where event.organization_id = tucxa_id
       and (event.starts_at at time zone 'America/Sao_Paulo')::date = event_date
       and lower(trim(event.title)) = lower(trim(event_title));

    if not exists (
      select 1
      from public.agv_events event
      where event.organization_id = tucxa_id
        and (event.starts_at at time zone 'America/Sao_Paulo')::date = event_date
        and lower(trim(event.title)) = lower(trim(event_title))
    ) then
      insert into public.agv_events (
        organization_id,
        title,
        event_type,
        status,
        active,
        starts_at,
        ends_at,
        all_day,
        location,
        group_slug,
        requires_approval,
        notes,
        metadata
      ) values (
        tucxa_id,
        event_title,
        'evento-tucxa',
        event_status,
        event_active,
        (event_date::text || ' 00:00:00-03')::timestamptz,
        (event_date::text || ' 23:59:59-03')::timestamptz,
        true,
        default_location,
        'eventos-tucxa',
        false,
        event_notes,
        jsonb_build_object(
          'eventClassification', 'social',
          'event_classification', 'social',
          'classification', 'social',
          'classificacao', 'social',
          'eventCollection', 'eventos-tucxa',
          'event_collection', 'eventos-tucxa',
          'calendarColorKey', 'eventos-tucxa',
          'calendar_color_key', 'eventos-tucxa',
          'timeUndefined', true,
          'time_undefined', true,
          'audience', 'filhos-corrente',
          'publico', 'filhos-corrente',
          'targetAudience', 'filhos-corrente',
          'sourceCalendar', 'calendario-fisico-tucxa-2026',
          'visual_calendar', true,
          'highlight_visual', true
        )
      );
    end if;
  end loop;

  -- Garante a configuração do módulo e registra a coleção nos catálogos sem
  -- remover públicos, classificações ou responsáveis já cadastrados.
  insert into public.oh_module_settings (organization_id, module_slug, enabled, settings)
  values (tucxa_id, 'agenda-viva', true, '{}'::jsonb)
  on conflict (organization_id, module_slug)
  do update set enabled = true, updated_at = now();

  update public.oh_module_settings module_setting
     set settings = jsonb_set(
           coalesce(module_setting.settings, '{}'::jsonb),
           '{agendaCatalogs}',
           coalesce(module_setting.settings->'agendaCatalogs', '{}'::jsonb) ||
             jsonb_build_object(
               'collections',
               coalesce(module_setting.settings->'agendaCatalogs'->'collections', '[]'::jsonb) ||
                 case
                   when coalesce(module_setting.settings->'agendaCatalogs'->'collections', '[]'::jsonb)
                        @> '[{"value":"eventos-tucxa"}]'::jsonb
                     then '[]'::jsonb
                   else jsonb_build_array(jsonb_build_object(
                     'id', 'eventos-tucxa',
                     'value', 'eventos-tucxa',
                     'label', 'Eventos do TUCXA',
                     'description', 'Datas do calendário físico e social do TUCXA.',
                     'active', true,
                     'archived', false
                   ))
                 end
             ),
           true
         ),
         updated_at = now()
   where module_setting.organization_id = tucxa_id
     and module_setting.module_slug = 'agenda-viva';
end
$$;

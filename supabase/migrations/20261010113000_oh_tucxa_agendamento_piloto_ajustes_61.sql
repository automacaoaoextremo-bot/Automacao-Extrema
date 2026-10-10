-- TUCXA - Agendamento Piloto - Ajuste 61
-- 1) Preserva o comportamento atual de paginação por visão:
--    Entidade e Consulente paginadas; Caderno sem paginação.
-- 2) Retrocompatibiliza agendamentos já feitos com a Entidade "Primeira Vez",
--    inclusive quando o agendamento já foi realocado para outra Entidade.
--
-- A lógica nova passa a manter o histórico no JSONB metadata:
--   firstTimeAppointment
--   firstTimeIndicatorActive
--   firstTimeOriginalEntityId
--   firstTimeOriginalEntityName
--   firstTimeMarkedAt
--
-- A sinalização visual fica ativa somente até existir um agendamento posterior
-- para a mesma pessoa. O histórico de Primeira Vez continua preservado.

begin;

update public.oh_module_settings
set settings = jsonb_set(
  jsonb_set(
    jsonb_set(
      coalesce(settings, '{}'::jsonb),
      '{pilotTriageEntityPaginationEnabled}',
      case
        when coalesce(settings, '{}'::jsonb) ? 'pilotTriageEntityPaginationEnabled'
          then coalesce(settings, '{}'::jsonb) -> 'pilotTriageEntityPaginationEnabled'
        when coalesce(settings, '{}'::jsonb) ? 'pilotTriagePaginationEnabled'
          then coalesce(settings, '{}'::jsonb) -> 'pilotTriagePaginationEnabled'
        else 'true'::jsonb
      end,
      true
    ),
    '{pilotTriageConsulentePaginationEnabled}',
    case
      when coalesce(settings, '{}'::jsonb) ? 'pilotTriageConsulentePaginationEnabled'
        then coalesce(settings, '{}'::jsonb) -> 'pilotTriageConsulentePaginationEnabled'
      when coalesce(settings, '{}'::jsonb) ? 'pilotTriagePaginationEnabled'
        then coalesce(settings, '{}'::jsonb) -> 'pilotTriagePaginationEnabled'
      else 'true'::jsonb
    end,
    true
  ),
  '{pilotTriageCadernoPaginationEnabled}',
  case
    when coalesce(settings, '{}'::jsonb) ? 'pilotTriageCadernoPaginationEnabled'
      then coalesce(settings, '{}'::jsonb) -> 'pilotTriageCadernoPaginationEnabled'
    else 'false'::jsonb
  end,
  true
),
updated_at = now()
where module_slug = 'atendimento-em-harmonia'
  and organization_id in (
    select id
    from public.oh_organizations
    where lower(coalesce(slug, '')) = 'tucxa'
       or lower(coalesce(name, '')) like '%tucxa%'
  );

with first_time_entities as (
  select
    e.id,
    e.organization_id,
    e.name,
    e.slug
  from public.oh_spiritual_entities e
  join public.oh_organizations o on o.id = e.organization_id
  where (
      lower(coalesce(o.slug, '')) = 'tucxa'
      or lower(coalesce(o.name, '')) like '%tucxa%'
    )
    and regexp_replace(
          lower(coalesce(e.slug, '') || ' ' || coalesce(e.name, '')),
          '[^a-z0-9]+',
          '',
          'g'
        ) like '%primeiravez%'
),
candidates as (
  select
    a.id as appointment_id,
    a.organization_id,
    a.person_id,
    a.created_at,
    coalesce(
      current_first.id,
      (
        select c.previous_entity_id
        from public.oh_tucxa_appointment_entity_changes c
        join first_time_entities changed_first
          on changed_first.id = c.previous_entity_id
         and changed_first.organization_id = c.organization_id
        where c.organization_id = a.organization_id
          and c.appointment_id = a.id
        order by c.changed_at asc, c.id asc
        limit 1
      )
    ) as first_time_entity_id
  from public.oh_consulente_appointments a
  left join first_time_entities current_first
    on current_first.id = a.entity_id
   and current_first.organization_id = a.organization_id
  where current_first.id is not null
     or exists (
       select 1
       from public.oh_tucxa_appointment_entity_changes c
       join first_time_entities changed_first
         on changed_first.id = c.previous_entity_id
        and changed_first.organization_id = c.organization_id
       where c.organization_id = a.organization_id
         and c.appointment_id = a.id
     )
),
resolved as (
  select
    c.*,
    e.name as first_time_entity_name
  from candidates c
  join first_time_entities e
    on e.id = c.first_time_entity_id
   and e.organization_id = c.organization_id
)
update public.oh_consulente_appointments a
set metadata =
      coalesce(a.metadata, '{}'::jsonb)
      || jsonb_build_object(
        'firstTimeAppointment', true,
        'firstTimeIndicatorActive',
          case
            when a.person_id is null then true
            else not exists (
              select 1
              from public.oh_consulente_appointments newer
              where newer.organization_id = a.organization_id
                and newer.person_id = a.person_id
                and newer.id <> a.id
                and newer.created_at > a.created_at
            )
          end,
        'firstTimeOriginalEntityId', r.first_time_entity_id::text,
        'firstTimeOriginalEntityName', coalesce(r.first_time_entity_name, 'Primeira Vez'),
        'firstTimeMarkedAt', coalesce(a.metadata->>'firstTimeMarkedAt', a.created_at::text)
      ),
    updated_at = now()
from resolved r
where a.id = r.appointment_id
  and a.organization_id = r.organization_id;

commit;

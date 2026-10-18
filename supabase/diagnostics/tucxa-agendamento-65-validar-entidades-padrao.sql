-- TUCXA - Agendamento Piloto - Ajuste 65
-- Diagnóstico somente leitura.
--
-- Execute ANTES e DEPOIS da migration 20261010223000.
--
-- Depois da migration, o esperado é:
--   PESSOA_COM_HISTORICO_SEM_PADRAO ............ 0
--   VINCULO_COM_HISTORICO_SEM_PADRAO .......... 0
--   HISTORICO_TERCEIRO_SEM_VINCULO ............ 0
--   AMBIGUIDADE_NOME_TERCEIRO .................. 0
--
-- PADRAO_EXISTENTE_DIFERE_DO_PRIMEIRO é apenas informativo:
-- o Ajuste 65 preserva uma Entidade padrão já cadastrada e NÃO a sobrescreve.

with tucxa as (
  select id
  from public.oh_organizations
  where lower(coalesce(slug, '')) = 'tucxa'
     or lower(coalesce(name, '')) like '%tucxa%'
),
person_first as (
  select distinct on (a.organization_id, a.person_id)
    a.organization_id,
    a.person_id,
    a.entity_id,
    a.appointment_date,
    a.created_at,
    a.id as appointment_id
  from public.oh_consulente_appointments a
  join tucxa t on t.id = a.organization_id
  where a.person_id is not null
    and a.entity_id is not null
    and not (
      a.notification_contact_type = 'alternate'
      and a.source_contact_person_id = a.person_id
    )
  order by
    a.organization_id,
    a.person_id,
    a.appointment_date asc,
    a.created_at asc,
    a.id asc
),
relationship_first as (
  select *
  from (
    select
      r.id as relationship_id,
      r.organization_id,
      r.owner_person_id,
      r.related_person_id,
      r.related_name,
      r.default_entity_id,
      a.entity_id as first_entity_id,
      a.id as first_appointment_id,
      a.appointment_date,
      row_number() over (
        partition by r.id
        order by a.appointment_date asc, a.created_at asc, a.id asc
      ) as rn
    from public.oh_tucxa_consulente_relationships r
    join tucxa t on t.id = r.organization_id
    join public.oh_consulente_appointments a
      on a.organization_id = r.organization_id
     and a.source_contact_person_id = r.owner_person_id
     and a.notification_contact_type = 'alternate'
     and a.entity_id is not null
     and (
       (
         r.related_person_id is not null
         and a.person_id = r.related_person_id
       )
       or (
         a.person_id is null
         and lower(regexp_replace(btrim(a.consulente_name), '[[:space:]]+', ' ', 'g'))
           = lower(regexp_replace(btrim(r.related_name), '[[:space:]]+', ' ', 'g'))
       )
       or (
         a.person_id = a.source_contact_person_id
         and lower(regexp_replace(btrim(a.consulente_name), '[[:space:]]+', ' ', 'g'))
           = lower(regexp_replace(btrim(r.related_name), '[[:space:]]+', ' ', 'g'))
       )
     )
  ) ranked
  where rn = 1
),
history_base as (
  select
    a.id,
    a.organization_id,
    a.source_contact_person_id as owner_person_id,
    case
      when a.person_id is not null
       and a.person_id <> a.source_contact_person_id
        then a.person_id
      else null
    end as related_person_id,
    btrim(a.consulente_name) as related_name,
    coalesce(nullif(btrim(a.notification_contact_relationship), ''), 'Consulente') as relationship,
    a.entity_id,
    a.appointment_date,
    a.created_at,
    case
      when a.person_id is not null
       and a.person_id <> a.source_contact_person_id
        then 'person:' || a.person_id::text
      else
        'name:' || lower(regexp_replace(btrim(a.consulente_name), '[[:space:]]+', ' ', 'g'))
    end as identity_key
  from public.oh_consulente_appointments a
  join tucxa t on t.id = a.organization_id
  where a.notification_contact_type = 'alternate'
    and a.source_contact_person_id is not null
    and a.entity_id is not null
    and btrim(coalesce(a.consulente_name, '')) <> ''
),
history_first as (
  select *
  from (
    select
      h.*,
      row_number() over (
        partition by h.organization_id, h.owner_person_id, h.identity_key
        order by h.appointment_date asc, h.created_at asc, h.id asc
      ) as rn
    from history_base h
  ) ranked
  where rn = 1
),
ambiguous as (
  select
    a.organization_id,
    a.source_contact_person_id as owner_person_id,
    lower(regexp_replace(btrim(a.consulente_name), '[[:space:]]+', ' ', 'g')) as normalized_name,
    min(btrim(a.consulente_name)) as sample_name,
    count(distinct a.person_id) as person_count,
    string_agg(distinct a.person_id::text, ', ' order by a.person_id::text) as person_ids
  from public.oh_consulente_appointments a
  join tucxa t on t.id = a.organization_id
  where a.notification_contact_type = 'alternate'
    and a.source_contact_person_id is not null
    and a.person_id is not null
    and a.person_id <> a.source_contact_person_id
    and btrim(coalesce(a.consulente_name, '')) <> ''
  group by
    a.organization_id,
    a.source_contact_person_id,
    lower(regexp_replace(btrim(a.consulente_name), '[[:space:]]+', ' ', 'g'))
  having count(distinct a.person_id) > 1
)

select
  'PESSOA_COM_HISTORICO_SEM_PADRAO'::text as verificacao,
  p.id::text as person_id,
  null::text as owner_person_id,
  p.full_name::text as nome,
  coalesce(current_entity.name, '')::text as entidade_padrao_atual,
  coalesce(first_entity.name, '')::text as entidade_primeiro_agendamento,
  (
    'primeiro_agendamento=' || pf.appointment_date::text
    || ' | appointment_id=' || pf.appointment_id::text
  )::text as detalhes
from person_first pf
join public.oh_people p
  on p.id = pf.person_id
 and p.organization_id = pf.organization_id
left join public.oh_tucxa_pilot_person_preferences pref
  on pref.organization_id = pf.organization_id
 and pref.person_id = pf.person_id
left join public.oh_spiritual_entities current_entity
  on current_entity.id = pref.default_entity_id
left join public.oh_spiritual_entities first_entity
  on first_entity.id = pf.entity_id
where pref.default_entity_id is null

union all

select
  'VINCULO_COM_HISTORICO_SEM_PADRAO',
  coalesce(rf.related_person_id::text, ''),
  rf.owner_person_id::text,
  rf.related_name,
  '',
  coalesce(first_entity.name, ''),
  (
    'relationship_id=' || rf.relationship_id::text
    || ' | primeiro_agendamento=' || rf.appointment_date::text
    || ' | appointment_id=' || rf.first_appointment_id::text
  )
from relationship_first rf
left join public.oh_spiritual_entities first_entity
  on first_entity.id = rf.first_entity_id
where rf.default_entity_id is null

union all

select
  'HISTORICO_TERCEIRO_SEM_VINCULO',
  coalesce(h.related_person_id::text, ''),
  h.owner_person_id::text,
  h.related_name,
  '',
  coalesce(first_entity.name, ''),
  (
    'primeiro_agendamento=' || h.appointment_date::text
    || ' | appointment_id=' || h.id::text
    || ' | vinculo=' || h.relationship
  )
from history_first h
left join public.oh_spiritual_entities first_entity
  on first_entity.id = h.entity_id
where not exists (
  select 1
  from public.oh_tucxa_consulente_relationships r
  where r.organization_id = h.organization_id
    and r.owner_person_id = h.owner_person_id
    and (
      (
        h.related_person_id is not null
        and r.related_person_id = h.related_person_id
      )
      or (
        h.related_person_id is null
        and lower(regexp_replace(btrim(r.related_name), '[[:space:]]+', ' ', 'g'))
          = lower(regexp_replace(btrim(h.related_name), '[[:space:]]+', ' ', 'g'))
      )
    )
)

union all

select
  'AMBIGUIDADE_NOME_TERCEIRO',
  '',
  a.owner_person_id::text,
  a.sample_name,
  '',
  '',
  (
    'person_ids=' || a.person_ids
    || ' | quantidade=' || a.person_count::text
  )
from ambiguous a

union all

select
  'PADRAO_EXISTENTE_DIFERE_DO_PRIMEIRO',
  p.id::text,
  '',
  p.full_name,
  coalesce(current_entity.name, ''),
  coalesce(first_entity.name, ''),
  'INFORMATIVO: preferência existente será preservada pelo Ajuste 65.'
from person_first pf
join public.oh_people p
  on p.id = pf.person_id
 and p.organization_id = pf.organization_id
join public.oh_tucxa_pilot_person_preferences pref
  on pref.organization_id = pf.organization_id
 and pref.person_id = pf.person_id
left join public.oh_spiritual_entities current_entity
  on current_entity.id = pref.default_entity_id
left join public.oh_spiritual_entities first_entity
  on first_entity.id = pf.entity_id
where pref.default_entity_id is not null
  and pref.default_entity_id <> pf.entity_id

order by verificacao, nome, owner_person_id, person_id;

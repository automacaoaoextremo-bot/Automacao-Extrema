-- Organização em Harmonia / TUCXA
-- Agendamento Piloto — Ajuste 65
--
-- Objetivos:
-- 1) garantir Entidade padrão para Consulentes que já possuem histórico,
--    preservando qualquer Entidade padrão já cadastrada;
-- 2) usar a Entidade do PRIMEIRO agendamento conhecido quando a preferência
--    ainda estiver vazia;
-- 3) aplicar a mesma regra às pessoas atendidas por um contato responsável;
-- 4) persistir vínculos históricos que ainda existiam apenas nos agendamentos,
--    sem criar oh_people por nome e sem alterar a Entidade padrão do contato.
--
-- O "primeiro agendamento" é definido de forma determinística por:
--   appointment_date ASC, created_at ASC, id ASC.
--
-- Não há DELETE, TRUNCATE ou sobrescrita de default_entity_id já preenchido.

begin;

-- ---------------------------------------------------------------------------
-- Guarda de segurança:
-- se um mesmo contato + mesmo nome histórico estiver associado a MAIS DE UM
-- person_id real, não é seguro consolidar automaticamente apenas pelo nome.
-- Nesse cenário a migration aborta para revisão manual.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    with tucxa as (
      select id
      from public.oh_organizations
      where lower(coalesce(slug, '')) = 'tucxa'
         or lower(coalesce(name, '')) like '%tucxa%'
    )
    select 1
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
  ) then
    raise exception using message =
      'AJUSTE65_AMBIGUOUS_RELATED_IDENTITY: há nome histórico de pessoa vinculada associado a mais de um person_id para o mesmo contato responsável. Execute o diagnóstico do Ajuste 65 antes de continuar.';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 1. Pessoas com person_id próprio:
-- cria/completa a preferência apenas quando default_entity_id estiver ausente.
--
-- Em históricos legados, alguns agendamentos "para outra pessoa" usavam o
-- person_id do próprio contato responsável. Esses casos são excluídos daqui
-- para não transformar a Entidade da pessoa atendida na Entidade padrão do
-- titular do WhatsApp.
-- ---------------------------------------------------------------------------
with tucxa as (
  select id
  from public.oh_organizations
  where lower(coalesce(slug, '')) = 'tucxa'
     or lower(coalesce(name, '')) like '%tucxa%'
),
first_person_appointment as (
  select distinct on (a.organization_id, a.person_id)
    a.organization_id,
    a.person_id,
    a.entity_id
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
)
insert into public.oh_tucxa_pilot_person_preferences (
  organization_id,
  person_id,
  default_entity_id,
  created_at,
  updated_at
)
select
  organization_id,
  person_id,
  entity_id,
  now(),
  now()
from first_person_appointment
on conflict (organization_id, person_id)
do update
set
  default_entity_id = coalesce(
    public.oh_tucxa_pilot_person_preferences.default_entity_id,
    excluded.default_entity_id
  ),
  updated_at = case
    when public.oh_tucxa_pilot_person_preferences.default_entity_id is null
      then now()
    else public.oh_tucxa_pilot_person_preferences.updated_at
  end;

-- ---------------------------------------------------------------------------
-- 2. Materializa vínculos históricos de "Agendar para outra pessoa" que ainda
--    existiam apenas em oh_consulente_appointments.
--
-- Quando o histórico antigo usou person_id = source_contact_person_id, tratamos
-- o dependente como snapshot sem related_person_id. Não criamos oh_people por nome.
-- ---------------------------------------------------------------------------
with tucxa as (
  select id
  from public.oh_organizations
  where lower(coalesce(slug, '')) = 'tucxa'
     or lower(coalesce(name, '')) like '%tucxa%'
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
first_history as (
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
)
insert into public.oh_tucxa_consulente_relationships (
  organization_id,
  owner_person_id,
  related_person_id,
  related_name,
  relationship,
  default_entity_id,
  allow_different_entity,
  created_at,
  updated_at
)
select
  h.organization_id,
  h.owner_person_id,
  h.related_person_id,
  h.related_name,
  h.relationship,
  h.entity_id,
  false,
  now(),
  now()
from first_history h
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
on conflict (organization_id, owner_person_id, related_name) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Completa Entidade padrão de vínculos já existentes.
--    Se related_person_id existe, priorizamos agendamentos com esse person_id.
--    O match por nome só é usado quando o agendamento histórico não possui
--    person_id, evitando juntar pessoas diferentes apenas pelo nome.
-- ---------------------------------------------------------------------------
with tucxa as (
  select id
  from public.oh_organizations
  where lower(coalesce(slug, '')) = 'tucxa'
     or lower(coalesce(name, '')) like '%tucxa%'
),
relationship_history as (
  select
    r.id as relationship_id,
    a.entity_id,
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
  where r.default_entity_id is null
),
first_relationship_history as (
  select relationship_id, entity_id
  from relationship_history
  where rn = 1
)
update public.oh_tucxa_consulente_relationships r
set
  default_entity_id = h.entity_id,
  updated_at = now()
from first_relationship_history h
where r.id = h.relationship_id
  and r.default_entity_id is null;

-- ---------------------------------------------------------------------------
-- 4. Quando a pessoa vinculada já ganhou related_person_id próprio mas ainda
--    não possui preferência canônica, copia a Entidade padrão do vínculo.
--    Preferências existentes continuam intocadas.
-- ---------------------------------------------------------------------------
with tucxa as (
  select id
  from public.oh_organizations
  where lower(coalesce(slug, '')) = 'tucxa'
     or lower(coalesce(name, '')) like '%tucxa%'
),
related_defaults as (
  select distinct on (r.organization_id, r.related_person_id)
    r.organization_id,
    r.related_person_id as person_id,
    r.default_entity_id,
    r.allow_different_entity
  from public.oh_tucxa_consulente_relationships r
  join tucxa t on t.id = r.organization_id
  where r.related_person_id is not null
    and r.default_entity_id is not null
  order by
    r.organization_id,
    r.related_person_id,
    r.created_at asc,
    r.id asc
)
insert into public.oh_tucxa_pilot_person_preferences (
  organization_id,
  person_id,
  default_entity_id,
  allow_different_entity,
  created_at,
  updated_at
)
select
  organization_id,
  person_id,
  default_entity_id,
  allow_different_entity,
  now(),
  now()
from related_defaults
on conflict (organization_id, person_id)
do update
set
  default_entity_id = coalesce(
    public.oh_tucxa_pilot_person_preferences.default_entity_id,
    excluded.default_entity_id
  ),
  updated_at = case
    when public.oh_tucxa_pilot_person_preferences.default_entity_id is null
      then now()
    else public.oh_tucxa_pilot_person_preferences.updated_at
  end;

commit;

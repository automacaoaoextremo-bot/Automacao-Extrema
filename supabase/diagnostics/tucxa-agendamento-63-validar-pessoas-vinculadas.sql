-- TUCXA - Ajuste 63
-- Diagnóstico SOMENTE LEITURA.
-- Verifica pessoas vinculadas a contatos responsáveis, Entidade padrão e permissão
-- para utilizar Entidade diferente.

-- 1. Vínculos persistidos e suas preferências.
select
  o.name as organizacao,
  owner.id as contato_responsavel_id,
  owner.full_name as contato_responsavel,
  owner.whatsapp as whatsapp_contato,
  rel.id as relacionamento_id,
  rel.related_person_id,
  coalesce(related.full_name, rel.related_name) as pessoa_atendida,
  rel.relationship as vinculo,
  rel.default_entity_id,
  ent.name as entidade_padrao,
  rel.allow_different_entity,
  rel.updated_at
from public.oh_tucxa_consulente_relationships rel
join public.oh_organizations o
  on o.id = rel.organization_id
join public.oh_people owner
  on owner.id = rel.owner_person_id
left join public.oh_people related
  on related.id = rel.related_person_id
left join public.oh_spiritual_entities ent
  on ent.id = rel.default_entity_id
where (
  lower(coalesce(o.slug, '')) = 'tucxa'
  or lower(coalesce(o.name, '')) like '%tucxa%'
)
order by owner.full_name, coalesce(related.full_name, rel.related_name);

-- 2. Vínculos sem Entidade padrão que ainda precisam ser revisados pela Recepção.
select
  owner.full_name as contato_responsavel,
  owner.whatsapp as whatsapp_contato,
  rel.id as relacionamento_id,
  coalesce(related.full_name, rel.related_name) as pessoa_atendida,
  rel.relationship as vinculo,
  rel.allow_different_entity
from public.oh_tucxa_consulente_relationships rel
join public.oh_organizations o
  on o.id = rel.organization_id
join public.oh_people owner
  on owner.id = rel.owner_person_id
left join public.oh_people related
  on related.id = rel.related_person_id
where (
  lower(coalesce(o.slug, '')) = 'tucxa'
  or lower(coalesce(o.name, '')) like '%tucxa%'
)
and rel.default_entity_id is null
order by owner.full_name, coalesce(related.full_name, rel.related_name);

-- 3. Histórico de agendamentos para terceiros que ainda não possui um vínculo
-- persistido equivalente. O sistema continua exibindo esses registros como fallback
-- e permite que a Recepção salve Entidade padrão/permissão individual.
select
  a.id as agendamento_id,
  a.appointment_date,
  owner.id as contato_responsavel_id,
  owner.full_name as contato_responsavel,
  owner.whatsapp as whatsapp_contato,
  a.person_id as pessoa_atendida_person_id,
  coalesce(related.full_name, a.consulente_name) as pessoa_atendida,
  a.notification_contact_relationship as vinculo,
  a.entity_id as ultima_entidade_id,
  ent.name as ultima_entidade
from public.oh_consulente_appointments a
join public.oh_organizations o
  on o.id = a.organization_id
join public.oh_people owner
  on owner.id = a.source_contact_person_id
left join public.oh_people related
  on related.id = a.person_id
left join public.oh_spiritual_entities ent
  on ent.id = a.entity_id
where (
  lower(coalesce(o.slug, '')) = 'tucxa'
  or lower(coalesce(o.name, '')) like '%tucxa%'
)
and a.notification_contact_type = 'alternate'
and not exists (
  select 1
  from public.oh_tucxa_consulente_relationships rel
  where rel.organization_id = a.organization_id
    and rel.owner_person_id = a.source_contact_person_id
    and (
      (a.person_id is not null and rel.related_person_id = a.person_id)
      or (
        a.person_id is null
        and lower(btrim(rel.related_name)) = lower(btrim(a.consulente_name))
        and lower(btrim(rel.relationship)) = lower(btrim(coalesce(a.notification_contact_relationship, '')))
      )
    )
)
order by owner.full_name, a.appointment_date desc, a.created_at desc;

-- 4. Pessoas vinculadas que possuem person_id próprio:
-- compara a preferência canônica da pessoa com o snapshot do relacionamento.
select
  owner.full_name as contato_responsavel,
  related.id as pessoa_atendida_id,
  related.full_name as pessoa_atendida,
  pref.default_entity_id as entidade_padrao_pessoa_id,
  pref_ent.name as entidade_padrao_pessoa,
  pref.allow_different_entity as pessoa_permite_outra_entidade,
  rel.default_entity_id as entidade_snapshot_relacao_id,
  rel_ent.name as entidade_snapshot_relacao,
  rel.allow_different_entity as relacao_permite_outra_entidade
from public.oh_tucxa_consulente_relationships rel
join public.oh_organizations o
  on o.id = rel.organization_id
join public.oh_people owner
  on owner.id = rel.owner_person_id
join public.oh_people related
  on related.id = rel.related_person_id
left join public.oh_tucxa_pilot_person_preferences pref
  on pref.organization_id = rel.organization_id
 and pref.person_id = rel.related_person_id
left join public.oh_spiritual_entities pref_ent
  on pref_ent.id = pref.default_entity_id
left join public.oh_spiritual_entities rel_ent
  on rel_ent.id = rel.default_entity_id
where (
  lower(coalesce(o.slug, '')) = 'tucxa'
  or lower(coalesce(o.name, '')) like '%tucxa%'
)
order by owner.full_name, related.full_name;

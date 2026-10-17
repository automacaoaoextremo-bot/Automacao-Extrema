-- TUCXA - Agendamento Piloto - Ajuste 62
-- DIAGNOSTICO SOMENTE LEITURA.
-- Nao altera nenhum dado.
--
-- Objetivos:
-- 1) conferir a configuracao de paginacao do Encaminhamento;
-- 2) conferir os vinculos persistidos entre contato responsavel e pessoa atendida;
-- 3) conferir os historicos de agendamento para terceiros usados como fallback;
-- 4) identificar historicos ainda sem vinculo persistido;
-- 5) conferir diferencas entre o nome salvo no agendamento e o nome atual do cadastro.

-- 1. Configuracao atual do modulo Atendimento em Harmonia.
select
  o.id as organization_id,
  o.name as organization_name,
  s.settings -> 'pilotForwardingPaginationEnabled' as encaminhamento_paginado,
  s.settings -> 'pilotTriageEntityPaginationEnabled' as triagem_entidade_paginada,
  s.settings -> 'pilotTriageConsulentePaginationEnabled' as triagem_consulente_paginada,
  s.settings -> 'pilotTriageCadernoPaginationEnabled' as triagem_caderno_paginada
from public.oh_organizations o
join public.oh_module_settings s
  on s.organization_id = o.id
 and s.module_slug = 'atendimento-em-harmonia'
where lower(coalesce(o.slug, '')) = 'tucxa'
   or lower(coalesce(o.name, '')) like '%tucxa%';

-- 2. Vinculos ja persistidos entre contato responsavel e pessoa atendida.
select
  r.id as relationship_id,
  owner.id as contato_responsavel_person_id,
  owner.full_name as contato_responsavel,
  owner.whatsapp as contato_responsavel_whatsapp,
  r.related_person_id,
  coalesce(related.full_name, r.related_name) as consulente,
  r.related_name as nome_salvo_no_vinculo,
  r.relationship as parentesco_vinculo,
  e.name as entidade_padrao_do_vinculo,
  r.updated_at
from public.oh_tucxa_consulente_relationships r
join public.oh_organizations o
  on o.id = r.organization_id
join public.oh_people owner
  on owner.id = r.owner_person_id
left join public.oh_people related
  on related.id = r.related_person_id
left join public.oh_spiritual_entities e
  on e.id = r.default_entity_id
where lower(coalesce(o.slug, '')) = 'tucxa'
   or lower(coalesce(o.name, '')) like '%tucxa%'
order by owner.full_name, coalesce(related.full_name, r.related_name);

-- 3. Historico de agendamentos para outra pessoa.
-- Este historico tambem e usado pelo Ajuste 62 para oferecer pessoas ja atendidas,
-- mesmo quando ainda nao existe uma linha em oh_tucxa_consulente_relationships.
select
  a.id as appointment_id,
  a.appointment_date,
  owner.id as contato_responsavel_person_id,
  owner.full_name as contato_responsavel,
  owner.whatsapp as contato_responsavel_whatsapp,
  a.person_id as consulente_person_id,
  coalesce(related.full_name, a.consulente_name) as consulente_atual,
  a.consulente_name as consulente_salvo_no_agendamento,
  a.notification_contact_relationship as parentesco_vinculo,
  e.name as entidade,
  a.status
from public.oh_consulente_appointments a
join public.oh_organizations o
  on o.id = a.organization_id
left join public.oh_people owner
  on owner.id = a.source_contact_person_id
left join public.oh_people related
  on related.id = a.person_id
left join public.oh_spiritual_entities e
  on e.id = a.entity_id
where (lower(coalesce(o.slug, '')) = 'tucxa'
       or lower(coalesce(o.name, '')) like '%tucxa%')
  and a.notification_contact_type = 'alternate'
  and a.source_contact_person_id is not null
order by owner.full_name, a.appointment_date desc, coalesce(related.full_name, a.consulente_name);

-- 4. Historicos para terceiros que ainda nao possuem um vinculo persistido equivalente.
-- Retornar linhas aqui NAO e erro: o codigo do Ajuste 62 usa o historico como fallback.
-- A consulta ajuda a saber quais pessoas ainda dependem desse fallback.
select
  a.id as appointment_id,
  a.appointment_date,
  owner.full_name as contato_responsavel,
  owner.whatsapp as contato_responsavel_whatsapp,
  coalesce(related.full_name, a.consulente_name) as consulente,
  a.notification_contact_relationship as parentesco_vinculo
from public.oh_consulente_appointments a
join public.oh_organizations o
  on o.id = a.organization_id
join public.oh_people owner
  on owner.id = a.source_contact_person_id
left join public.oh_people related
  on related.id = a.person_id
where (lower(coalesce(o.slug, '')) = 'tucxa'
       or lower(coalesce(o.name, '')) like '%tucxa%')
  and a.notification_contact_type = 'alternate'
  and not exists (
    select 1
    from public.oh_tucxa_consulente_relationships r
    where r.organization_id = a.organization_id
      and r.owner_person_id = a.source_contact_person_id
      and (
        (a.person_id is not null and r.related_person_id = a.person_id)
        or lower(btrim(r.related_name)) = lower(btrim(a.consulente_name))
      )
  )
order by owner.full_name, a.appointment_date desc;

-- 5. Agendamentos cujo nome do cadastro atual difere do snapshot salvo no agendamento.
-- O relatorio do Ajuste 62 deve preferir p.full_name quando person_id estiver preenchido.
select
  a.id as appointment_id,
  a.appointment_date,
  e.name as entidade,
  a.person_id,
  a.consulente_name as nome_salvo_no_agendamento,
  p.full_name as nome_atual_do_cadastro,
  p.whatsapp
from public.oh_consulente_appointments a
join public.oh_organizations o
  on o.id = a.organization_id
join public.oh_people p
  on p.id = a.person_id
left join public.oh_spiritual_entities e
  on e.id = a.entity_id
where (lower(coalesce(o.slug, '')) = 'tucxa'
       or lower(coalesce(o.name, '')) like '%tucxa%')
  and lower(btrim(coalesce(a.consulente_name, ''))) <> lower(btrim(coalesce(p.full_name, '')))
order by a.appointment_date desc, p.full_name;

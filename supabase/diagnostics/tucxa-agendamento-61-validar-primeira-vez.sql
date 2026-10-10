-- TUCXA - Ajuste 61 - Validação de Primeira Vez e paginação
-- SOMENTE LEITURA: este arquivo não altera dados.

-- 1. Configuração de paginação da Triagem.
select
  o.name as organizacao,
  s.settings->>'pilotTriageEntityPaginationEnabled' as entidade_paginada,
  s.settings->>'pilotTriageConsulentePaginationEnabled' as consulente_paginada,
  s.settings->>'pilotTriageCadernoPaginationEnabled' as caderno_paginado
from public.oh_module_settings s
join public.oh_organizations o on o.id = s.organization_id
where s.module_slug = 'atendimento-em-harmonia'
  and (
    lower(coalesce(o.slug, '')) = 'tucxa'
    or lower(coalesce(o.name, '')) like '%tucxa%'
  );

-- 2. Entidade(s) reconhecida(s) como "Primeira Vez".
select
  e.id,
  e.name,
  e.slug,
  e.active,
  e.appointment_enabled
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
order by e.name;

-- 3. Agendamentos marcados como Primeira Vez.
select
  a.id as appointment_id,
  a.appointment_date,
  p.id as person_id,
  p.full_name,
  e.name as entidade_atual,
  a.status,
  a.metadata->>'firstTimeAppointment' as primeira_vez_historico,
  a.metadata->>'firstTimeIndicatorActive' as sinalizacao_ativa,
  a.metadata->>'firstTimeOriginalEntityName' as entidade_original,
  a.metadata->>'firstTimeMarkedAt' as marcado_em
from public.oh_consulente_appointments a
join public.oh_organizations o on o.id = a.organization_id
left join public.oh_people p on p.id = a.person_id
left join public.oh_spiritual_entities e on e.id = a.entity_id
where (
    lower(coalesce(o.slug, '')) = 'tucxa'
    or lower(coalesce(o.name, '')) like '%tucxa%'
  )
  and coalesce(a.metadata->>'firstTimeAppointment', 'false') = 'true'
order by a.created_at desc;

-- 4. Conferência de pessoas com mais de um histórico de Primeira Vez.
-- O resultado ideal é ZERO linhas.
select
  p.id as person_id,
  p.full_name,
  count(*) as quantidade_primeira_vez
from public.oh_consulente_appointments a
join public.oh_people p on p.id = a.person_id
join public.oh_organizations o on o.id = a.organization_id
where (
    lower(coalesce(o.slug, '')) = 'tucxa'
    or lower(coalesce(o.name, '')) like '%tucxa%'
  )
  and coalesce(a.metadata->>'firstTimeAppointment', 'false') = 'true'
group by p.id, p.full_name
having count(*) > 1
order by quantidade_primeira_vez desc, p.full_name;

-- 5. Preferência de Entidade padrão das pessoas que ainda possuem
-- sinalização ativa de Primeira Vez.
select
  p.id as person_id,
  p.full_name,
  a.id as appointment_id,
  a.appointment_date,
  a.metadata->>'firstTimeOriginalEntityName' as primeira_vez_original,
  pref.default_entity_id,
  default_entity.name as entidade_padrao_atual
from public.oh_consulente_appointments a
join public.oh_people p on p.id = a.person_id
left join public.oh_tucxa_pilot_person_preferences pref
  on pref.organization_id = a.organization_id
 and pref.person_id = a.person_id
left join public.oh_spiritual_entities default_entity
  on default_entity.id = pref.default_entity_id
join public.oh_organizations o on o.id = a.organization_id
where (
    lower(coalesce(o.slug, '')) = 'tucxa'
    or lower(coalesce(o.name, '')) like '%tucxa%'
  )
  and coalesce(a.metadata->>'firstTimeIndicatorActive', 'false') = 'true'
order by p.full_name;

-- TUCXA - Agendamento Piloto - Ajuste 67
-- Diagnóstico SOMENTE LEITURA.
--
-- Objetivos:
-- 1) conferir a Entidade "Primeira Vez" usada pelo piloto;
-- 2) conferir novos cadastros públicos marcados para primeiro atendimento obrigatório;
-- 3) identificar quem ainda deve usar Primeira Vez, quem já a utilizou e quem
--    aguarda definição de Entidade padrão;
-- 4) preservar a regra do Ajuste 66: WhatsApp de Filho da Corrente ou
--    Entidade/Cavalinho não pode ganhar elegibilidade de Consulente.
--
-- Nenhuma instrução abaixo altera dados.

-- ============================================================
-- 1) Entidade Primeira Vez disponível no cadastro do TUCXA
-- ============================================================
with tucxa as (
  select id
  from public.oh_organizations
  where lower(coalesce(slug, '')) = 'tucxa'
     or lower(coalesce(name, '')) like '%tucxa%'
  order by case when lower(coalesce(slug, '')) = 'tucxa' then 0 else 1 end,
           created_at asc
  limit 1
)
select
  e.id,
  e.name,
  e.slug,
  e.active,
  e.appointment_enabled,
  e.daily_capacity
from public.oh_spiritual_entities e
join tucxa t on t.id = e.organization_id
where lower(regexp_replace(coalesce(e.name, '') || ' ' || coalesce(e.slug, ''), '[^a-zA-Z0-9]+', ' ', 'g'))
      like '%primeira%vez%'
order by e.name;


-- ============================================================
-- 2) Estado do primeiro atendimento dos Consulentes atuais
-- ============================================================
with tucxa as (
  select id
  from public.oh_organizations
  where lower(coalesce(slug, '')) = 'tucxa'
     or lower(coalesce(name, '')) like '%tucxa%'
  order by case when lower(coalesce(slug, '')) = 'tucxa' then 0 else 1 end,
           created_at asc
  limit 1
),
roles as (
  select r.id, r.name, r.slug
  from public.oh_roles r
  join tucxa t on t.id = r.organization_id
  where r.active = true
),
people as (
  select
    p.id,
    p.full_name,
    p.whatsapp,
    p.email,
    p.registration_source,
    case
      when regexp_replace(coalesce(p.whatsapp, ''), '\D', '', 'g') like '55%'
       and length(regexp_replace(coalesce(p.whatsapp, ''), '\D', '', 'g')) > 11
      then substr(regexp_replace(coalesce(p.whatsapp, ''), '\D', '', 'g'), 3)
      else regexp_replace(coalesce(p.whatsapp, ''), '\D', '', 'g')
    end as whatsapp_key
  from public.oh_people p
  join tucxa t on t.id = p.organization_id
  where p.active = true
),
active_memberships as (
  select
    m.person_id,
    m.role_id,
    m.status,
    m.agenda_viva_profile
  from public.oh_memberships m
  join tucxa t on t.id = m.organization_id
  where m.active = true
    and lower(coalesce(m.status, 'ativo')) in ('ativo', 'active', '')
),
filhos as (
  select distinct m.person_id
  from active_memberships m
  left join roles r on r.id = m.role_id
  where lower(coalesce(r.slug, '')) in ('filho-da-corrente', 'filho-corrente')
     or lower(coalesce(r.name, '')) = 'filho da corrente'
     or lower(coalesce(m.agenda_viva_profile->>'pilotAccessKind', '')) in ('recepcao', 'cavalinho')
     or lower(coalesce(m.agenda_viva_profile->>'source', '')) in ('tucxa-agendamento-piloto-01', 'tucxa_agendamento_piloto_01')
),
entity_people as (
  select distinct l.person_id
  from public.oh_person_entity_links l
  join tucxa t on t.id = l.organization_id
  where l.active = true
),
blocked_ids as (
  select person_id from filhos
  union
  select person_id from entity_people
),
blocked_whatsapps as (
  select distinct p.whatsapp_key
  from people p
  join blocked_ids b on b.person_id = p.id
  where p.whatsapp_key <> ''
),
first_time_entities as (
  select e.id
  from public.oh_spiritual_entities e
  join tucxa t on t.id = e.organization_id
  where lower(regexp_replace(coalesce(e.name, '') || ' ' || coalesce(e.slug, ''), '[^a-zA-Z0-9]+', ' ', 'g'))
        like '%primeira%vez%'
),
appointment_summary as (
  select
    a.person_id,
    count(*) as appointment_count,
    bool_or(
      a.entity_id in (select id from first_time_entities)
      or coalesce((a.metadata->>'firstTimeAppointment')::boolean, false)
    ) as used_first_time,
    min(a.appointment_date) as first_appointment,
    max(a.appointment_date) as last_appointment
  from public.oh_consulente_appointments a
  join tucxa t on t.id = a.organization_id
  where a.person_id is not null
  group by a.person_id
),
first_time_from_history as (
  select distinct c.appointment_id
  from public.oh_tucxa_appointment_entity_changes c
  join tucxa t on t.id = c.organization_id
  where c.previous_entity_id in (select id from first_time_entities)
),
people_with_changed_first_time as (
  select distinct a.person_id
  from public.oh_consulente_appointments a
  join first_time_from_history h on h.appointment_id = a.id
  where a.person_id is not null
),
preferences as (
  select
    pref.person_id,
    pref.default_entity_id,
    pref.allow_different_entity
  from public.oh_tucxa_pilot_person_preferences pref
  join tucxa t on t.id = pref.organization_id
),
profile_flags as (
  select
    m.person_id,
    bool_or(coalesce((m.agenda_viva_profile->>'firstAppointmentMustBeFirstTime')::boolean, false)) as first_time_required
  from active_memberships m
  group by m.person_id
)
select
  case
    when b.person_id is not null
      or (p.whatsapp_key <> '' and bw.whatsapp_key is not null)
      then 'BLOQUEADO_PELO_PERFIL_ATUAL'
    when coalesce(a.used_first_time, false)
      or changed.person_id is not null
      then case
        when pref.default_entity_id is null
          or pref.default_entity_id in (select id from first_time_entities)
          then 'PRIMEIRA_VEZ_REALIZADA_AGUARDA_ENTIDADE_PADRAO'
        else 'PRIMEIRA_VEZ_REALIZADA_COM_ENTIDADE_PADRAO'
      end
    when coalesce(pf.first_time_required, false)
      and coalesce(a.appointment_count, 0) = 0
      then 'PRIMEIRA_VEZ_OBRIGATORIA_NOVO_CADASTRO'
    when pref.default_entity_id is null
      then 'SEM_HISTORICO_E_SEM_ENTIDADE_PADRAO'
    else 'CONSULENTE_COM_ENTIDADE_PADRAO'
  end as situacao,
  p.id as person_id,
  p.full_name,
  p.whatsapp,
  p.email,
  coalesce(pf.first_time_required, false) as cadastro_exige_primeira_vez,
  coalesce(a.appointment_count, 0) as total_agendamentos,
  coalesce(a.used_first_time, false) or changed.person_id is not null as ja_usou_primeira_vez,
  a.first_appointment,
  a.last_appointment,
  pref.default_entity_id,
  coalesce(e.name, '') as entidade_padrao,
  coalesce(pref.allow_different_entity, false) as permite_entidade_diferente
from people p
left join appointment_summary a on a.person_id = p.id
left join people_with_changed_first_time changed on changed.person_id = p.id
left join preferences pref on pref.person_id = p.id
left join profile_flags pf on pf.person_id = p.id
left join blocked_ids b on b.person_id = p.id
left join blocked_whatsapps bw on bw.whatsapp_key = p.whatsapp_key and p.whatsapp_key <> ''
left join public.oh_spiritual_entities e on e.id = pref.default_entity_id
order by situacao, p.full_name, p.whatsapp;


-- ============================================================
-- 3) Atenção: Entidade padrão gravada como Primeira Vez
-- O runtime do Ajuste 67 ignora esse valor como padrão permanente, mas esta
-- consulta ajuda a localizar resíduos históricos para revisão posterior.
-- ============================================================
with tucxa as (
  select id
  from public.oh_organizations
  where lower(coalesce(slug, '')) = 'tucxa'
     or lower(coalesce(name, '')) like '%tucxa%'
  order by case when lower(coalesce(slug, '')) = 'tucxa' then 0 else 1 end,
           created_at asc
  limit 1
),
first_time_entities as (
  select e.id, e.name
  from public.oh_spiritual_entities e
  join tucxa t on t.id = e.organization_id
  where lower(regexp_replace(coalesce(e.name, '') || ' ' || coalesce(e.slug, ''), '[^a-zA-Z0-9]+', ' ', 'g'))
        like '%primeira%vez%'
)
select
  p.id as person_id,
  p.full_name,
  p.whatsapp,
  ft.name as entidade_padrao_incorreta
from public.oh_tucxa_pilot_person_preferences pref
join tucxa t on t.id = pref.organization_id
join public.oh_people p on p.id = pref.person_id
join first_time_entities ft on ft.id = pref.default_entity_id
order by p.full_name;

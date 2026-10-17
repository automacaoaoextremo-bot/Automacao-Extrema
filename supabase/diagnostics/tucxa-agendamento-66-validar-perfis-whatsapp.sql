-- TUCXA - Ajuste 66
-- Diagnóstico de elegibilidade atual de Consulentes, Filhos da Corrente
-- e pessoas vinculadas a Entidades/Cavalinhos.
--
-- SOMENTE LEITURA.
--
-- Regra central:
--   o WhatsApp normalizado é a chave de identidade operacional.
--   Se qualquer cadastro ativo com o mesmo WhatsApp estiver atualmente como
--   Filho da Corrente ou vinculado a uma Entidade/Cavalinho, esse WhatsApp
--   não deve aparecer como Consulente nem receber novos atendimentos seg/ter.
--
-- O histórico de agendamentos é preservado e não define o perfil atual.

with tucxa as (
  select id
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by case when slug = 'tucxa' then 0 else 1 end, created_at asc
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
    p.notification_email,
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
  where
    lower(coalesce(r.slug, '')) in ('filho-da-corrente', 'filho-corrente')
    or lower(coalesce(r.name, '')) = 'filho da corrente'
    or lower(coalesce(m.agenda_viva_profile->>'pilotAccessKind', '')) in ('recepcao', 'cavalinho')
    or lower(coalesce(m.agenda_viva_profile->>'source', '')) in ('tucxa-agendamento-piloto-01', 'tucxa_agendamento_piloto_01')
),
entity_people as (
  select distinct
    l.person_id,
    l.entity_id,
    l.relationship_type
  from public.oh_person_entity_links l
  join tucxa t on t.id = l.organization_id
  where l.active = true
),
blocked_person_ids as (
  select person_id, 'FILHO_DA_CORRENTE'::text as reason
  from filhos
  union
  select person_id, 'ENTIDADE_CAVALINHO'::text as reason
  from entity_people
),
blocked_whatsapps as (
  select distinct p.whatsapp_key
  from people p
  join blocked_person_ids b on b.person_id = p.id
  where p.whatsapp_key <> ''
),
preferences as (
  select
    pref.person_id,
    pref.default_entity_id,
    pref.allow_different_entity
  from public.oh_tucxa_pilot_person_preferences pref
  join tucxa t on t.id = pref.organization_id
),
membership_flags as (
  select
    p.id as person_id,
    count(m.person_id) as active_membership_count,
    bool_or(
      lower(coalesce(m.agenda_viva_profile::text, '')) like '%consulente%'
      or lower(coalesce(m.agenda_viva_profile::text, '')) like '%filho-de-fora%'
      or lower(coalesce(m.agenda_viva_profile::text, '')) like '%filho de fora%'
    ) as has_consulente_profile
  from people p
  left join active_memberships m on m.person_id = p.id
  group by p.id
),
candidate_consulentes as (
  select
    p.*,
    pref.default_entity_id,
    pref.allow_different_entity,
    mf.active_membership_count,
    mf.has_consulente_profile,
    exists (select 1 from blocked_person_ids b where b.person_id = p.id) as blocked_by_person,
    exists (select 1 from blocked_whatsapps w where w.whatsapp_key = p.whatsapp_key and p.whatsapp_key <> '') as blocked_by_whatsapp
  from people p
  left join preferences pref on pref.person_id = p.id
  left join membership_flags mf on mf.person_id = p.id
),
eligible_consulentes as (
  select c.*
  from candidate_consulentes c
  where not c.blocked_by_person
    and not c.blocked_by_whatsapp
    and (
      coalesce(c.active_membership_count, 0) = 0
      or lower(coalesce(c.registration_source, '')) like '%recepcao%'
      or coalesce(c.has_consulente_profile, false)
    )
),
appointment_history as (
  select
    a.person_id,
    count(*) as total_agendamentos,
    min(a.appointment_date) as primeiro_agendamento,
    max(a.appointment_date) as ultimo_agendamento
  from public.oh_consulente_appointments a
  join tucxa t on t.id = a.organization_id
  where a.person_id is not null
  group by a.person_id
)

select
  'BLOQUEADO_ATUAL' as diagnostico,
  p.full_name as nome,
  p.whatsapp,
  p.whatsapp_key,
  string_agg(distinct b.reason, ', ' order by b.reason) as motivo,
  coalesce(e.name, '') as entidade_vinculada,
  coalesce(r.name, '') as papel_atual,
  coalesce(h.total_agendamentos, 0)::text as historico_agendamentos,
  coalesce(h.primeiro_agendamento::text, '') as primeiro_agendamento,
  coalesce(h.ultimo_agendamento::text, '') as ultimo_agendamento
from people p
join blocked_person_ids b on b.person_id = p.id
left join entity_people ep on ep.person_id = p.id
left join public.oh_spiritual_entities e on e.id = ep.entity_id
left join active_memberships m on m.person_id = p.id
left join roles r on r.id = m.role_id
left join appointment_history h on h.person_id = p.id
group by p.id, p.full_name, p.whatsapp, p.whatsapp_key, e.name, r.name,
         h.total_agendamentos, h.primeiro_agendamento, h.ultimo_agendamento

union all

select
  'WHATSAPP_COMPARTILHADO_COM_BLOQUEADO',
  p.full_name,
  p.whatsapp,
  p.whatsapp_key,
  'Mesmo WhatsApp de Filho da Corrente/Entidade',
  '',
  '',
  coalesce(h.total_agendamentos, 0)::text,
  coalesce(h.primeiro_agendamento::text, ''),
  coalesce(h.ultimo_agendamento::text, '')
from people p
left join appointment_history h on h.person_id = p.id
where p.whatsapp_key <> ''
  and exists (
    select 1
    from blocked_whatsapps bw
    where bw.whatsapp_key = p.whatsapp_key
  )
  and not exists (
    select 1
    from blocked_person_ids b
    where b.person_id = p.id
  )

union all

select
  'CONSULENTE_ELEGIVEL_ATUAL',
  c.full_name,
  c.whatsapp,
  c.whatsapp_key,
  case
    when c.default_entity_id is null then 'Sem Entidade padrão'
    else 'Elegível'
  end,
  coalesce(e.name, ''),
  '',
  coalesce(h.total_agendamentos, 0)::text,
  coalesce(h.primeiro_agendamento::text, ''),
  coalesce(h.ultimo_agendamento::text, '')
from eligible_consulentes c
left join public.oh_spiritual_entities e on e.id = c.default_entity_id
left join appointment_history h on h.person_id = c.id

order by diagnostico, nome, whatsapp_key;


-- 2) Duplicidades ativas de WhatsApp no TUCXA.
with tucxa as (
  select id
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by case when slug = 'tucxa' then 0 else 1 end, created_at asc
  limit 1
),
people as (
  select
    p.id,
    p.full_name,
    p.whatsapp,
    case
      when regexp_replace(coalesce(p.whatsapp, ''), '\D', '', 'g') like '55%'
       and length(regexp_replace(coalesce(p.whatsapp, ''), '\D', '', 'g')) > 11
      then substr(regexp_replace(coalesce(p.whatsapp, ''), '\D', '', 'g'), 3)
      else regexp_replace(coalesce(p.whatsapp, ''), '\D', '', 'g')
    end as whatsapp_key
  from public.oh_people p
  join tucxa t on t.id = p.organization_id
  where p.active = true
)
select
  whatsapp_key,
  count(*) as quantidade,
  string_agg(full_name || ' [' || id::text || ']', ' | ' order by full_name) as cadastros
from people
where whatsapp_key <> ''
group by whatsapp_key
having count(*) > 1
order by quantidade desc, whatsapp_key;


-- 3) Filhos da Corrente atuais que possuem histórico de Consulente.
-- Isto NÃO é erro: o histórico deve ser preservado. Serve apenas para conferir
-- que eles não apareçam mais como elegíveis nem recebam novos agendamentos.
with tucxa as (
  select id
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by case when slug = 'tucxa' then 0 else 1 end, created_at asc
  limit 1
),
filho_roles as (
  select r.id
  from public.oh_roles r
  join tucxa t on t.id = r.organization_id
  where r.active = true
    and r.slug in ('filho-da-corrente', 'filho-corrente')
),
filhos as (
  select distinct m.person_id
  from public.oh_memberships m
  join tucxa t on t.id = m.organization_id
  where m.active = true
    and lower(coalesce(m.status, 'ativo')) in ('ativo', 'active', '')
    and m.role_id in (select id from filho_roles)
)
select
  p.full_name,
  p.whatsapp,
  count(a.id) as total_agendamentos_historicos,
  min(a.appointment_date) as primeiro,
  max(a.appointment_date) as ultimo
from filhos f
join public.oh_people p on p.id = f.person_id and p.active = true
join public.oh_consulente_appointments a
  on a.organization_id = p.organization_id
 and a.person_id = p.id
group by p.id, p.full_name, p.whatsapp
order by p.full_name;

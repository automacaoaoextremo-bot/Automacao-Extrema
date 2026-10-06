-- TUCXA - Agendamento piloto - Diagnóstico Ajuste 52
-- SOMENTE LEITURA. Não altera dados.

-- 1) Confirma duplicidades inválidas de Ordem de Atendimento.
-- Esperado após o uso normal do sistema: zero linhas.
select
  a.appointment_date,
  a.entity_id,
  coalesce(e.name, '(sem entidade)') as entidade,
  a.arrival_order,
  count(*) as quantidade,
  string_agg(coalesce(a.consulente_name, a.id::text), ' | ' order by a.arrived_at, a.created_at, a.id) as agendamentos
from public.oh_consulente_appointments a
left join public.oh_spiritual_entities e on e.id = a.entity_id
where a.arrival_status = 'arrived'
  and a.arrival_order is not null
group by a.appointment_date, a.entity_id, e.name, a.arrival_order
having count(*) > 1
order by a.appointment_date, entidade, a.arrival_order;

-- 2) Mostra as ordens de atendimento de 05 e 06/10 por Entidade.
-- A ordem 1 pode aparecer em Entidades diferentes; não pode repetir dentro
-- da mesma Entidade/data.
select
  a.appointment_date as data,
  coalesce(e.name, '(sem entidade)') as entidade,
  a.consulente_name as consulente,
  a.arrival_status,
  a.arrival_order as ordem_atendimento,
  a.arrived_at,
  a.created_at
from public.oh_consulente_appointments a
left join public.oh_spiritual_entities e on e.id = a.entity_id
where a.appointment_date in (date '2026-10-05', date '2026-10-06')
order by a.appointment_date, entidade, a.arrival_order nulls last, a.created_at, a.id;

-- 3) Diagnóstico dos acessos com função Recepção.
-- Não exibe senha (o Supabase Auth não permite leitura de senha).
-- Verifique principalmente: pessoa ativa, membership ativo/status,
-- auth_user_id existente e presença do usuário em auth.users.
with tucxa as (
  select id
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by case when slug = 'tucxa' then 0 else 1 end, created_at asc
  limit 1
), memberships as (
  select
    p.id as person_id,
    p.full_name,
    p.whatsapp,
    p.email,
    p.notification_email,
    p.active as person_active,
    p.auth_user_id,
    m.id as membership_id,
    m.active as membership_active,
    m.status as membership_status,
    m.agenda_viva_profile
  from public.oh_people p
  join tucxa t on t.id = p.organization_id
  left join public.oh_memberships m
    on m.organization_id = p.organization_id
   and m.person_id = p.id
  where
    lower(coalesce(m.agenda_viva_profile::text, '')) like '%recep%'
)
select
  m.full_name,
  m.whatsapp,
  m.email,
  m.notification_email,
  m.person_active,
  m.membership_active,
  m.membership_status,
  m.auth_user_id,
  (u.id is not null) as auth_user_exists,
  u.email as auth_email,
  u.phone as auth_phone,
  u.email_confirmed_at,
  u.phone_confirmed_at,
  u.last_sign_in_at,
  u.raw_user_meta_data->>'must_change_password' as must_change_password,
  m.agenda_viva_profile
from memberships m
left join auth.users u on u.id = m.auth_user_id
order by m.full_name, m.membership_id;

-- TUCXA - Ajuste 64 - diagnóstico de Primeiro Acesso / Gabriel Mattano da Silva
-- SOMENTE LEITURA. Não altera nenhum registro.

-- 1) Confirma a organização TUCXA.
with tucxa as (
  select id, name, slug
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by created_at asc
  limit 1
)
select * from tucxa;

-- 2) Procura pessoas relacionadas ao caso pelo e-mail informado ou pelo nome.
select
  p.id,
  p.organization_id,
  o.name as organization_name,
  p.full_name,
  p.whatsapp,
  p.email,
  p.active,
  p.auth_user_id,
  p.created_at,
  p.updated_at
from public.oh_people p
left join public.oh_organizations o on o.id = p.organization_id
where lower(coalesce(p.email, '')) = lower('gabrielmattanosilva@gmail.com')
   or p.full_name ilike 'Gabriel Mattano%'
order by p.updated_at desc nulls last, p.created_at desc;

-- 3) Verifica a credencial Auth do e-mail. Útil para detectar Auth órfão criado
-- por uma tentativa anterior que falhou antes de concluir o pedido.
select
  u.id,
  u.email,
  u.phone,
  u.raw_user_meta_data ->> 'full_name' as metadata_full_name,
  u.raw_user_meta_data ->> 'whatsapp' as metadata_whatsapp,
  u.raw_user_meta_data ->> 'organization_id' as metadata_organization_id,
  u.raw_user_meta_data ->> 'oh_access_status' as metadata_access_status,
  u.created_at,
  u.updated_at
from auth.users u
where lower(coalesce(u.email, '')) = lower('gabrielmattanosilva@gmail.com');

-- 4) Memberships das pessoas localizadas.
with candidates as (
  select id
  from public.oh_people
  where lower(coalesce(email, '')) = lower('gabrielmattanosilva@gmail.com')
     or full_name ilike 'Gabriel Mattano%'
)
select
  m.id,
  m.organization_id,
  m.person_id,
  m.role_id,
  r.slug as role_slug,
  m.active,
  m.status,
  m.module_slugs,
  m.agenda_viva_profile,
  m.updated_at
from public.oh_memberships m
left join public.oh_roles r on r.id = m.role_id
where m.person_id in (select id from candidates)
order by m.updated_at desc;

-- 5) Pedidos de validação das pessoas localizadas.
with candidates as (
  select id
  from public.oh_people
  where lower(coalesce(email, '')) = lower('gabrielmattanosilva@gmail.com')
     or full_name ilike 'Gabriel Mattano%'
)
select
  v.id,
  v.organization_id,
  v.person_id,
  v.status,
  v.full_name,
  v.whatsapp,
  v.email,
  v.created_at,
  v.updated_at
from public.oh_first_access_validation_requests v
where v.person_id in (select id from candidates)
   or lower(coalesce(v.email, '')) = lower('gabrielmattanosilva@gmail.com')
   or v.full_name ilike 'Gabriel Mattano%'
order by v.updated_at desc;

-- 6) Confere índices/constraints de e-mail em oh_people.
select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'oh_people'
  and lower(indexdef) like '%email%'
order by indexname;

select
  c.conname,
  pg_get_constraintdef(c.oid) as definition
from pg_constraint c
where c.conrelid = 'public.oh_people'::regclass
  and (
    lower(c.conname) like '%email%'
    or lower(pg_get_constraintdef(c.oid)) like '%email%'
  )
order by c.conname;

-- 7) Verifica se ainda existem duplicidades de e-mail DENTRO da mesma organização.
-- Após a migration do Ajuste 64, o esperado é zero linhas.
select
  organization_id,
  lower(email) as normalized_email,
  count(*) as quantidade,
  array_agg(id order by created_at) as person_ids
from public.oh_people
where email is not null
  and btrim(email) <> ''
group by organization_id, lower(email)
having count(*) > 1
order by quantidade desc, normalized_email;

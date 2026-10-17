-- TUCXA - Diagnóstico de identidade por celular
-- SOMENTE LEITURA. Não altera nenhum dado.
--
-- Objetivos:
-- 1) conferir separadamente as duas Marianas pelos celulares;
-- 2) verificar membership/auth_user_id;
-- 3) listar eventuais celulares duplicados no TUCXA antes de qualquer índice UNIQUE.

with tucxa as (
  select id, name, slug
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by case when slug = 'tucxa' then 0 else 1 end
  limit 1
), people as (
  select
    p.*,
    regexp_replace(coalesce(p.whatsapp, ''), '[^0-9]', '', 'g') as phone_digits,
    case
      when regexp_replace(coalesce(p.whatsapp, ''), '[^0-9]', '', 'g') like '55%'
       and length(regexp_replace(coalesce(p.whatsapp, ''), '[^0-9]', '', 'g')) > 11
      then substring(regexp_replace(coalesce(p.whatsapp, ''), '[^0-9]', '', 'g') from 3)
      else regexp_replace(coalesce(p.whatsapp, ''), '[^0-9]', '', 'g')
    end as phone_canonical
  from public.oh_people p
  join tucxa t on t.id = p.organization_id
)
select
  p.id as person_id,
  p.full_name,
  p.email,
  p.whatsapp,
  p.phone_canonical,
  p.active as person_active,
  p.auth_user_id,
  m.id as membership_id,
  m.active as membership_active,
  m.status as membership_status,
  m.agenda_viva_profile ->> 'validationStatus' as validation_status,
  m.agenda_viva_profile ->> 'source' as profile_source,
  m.updated_at as membership_updated_at
from people p
left join public.oh_memberships m
  on m.organization_id = p.organization_id
 and m.person_id = p.id
where p.phone_canonical in ('19991532076', '19993213935')
order by p.phone_canonical, m.updated_at desc nulls last;

-- Celulares duplicados dentro do TUCXA.
with tucxa as (
  select id
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by case when slug = 'tucxa' then 0 else 1 end
  limit 1
), normalized as (
  select
    p.id,
    p.full_name,
    p.active,
    case
      when regexp_replace(coalesce(p.whatsapp, ''), '[^0-9]', '', 'g') like '55%'
       and length(regexp_replace(coalesce(p.whatsapp, ''), '[^0-9]', '', 'g')) > 11
      then substring(regexp_replace(coalesce(p.whatsapp, ''), '[^0-9]', '', 'g') from 3)
      else regexp_replace(coalesce(p.whatsapp, ''), '[^0-9]', '', 'g')
    end as phone_canonical
  from public.oh_people p
  join tucxa t on t.id = p.organization_id
)
select
  phone_canonical,
  count(*) as quantidade,
  string_agg(full_name || ' [' || id::text || ']', ' | ' order by full_name) as pessoas
from normalized
where phone_canonical <> ''
group by phone_canonical
having count(*) > 1
order by quantidade desc, phone_canonical;

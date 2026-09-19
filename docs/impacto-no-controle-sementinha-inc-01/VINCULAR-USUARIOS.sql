-- Impacto no Controle — vincular usuários de Authentication à gestão.
-- Execute SOMENTE depois de criar/verificar os e-mails em:
-- Supabase > Authentication > Users.
-- Este script é idempotente e NÃO cria senha nem usuário de Authentication.

begin;

insert into public.inc_app_users (auth_user_id, client_id, role, name, email)
select
  u.id,
  null,
  'owner',
  'Impacto no Controle',
  'impactonocontrole@gmail.com'
from auth.users u
where lower(u.email) = 'impactonocontrole@gmail.com'
on conflict (auth_user_id) do update
set
  client_id = null,
  role = excluded.role,
  name = excluded.name,
  email = excluded.email;

insert into public.inc_app_users (auth_user_id, client_id, role, name, email)
select
  u.id,
  cl.id,
  'client_admin',
  'Sementinha',
  'bazardosementinha@gmail.com'
from auth.users u
cross join public.inc_clients cl
where lower(u.email) = 'bazardosementinha@gmail.com'
  and cl.slug = 'sementinha'
on conflict (auth_user_id) do update
set
  client_id = excluded.client_id,
  role = excluded.role,
  name = excluded.name,
  email = excluded.email;

commit;

-- Conferência final (não exibe senha ou token):
select
  au.email,
  au.role,
  cl.slug as client_slug,
  cl.name as client_name
from public.inc_app_users au
left join public.inc_clients cl on cl.id = au.client_id
where lower(au.email) in (
  'impactonocontrole@gmail.com',
  'bazardosementinha@gmail.com'
)
order by au.role, au.email;

-- Caixa Claro — vínculo dos quatro logins da família SilvaMattano
--
-- 1) Primeiro crie os quatro usuários em Supabase > Authentication > Users.
-- 2) Substitua SOMENTE os quatro e-mails abaixo pelos e-mails usados no Auth.
-- 3) Execute este bloco no SQL Editor.
--
-- NÃO coloque senhas neste arquivo. Senhas pertencem exclusivamente ao Supabase Auth.

do $$
declare
  v_family_id uuid;
  v_email_marcio text := 'marcioalex.silva@gmail.com';
  v_email_mariana text := 'marianamattanosilva@gmail.com';
  v_email_gabriel text := 'gabrielmattanosilva@gmail.com';
  v_email_daniela text := 'danielamattano1976@gmail.com';
  v_count integer;
begin
  select id into v_family_id
  from public.cc_families
  where slug = 'silvamattano';

  if v_family_id is null then
    raise exception 'Família SilvaMattano não encontrada. Aplique primeiro a migration do Caixa Claro.';
  end if;

  update public.cc_family_members m
  set auth_user_id = u.id,
      email = lower(u.email),
      updated_at = now()
  from auth.users u
  where m.family_id = v_family_id
    and m.full_name = 'Marcio Alexandre da Silva'
    and lower(u.email) = lower(v_email_marcio);
  get diagnostics v_count = row_count;
  if v_count <> 1 then raise exception 'Usuário de Márcio não encontrado para o e-mail informado.'; end if;

  update public.cc_family_members m
  set auth_user_id = u.id,
      email = lower(u.email),
      updated_at = now()
  from auth.users u
  where m.family_id = v_family_id
    and m.full_name = 'Mariana Mattano da Silva'
    and lower(u.email) = lower(v_email_mariana);
  get diagnostics v_count = row_count;
  if v_count <> 1 then raise exception 'Usuário de Mariana não encontrado para o e-mail informado.'; end if;

  update public.cc_family_members m
  set auth_user_id = u.id,
      email = lower(u.email),
      updated_at = now()
  from auth.users u
  where m.family_id = v_family_id
    and m.full_name = 'Gabriel Mattano da Silva'
    and lower(u.email) = lower(v_email_gabriel);
  get diagnostics v_count = row_count;
  if v_count <> 1 then raise exception 'Usuário de Gabriel não encontrado para o e-mail informado.'; end if;

  update public.cc_family_members m
  set auth_user_id = u.id,
      email = lower(u.email),
      updated_at = now()
  from auth.users u
  where m.family_id = v_family_id
    and m.full_name = 'Daniela Mattano da Silva'
    and lower(u.email) = lower(v_email_daniela);
  get diagnostics v_count = row_count;
  if v_count <> 1 then raise exception 'Usuário de Daniela não encontrado para o e-mail informado.'; end if;
end $$;

-- Conferência final (não mostra senha):
select
  m.full_name,
  m.role,
  m.email,
  case when m.auth_user_id is null then 'PENDENTE' else 'VINCULADO' end as status_login
from public.cc_family_members m
join public.cc_families f on f.id = m.family_id
where f.slug = 'silvamattano'
order by m.full_name;

-- Organização em Harmonia - reparo do vínculo do cliente/gestor Tucxa
-- Seguro para rodar mais de uma vez no Supabase SQL Editor.
-- Objetivo: garantir que tucxacentro@gmail.com acesse a área cliente do Tucxa
-- sem liberar Filhos da Corrente na área de gestão.

do $$
declare
  tucxa_id uuid;
  admin_role_id uuid;
  gestor_person_id uuid;
  gestor_auth_user_id uuid;
  existing_membership_id uuid;
begin
  select id
    into tucxa_id
  from public.oh_organizations
  where slug = 'tucxa'
     or lower(coalesce(email, '')) = 'tucxacentro@gmail.com'
     or name ilike '%tucxa%'
  order by case when slug = 'tucxa' then 0 else 1 end, created_at desc
  limit 1;

  if tucxa_id is null then
    raise notice 'Organização Tucxa não encontrada. Cadastre a organização antes de rodar este reparo.';
    return;
  end if;

  update public.oh_organizations
     set slug = coalesce(nullif(slug, ''), 'tucxa'),
         email = coalesce(nullif(email, ''), 'tucxacentro@gmail.com'),
         enabled_modules = coalesce(enabled_modules, array['agenda-viva', 'atendimento-em-harmonia', 'corrente-em-dia']::text[]),
         status = coalesce(nullif(status, ''), 'ativo'),
         updated_at = now()
   where id = tucxa_id;

  select id
    into admin_role_id
  from public.oh_roles
  where organization_id = tucxa_id
    and slug in ('administrador-sistema', 'gestor-cliente', 'administrador')
  order by case when slug = 'administrador-sistema' then 0 else 1 end, created_at asc
  limit 1;

  if admin_role_id is null then
    insert into public.oh_roles (organization_id, name, slug, description, active, is_system)
    values (
      tucxa_id,
      'Administrador do sistema',
      'administrador-sistema',
      'Pode administrar configurações, acessos e validações da Organização em Harmonia.',
      true,
      false
    )
    returning id into admin_role_id;
  end if;

  select id
    into gestor_auth_user_id
  from auth.users
  where lower(email) = 'tucxacentro@gmail.com'
  order by created_at desc
  limit 1;

  select id
    into gestor_person_id
  from public.oh_people
  where organization_id = tucxa_id
    and (
      lower(coalesce(email, '')) = 'tucxacentro@gmail.com'
      or (gestor_auth_user_id is not null and auth_user_id = gestor_auth_user_id)
    )
  order by updated_at desc nulls last, created_at desc
  limit 1;

  if gestor_person_id is null then
    insert into public.oh_people (
      organization_id,
      full_name,
      email,
      whatsapp,
      active,
      auth_user_id,
      notes,
      created_at,
      updated_at
    )
    values (
      tucxa_id,
      'Gestor Tucxa',
      'tucxacentro@gmail.com',
      null,
      true,
      gestor_auth_user_id,
      'Gestor vinculado automaticamente para acesso à área cliente da Organização em Harmonia.',
      now(),
      now()
    )
    returning id into gestor_person_id;
  else
    update public.oh_people
       set email = 'tucxacentro@gmail.com',
           active = true,
           auth_user_id = coalesce(auth_user_id, gestor_auth_user_id),
           updated_at = now()
     where id = gestor_person_id;
  end if;

  select id
    into existing_membership_id
  from public.oh_memberships
  where organization_id = tucxa_id
    and person_id = gestor_person_id
  order by updated_at desc nulls last, created_at desc
  limit 1;

  if existing_membership_id is null then
    insert into public.oh_memberships (
      organization_id,
      person_id,
      role_id,
      module_slugs,
      active,
      status,
      is_main_contact,
      can_receive_notifications,
      agenda_viva_profile,
      created_at,
      updated_at
    )
    values (
      tucxa_id,
      gestor_person_id,
      admin_role_id,
      array['agenda-viva', 'atendimento-em-harmonia', 'corrente-em-dia']::text[],
      true,
      'gestor_cliente',
      true,
      true,
      jsonb_build_object(
        'source', 'cliente_tucxa',
        'validationStatus', 'gestor_cliente',
        'isClientAdmin', true,
        'repairedAt', now()
      ),
      now(),
      now()
    );
  else
    update public.oh_memberships
       set role_id = admin_role_id,
           module_slugs = array['agenda-viva', 'atendimento-em-harmonia', 'corrente-em-dia']::text[],
           active = true,
           status = 'gestor_cliente',
           is_main_contact = true,
           can_receive_notifications = true,
           agenda_viva_profile = coalesce(agenda_viva_profile, '{}'::jsonb) || jsonb_build_object(
             'source', 'cliente_tucxa',
             'validationStatus', 'gestor_cliente',
             'isClientAdmin', true,
             'repairedAt', now()
           ),
           updated_at = now()
     where id = existing_membership_id;
  end if;
end $$;

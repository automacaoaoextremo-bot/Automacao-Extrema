-- Organização em Harmonia / TUCXA / Sementinha
-- Evolução 02: hierarquia genérica de funções e sub-funções do Sementinha.

alter table if exists public.oh_roles
  add column if not exists parent_role_id uuid references public.oh_roles(id) on delete set null;

create index if not exists idx_oh_roles_parent_role
  on public.oh_roles (organization_id, parent_role_id)
  where parent_role_id is not null;

do $$
declare
  tucxa_id uuid;
  coordenador_id uuid;
begin
  select id
    into tucxa_id
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by created_at desc
  limit 1;

  if tucxa_id is null then
    return;
  end if;

  update public.oh_roles
     set name = 'Coordenador Sementinha',
         description = 'Coordena as atividades do Sementinha. Pode possuir sub-funções específicas.',
         active = true,
         updated_at = now()
   where organization_id = tucxa_id
     and slug = 'coordenacao-sementinha';

  if not exists (
    select 1
    from public.oh_roles
    where organization_id = tucxa_id
      and slug = 'coordenacao-sementinha'
  ) then
    insert into public.oh_roles (
      organization_id, name, slug, description, active, is_system
    )
    values (
      tucxa_id,
      'Coordenador Sementinha',
      'coordenacao-sementinha',
      'Coordena as atividades do Sementinha. Pode possuir sub-funções específicas.',
      true,
      false
    );
  end if;

  select id
    into coordenador_id
  from public.oh_roles
  where organization_id = tucxa_id
    and slug = 'coordenacao-sementinha'
  limit 1;

  insert into public.oh_roles (
    organization_id, name, slug, description, active, is_system, parent_role_id
  )
  select
    tucxa_id,
    item.name,
    item.slug,
    item.description,
    true,
    false,
    coordenador_id
  from (values
    (
      'Gestor Despensa Viva',
      'gestor-despensa-viva',
      'Pode acessar e atualizar estoque, lotes, validades, composição e entregas da Despensa Viva.'
    ),
    (
      'Gestor Bazar Beneficente',
      'gestor-bazar-beneficente',
      'Responsável pela gestão das atividades do Bazar Beneficente.'
    ),
    (
      'Gestor Bingo Beneficente',
      'gestor-bingo-beneficente',
      'Responsável pela gestão das atividades do Bingo Beneficente.'
    ),
    (
      'Gestor Ações Comunitárias',
      'gestor-acoes-comunitarias',
      'Responsável pela gestão das ações do Sementinha nas comunidades.'
    )
  ) as item(name, slug, description)
  where not exists (
    select 1
    from public.oh_roles role
    where role.organization_id = tucxa_id
      and role.slug = item.slug
  );

  update public.oh_roles
     set parent_role_id = coordenador_id,
         active = true,
         updated_at = now()
   where organization_id = tucxa_id
     and slug in (
       'gestor-despensa-viva',
       'gestor-bazar-beneficente',
       'gestor-bingo-beneficente',
       'gestor-acoes-comunitarias'
     );

  -- A terminologia apresentada ao usuário passa a ser PVPS.
  update public.oh_sementinha_movements
     set notes = replace(notes, 'FEFO', 'PVPS')
   where organization_id = tucxa_id
     and notes like '%FEFO%';

  update public.oh_sementinha_deliveries
     set notes = replace(notes, 'FEFO', 'PVPS')
   where organization_id = tucxa_id
     and notes like '%FEFO%';
end $$;

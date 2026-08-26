-- TUCXA / Acervo Vivo — Ajustes 15
-- Regras de circulação, novas funções de gestão e trilha dedicada ao Folha Verde.

alter table if exists public.oh_acervo_settings
  add column if not exists member_loans_enabled boolean not null default true,
  add column if not exists block_new_loans_with_overdue boolean not null default true,
  add column if not exists block_new_loans_with_pending_fee boolean not null default true;

do $$
declare
  tucxa_id uuid;
begin
  select site.organization_id into tucxa_id
  from public.oh_client_site_settings site
  where site.public_slug = 'tucxa'
    and coalesce(site.active, true) = true
  order by site.updated_at desc nulls last
  limit 1;

  if tucxa_id is null then
    select id into tucxa_id
    from public.oh_organizations
    where slug = 'tucxa'
    order by created_at asc
    limit 1;
  end if;

  if tucxa_id is null then
    select id into tucxa_id
    from public.oh_organizations
    where name ilike '%tucxa%'
    order by created_at desc
    limit 1;
  end if;

  if tucxa_id is null then
    raise notice 'Acervo Vivo Ajuste 15: organização TUCXA não localizada.';
    return;
  end if;

  insert into public.oh_acervo_settings (organization_id)
  values (tucxa_id)
  on conflict (organization_id) do nothing;

  -- Preserva o slug legado para não quebrar vínculos já existentes, mas apresenta
  -- ao usuário o nome definido no Ajuste 15.
  update public.oh_roles
     set name = 'Gestor Acervo Vivo - Biblioteca',
         description = 'Responsável pela Biblioteca do Acervo Vivo: catálogo, exemplares, circulação, inventário, regras de empréstimo e apoio à curadoria.',
         active = true,
         updated_at = now()
   where organization_id = tucxa_id
     and slug = 'biblioteca-acervo-vivo';

  if not exists (
    select 1 from public.oh_roles
    where organization_id = tucxa_id and slug = 'biblioteca-acervo-vivo'
  ) then
    insert into public.oh_roles (organization_id, name, slug, description, active, is_system)
    values (
      tucxa_id,
      'Gestor Acervo Vivo - Biblioteca',
      'biblioteca-acervo-vivo',
      'Responsável pela Biblioteca do Acervo Vivo: catálogo, exemplares, circulação, inventário, regras de empréstimo e apoio à curadoria.',
      true,
      false
    );
  end if;

  insert into public.oh_roles (organization_id, name, slug, description, active, is_system)
  select tucxa_id, item.name, item.slug, item.description, true, false
  from (values
    (
      'Gestor Acervo Vivo - Folha Verde',
      'gestor-acervo-vivo-folha-verde',
      'Responsável pelas edições, versões e curadoria do Folha Verde dentro do Acervo Vivo.'
    ),
    (
      'Gestor Acervo Vivo - Grupo de Estudos',
      'gestor-acervo-vivo-grupo-de-estudos',
      'Responsável pelas trilhas e curadorias relacionadas ao Grupo de Estudos dentro do Acervo Vivo.'
    ),
    (
      'Gestor Acervo Vivo - Clube do Livro',
      'gestor-acervo-vivo-clube-do-livro',
      'Responsável pelas curadorias, livros do mês e integrações do Clube do Livro dentro do Acervo Vivo.'
    )
  ) as item(name, slug, description)
  where not exists (
    select 1 from public.oh_roles role
    where role.organization_id = tucxa_id and role.slug = item.slug
  );

  update public.oh_roles role
     set name = item.name,
         description = item.description,
         active = true,
         updated_at = now()
  from (values
    ('gestor-acervo-vivo-folha-verde', 'Gestor Acervo Vivo - Folha Verde', 'Responsável pelas edições, versões e curadoria do Folha Verde dentro do Acervo Vivo.'),
    ('gestor-acervo-vivo-grupo-de-estudos', 'Gestor Acervo Vivo - Grupo de Estudos', 'Responsável pelas trilhas e curadorias relacionadas ao Grupo de Estudos dentro do Acervo Vivo.'),
    ('gestor-acervo-vivo-clube-do-livro', 'Gestor Acervo Vivo - Clube do Livro', 'Responsável pelas curadorias, livros do mês e integrações do Clube do Livro dentro do Acervo Vivo.')
  ) as item(slug, name, description)
  where role.organization_id = tucxa_id
    and role.slug = item.slug;

  insert into public.oh_acervo_trails (
    organization_id, name, slug, objective, description, audience, level, official, active, sort_order, metadata
  ) values (
    tucxa_id,
    'Folha Verde — Edições',
    'folha-verde-edicoes',
    'Reunir as edições do Folha Verde em ordem cronológica para facilitar consulta, estudo e preservação da memória da Casa.',
    'Trilha dedicada às edições mensais e às revisões vigentes do Folha Verde. A curadoria pode ser mantida pelo Gestor Acervo Vivo - Folha Verde.',
    array['filhos da corrente','consulentes']::text[],
    'livre',
    false,
    true,
    70,
    jsonb_build_object('source','ajustes-15','validation','pendente')
  )
  on conflict (organization_id, slug) do update set
    name = excluded.name,
    objective = excluded.objective,
    description = excluded.description,
    audience = excluded.audience,
    active = true,
    updated_at = now();
end $$;

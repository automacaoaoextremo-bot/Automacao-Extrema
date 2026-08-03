-- Organização em Harmonia / Corrente em Dia v3 — Ajustes Evolução 03
-- Vínculos familiares cadastrados no Primeiro Acesso e em Atualizar Dados.
-- Migration aditiva e idempotente.

create extension if not exists pgcrypto;

create table if not exists public.oh_person_family_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.oh_organizations(id) on delete cascade,
  person_id uuid not null,
  related_person_id uuid not null,
  relationship_type_id uuid not null,
  source text not null default 'cadastro',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint oh_person_family_links_person_fkey
    foreign key (person_id) references public.oh_people(id) on delete cascade,
  constraint oh_person_family_links_related_person_fkey
    foreign key (related_person_id) references public.oh_people(id) on delete cascade,
  constraint oh_person_family_links_relationship_type_fkey
    foreign key (relationship_type_id)
    references public.oh_family_relationship_types(id) on delete restrict,
  constraint oh_person_family_links_people_different_check
    check (person_id <> related_person_id),
  constraint oh_person_family_links_unique
    unique (organization_id, person_id, related_person_id)
);

create index if not exists idx_oh_person_family_links_person
  on public.oh_person_family_links (organization_id, person_id, active);

create index if not exists idx_oh_person_family_links_related
  on public.oh_person_family_links (organization_id, related_person_id, active);

alter table public.oh_person_family_links enable row level security;

comment on table public.oh_person_family_links is
  'Vínculos familiares informados pelos Filhos da Corrente para cadastro e contribuição familiar.';

comment on column public.oh_person_family_links.relationship_type_id is
  'Parentesco da pessoa relacionada em relação à pessoa responsável pelo cadastro.';

-- Completa os graus solicitados no Ajustes Evolução 03.
do $$
declare
  org_id uuid;
begin
  select id
    into org_id
    from public.oh_organizations
   where slug = 'tucxa'
      or lower(name) like '%tucxa%'
   order by case when slug = 'tucxa' then 0 else 1 end, created_at
   limit 1;

  if org_id is null then
    return;
  end if;

  insert into public.oh_family_relationship_types (
    organization_id,
    slug,
    label,
    sort_order,
    active
  )
  values
    (org_id, 'pai', 'Pai', 10, true),
    (org_id, 'mae', 'Mãe', 20, true),
    (org_id, 'marido', 'Marido', 30, true),
    (org_id, 'esposa', 'Esposa', 40, true),
    (org_id, 'filho', 'Filho', 50, true),
    (org_id, 'filha', 'Filha', 60, true)
  on conflict (organization_id, slug) do update set
    label = excluded.label,
    sort_order = excluded.sort_order,
    active = true,
    updated_at = now();
end $$;

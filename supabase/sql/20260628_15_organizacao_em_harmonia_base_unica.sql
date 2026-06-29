-- Organização em Harmonia — Base Única compartilhada
-- Idempotente: pode rodar mais de uma vez sem apagar dados.
-- Versão corrigida: adiciona colunas ausentes quando tabelas já existem de versões anteriores.

create extension if not exists pgcrypto;

create table if not exists public.oh_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  organization_type text,
  city text,
  state text,
  whatsapp text,
  email text,
  active boolean not null default true,
  enabled_modules text[] not null default '{}',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.oh_organizations add column if not exists slug text;
alter table public.oh_organizations add column if not exists organization_type text;
alter table public.oh_organizations add column if not exists city text;
alter table public.oh_organizations add column if not exists state text;
alter table public.oh_organizations add column if not exists whatsapp text;
alter table public.oh_organizations add column if not exists email text;
alter table public.oh_organizations add column if not exists active boolean not null default true;
alter table public.oh_organizations add column if not exists enabled_modules text[] not null default '{}';
alter table public.oh_organizations add column if not exists settings jsonb not null default '{}'::jsonb;
alter table public.oh_organizations add column if not exists created_at timestamptz not null default now();
alter table public.oh_organizations add column if not exists updated_at timestamptz not null default now();
create unique index if not exists idx_oh_organizations_slug_unique on public.oh_organizations(slug) where slug is not null;

create table if not exists public.oh_people (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.oh_organizations(id) on delete cascade,
  full_name text not null,
  email text,
  whatsapp text,
  document text,
  active boolean not null default true,
  lgpd_consent_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.oh_people add column if not exists organization_id uuid references public.oh_organizations(id) on delete cascade;
alter table public.oh_people add column if not exists full_name text;
update public.oh_people set full_name = coalesce(full_name, email, whatsapp, 'Pessoa sem nome') where full_name is null;
alter table public.oh_people alter column full_name set not null;
alter table public.oh_people add column if not exists email text;
alter table public.oh_people add column if not exists whatsapp text;
alter table public.oh_people add column if not exists document text;
alter table public.oh_people add column if not exists active boolean not null default true;
alter table public.oh_people add column if not exists lgpd_consent_at timestamptz;
alter table public.oh_people add column if not exists notes text;
alter table public.oh_people add column if not exists created_at timestamptz not null default now();
alter table public.oh_people add column if not exists updated_at timestamptz not null default now();

create table if not exists public.oh_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.oh_organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  is_system boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.oh_roles add column if not exists organization_id uuid references public.oh_organizations(id) on delete cascade;
alter table public.oh_roles add column if not exists name text;
update public.oh_roles set name = coalesce(name, slug, 'Função sem nome') where name is null;
alter table public.oh_roles alter column name set not null;
alter table public.oh_roles add column if not exists slug text;
update public.oh_roles set slug = lower(regexp_replace(coalesce(slug, name), '[^a-zA-Z0-9]+', '-', 'g')) where slug is null;
alter table public.oh_roles alter column slug set not null;
alter table public.oh_roles add column if not exists description text;
alter table public.oh_roles add column if not exists is_system boolean not null default false;
alter table public.oh_roles add column if not exists active boolean not null default true;
alter table public.oh_roles add column if not exists created_at timestamptz not null default now();
alter table public.oh_roles add column if not exists updated_at timestamptz not null default now();
create unique index if not exists idx_oh_roles_org_slug_unique on public.oh_roles(organization_id, slug);

create table if not exists public.oh_permissions (
  id uuid primary key default gen_random_uuid(),
  module_slug text,
  permission_key text not null,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

-- Corrige tabelas criadas por versões anteriores que ainda não tinham module_slug.
alter table public.oh_permissions add column if not exists module_slug text;
alter table public.oh_permissions add column if not exists permission_key text;
alter table public.oh_permissions add column if not exists name text;
alter table public.oh_permissions add column if not exists description text;
alter table public.oh_permissions add column if not exists created_at timestamptz not null default now();
update public.oh_permissions set module_slug = 'base-unica' where module_slug is null;
update public.oh_permissions set permission_key = coalesce(permission_key, id::text) where permission_key is null;
update public.oh_permissions set name = coalesce(name, permission_key, 'Permissão sem nome') where name is null;
alter table public.oh_permissions alter column module_slug set not null;
alter table public.oh_permissions alter column permission_key set not null;
alter table public.oh_permissions alter column name set not null;
create unique index if not exists idx_oh_permissions_module_permission_unique on public.oh_permissions(module_slug, permission_key);

create table if not exists public.oh_role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.oh_roles(id) on delete cascade,
  permission_id uuid not null references public.oh_permissions(id) on delete cascade,
  allowed boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.oh_role_permissions add column if not exists role_id uuid references public.oh_roles(id) on delete cascade;
alter table public.oh_role_permissions add column if not exists permission_id uuid references public.oh_permissions(id) on delete cascade;
alter table public.oh_role_permissions add column if not exists allowed boolean not null default true;
alter table public.oh_role_permissions add column if not exists created_at timestamptz not null default now();
create unique index if not exists idx_oh_role_permissions_role_permission_unique on public.oh_role_permissions(role_id, permission_id);

create table if not exists public.oh_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  person_id uuid not null references public.oh_people(id) on delete cascade,
  role_id uuid references public.oh_roles(id) on delete set null,
  module_slugs text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.oh_memberships add column if not exists organization_id uuid references public.oh_organizations(id) on delete cascade;
alter table public.oh_memberships add column if not exists person_id uuid references public.oh_people(id) on delete cascade;
alter table public.oh_memberships add column if not exists role_id uuid references public.oh_roles(id) on delete set null;
alter table public.oh_memberships add column if not exists module_slugs text[] not null default '{}';
alter table public.oh_memberships add column if not exists active boolean not null default true;
alter table public.oh_memberships add column if not exists created_at timestamptz not null default now();
alter table public.oh_memberships add column if not exists updated_at timestamptz not null default now();
create unique index if not exists idx_oh_memberships_org_person_role_unique on public.oh_memberships(organization_id, person_id, role_id);

create table if not exists public.oh_module_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  module_slug text not null,
  enabled boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.oh_module_settings add column if not exists organization_id uuid references public.oh_organizations(id) on delete cascade;
alter table public.oh_module_settings add column if not exists module_slug text;
update public.oh_module_settings set module_slug = 'organizacao-em-harmonia' where module_slug is null;
alter table public.oh_module_settings alter column module_slug set not null;
alter table public.oh_module_settings add column if not exists enabled boolean not null default false;
alter table public.oh_module_settings add column if not exists settings jsonb not null default '{}'::jsonb;
alter table public.oh_module_settings add column if not exists created_at timestamptz not null default now();
alter table public.oh_module_settings add column if not exists updated_at timestamptz not null default now();
create unique index if not exists idx_oh_module_settings_org_module_unique on public.oh_module_settings(organization_id, module_slug);

create table if not exists public.oh_audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.oh_organizations(id) on delete set null,
  actor_person_id uuid references public.oh_people(id) on delete set null,
  module_slug text,
  action text not null,
  entity_table text,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.oh_audit_logs add column if not exists organization_id uuid references public.oh_organizations(id) on delete set null;
alter table public.oh_audit_logs add column if not exists actor_person_id uuid references public.oh_people(id) on delete set null;
alter table public.oh_audit_logs add column if not exists module_slug text;
alter table public.oh_audit_logs add column if not exists action text;
update public.oh_audit_logs set action = 'legacy' where action is null;
alter table public.oh_audit_logs alter column action set not null;
alter table public.oh_audit_logs add column if not exists entity_table text;
alter table public.oh_audit_logs add column if not exists entity_id uuid;
alter table public.oh_audit_logs add column if not exists details jsonb not null default '{}'::jsonb;
alter table public.oh_audit_logs add column if not exists created_at timestamptz not null default now();

insert into public.oh_permissions (module_slug, permission_key, name, description)
values
  ('base-unica', 'people.view', 'Ver pessoas', 'Permite visualizar pessoas cadastradas na Base Única.'),
  ('base-unica', 'people.manage', 'Gerenciar pessoas', 'Permite criar, editar, ativar e inativar pessoas.'),
  ('base-unica', 'roles.manage', 'Gerenciar funções', 'Permite criar funções e configurar permissões.'),
  ('base-unica', 'modules.manage', 'Gerenciar módulos', 'Permite habilitar ou desabilitar módulos da organização.'),
  ('corrente-em-dia', 'contributions.view', 'Ver contribuições', 'Permite visualizar contribuições e status.'),
  ('corrente-em-dia', 'proofs.approve', 'Aprovar comprovantes', 'Permite aprovar, reprovar ou pedir correção de comprovantes.'),
  ('atendimento-em-harmonia', 'attendance.view', 'Ver atendimentos', 'Permite visualizar agenda e fila de atendimento.'),
  ('atendimento-em-harmonia', 'attendance.manage', 'Gerenciar atendimentos', 'Permite criar, remanejar, concluir e cancelar atendimentos.'),
  ('agenda-viva', 'events.view', 'Ver agenda', 'Permite visualizar atividades e calendário.'),
  ('agenda-viva', 'events.manage', 'Gerenciar agenda', 'Permite criar e alterar atividades.'),
  ('agenda-viva', 'events.approve', 'Aprovar agenda', 'Permite aprovar inclusão, alteração ou cancelamento de atividades.')
on conflict (module_slug, permission_key) do update set
  name = excluded.name,
  description = excluded.description;

create index if not exists idx_oh_people_organization on public.oh_people(organization_id);
create index if not exists idx_oh_roles_organization on public.oh_roles(organization_id);
create index if not exists idx_oh_memberships_organization on public.oh_memberships(organization_id);
create index if not exists idx_oh_module_settings_organization on public.oh_module_settings(organization_id);
create index if not exists idx_oh_audit_logs_organization on public.oh_audit_logs(organization_id);
create index if not exists idx_oh_permissions_module on public.oh_permissions(module_slug);

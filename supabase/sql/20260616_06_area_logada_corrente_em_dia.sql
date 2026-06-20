-- ============================================================
-- Automação Extrema — Corrente em Dia
-- 06. Área logada V1: cadastro, configurações, permissões,
--     contribuintes, contribuir e aprovações.
-- Execute após os SQLs anteriores do Corrente em Dia.
-- ============================================================

create extension if not exists "pgcrypto";

-- Campos adicionais do cadastro da organização.
alter table public.ced_organizations
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists responsible_manager_name text,
  add column if not exists postal_code text,
  add column if not exists address_number text,
  add column if not exists address_complement text,
  add column if not exists reminder_before_due_enabled boolean not null default false,
  add column if not exists reminder_due_day_enabled boolean not null default false,
  add column if not exists reminder_after_due_enabled boolean not null default false,
  add column if not exists reminder_five_days_after_enabled boolean not null default false;

-- Opções de contribuição adicionais por organização.
create table if not exists public.ced_contribution_options (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ced_organizations(id) on delete cascade,
  description text not null,
  amount numeric(12,2),
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Permissões por função/tela/opção.
create table if not exists public.ced_role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.ced_roles(id) on delete cascade,
  permission_key text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(role_id, permission_key)
);

create index if not exists idx_ced_contribution_options_org on public.ced_contribution_options(organization_id);
create index if not exists idx_ced_role_permissions_role on public.ced_role_permissions(role_id);
create index if not exists idx_ced_role_permissions_key on public.ced_role_permissions(permission_key);

-- Triggers updated_at.
do $$
begin
  execute 'drop trigger if exists trg_ced_contribution_options_updated_at on public.ced_contribution_options';
  execute 'create trigger trg_ced_contribution_options_updated_at before update on public.ced_contribution_options for each row execute function public.set_updated_at()';

  execute 'drop trigger if exists trg_ced_role_permissions_updated_at on public.ced_role_permissions';
  execute 'create trigger trg_ced_role_permissions_updated_at before update on public.ced_role_permissions for each row execute function public.set_updated_at()';
end $$;

-- RLS e leitura autenticada.
alter table public.ced_contribution_options enable row level security;
alter table public.ced_role_permissions enable row level security;

do $$
begin
  execute 'drop policy if exists "Authenticated can read ced_contribution_options" on public.ced_contribution_options';
  execute 'create policy "Authenticated can read ced_contribution_options" on public.ced_contribution_options for select to authenticated using (true)';

  execute 'drop policy if exists "Authenticated can read ced_role_permissions" on public.ced_role_permissions';
  execute 'create policy "Authenticated can read ced_role_permissions" on public.ced_role_permissions for select to authenticated using (true)';
end $$;

-- Seed de funções padrão.
insert into public.ced_roles (name, slug, applies_to, description, is_manager, is_financial_role, sort_order)
values
  ('Presidente', 'presidente', 'todos', 'Responsável máximo pela organização e pela gestão do sistema.', true, true, 1),
  ('Coordenador', 'coordenador', 'todos', 'Ajuda na gestão, acompanhamento e organização da casa.', true, false, 2),
  ('Cavalinho', 'cavalinho', 'terreiro', 'Participante da corrente espiritual.', false, false, 10),
  ('Cambono', 'cambono', 'terreiro', 'Apoio nos trabalhos e organização da gira.', false, false, 11),
  ('Filho da Corrente', 'filho-da-corrente', 'terreiro', 'Participante recorrente da corrente.', false, false, 12),
  ('Consulente', 'consulente', 'todos', 'Pessoa que contribui eventualmente ou acompanha a casa.', false, false, 13)
on conflict (slug) do update set
  name = excluded.name,
  applies_to = excluded.applies_to,
  description = excluded.description,
  is_manager = excluded.is_manager,
  is_financial_role = excluded.is_financial_role,
  sort_order = excluded.sort_order;

-- Permissões padrão.
with permissions(permission_key) as (
  values
    ('cadastro.view'),
    ('cadastro.edit'),
    ('configuracoes.view'),
    ('configuracoes.edit'),
    ('contribuintes.view'),
    ('contribuintes.edit'),
    ('contribuintes.import'),
    ('contribuir.view'),
    ('contribuir.upload_receipt'),
    ('aprovacoes.view'),
    ('aprovacoes.review'),
    ('aprovacoes.send_reminders')
), manager_roles as (
  select id from public.ced_roles where slug in ('presidente', 'coordenador')
)
insert into public.ced_role_permissions (role_id, permission_key, enabled)
select mr.id, p.permission_key, true
from manager_roles mr
cross join permissions p
on conflict (role_id, permission_key) do nothing;

with permissions(permission_key) as (
  values
    ('contribuir.view'),
    ('contribuir.upload_receipt')
), contributor_roles as (
  select id from public.ced_roles where slug in ('cavalinho', 'cambono', 'filho-da-corrente', 'consulente')
)
insert into public.ced_role_permissions (role_id, permission_key, enabled)
select cr.id, p.permission_key, true
from contributor_roles cr
cross join permissions p
on conflict (role_id, permission_key) do nothing;

-- Completa contato da organização a partir do primeiro gestor, quando possível.
update public.ced_organizations o
set
  contact_name = coalesce(o.contact_name, p.full_name),
  contact_email = coalesce(o.contact_email, p.email),
  responsible_manager_name = coalesce(o.responsible_manager_name, p.full_name)
from public.ced_person_organizations po
join public.ced_people p on p.id = po.person_id
where po.organization_id = o.id
  and po.is_manager = true;

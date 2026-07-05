-- Organização em Harmonia — site público específico do cliente Tucxa
-- Seguro para rodar mais de uma vez no Supabase SQL Editor.

alter table if exists public.oh_memberships
  add column if not exists agenda_viva_profile jsonb default '{}'::jsonb;

create table if not exists public.oh_client_site_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  public_slug text not null,
  settings jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_oh_client_site_settings_organization
  on public.oh_client_site_settings (organization_id);

create unique index if not exists idx_oh_client_site_settings_public_slug
  on public.oh_client_site_settings (public_slug)
  where active is true;

create table if not exists public.oh_public_site_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.oh_organizations(id) on delete set null,
  source text not null default 'site-publico',
  request_type text not null default 'atendimento',
  full_name text,
  whatsapp text,
  email text,
  contribution_mode text,
  preferred_day text,
  notes text,
  status text not null default 'novo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_oh_public_site_requests_organization_status
  on public.oh_public_site_requests (organization_id, status, created_at desc);

create index if not exists idx_oh_public_site_requests_contact
  on public.oh_public_site_requests (whatsapp, lower(email));

-- Configuração padrão do site do Tucxa, quando a organização já estiver cadastrada.
insert into public.oh_client_site_settings (organization_id, public_slug, settings)
select
  org.id,
  'tucxa',
  jsonb_build_object(
    'publicSlug', 'tucxa',
    'organizationName', 'TUCXA - Templo de Umbanda Caboclo Sete Flexa',
    'logoUrl', '/clientes/tucxa/tucxa-logo.jpg',
    'primaryColor', '#123D2C',
    'accentColor', '#2F6B43',
    'headline', 'Um ponto simples para orientar, organizar e cuidar melhor da nossa corrente.',
    'showFilhoDaCorrente', true,
    'showConsulente', true,
    'showClienteFundador', false,
    'enabledSections', jsonb_build_array('visao', 'modulos', 'base-harmonia', 'beneficios', 'como-funciona', 'consulentes')
  )
from public.oh_organizations org
where org.slug = 'tucxa' or org.name ilike '%tucxa%'
on conflict (organization_id) do update set
  public_slug = excluded.public_slug,
  settings = public.oh_client_site_settings.settings || excluded.settings,
  updated_at = now();

-- Funções-base sugeridas para o Tucxa. Só insere quando a organização existir.
insert into public.oh_roles (organization_id, name, slug, description, active, is_system)
select org.id, item.name, item.slug, item.description, true, false
from public.oh_organizations org
cross join (values
  ('Administrador do sistema', 'administrador-sistema', 'Pode administrar configurações, acessos e validações.'),
  ('Cambono', 'cambono', 'Apoia entidades, consulentes e organização dos trabalhos.'),
  ('Cavalinho', 'cavalinho', 'Médium de incorporação/atendimento conforme organização da casa.'),
  ('Coordenação', 'coordenacao', 'Apoia decisões e orientações operacionais da casa.'),
  ('Diretoria', 'diretoria', 'Participa da direção e decisões administrativas.'),
  ('Filho da Corrente', 'filho-da-corrente', 'Participa da corrente do Tucxa.'),
  ('Organização', 'organizacao', 'Apoia a organização das atividades e fluxos.'),
  ('Presidente', 'presidente', 'Responsável máximo pela organização, quando aplicável.'),
  ('Recepção', 'recepcao', 'Apoia acolhimento, entrada e orientação de consulentes.'),
  ('Tesouraria/Financeiro', 'tesouraria-financeiro', 'Apoia contribuições, conferências e relatórios.'),
  ('Cambono volante/reserva', 'cambono-volante-reserva', 'Apoia como cambono reserva ou volante.'),
  ('Apoia recepção', 'apoia-recepcao', 'Apoio eventual à recepção.'),
  ('Apoia organização', 'apoia-organizacao', 'Apoio eventual à organização.')
) as item(name, slug, description)
where (org.slug = 'tucxa' or org.name ilike '%tucxa%')
  and not exists (
    select 1 from public.oh_roles existing
    where existing.organization_id = org.id and existing.slug = item.slug
  );

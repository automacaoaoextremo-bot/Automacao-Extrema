-- Automação Extrema — Corrente em Dia
-- 02. Base de dados da V1: entidades, vínculos, pessoas, famílias, contribuições, comprovantes e repasses.
-- Execute no Supabase SQL Editor após o arquivo 01.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Cadastro central de clientes da AE.
create table if not exists public.ae_clients (
  id uuid primary key default gen_random_uuid(),
  client_type text not null default 'outro' check (client_type in ('federacao', 'associacao', 'terreiro', 'ong', 'empresa', 'pessoa_fisica', 'outro')),
  display_name text not null,
  legal_name text,
  slug text not null unique,
  document_number text,
  email text,
  whatsapp text,
  city text,
  state text,
  country text not null default 'Brasil',
  status text not null default 'ativo',
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ae_client_relationships (
  id uuid primary key default gen_random_uuid(),
  parent_client_id uuid not null references public.ae_clients(id) on delete cascade,
  child_client_id uuid not null references public.ae_clients(id) on delete cascade,
  relationship_type text not null default 'vinculo' check (relationship_type in ('filiacao', 'indicacao', 'gestao', 'parceria', 'vinculo')),
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  unique(parent_client_id, child_client_id, relationship_type)
);

create table if not exists public.ae_client_solution_subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.ae_clients(id) on delete cascade,
  solution_id uuid not null references public.ae_solutions(id) on delete cascade,
  status text not null default 'piloto' check (status in ('piloto', 'ativo', 'pausado', 'cancelado', 'encerrado')),
  commercial_model text not null default 'taxa_operacional',
  setup_fee numeric(12,2) not null default 0,
  monthly_fee numeric(12,2) not null default 0,
  operational_fee_percentage numeric(5,2) not null default 2.50,
  started_at date not null default current_date,
  ended_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(client_id, solution_id)
);

alter table public.ae_client_sites
  add column if not exists client_id uuid references public.ae_clients(id) on delete set null,
  add column if not exists solution_slug text,
  add column if not exists is_demo boolean not null default false;

-- Entidades específicas do Corrente em Dia.
create table if not exists public.ced_organizations (
  id uuid primary key default gen_random_uuid(),
  ae_client_id uuid references public.ae_clients(id) on delete set null,
  organization_type text not null check (organization_type in ('federacao', 'associacao', 'terreiro')),
  name text not null,
  slug text not null unique,
  legal_name text,
  document_number text,
  email text,
  whatsapp text,
  address_line text,
  neighborhood text,
  city text,
  state text,
  country text not null default 'Brasil',
  pix_key text,
  pix_key_type text check (pix_key_type in ('email', 'cpf', 'cnpj', 'telefone', 'aleatoria', 'outro')),
  pix_receiver_name text,
  default_individual_amount numeric(12,2),
  default_family_amount numeric(12,2),
  contribution_due_day integer check (contribution_due_day between 1 and 28),
  contribution_due_mode text not null default 'until_day' check (contribution_due_mode in ('fixed_day', 'until_day', 'free_month')),
  deep_dive_text text,
  public_headline text,
  public_status text not null default 'ativo' check (public_status in ('ativo', 'rascunho', 'pausado', 'encerrado')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ced_organization_links (
  id uuid primary key default gen_random_uuid(),
  parent_organization_id uuid not null references public.ced_organizations(id) on delete cascade,
  child_organization_id uuid not null references public.ced_organizations(id) on delete cascade,
  relationship_type text not null default 'filiacao' check (relationship_type in ('filiacao', 'indicacao', 'apoio', 'gestao')),
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  unique(parent_organization_id, child_organization_id, relationship_type)
);

create table if not exists public.ced_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  applies_to text not null default 'todos' check (applies_to in ('federacao', 'associacao', 'terreiro', 'todos')),
  description text,
  is_manager boolean not null default false,
  is_financial_role boolean not null default false,
  sort_order integer not null default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ced_people (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  whatsapp text,
  person_type text not null default 'contribuinte' check (person_type in ('gestor', 'contribuinte', 'consulente', 'familiar', 'parceiro', 'outro')),
  auth_user_id uuid,
  status text not null default 'ativo' check (status in ('ativo', 'inativo', 'arquivado')),
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ced_person_organizations (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.ced_people(id) on delete cascade,
  organization_id uuid not null references public.ced_organizations(id) on delete cascade,
  role_id uuid references public.ced_roles(id) on delete set null,
  is_manager boolean not null default false,
  is_financial_responsible boolean not null default false,
  contribution_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(person_id, organization_id, role_id)
);

create table if not exists public.ced_families (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ced_organizations(id) on delete cascade,
  name text not null,
  responsible_person_id uuid references public.ced_people(id) on delete set null,
  default_amount numeric(12,2),
  due_day integer check (due_day between 1 and 28),
  status text not null default 'ativo' check (status in ('ativo', 'inativo', 'arquivado')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ced_family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.ced_families(id) on delete cascade,
  person_id uuid not null references public.ced_people(id) on delete cascade,
  relationship_label text,
  created_at timestamptz not null default now(),
  unique(family_id, person_id)
);

create table if not exists public.ced_contribution_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ced_organizations(id) on delete cascade,
  person_id uuid references public.ced_people(id) on delete cascade,
  family_id uuid references public.ced_families(id) on delete cascade,
  rule_type text not null default 'individual' check (rule_type in ('individual', 'familia', 'livre', 'eventual', 'isento')),
  amount numeric(12,2),
  due_day integer check (due_day between 1 and 28),
  due_mode text not null default 'until_day' check (due_mode in ('fixed_day', 'until_day', 'free_month')),
  starts_on date not null default current_date,
  ends_on date,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (person_id is not null or family_id is not null)
);

create table if not exists public.ced_contributions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ced_organizations(id) on delete cascade,
  contribution_rule_id uuid references public.ced_contribution_rules(id) on delete set null,
  person_id uuid references public.ced_people(id) on delete set null,
  family_id uuid references public.ced_families(id) on delete set null,
  reference_month date not null,
  expected_amount numeric(12,2),
  due_date date,
  pix_key_expected text,
  pix_receiver_expected text,
  pix_payload text,
  status text not null default 'em_aberto' check (status in ('em_aberto', 'comprovante_enviado', 'pre_validado', 'divergente', 'aprovado', 'reprovado', 'cancelado')),
  generated_by text not null default 'manual',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ced_payment_receipts (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.ced_contributions(id) on delete cascade,
  uploaded_by_person_id uuid references public.ced_people(id) on delete set null,
  file_url text,
  file_name text,
  informed_amount numeric(12,2),
  informed_paid_at timestamptz,
  ocr_amount numeric(12,2),
  ocr_pix_key text,
  ocr_receiver_name text,
  ocr_status_text text,
  transaction_e2e_id text,
  validation_status text not null default 'pendente' check (validation_status in ('pendente', 'pre_validado', 'divergente', 'duplicado', 'inconclusivo')),
  validation_notes text,
  raw_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ced_contribution_reviews (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.ced_payment_receipts(id) on delete cascade,
  contribution_id uuid not null references public.ced_contributions(id) on delete cascade,
  reviewer_person_id uuid references public.ced_people(id) on delete set null,
  reviewer_auth_user_id uuid,
  decision text not null check (decision in ('aprovado', 'reprovado', 'pedir_correcao')),
  notes text,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.ced_split_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.ced_organizations(id) on delete cascade,
  solution_id uuid references public.ae_solutions(id) on delete cascade,
  beneficiary_kind text not null check (beneficiary_kind in ('federacao', 'associacao', 'ae', 'laercio', 'reserva_operacional', 'outro')),
  beneficiary_name text not null,
  percentage numeric(5,2) not null check (percentage >= 0 and percentage <= 100),
  applies_when text not null default 'sempre',
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ced_reminder_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.ced_organizations(id) on delete cascade,
  template_key text not null,
  channel text not null default 'whatsapp' check (channel in ('whatsapp', 'email', 'sistema')),
  title text not null,
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, template_key, channel)
);

-- Índices.
create index if not exists idx_ae_clients_type on public.ae_clients(client_type);
create index if not exists idx_ae_clients_status on public.ae_clients(status);
create index if not exists idx_ae_client_subscriptions_solution on public.ae_client_solution_subscriptions(solution_id);
create index if not exists idx_ced_organizations_type on public.ced_organizations(organization_type);
create index if not exists idx_ced_organizations_client on public.ced_organizations(ae_client_id);
create index if not exists idx_ced_org_links_parent on public.ced_organization_links(parent_organization_id);
create index if not exists idx_ced_org_links_child on public.ced_organization_links(child_organization_id);
create index if not exists idx_ced_people_email on public.ced_people(email);
create index if not exists idx_ced_person_org_org on public.ced_person_organizations(organization_id);
create index if not exists idx_ced_families_org on public.ced_families(organization_id);
create index if not exists idx_ced_rules_org on public.ced_contribution_rules(organization_id);
create index if not exists idx_ced_contributions_org_month on public.ced_contributions(organization_id, reference_month);
create index if not exists idx_ced_contributions_status on public.ced_contributions(status);
create index if not exists idx_ced_receipts_contribution on public.ced_payment_receipts(contribution_id);
create index if not exists idx_ced_reviews_contribution on public.ced_contribution_reviews(contribution_id);
create unique index if not exists idx_ced_contrib_person_month on public.ced_contributions(organization_id, person_id, reference_month) where person_id is not null;
create unique index if not exists idx_ced_contrib_family_month on public.ced_contributions(organization_id, family_id, reference_month) where family_id is not null;
create unique index if not exists idx_ced_receipts_e2e_unique on public.ced_payment_receipts(transaction_e2e_id) where transaction_e2e_id is not null;

-- Triggers updated_at.
do $$
begin
  execute 'drop trigger if exists trg_ae_clients_updated_at on public.ae_clients';
  execute 'create trigger trg_ae_clients_updated_at before update on public.ae_clients for each row execute function public.set_updated_at()';
  execute 'drop trigger if exists trg_ae_client_solution_subscriptions_updated_at on public.ae_client_solution_subscriptions';
  execute 'create trigger trg_ae_client_solution_subscriptions_updated_at before update on public.ae_client_solution_subscriptions for each row execute function public.set_updated_at()';
  execute 'drop trigger if exists trg_ced_organizations_updated_at on public.ced_organizations';
  execute 'create trigger trg_ced_organizations_updated_at before update on public.ced_organizations for each row execute function public.set_updated_at()';
  execute 'drop trigger if exists trg_ced_roles_updated_at on public.ced_roles';
  execute 'create trigger trg_ced_roles_updated_at before update on public.ced_roles for each row execute function public.set_updated_at()';
  execute 'drop trigger if exists trg_ced_people_updated_at on public.ced_people';
  execute 'create trigger trg_ced_people_updated_at before update on public.ced_people for each row execute function public.set_updated_at()';
  execute 'drop trigger if exists trg_ced_families_updated_at on public.ced_families';
  execute 'create trigger trg_ced_families_updated_at before update on public.ced_families for each row execute function public.set_updated_at()';
  execute 'drop trigger if exists trg_ced_contribution_rules_updated_at on public.ced_contribution_rules';
  execute 'create trigger trg_ced_contribution_rules_updated_at before update on public.ced_contribution_rules for each row execute function public.set_updated_at()';
  execute 'drop trigger if exists trg_ced_contributions_updated_at on public.ced_contributions';
  execute 'create trigger trg_ced_contributions_updated_at before update on public.ced_contributions for each row execute function public.set_updated_at()';
  execute 'drop trigger if exists trg_ced_payment_receipts_updated_at on public.ced_payment_receipts';
  execute 'create trigger trg_ced_payment_receipts_updated_at before update on public.ced_payment_receipts for each row execute function public.set_updated_at()';
  execute 'drop trigger if exists trg_ced_split_rules_updated_at on public.ced_split_rules';
  execute 'create trigger trg_ced_split_rules_updated_at before update on public.ced_split_rules for each row execute function public.set_updated_at()';
  execute 'drop trigger if exists trg_ced_reminder_templates_updated_at on public.ced_reminder_templates';
  execute 'create trigger trg_ced_reminder_templates_updated_at before update on public.ced_reminder_templates for each row execute function public.set_updated_at()';
end $$;

-- Views para gestão.
create or replace view public.ced_v_dashboard_month as
select
  o.id as organization_id,
  o.name as organization_name,
  o.slug as organization_slug,
  o.organization_type,
  c.reference_month,
  count(*) as total_contributions,
  count(*) filter (where c.status = 'aprovado') as approved_count,
  count(*) filter (where c.status in ('em_aberto', 'comprovante_enviado', 'pre_validado', 'divergente', 'reprovado')) as pending_count,
  count(*) filter (where c.status = 'divergente') as divergent_count,
  count(*) filter (where c.status in ('comprovante_enviado', 'pre_validado', 'divergente')) as review_count,
  coalesce(sum(c.expected_amount) filter (where c.status = 'aprovado'), 0)::numeric(12,2) as approved_amount,
  coalesce(sum(c.expected_amount) filter (where c.status <> 'aprovado'), 0)::numeric(12,2) as pending_amount,
  coalesce(sum(c.expected_amount), 0)::numeric(12,2) as expected_amount
from public.ced_organizations o
left join public.ced_contributions c on c.organization_id = o.id
group by o.id, o.name, o.slug, o.organization_type, c.reference_month;

create or replace view public.ced_v_monthly_split_estimate as
select
  o.id as organization_id,
  o.name as organization_name,
  c.reference_month,
  sr.beneficiary_kind,
  sr.beneficiary_name,
  sr.percentage,
  coalesce(sum(c.expected_amount) filter (where c.status = 'aprovado'), 0)::numeric(12,2) as approved_amount,
  (coalesce(sum(c.expected_amount) filter (where c.status = 'aprovado'), 0) * sr.percentage / 100)::numeric(12,2) as estimated_repass_amount
from public.ced_organizations o
join public.ced_split_rules sr on sr.organization_id = o.id and sr.is_active
left join public.ced_contributions c on c.organization_id = o.id
group by o.id, o.name, c.reference_month, sr.beneficiary_kind, sr.beneficiary_name, sr.percentage;

-- RLS: a aplicação usa service role nas rotas server-side. Políticas abaixo liberam leitura para usuários autenticados.
alter table public.ae_clients enable row level security;
alter table public.ae_client_relationships enable row level security;
alter table public.ae_client_solution_subscriptions enable row level security;
alter table public.ced_organizations enable row level security;
alter table public.ced_organization_links enable row level security;
alter table public.ced_roles enable row level security;
alter table public.ced_people enable row level security;
alter table public.ced_person_organizations enable row level security;
alter table public.ced_families enable row level security;
alter table public.ced_family_members enable row level security;
alter table public.ced_contribution_rules enable row level security;
alter table public.ced_contributions enable row level security;
alter table public.ced_payment_receipts enable row level security;
alter table public.ced_contribution_reviews enable row level security;
alter table public.ced_split_rules enable row level security;
alter table public.ced_reminder_templates enable row level security;

-- Remove e recria políticas simples de leitura autenticada.
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'ae_clients','ae_client_relationships','ae_client_solution_subscriptions',
    'ced_organizations','ced_organization_links','ced_roles','ced_people','ced_person_organizations',
    'ced_families','ced_family_members','ced_contribution_rules','ced_contributions','ced_payment_receipts',
    'ced_contribution_reviews','ced_split_rules','ced_reminder_templates'
  ]
  loop
    execute format('drop policy if exists "Authenticated can read %I" on public.%I', tbl, tbl);
    execute format('create policy "Authenticated can read %I" on public.%I for select to authenticated using (true)', tbl, tbl);
  end loop;
end $$;

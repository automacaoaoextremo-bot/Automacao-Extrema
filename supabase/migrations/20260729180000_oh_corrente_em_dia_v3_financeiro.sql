-- Corrente em Dia v3
-- Estrutura financeira, importações, conciliação, contribuição familiar,
-- documentos/OCR e prestação pública de contas.
-- Seguro para execução única no Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.oh_financial_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  default_monthly_amount numeric(12,2) not null default 50,
  amount_is_mandatory boolean not null default false,
  allow_custom_amount boolean not null default true,
  allowed_due_days integer[] not null default array[1,5,10,15,20,30],
  default_due_day integer not null default 10,
  reminder_days_before integer[] not null default array[7,3,1],
  reminder_on_due_date boolean not null default true,
  reminder_channels text[] not null default array['whatsapp','painel'],
  family_contributions_enabled boolean not null default true,
  family_requires_member_confirmation boolean not null default true,
  family_requires_financial_approval boolean not null default true,
  public_detail_level text not null default 'grupos',
  public_show_last_12_months boolean not null default true,
  public_show_drilldown boolean not null default true,
  public_show_top_expenses boolean not null default true,
  public_show_top_revenues boolean not null default true,
  public_show_negative_results boolean not null default true,
  public_show_accumulated_balance boolean not null default true,
  public_show_simulator boolean not null default true,
  public_show_provisional_data boolean not null default true,
  public_popup_frequency text not null default 'once_per_session',
  public_headline text not null default 'Transparência fortalece a confiança.',
  public_message text not null default 'Cada contribuição ajuda a manter a Casa aberta, acolhedora e preparada para realizar seus trabalhos. Nenhum nome ou valor individual é exibido.',
  google_sheets_url text,
  google_sheets_tab text,
  google_sheets_last_sync_at timestamptz,
  ocr_provider text not null default 'external_adapter',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

create table if not exists public.oh_financial_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  entry_type text not null check (entry_type in ('receita','despesa')),
  parent_id uuid references public.oh_financial_categories(id) on delete set null,
  name text not null,
  public_name text,
  slug text not null,
  group_name text not null,
  public_visible boolean not null default true,
  active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, entry_type, slug)
);

create table if not exists public.oh_financial_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  competence_month date not null,
  status text not null default 'aberto'
    check (status in ('aberto','importado','provisorio','em_revisao','confirmado','com_divergencia','fechado')),
  opening_balance numeric(14,2) not null default 0,
  closing_balance numeric(14,2),
  needs_update boolean not null default false,
  source_label text,
  approved_by uuid references public.oh_people(id) on delete set null,
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, competence_month)
);

create table if not exists public.oh_financial_imports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  import_type text not null,
  source_name text,
  original_file_name text,
  original_mime_type text,
  status text not null default 'pre_visualizacao'
    check (status in ('pre_visualizacao','aguardando_mapeamento','processando','concluido','concluido_com_erros','cancelado')),
  mapping jsonb not null default '{}'::jsonb,
  totals jsonb not null default '{}'::jsonb,
  error_log jsonb not null default '[]'::jsonb,
  created_by uuid references public.oh_people(id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.oh_financial_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  period_id uuid references public.oh_financial_periods(id) on delete set null,
  category_id uuid references public.oh_financial_categories(id) on delete set null,
  import_id uuid references public.oh_financial_imports(id) on delete set null,
  entry_type text not null check (entry_type in ('receita','despesa')),
  entry_date date not null,
  competence_month date not null,
  description_internal text not null,
  description_public text,
  amount numeric(14,2) not null check (amount >= 0),
  payment_method text,
  financial_account text,
  counterparty_name text,
  source_type text not null default 'manual',
  source_reference text,
  status text not null default 'em_revisao'
    check (status in ('rascunho','importado','provisorio','em_revisao','confirmado','com_divergencia','cancelado')),
  is_provisional boolean not null default false,
  needs_update boolean not null default false,
  public_visible boolean not null default true,
  notes_internal text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.oh_people(id) on delete set null,
  approved_by uuid references public.oh_people(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop index if exists public.idx_oh_fin_entries_source_unique;
create unique index idx_oh_fin_entries_source_unique
  on public.oh_financial_entries (organization_id, source_type, source_reference);

create index if not exists idx_oh_fin_entries_org_month
  on public.oh_financial_entries (organization_id, competence_month, entry_type, status);

create table if not exists public.oh_financial_import_rows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  import_id uuid not null references public.oh_financial_imports(id) on delete cascade,
  row_number integer not null,
  source_data jsonb not null default '{}'::jsonb,
  normalized_data jsonb not null default '{}'::jsonb,
  validation_status text not null default 'pendente',
  validation_messages jsonb not null default '[]'::jsonb,
  created_entry_id uuid references public.oh_financial_entries(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (import_id, row_number)
);

create table if not exists public.oh_bank_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  import_id uuid references public.oh_financial_imports(id) on delete set null,
  external_id text,
  transaction_date date not null,
  description text not null,
  amount numeric(14,2) not null,
  transaction_type text not null check (transaction_type in ('credito','debito')),
  account_label text,
  fit_id text,
  status text not null default 'nao_conciliado'
    check (status in ('nao_conciliado','sugerido','conciliado','ignorado')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, external_id)
);

create table if not exists public.oh_reconciliation_matches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  bank_transaction_id uuid not null references public.oh_bank_transactions(id) on delete cascade,
  financial_entry_id uuid not null references public.oh_financial_entries(id) on delete cascade,
  match_type text not null default 'manual',
  confidence numeric(5,2),
  status text not null default 'confirmado',
  confirmed_by uuid references public.oh_people(id) on delete set null,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (bank_transaction_id, financial_entry_id)
);

create table if not exists public.oh_financial_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  entry_id uuid references public.oh_financial_entries(id) on delete set null,
  import_id uuid references public.oh_financial_imports(id) on delete set null,
  storage_path text,
  original_file_name text,
  mime_type text,
  document_type text not null default 'comprovante',
  ocr_status text not null default 'aguardando_processamento',
  ocr_provider text,
  extracted_data jsonb not null default '{}'::jsonb,
  validation_status text not null default 'aguardando_validacao',
  validated_by uuid references public.oh_people(id) on delete set null,
  validated_at timestamptz,
  created_by uuid references public.oh_people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.oh_family_relationship_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  slug text not null,
  label text not null,
  active boolean not null default true,
  requires_member_confirmation boolean not null default true,
  requires_financial_approval boolean not null default true,
  allow_responsible_payment boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.oh_family_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  name text not null,
  responsible_person_id uuid references public.oh_people(id) on delete set null,
  contribution_mode text not null default 'consolidada'
    check (contribution_mode in ('consolidada','valores_individuais','separada','parcial')),
  status text not null default 'ativo',
  notes text,
  created_by uuid references public.oh_people(id) on delete set null,
  approved_by uuid references public.oh_people(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.oh_family_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  family_group_id uuid not null references public.oh_family_groups(id) on delete cascade,
  person_id uuid not null references public.oh_people(id) on delete cascade,
  relationship_type_id uuid references public.oh_family_relationship_types(id) on delete set null,
  individual_amount numeric(12,2),
  included_in_payment boolean not null default true,
  member_confirmed_at timestamptz,
  financial_approved_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_group_id, person_id)
);

create table if not exists public.oh_contribution_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  person_id uuid references public.oh_people(id) on delete cascade,
  external_contact_key text,
  preferred_due_day integer,
  reminder_days_before integer[] not null default array[3,1],
  reminder_channels text[] not null default array['whatsapp'],
  recurring_mode text not null default 'nao_programada'
    check (recurring_mode in ('nao_programada','pix_agendado','pix_automatico','cartao_recorrente','boleto_recorrente')),
  recurring_status text not null default 'inativo',
  recurring_provider_reference text,
  family_group_id uuid references public.oh_family_groups(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, person_id)
);

create table if not exists public.oh_public_financial_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  reference_month date not null,
  detail_level text not null default 'grupos',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'rascunho'
    check (status in ('rascunho','aguardando_aprovacao','publicado','substituido')),
  published_by uuid references public.oh_people(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_oh_public_snapshot_published
  on public.oh_public_financial_snapshots (organization_id, reference_month)
  where status = 'publicado';

create table if not exists public.oh_financial_audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  actor_person_id uuid references public.oh_people(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  justification text,
  created_at timestamptz not null default now()
);

alter table if exists public.oh_contributions
  add column if not exists contribution_kind text not null default 'mensal',
  add column if not exists is_anonymous boolean not null default false,
  add column if not exists recurrence_type text not null default 'pontual',
  add column if not exists preferred_due_day integer,
  add column if not exists contributor_email text,
  add column if not exists contributor_whatsapp text,
  add column if not exists family_group_id uuid references public.oh_family_groups(id) on delete set null,
  add column if not exists public_identification_mode text not null default 'sigiloso';

alter table public.oh_financial_settings enable row level security;
alter table public.oh_financial_categories enable row level security;
alter table public.oh_financial_periods enable row level security;
alter table public.oh_financial_imports enable row level security;
alter table public.oh_financial_entries enable row level security;
alter table public.oh_financial_import_rows enable row level security;
alter table public.oh_bank_transactions enable row level security;
alter table public.oh_reconciliation_matches enable row level security;
alter table public.oh_financial_documents enable row level security;
alter table public.oh_family_relationship_types enable row level security;
alter table public.oh_family_groups enable row level security;
alter table public.oh_family_members enable row level security;
alter table public.oh_contribution_preferences enable row level security;
alter table public.oh_public_financial_snapshots enable row level security;
alter table public.oh_financial_audit_logs enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'oh-financial-documents',
  'oh-financial-documents',
  false,
  15728640,
  array['image/jpeg','image/png','image/webp','application/pdf','text/plain','text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
declare
  org_id uuid;
  expense_category_id uuid;
  revenue_category_id uuid;
  month_data record;
  period_id uuid;
begin
  select id into org_id
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by created_at asc
  limit 1;

  if org_id is null then
    return;
  end if;

  insert into public.oh_financial_settings (organization_id)
  values (org_id)
  on conflict (organization_id) do nothing;

  insert into public.oh_family_relationship_types (
    organization_id, slug, label, sort_order
  )
  values
    (org_id, 'filho', 'Filho', 10),
    (org_id, 'filha', 'Filha', 20),
    (org_id, 'esposa', 'Esposa', 30),
    (org_id, 'marido', 'Marido', 40)
  on conflict (organization_id, slug) do update set
    label = excluded.label,
    active = true,
    sort_order = excluded.sort_order,
    updated_at = now();

  insert into public.oh_financial_categories (
    organization_id, entry_type, name, public_name, slug, group_name, sort_order
  )
  values
    (org_id, 'despesa', 'Despesas consolidadas', 'Despesas', 'despesas-consolidadas', 'Despesas gerais', 1),
    (org_id, 'despesa', 'Estrutura e serviços essenciais', 'Estrutura e serviços essenciais', 'estrutura-servicos', 'Estrutura e serviços essenciais', 10),
    (org_id, 'despesa', 'Segurança e conservação', 'Segurança e conservação', 'seguranca-conservacao', 'Segurança e conservação', 20),
    (org_id, 'despesa', 'Materiais dos trabalhos', 'Materiais dos trabalhos', 'materiais-trabalhos', 'Materiais dos trabalhos', 30),
    (org_id, 'despesa', 'Institucional e administrativo', 'Institucional e administrativo', 'institucional-administrativo', 'Institucional e administrativo', 40),
    (org_id, 'despesa', 'Eventos e ações assistenciais', 'Eventos e ações assistenciais', 'eventos-assistencia', 'Eventos e ações assistenciais', 50),
    (org_id, 'receita', 'Receitas consolidadas', 'Receitas', 'receitas-consolidadas', 'Receitas gerais', 1),
    (org_id, 'receita', 'Contribuições dos Filhos da Corrente', 'Contribuições dos Filhos da Corrente', 'contribuicoes-filhos', 'Contribuições', 10),
    (org_id, 'receita', 'Contribuições espontâneas e doações', 'Contribuições espontâneas e doações', 'doacoes', 'Contribuições', 20),
    (org_id, 'receita', 'Eventos', 'Eventos', 'eventos', 'Eventos', 30),
    (org_id, 'receita', 'Ações do Sementinha', 'Ações do Sementinha', 'sementinha', 'Ações assistenciais', 40),
    (org_id, 'receita', 'Outras receitas', 'Outras receitas', 'outras-receitas', 'Outras receitas', 50)
  on conflict (organization_id, entry_type, slug) do update set
    name = excluded.name,
    public_name = excluded.public_name,
    group_name = excluded.group_name,
    active = true,
    sort_order = excluded.sort_order,
    updated_at = now();

  select id into expense_category_id
  from public.oh_financial_categories
  where organization_id = org_id and entry_type = 'despesa' and slug = 'despesas-consolidadas';

  select id into revenue_category_id
  from public.oh_financial_categories
  where organization_id = org_id and entry_type = 'receita' and slug = 'receitas-consolidadas';

  for month_data in
    select *
    from (
      values
        ('2025-08-01'::date, 11130.92::numeric, 12700.97::numeric, 'confirmado'::text, false, 'Balancete ago/2025'),
        ('2025-09-01'::date, 16910.81::numeric, 10720.57::numeric, 'confirmado'::text, false, 'Balancete set/2025'),
        ('2025-10-01'::date,  6054.63::numeric, 11649.00::numeric, 'confirmado'::text, false, 'Balancete out/2025'),
        ('2025-11-01'::date, 13968.19::numeric, 13989.03::numeric, 'confirmado'::text, false, 'Balancete nov/2025'),
        ('2025-12-01'::date,  7835.35::numeric,  9422.20::numeric, 'confirmado'::text, false, 'Balancete dez/2025'),
        ('2026-01-01'::date,  7835.35::numeric,  9422.20::numeric, 'provisorio'::text, true, 'Replicado de dez/2025'),
        ('2026-02-01'::date,  7835.35::numeric,  9422.20::numeric, 'provisorio'::text, true, 'Replicado de dez/2025'),
        ('2026-03-01'::date,  7835.35::numeric,  9422.20::numeric, 'provisorio'::text, true, 'Replicado de dez/2025'),
        ('2026-04-01'::date,  7835.35::numeric,  9422.20::numeric, 'provisorio'::text, true, 'Replicado de dez/2025'),
        ('2026-05-01'::date,  7835.35::numeric,  9422.20::numeric, 'provisorio'::text, true, 'Replicado de dez/2025'),
        ('2026-06-01'::date,  7835.35::numeric,  9422.20::numeric, 'provisorio'::text, true, 'Replicado de dez/2025'),
        ('2026-07-01'::date,  7835.35::numeric,  9422.20::numeric, 'provisorio'::text, true, 'Replicado de dez/2025')
    ) as seeded(competence_month, expenses, revenues, period_status, needs_update, source_label)
  loop
    insert into public.oh_financial_periods (
      organization_id, competence_month, status, needs_update, source_label
    )
    values (
      org_id, month_data.competence_month, month_data.period_status, month_data.needs_update, month_data.source_label
    )
    on conflict (organization_id, competence_month) do update set
      status = excluded.status,
      needs_update = excluded.needs_update,
      source_label = excluded.source_label,
      updated_at = now()
    returning id into period_id;

    insert into public.oh_financial_entries (
      organization_id, period_id, category_id, entry_type, entry_date, competence_month,
      description_internal, description_public, amount, source_type, source_reference,
      status, is_provisional, needs_update, public_visible, metadata
    )
    values (
      org_id, period_id, expense_category_id, 'despesa',
      month_data.competence_month, month_data.competence_month,
      'Despesas consolidadas do balancete', 'Despesas consolidadas',
      month_data.expenses, 'seed_balancete',
      to_char(month_data.competence_month, 'YYYY-MM') || ':despesa',
      month_data.period_status, month_data.needs_update, month_data.needs_update, true,
      jsonb_build_object('sourceLabel', month_data.source_label)
    )
    on conflict (organization_id, source_type, source_reference)
    do update set
      amount = excluded.amount,
      status = excluded.status,
      is_provisional = excluded.is_provisional,
      needs_update = excluded.needs_update,
      updated_at = now();

    insert into public.oh_financial_entries (
      organization_id, period_id, category_id, entry_type, entry_date, competence_month,
      description_internal, description_public, amount, source_type, source_reference,
      status, is_provisional, needs_update, public_visible, metadata
    )
    values (
      org_id, period_id, revenue_category_id, 'receita',
      month_data.competence_month, month_data.competence_month,
      'Receitas consolidadas do balancete', 'Receitas consolidadas',
      month_data.revenues, 'seed_balancete',
      to_char(month_data.competence_month, 'YYYY-MM') || ':receita',
      month_data.period_status, month_data.needs_update, month_data.needs_update, true,
      jsonb_build_object('sourceLabel', month_data.source_label)
    )
    on conflict (organization_id, source_type, source_reference)
    do update set
      amount = excluded.amount,
      status = excluded.status,
      is_provisional = excluded.is_provisional,
      needs_update = excluded.needs_update,
      updated_at = now();
  end loop;

  update public.oh_roles
  set
    recommended_permissions = coalesce(recommended_permissions, '[]'::jsonb)
      || '["corrente-em-dia.financeiro.visualizar","corrente-em-dia.financeiro.editar","corrente-em-dia.importar","corrente-em-dia.publicar"]'::jsonb,
    updated_at = now()
  where organization_id = org_id
    and slug = 'tesouraria-financeiro';
end $$;

-- Caixa Claro — piloto SilvaMattano v1
-- Estrutura multi-família com autenticação individual por Supabase Auth,
-- importação de extratos, rendas, agenda financeira, documentos privados
-- e conciliação muitos-para-muitos (incluindo o caso "PIX ponte").
--
-- Esta migration NÃO cria usuários do Supabase Auth e NÃO armazena senhas.
-- Os quatro usuários devem ser criados em Authentication > Users e depois
-- vinculados aos registros cc_family_members conforme o passo a passo entregue.

begin;

create extension if not exists pgcrypto;

create or replace function public.cc_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Núcleo multi-família
-- -----------------------------------------------------------------------------
create table if not exists public.cc_families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'America/Sao_Paulo',
  currency text not null default 'BRL',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cc_family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.cc_families(id) on delete cascade,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  display_name text,
  email text,
  role text not null default 'member' check (role in ('owner','admin','member')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, full_name)
);

create unique index if not exists cc_family_members_email_unique
  on public.cc_family_members (lower(email))
  where email is not null;

create table if not exists public.cc_accounts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.cc_families(id) on delete cascade,
  owner_member_id uuid references public.cc_family_members(id) on delete set null,
  institution text not null,
  nickname text not null,
  kind text not null default 'checking'
    check (kind in ('checking','savings','credit_card','investment','wallet','other')),
  current_balance_cents bigint not null default 0,
  include_in_cash boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, nickname)
);

create table if not exists public.cc_import_batches (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.cc_families(id) on delete cascade,
  account_id uuid not null references public.cc_accounts(id) on delete cascade,
  imported_by_member_id uuid references public.cc_family_members(id) on delete set null,
  source text not null check (source in ('btg_xlsx','csv','ofx','manual','other')),
  original_name text,
  row_count integer not null default 0 check (row_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.cc_transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.cc_families(id) on delete cascade,
  account_id uuid not null references public.cc_accounts(id) on delete cascade,
  import_batch_id uuid references public.cc_import_batches(id) on delete set null,
  member_id uuid references public.cc_family_members(id) on delete set null,
  occurred_at timestamptz not null,
  category_raw text,
  transaction_raw text,
  description text not null,
  amount_cents bigint not null,
  kind text not null default 'uncategorized'
    check (kind in ('income','expense','transfer','uncategorized')),
  external_hash text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, account_id, external_hash)
);

create index if not exists cc_transactions_family_date_idx
  on public.cc_transactions (family_id, occurred_at desc);
create index if not exists cc_transactions_family_kind_idx
  on public.cc_transactions (family_id, kind, occurred_at desc);

create table if not exists public.cc_balance_snapshots (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.cc_families(id) on delete cascade,
  account_id uuid not null references public.cc_accounts(id) on delete cascade,
  import_batch_id uuid references public.cc_import_batches(id) on delete set null,
  snapshot_date timestamptz not null,
  balance_cents bigint not null,
  created_at timestamptz not null default now(),
  unique (family_id, account_id, snapshot_date)
);

-- -----------------------------------------------------------------------------
-- Rendas e previsão
-- O evento de renda é a fonte de verdade para salário/INSS.
-- Um PIX posterior para o BTG pode ser conciliado como transferência interna,
-- impedindo que a mesma renda seja contada duas vezes.
-- -----------------------------------------------------------------------------
create table if not exists public.cc_income_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.cc_families(id) on delete cascade,
  member_id uuid not null references public.cc_family_members(id) on delete cascade,
  source_name text not null,
  source_type text not null default 'salary'
    check (source_type in ('salary','inss','benefit','freelance','other')),
  competence_date date not null,
  expected_date date,
  net_cents bigint not null check (net_cents >= 0),
  received_cents bigint not null default 0 check (received_cents >= 0),
  status text not null default 'expected'
    check (status in ('expected','received','partial','canceled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cc_income_events_family_competence_idx
  on public.cc_income_events (family_id, competence_date desc);

create table if not exists public.cc_planned_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.cc_families(id) on delete cascade,
  member_id uuid references public.cc_family_members(id) on delete set null,
  title text not null,
  direction text not null check (direction in ('income','expense')),
  amount_cents bigint not null check (amount_cents >= 0),
  due_date date not null,
  status text not null default 'planned'
    check (status in ('planned','confirmed','paid','canceled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cc_planned_items_family_due_idx
  on public.cc_planned_items (family_id, due_date);

-- -----------------------------------------------------------------------------
-- Documentos financeiros privados
-- -----------------------------------------------------------------------------
create table if not exists public.cc_documents (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.cc_families(id) on delete cascade,
  member_id uuid references public.cc_family_members(id) on delete set null,
  document_type text not null
    check (document_type in ('holerite','inss','bank_statement','card_statement','receipt','other')),
  original_name text not null,
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint,
  notes text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Conciliação muitos-para-muitos
-- Exemplos suportados:
-- 1) holerite -> crédito direto no banco de origem;
-- 2) holerite -> PIX ponte no BTG;
-- 3) uma renda -> vários PIX parciais;
-- 4) um único crédito -> várias rendas;
-- 5) confirmação manual quando não houver extrato do banco de origem.
-- -----------------------------------------------------------------------------
create table if not exists public.cc_reconciliation_allocations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.cc_families(id) on delete cascade,
  income_event_id uuid not null references public.cc_income_events(id) on delete cascade,
  transaction_id uuid not null references public.cc_transactions(id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0),
  method text not null
    check (method in ('direct_credit','pix_bridge','source_bank_credit','manual','split','combined')),
  note text,
  created_at timestamptz not null default now(),
  unique (income_event_id, transaction_id, method)
);

create index if not exists cc_reconciliation_income_idx
  on public.cc_reconciliation_allocations (income_event_id);
create index if not exists cc_reconciliation_transaction_idx
  on public.cc_reconciliation_allocations (transaction_id);

-- -----------------------------------------------------------------------------
-- updated_at
-- -----------------------------------------------------------------------------
drop trigger if exists cc_families_touch_updated_at on public.cc_families;
create trigger cc_families_touch_updated_at before update on public.cc_families
for each row execute function public.cc_touch_updated_at();

drop trigger if exists cc_family_members_touch_updated_at on public.cc_family_members;
create trigger cc_family_members_touch_updated_at before update on public.cc_family_members
for each row execute function public.cc_touch_updated_at();

drop trigger if exists cc_accounts_touch_updated_at on public.cc_accounts;
create trigger cc_accounts_touch_updated_at before update on public.cc_accounts
for each row execute function public.cc_touch_updated_at();

drop trigger if exists cc_transactions_touch_updated_at on public.cc_transactions;
create trigger cc_transactions_touch_updated_at before update on public.cc_transactions
for each row execute function public.cc_touch_updated_at();

drop trigger if exists cc_income_events_touch_updated_at on public.cc_income_events;
create trigger cc_income_events_touch_updated_at before update on public.cc_income_events
for each row execute function public.cc_touch_updated_at();

drop trigger if exists cc_planned_items_touch_updated_at on public.cc_planned_items;
create trigger cc_planned_items_touch_updated_at before update on public.cc_planned_items
for each row execute function public.cc_touch_updated_at();

-- -----------------------------------------------------------------------------
-- Autorização / RLS
-- -----------------------------------------------------------------------------
alter table public.cc_families enable row level security;
alter table public.cc_family_members enable row level security;
alter table public.cc_accounts enable row level security;
alter table public.cc_import_batches enable row level security;
alter table public.cc_transactions enable row level security;
alter table public.cc_balance_snapshots enable row level security;
alter table public.cc_income_events enable row level security;
alter table public.cc_planned_items enable row level security;
alter table public.cc_documents enable row level security;
alter table public.cc_reconciliation_allocations enable row level security;

create or replace function public.cc_current_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id
  from public.cc_family_members
  where auth_user_id = auth.uid()
    and active = true
  limit 1;
$$;

create or replace function public.cc_is_family_member(target_family uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.cc_family_members
    where auth_user_id = auth.uid()
      and family_id = target_family
      and active = true
  );
$$;

create or replace function public.cc_is_family_admin(target_family uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.cc_family_members
    where auth_user_id = auth.uid()
      and family_id = target_family
      and active = true
      and role in ('owner','admin')
  );
$$;

revoke all on function public.cc_current_family_id() from public;
revoke all on function public.cc_is_family_member(uuid) from public;
revoke all on function public.cc_is_family_admin(uuid) from public;
grant execute on function public.cc_current_family_id(), public.cc_is_family_member(uuid), public.cc_is_family_admin(uuid) to authenticated;

-- Família
DROP POLICY IF EXISTS "cc family select" ON public.cc_families;
CREATE POLICY "cc family select" ON public.cc_families
FOR SELECT TO authenticated USING (id = public.cc_current_family_id());

-- Membros: todos da mesma família podem se ver; apenas owner/admin alteram cadastro.
DROP POLICY IF EXISTS "cc members select family" ON public.cc_family_members;
CREATE POLICY "cc members select family" ON public.cc_family_members
FOR SELECT TO authenticated USING (family_id = public.cc_current_family_id());

DROP POLICY IF EXISTS "cc members admin insert" ON public.cc_family_members;
CREATE POLICY "cc members admin insert" ON public.cc_family_members
FOR INSERT TO authenticated WITH CHECK (public.cc_is_family_admin(family_id));

DROP POLICY IF EXISTS "cc members admin update" ON public.cc_family_members;
CREATE POLICY "cc members admin update" ON public.cc_family_members
FOR UPDATE TO authenticated USING (public.cc_is_family_admin(family_id))
WITH CHECK (public.cc_is_family_admin(family_id));

-- Tabelas financeiras: qualquer membro autenticado da própria família pode operar.
DROP POLICY IF EXISTS "cc accounts family all" ON public.cc_accounts;
CREATE POLICY "cc accounts family all" ON public.cc_accounts
FOR ALL TO authenticated USING (public.cc_is_family_member(family_id))
WITH CHECK (public.cc_is_family_member(family_id));

DROP POLICY IF EXISTS "cc imports family all" ON public.cc_import_batches;
CREATE POLICY "cc imports family all" ON public.cc_import_batches
FOR ALL TO authenticated USING (public.cc_is_family_member(family_id))
WITH CHECK (public.cc_is_family_member(family_id));

DROP POLICY IF EXISTS "cc transactions family all" ON public.cc_transactions;
CREATE POLICY "cc transactions family all" ON public.cc_transactions
FOR ALL TO authenticated USING (public.cc_is_family_member(family_id))
WITH CHECK (public.cc_is_family_member(family_id));

DROP POLICY IF EXISTS "cc balances family all" ON public.cc_balance_snapshots;
CREATE POLICY "cc balances family all" ON public.cc_balance_snapshots
FOR ALL TO authenticated USING (public.cc_is_family_member(family_id))
WITH CHECK (public.cc_is_family_member(family_id));

DROP POLICY IF EXISTS "cc incomes family all" ON public.cc_income_events;
CREATE POLICY "cc incomes family all" ON public.cc_income_events
FOR ALL TO authenticated USING (public.cc_is_family_member(family_id))
WITH CHECK (public.cc_is_family_member(family_id));

DROP POLICY IF EXISTS "cc planned family all" ON public.cc_planned_items;
CREATE POLICY "cc planned family all" ON public.cc_planned_items
FOR ALL TO authenticated USING (public.cc_is_family_member(family_id))
WITH CHECK (public.cc_is_family_member(family_id));

DROP POLICY IF EXISTS "cc documents family all" ON public.cc_documents;
CREATE POLICY "cc documents family all" ON public.cc_documents
FOR ALL TO authenticated USING (public.cc_is_family_member(family_id))
WITH CHECK (public.cc_is_family_member(family_id));

DROP POLICY IF EXISTS "cc reconciliation family all" ON public.cc_reconciliation_allocations;
CREATE POLICY "cc reconciliation family all" ON public.cc_reconciliation_allocations
FOR ALL TO authenticated USING (public.cc_is_family_member(family_id))
WITH CHECK (public.cc_is_family_member(family_id));

-- -----------------------------------------------------------------------------
-- Storage privado
-- O primeiro diretório do objeto é SEMPRE o family_id.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('caixa-claro-private', 'caixa-claro-private', false, 15728640)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit;

DROP POLICY IF EXISTS "cc storage family select" ON storage.objects;
CREATE POLICY "cc storage family select" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'caixa-claro-private'
  and public.cc_is_family_member(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "cc storage family insert" ON storage.objects;
CREATE POLICY "cc storage family insert" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'caixa-claro-private'
  and public.cc_is_family_member(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "cc storage family update" ON storage.objects;
CREATE POLICY "cc storage family update" ON storage.objects
FOR UPDATE TO authenticated USING (
  bucket_id = 'caixa-claro-private'
  and public.cc_is_family_member(((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'caixa-claro-private'
  and public.cc_is_family_member(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "cc storage family delete" ON storage.objects;
CREATE POLICY "cc storage family delete" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'caixa-claro-private'
  and public.cc_is_family_member(((storage.foldername(name))[1])::uuid)
);

-- -----------------------------------------------------------------------------
-- Piloto SilvaMattano
-- Apenas estrutura nominal: nenhuma renda, saldo, CPF, senha ou documento é
-- gravado no repositório/migration.
-- -----------------------------------------------------------------------------
insert into public.cc_families (name, slug)
values ('SilvaMattano', 'silvamattano')
on conflict (slug) do update set name = excluded.name;

with family as (
  select id from public.cc_families where slug = 'silvamattano'
)
insert into public.cc_family_members (family_id, full_name, display_name, role)
select family.id, seed.full_name, seed.display_name, seed.role
from family
cross join (
  values
    ('Marcio Alexandre da Silva', 'Márcio', 'owner'),
    ('Mariana Mattano da Silva', 'Mariana', 'member'),
    ('Gabriel Mattano da Silva', 'Gabriel', 'member'),
    ('Daniela Mattano da Silva', 'Daniela', 'member')
) as seed(full_name, display_name, role)
on conflict (family_id, full_name) do update
set display_name = excluded.display_name;

with family as (
  select id from public.cc_families where slug = 'silvamattano'
), owner_member as (
  select m.id, m.family_id
  from public.cc_family_members m
  join family f on f.id = m.family_id
  where m.full_name = 'Marcio Alexandre da Silva'
)
insert into public.cc_accounts (family_id, owner_member_id, institution, nickname, kind, include_in_cash)
select family_id, id, 'BTG Pactual', 'BTG Família', 'checking', true
from owner_member
on conflict (family_id, nickname) do nothing;

commit;

-- Automação Extrema — Bazar no Controle — Sementinha do Tucxa
-- Primeira versão: evento Bazar do Sementinha em 04/07/2026.
-- Inclui pedidos, itens de bazar por valor fixo, cardápio, pagamentos, despesas,
-- relatório e prevenção de duplicidade por attempt_id e assinatura idêntica em 15 segundos.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.bazar_events (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  name text not null,
  slug text not null unique,
  event_date date not null,
  status text not null default 'ativo',
  pix_key text,
  pix_receiver text,
  pix_city text,
  primary_color text not null default '#2f7d45',
  accent_color text not null default '#83a847',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bazar_clients (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.bazar_events(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  whatsapp text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, normalized_name)
);

create table if not exists public.bazar_price_points (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.bazar_events(id) on delete cascade,
  amount numeric(10,2) not null check (amount >= 0),
  label text,
  is_active boolean not null default true,
  sort_order integer not null default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, amount)
);

create table if not exists public.bazar_category_nodes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.bazar_events(id) on delete cascade,
  path text not null,
  level_1 text,
  level_2 text,
  level_3 text,
  is_active boolean not null default true,
  is_required boolean not null default false,
  is_visible boolean not null default true,
  sort_order integer not null default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, path)
);

create table if not exists public.bazar_menu_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.bazar_events(id) on delete cascade,
  category text not null,
  name text not null,
  description text,
  unit_label text not null default 'unidade',
  price numeric(10,2) not null check (price >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, category, name)
);

create table if not exists public.bazar_orders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.bazar_events(id) on delete cascade,
  client_id uuid not null references public.bazar_clients(id) on delete restrict,
  code text not null,
  status text not null default 'aberto',
  payment_status text not null default 'pendente',
  total_amount numeric(10,2) not null default 0,
  notes text,
  dedupe_signature text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, code)
);

create table if not exists public.bazar_order_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.bazar_events(id) on delete cascade,
  order_id uuid not null references public.bazar_orders(id) on delete cascade,
  kind text not null check (kind in ('bazar','menu')),
  source_id uuid,
  name text not null,
  category_path text,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  total_price numeric(10,2) not null check (total_price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.bazar_order_attempts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.bazar_events(id) on delete cascade,
  attempt_id text not null,
  order_id uuid not null references public.bazar_orders(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(event_id, attempt_id)
);

create table if not exists public.bazar_payments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.bazar_events(id) on delete cascade,
  client_id uuid references public.bazar_clients(id) on delete set null,
  order_ids uuid[] not null default '{}',
  method text not null check (method in ('pix','credito','debito','dinheiro')),
  amount numeric(10,2) not null check (amount >= 0),
  group_code text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.bazar_expenses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.bazar_events(id) on delete cascade,
  category text not null default 'Geral',
  description text not null,
  amount numeric(10,2) not null check (amount >= 0),
  status text not null default 'confirmada',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bazar_clients_event on public.bazar_clients(event_id);
create index if not exists idx_bazar_orders_event_status on public.bazar_orders(event_id, status, payment_status);
create index if not exists idx_bazar_orders_dedupe_recent on public.bazar_orders(event_id, dedupe_signature, created_at desc);
create index if not exists idx_bazar_order_items_order on public.bazar_order_items(order_id);
create index if not exists idx_bazar_payments_event on public.bazar_payments(event_id);
create index if not exists idx_bazar_expenses_event on public.bazar_expenses(event_id);

-- Triggers updated_at
drop trigger if exists trg_bazar_events_updated_at on public.bazar_events;
create trigger trg_bazar_events_updated_at before update on public.bazar_events for each row execute function public.set_updated_at();
drop trigger if exists trg_bazar_clients_updated_at on public.bazar_clients;
create trigger trg_bazar_clients_updated_at before update on public.bazar_clients for each row execute function public.set_updated_at();
drop trigger if exists trg_bazar_price_points_updated_at on public.bazar_price_points;
create trigger trg_bazar_price_points_updated_at before update on public.bazar_price_points for each row execute function public.set_updated_at();
drop trigger if exists trg_bazar_category_nodes_updated_at on public.bazar_category_nodes;
create trigger trg_bazar_category_nodes_updated_at before update on public.bazar_category_nodes for each row execute function public.set_updated_at();
drop trigger if exists trg_bazar_menu_items_updated_at on public.bazar_menu_items;
create trigger trg_bazar_menu_items_updated_at before update on public.bazar_menu_items for each row execute function public.set_updated_at();
drop trigger if exists trg_bazar_orders_updated_at on public.bazar_orders;
create trigger trg_bazar_orders_updated_at before update on public.bazar_orders for each row execute function public.set_updated_at();
drop trigger if exists trg_bazar_expenses_updated_at on public.bazar_expenses;
create trigger trg_bazar_expenses_updated_at before update on public.bazar_expenses for each row execute function public.set_updated_at();

alter table public.bazar_events enable row level security;
alter table public.bazar_clients enable row level security;
alter table public.bazar_price_points enable row level security;
alter table public.bazar_category_nodes enable row level security;
alter table public.bazar_menu_items enable row level security;
alter table public.bazar_orders enable row level security;
alter table public.bazar_order_items enable row level security;
alter table public.bazar_order_attempts enable row level security;
alter table public.bazar_payments enable row level security;
alter table public.bazar_expenses enable row level security;

-- A aplicação usa SERVICE_ROLE nas rotas server-side. As políticas abaixo deixam leitura autenticada futura possível.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'bazar_events' and policyname = 'Authenticated can read bazar') then
    create policy "Authenticated can read bazar" on public.bazar_events for select to authenticated using (true);
  end if;
end $$;

insert into public.bazar_events (client_name, name, slug, event_date, pix_key, pix_receiver, pix_city, notes)
values ('Sementinha do Tucxa', 'Bazar do Sementinha — 04/07/2026', 'bazar-sementinha-2026-07-04', '2026-07-04', '58.392.598/0001-91', 'SEMENTINHA DO TUCXA', 'CAMPINAS', 'Primeiro evento fundador da solução Bazar no Controle dentro da Automação Extrema.')
on conflict (slug) do update set
  client_name = excluded.client_name,
  name = excluded.name,
  event_date = excluded.event_date,
  pix_key = excluded.pix_key,
  pix_receiver = excluded.pix_receiver,
  pix_city = excluded.pix_city,
  updated_at = now();

with ev as (select id from public.bazar_events where slug = 'bazar-sementinha-2026-07-04')
insert into public.bazar_price_points (event_id, amount, label, sort_order)
select ev.id, value::numeric, 'R$ ' || value::text || ',00', value
from ev, generate_series(5, 50, 5) as value
on conflict (event_id, amount) do nothing;

with ev as (select id from public.bazar_events where slug = 'bazar-sementinha-2026-07-04'),
rows(path, l1, l2, l3, sort_order) as (
  values
    ('Roupas > Adulto > Feminino', 'Roupas', 'Adulto', 'Feminino', 10),
    ('Roupas > Adulto > Masculino', 'Roupas', 'Adulto', 'Masculino', 11),
    ('Roupas > Infantil > Feminino', 'Roupas', 'Infantil', 'Feminino', 12),
    ('Roupas > Infantil > Masculino', 'Roupas', 'Infantil', 'Masculino', 13),
    ('Sapatos > Adulto > Feminino', 'Sapatos', 'Adulto', 'Feminino', 20),
    ('Sapatos > Adulto > Masculino', 'Sapatos', 'Adulto', 'Masculino', 21),
    ('Sapatos > Infantil', 'Sapatos', 'Infantil', null, 22),
    ('Bijuterias', 'Bijuterias', null, null, 30),
    ('Bolsas e acessórios', 'Bolsas e acessórios', null, null, 31),
    ('Casa e utilidades', 'Casa e utilidades', null, null, 40),
    ('Brinquedos', 'Brinquedos', null, null, 50),
    ('Livros', 'Livros', null, null, 60),
    ('Outros', 'Outros', null, null, 99)
)
insert into public.bazar_category_nodes (event_id, path, level_1, level_2, level_3, sort_order)
select ev.id, rows.path, rows.l1, rows.l2, rows.l3, rows.sort_order
from ev, rows
on conflict (event_id, path) do nothing;

with ev as (select id from public.bazar_events where slug = 'bazar-sementinha-2026-07-04'),
rows(category, name, unit_label, price, sort_order) as (
  values
    ('Salgados', 'Torta de frango', 'pedaço', 10.00, 10),
    ('Salgados', 'Torta de palmito', 'pedaço', 10.00, 11),
    ('Salgados', 'Coxinha', 'unidade', 8.00, 12),
    ('Salgados', 'Bolo salgado', 'pedaço', 10.00, 13),
    ('Doces', 'Bolo de chocolate', 'pedaço', 8.00, 20),
    ('Doces', 'Bolo de abacaxi', 'pedaço', 8.00, 21),
    ('Bebidas', 'Refrigerante 350 ml Coca', 'lata', 7.00, 30),
    ('Bebidas', 'Refrigerante 350 ml Coca Zero', 'lata', 7.00, 31),
    ('Bebidas', 'Refrigerante 350 ml Guaraná', 'lata', 7.00, 32),
    ('Bebidas', 'Suco', 'copo', 6.00, 33)
)
insert into public.bazar_menu_items (event_id, category, name, unit_label, price, sort_order)
select ev.id, rows.category, rows.name, rows.unit_label, rows.price, rows.sort_order
from ev, rows
on conflict (event_id, category, name) do nothing;

-- Cadastro da solução no catálogo geral da AE, se a tabela existir.
do $$
begin
  if to_regclass('public.ae_solutions') is not null then
    insert into public.ae_solutions (name, slug, short_description, target_audience, main_pains, current_status, stage, priority, source_file, is_active)
    values (
      $q$Bazar no Controle$q$,
      $q$bazar-no-controle$q$,
      $q$Solução para registrar pedidos, pagamentos, despesas e prestação de contas de bazares beneficentes, com controle por evento.$q$,
      $q$Organizações, grupos sociais, escolas, centros, ONGs e comunidades que fazem bazares, campanhas e eventos com voluntários.$q$,
      $q$Pedidos em papel ou WhatsApp, dúvida no caixa, clientes com nomes repetidos, prestação de contas manual e pouca comparação entre eventos.$q$,
      $q$validando$q$,
      $q$validacao$q$,
      25,
      $q$Bazar do Sementinha 04-07-2026$q$,
      true
    )
    on conflict (slug) do update set
      short_description = excluded.short_description,
      target_audience = excluded.target_audience,
      main_pains = excluded.main_pains,
      current_status = excluded.current_status,
      stage = excluded.stage,
      priority = excluded.priority,
      source_file = excluded.source_file,
      is_active = excluded.is_active;
  end if;
end $$;

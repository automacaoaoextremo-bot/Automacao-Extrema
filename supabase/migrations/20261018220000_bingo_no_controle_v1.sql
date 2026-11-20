-- Bingo no Controle: nova estrutura isolada. Nenhuma tabela antiga e alterada.
create extension if not exists pgcrypto;
create table if not exists public.bnc_organizations (
 id uuid primary key default gen_random_uuid(), slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
 name text not null, legal_name text, created_at timestamptz not null default now()
);
create table if not exists public.bnc_members (
 organization_id uuid not null references public.bnc_organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','manager','finance','operator','viewer')),
 created_at timestamptz not null default now(), primary key(organization_id,user_id)
);
create table if not exists public.bnc_events (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.bnc_organizations(id),
 slug text not null check(slug ~ '^[a-z0-9-]+$'), title text not null, description text,
 starts_at timestamptz, venue text,
 status text not null default 'draft' check(status in ('draft','ready','active','completed','archived')),
 is_public boolean not null default false,
 sales_enabled boolean not null default false,
 created_at timestamptz not null default now(), unique(organization_id,slug),
 unique(id,organization_id)
);
create table if not exists public.bnc_rounds (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.bnc_events(id) on delete cascade,
 round_number integer not null check(round_number > 0), title text not null,
 status text not null default 'planned' check(status in ('planned','open','closed','completed','cancelled')),
 starts_at timestamptz, card_price_cents integer check(card_price_cents >= 0),
 created_at timestamptz not null default now(), unique(event_id,round_number), unique(id,event_id)
);
create table if not exists public.bnc_prizes (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.bnc_organizations(id),
 title text not null, description text, estimated_value_cents integer check(estimated_value_cents >= 0),
 image_url text, donor_name text, is_confirmed boolean not null default false,
 created_at timestamptz not null default now(), unique(id,organization_id)
);
create table if not exists public.bnc_awards (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.bnc_events(id) on delete cascade,
 round_id uuid not null, prize_id uuid,
 award_type text not null check(award_type in ('quina','full_card','other')),
 award_number integer not null default 1 check(award_number > 0),
 label text not null, created_at timestamptz not null default now(),
 foreign key(round_id,event_id) references public.bnc_rounds(id,event_id),
 unique(round_id,award_type,award_number)
);
create table if not exists public.bnc_offers (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.bnc_events(id) on delete cascade,
 title text not null, price_cents integer not null check(price_cents >= 0),
 quantity integer not null check(quantity > 0),
 is_active boolean not null default false,
 created_at timestamptz not null default now(), unique(id,event_id)
);
create table if not exists public.bnc_offer_rounds (
 offer_id uuid not null references public.bnc_offers(id) on delete cascade,
 round_id uuid not null references public.bnc_rounds(id) on delete cascade,
 quantity integer not null check(quantity > 0), primary key(offer_id,round_id)
);
create table if not exists public.bnc_orders (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.bnc_events(id),
 offer_id uuid references public.bnc_offers(id), buyer_name text not null,
 buyer_phone_digits text not null check(buyer_phone_digits ~ '^[0-9]{10,13}$'),
 buyer_email text, amount_cents integer not null check(amount_cents >= 0),
 status text not null default 'pending' check(status in ('pending','paid','cancelled','refunded')),
 created_at timestamptz not null default now(), unique(id,event_id)
);
create table if not exists public.bnc_payments (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.bnc_orders(id),
 provider text not null, provider_reference text,
 method text not null check(method in ('pix','credit','debit','cash')),
 amount_cents integer not null check(amount_cents >= 0),
 status text not null default 'pending' check(status in ('pending','paid','failed','refunded')),
 created_at timestamptz not null default now(), unique(provider,provider_reference)
);
create table if not exists public.bnc_cards (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.bnc_orders(id),
 round_id uuid not null references public.bnc_rounds(id),
 serial text not null unique, status text not null default 'issued' check(status in ('issued','delivered','voided')),
 created_at timestamptz not null default now()
);
create table if not exists public.bnc_draws (
 id uuid primary key default gen_random_uuid(), round_id uuid not null references public.bnc_rounds(id),
 draw_sequence integer not null check(draw_sequence > 0), number integer not null check(number between 1 and 75),
 is_voided boolean not null default false, drawn_at timestamptz not null default now(),
 unique(round_id,draw_sequence)
);
create table if not exists public.bnc_winner_claims (
 id uuid primary key default gen_random_uuid(), round_id uuid not null references public.bnc_rounds(id),
 card_id uuid references public.bnc_cards(id), status text not null default 'pending' check(status in ('pending','accepted','rejected')),
 submitted_at timestamptz not null default now()
);
create table if not exists public.bnc_legacy_map (
 id bigint generated always as identity primary key, source_project text not null,
 source_table text not null, source_id text not null, destination_table text not null,
 destination_id uuid not null, migrated_at timestamptz not null default now(),
 unique(source_project,source_table,source_id)
);
-- Default deny via RLS: no table is open for anon or authenticated yet.
-- Only membership own-row can be read; future server operations need explicit scoped policies.
do $$ declare r record; begin
 for r in select tablename from pg_tables where schemaname='public' and tablename like 'bnc_%' loop
  execute format('alter table public.%I enable row level security',r.tablename);
 end loop;
end $$;
-- Idempotente apenas quando a politica preexistente e equivalente.
-- Nunca substituir/afrouxar automaticamente permissoes em producao.
do $$
declare p record;
begin
 select permissive, roles, cmd, qual, with_check into p
 from pg_policies
 where schemaname = 'public' and tablename = 'bnc_members'
   and policyname = 'bnc_members_own_read';
 if not found then
  create policy bnc_members_own_read on public.bnc_members
   for select to authenticated using (user_id=auth.uid());
 elsif p.permissive <> 'PERMISSIVE' or p.cmd <> 'SELECT'
   or p.roles <> array['authenticated']::name[]
   or regexp_replace(p.qual, '[[:space:]]+', '', 'g') <> '(user_id=auth.uid())'
   or p.with_check is not null then
  raise exception 'bnc_members_own_read existe com definicao diferente. Revisar manualmente.';
 end if;
end $$;
create index if not exists bnc_events_org_idx on public.bnc_events(organization_id);
create index if not exists bnc_rounds_event_idx on public.bnc_rounds(event_id);
create index if not exists bnc_orders_event_idx on public.bnc_orders(event_id);
create index if not exists bnc_cards_round_idx on public.bnc_cards(round_id);
create index if not exists bnc_draws_round_idx on public.bnc_draws(round_id);
-- Deliberadamente sem dados de cliente ou permissao de vendas nesta migration.

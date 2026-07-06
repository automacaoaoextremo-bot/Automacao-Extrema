-- Automação Extrema — Bazar no Controle — Sementinha 04/07/2026
-- Ajuste do QRCode para acompanhamento por cliente, não por pedido individual.
-- Também mantém compatibilidade com o public_token antigo dos pedidos.

begin;

create extension if not exists "pgcrypto";

-- Token público consolidado por cliente.
alter table public.bazar_clients
add column if not exists public_token uuid;

update public.bazar_clients
set public_token = gen_random_uuid(),
    updated_at = now()
where public_token is null;

alter table public.bazar_clients
alter column public_token set default gen_random_uuid();

alter table public.bazar_clients
alter column public_token set not null;

create unique index if not exists idx_bazar_clients_public_token
on public.bazar_clients (public_token);

-- Mantém o token público por pedido para links antigos que já tenham sido gerados.
alter table public.bazar_orders
add column if not exists public_token uuid;

update public.bazar_orders
set public_token = gen_random_uuid(),
    updated_at = now()
where public_token is null;

alter table public.bazar_orders
alter column public_token set default gen_random_uuid();

alter table public.bazar_orders
alter column public_token set not null;

create unique index if not exists idx_bazar_orders_public_token
on public.bazar_orders (public_token);

commit;

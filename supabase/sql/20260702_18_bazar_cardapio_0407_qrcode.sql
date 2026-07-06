-- Automação Extrema — Bazar no Controle — Sementinha 04/07/2026
-- Ajuste do cardápio real da Cozinha do Bazar e QRCode de acompanhamento público do pedido.
--
-- Observação importante:
-- O schema real deste projeto usa public.bazar_menu_items para o cardápio.
-- Portanto, não use public.bazar_categories/public.bazar_items para este Bazar.

begin;

create extension if not exists "pgcrypto";

-- Garante que o evento exista, caso o seed base já tenha sido executado.
insert into public.bazar_events (client_name, name, slug, event_date, pix_key, pix_receiver, pix_city, notes)
values (
  'Sementinha do Tucxa',
  'Bazar do Sementinha — 04/07/2026',
  'bazar-sementinha-2026-07-04',
  '2026-07-04',
  '58.392.598/0001-91',
  'SEMENTINHA DO TUCXA',
  'CAMPINAS',
  'Evento fundador da solução Bazar no Controle dentro da Automação Extrema.'
)
on conflict (slug) do update set
  client_name = excluded.client_name,
  name = excluded.name,
  event_date = excluded.event_date,
  pix_key = excluded.pix_key,
  pix_receiver = excluded.pix_receiver,
  pix_city = excluded.pix_city,
  notes = excluded.notes,
  updated_at = now();

-- Token público para o cliente acompanhar o pedido pelo QRCode.
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

-- Inativa o cardápio antigo do evento para evitar itens antigos como Coxinha/Bolo salgado.
with ev as (
  select id from public.bazar_events where slug = 'bazar-sementinha-2026-07-04'
)
update public.bazar_menu_items
set is_active = false,
    updated_at = now()
where event_id = (select id from ev);

-- Cardápio oficial da imagem do Bazar do dia 04/07.
with ev as (
  select id from public.bazar_events where slug = 'bazar-sementinha-2026-07-04'
),
rows(category, name, description, unit_label, price, sort_order) as (
  values
    -- Tortas — R$ 12,00
    ('Tortas', 'Torta de palmito', 'Torta de palmito.', 'pedaço', 12.00, 10),
    ('Tortas', 'Torta de frango', 'Torta de frango.', 'pedaço', 12.00, 20),

    -- Salgados — R$ 10,00
    ('Salgados', 'Croquete', 'Croquete.', 'unidade', 10.00, 10),
    ('Salgados', 'Kibe', 'Kibe.', 'unidade', 10.00, 20),
    ('Salgados', 'Presunto e queijo', 'Salgado de presunto e queijo.', 'unidade', 10.00, 30),
    ('Salgados', 'Salsicha', 'Salgado de salsicha.', 'unidade', 10.00, 40),
    ('Salgados', 'Bolinho de carne', 'Bolinho de carne.', 'unidade', 10.00, 50),

    -- Bauru de Forno — R$ 12,00
    ('Bauru de Forno', 'Bauru de forno', 'Massa fina, presunto, queijo e tomate.', 'pedaço', 12.00, 10),

    -- Doces — R$ 12,00
    ('Doces', 'Bolo branco com Ninho', 'Bolo branco com Ninho.', 'pedaço', 12.00, 10),
    ('Doces', 'Bolo de chocolate recheado', 'Bolo de chocolate recheado.', 'pedaço', 12.00, 20),
    ('Doces', 'Pudim leite condensado', 'Pudim de leite condensado.', 'pedaço', 12.00, 30),

    -- Doces — R$ 8,00
    ('Doces', 'Bolo de milho cremoso', 'Bolo de milho cremoso.', 'pedaço', 8.00, 40),
    ('Doces', 'Mousse de paçoca', 'Mousse de paçoca.', 'unidade', 8.00, 50),
    ('Doces', 'Espeto de morango c/ chocolate', 'Espeto de morango com chocolate.', 'unidade', 8.00, 60),

    -- Bebidas
    ('Bebidas', 'Água com gás', 'Água com gás.', 'unidade', 5.00, 10),
    ('Bebidas', 'Água sem gás', 'Água sem gás.', 'unidade', 5.00, 20),
    ('Bebidas', 'Refrigerante', 'Refrigerante.', 'unidade', 7.00, 30),
    ('Bebidas', 'Suco', 'Suco.', 'copo', 6.00, 40),
    ('Bebidas', 'Quentão', 'Quentão.', 'copo', 8.00, 50),
    ('Bebidas', 'Cappuccino', 'Cappuccino.', 'copo', 6.00, 60)
)
insert into public.bazar_menu_items (
  event_id,
  category,
  name,
  description,
  unit_label,
  price,
  is_active,
  sort_order
)
select
  ev.id,
  rows.category,
  rows.name,
  rows.description,
  rows.unit_label,
  rows.price,
  true,
  rows.sort_order
from ev, rows
on conflict (event_id, category, name) do update set
  description = excluded.description,
  unit_label = excluded.unit_label,
  price = excluded.price,
  is_active = true,
  sort_order = excluded.sort_order,
  updated_at = now();

commit;

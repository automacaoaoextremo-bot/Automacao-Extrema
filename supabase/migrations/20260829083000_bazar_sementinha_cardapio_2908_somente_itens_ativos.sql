-- Automação Extrema — Bazar Sementinha
-- Cardápio oficial do evento de 29/08/2026.
--
-- Objetivos:
-- 1) preservar integralmente o cardápio histórico de 04/07/2026;
-- 2) inativar, SOMENTE em 29/08/2026, itens herdados do evento anterior;
-- 3) garantir como ativos apenas os oito itens/preços oficiais da arte de 29/08/2026.
--
-- Não apaga pedidos, pagamentos, clientes ou itens históricos.

begin;

-- Primeiro inativa todo o cardápio atualmente vinculado a 29/08.
-- O evento de 04/07 NÃO é alterado.
with target_event as (
  select id
  from public.bazar_events
  where slug = 'bazar-sementinha-2026-08-29'
  limit 1
)
update public.bazar_menu_items item
set is_active = false,
    updated_at = now()
from target_event
where item.event_id = target_event.id;

-- Reativa/atualiza os itens oficiais quando já existirem.
with target_event as (
  select id
  from public.bazar_events
  where slug = 'bazar-sementinha-2026-08-29'
  limit 1
),
official_items(category, name, description, unit_label, price, sort_order) as (
  values
    ('Tortas',   'Torta salgada',                       'Torta salgada.',                       'pedaço',  10.00::numeric, 10),
    ('Salgados', 'Salgados Assado/Frito',               'Salgados assados ou fritos.',          'unidade', 10.00::numeric, 20),
    ('Doces',    'Pudim',                               'Pudim.',                                'pedaço',  10.00::numeric, 30),
    ('Doces',    'Bolo',                                'Bolo.',                                 'pedaço',  12.00::numeric, 40),
    ('Doces',    'Morango com chocolate no palito',     'Morango com chocolate no palito.',     'unidade', 12.00::numeric, 50),
    ('Bebidas',  'Refrigerante',                        'Refrigerante.',                         'unidade',  7.00::numeric, 60),
    ('Bebidas',  'Suco',                                'Suco.',                                 'copo',     6.00::numeric, 70),
    ('Bebidas',  'Água com e sem gás',                  'Água com ou sem gás.',                  'unidade',  5.00::numeric, 80)
)
update public.bazar_menu_items item
set description = official.description,
    unit_label = official.unit_label,
    price = official.price,
    is_active = true,
    sort_order = official.sort_order,
    updated_at = now()
from target_event, official_items official
where item.event_id = target_event.id
  and lower(trim(item.category)) = lower(trim(official.category))
  and lower(trim(item.name)) = lower(trim(official.name));

-- Insere os itens oficiais que ainda não existirem no evento.
with target_event as (
  select id
  from public.bazar_events
  where slug = 'bazar-sementinha-2026-08-29'
  limit 1
),
official_items(category, name, description, unit_label, price, sort_order) as (
  values
    ('Tortas',   'Torta salgada',                       'Torta salgada.',                       'pedaço',  10.00::numeric, 10),
    ('Salgados', 'Salgados Assado/Frito',               'Salgados assados ou fritos.',          'unidade', 10.00::numeric, 20),
    ('Doces',    'Pudim',                               'Pudim.',                                'pedaço',  10.00::numeric, 30),
    ('Doces',    'Bolo',                                'Bolo.',                                 'pedaço',  12.00::numeric, 40),
    ('Doces',    'Morango com chocolate no palito',     'Morango com chocolate no palito.',     'unidade', 12.00::numeric, 50),
    ('Bebidas',  'Refrigerante',                        'Refrigerante.',                         'unidade',  7.00::numeric, 60),
    ('Bebidas',  'Suco',                                'Suco.',                                 'copo',     6.00::numeric, 70),
    ('Bebidas',  'Água com e sem gás',                  'Água com ou sem gás.',                  'unidade',  5.00::numeric, 80)
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
  target_event.id,
  official.category,
  official.name,
  official.description,
  official.unit_label,
  official.price,
  true,
  official.sort_order
from target_event
cross join official_items official
where not exists (
  select 1
  from public.bazar_menu_items existing
  where existing.event_id = target_event.id
    and lower(trim(existing.category)) = lower(trim(official.category))
    and lower(trim(existing.name)) = lower(trim(official.name))
);

commit;

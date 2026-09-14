-- Automação Extrema — Bazar Sementinha — Multi-eventos v1
-- Preserva integralmente o bazar de 04/07/2026 e prepara o bazar de 29/08/2026.
-- O evento público passa a ser definido por bazar_events.is_public.
-- Clientes não são copiados: a aplicação pesquisa clientes históricos e reaproveita nome/WhatsApp
-- ao criar o primeiro pedido no novo evento.

begin;

alter table public.bazar_events
  add column if not exists is_public boolean not null default false;

alter table public.bazar_events
  add column if not exists source_event_id uuid references public.bazar_events(id) on delete set null;

create unique index if not exists idx_bazar_events_single_public
  on public.bazar_events ((is_public))
  where is_public = true;

create index if not exists idx_bazar_events_event_date
  on public.bazar_events (event_date desc);

create index if not exists idx_bazar_clients_whatsapp_lookup
  on public.bazar_clients (whatsapp)
  where whatsapp is not null;

-- Garante que o evento fundador existe e fica preservado como histórico.
insert into public.bazar_events (
  client_name,
  name,
  slug,
  event_date,
  status,
  is_public,
  pix_key,
  pix_receiver,
  pix_city,
  notes
)
values (
  'Sementinha do Tucxa',
  'Bazar do Sementinha — 04/07/2026',
  'bazar-sementinha-2026-07-04',
  '2026-07-04',
  'encerrado',
  false,
  '58.392.598/0001-91',
  'SEMENTINHA DO TUCXA',
  'CAMPINAS',
  'Evento fundador preservado para histórico, caixa e prestação de contas.'
)
on conflict (slug) do update set
  name = excluded.name,
  status = 'encerrado',
  updated_at = now();

-- Cria o evento de 29/08/2026. Não sobrescreve configurações já ajustadas se a migration
-- for aplicada em uma base onde o evento já tenha sido criado manualmente.
with source_event as (
  select id
  from public.bazar_events
  where slug = 'bazar-sementinha-2026-07-04'
  limit 1
)
insert into public.bazar_events (
  client_name,
  name,
  slug,
  event_date,
  status,
  is_public,
  source_event_id,
  pix_key,
  pix_receiver,
  pix_city,
  primary_color,
  accent_color,
  notes
)
select
  'Sementinha do Tucxa',
  'Bazar do Sementinha — 29/08/2026',
  'bazar-sementinha-2026-08-29',
  '2026-08-29',
  'ativo',
  false,
  source_event.id,
  '58.392.598/0001-91',
  'SEMENTINHA DO TUCXA',
  'CAMPINAS',
  '#2f7d45',
  '#83a847',
  'Criado a partir do evento de 04/07/2026. Cardápio, categorias e valores inicialmente copiados; pedidos, caixa, despesas e prestação começam zerados.'
from source_event
on conflict (slug) do nothing;

-- Copia valores do evento de 04/07 para 29/08.
with source_event as (
  select id from public.bazar_events where slug = 'bazar-sementinha-2026-07-04'
), target_event as (
  select id from public.bazar_events where slug = 'bazar-sementinha-2026-08-29'
)
insert into public.bazar_price_points (event_id, amount, label, is_active, sort_order)
select target_event.id, source.amount, source.label, source.is_active, source.sort_order
from public.bazar_price_points source
cross join source_event
cross join target_event
where source.event_id = source_event.id
on conflict (event_id, amount) do nothing;

-- Copia categorias do evento de 04/07 para 29/08.
with source_event as (
  select id from public.bazar_events where slug = 'bazar-sementinha-2026-07-04'
), target_event as (
  select id from public.bazar_events where slug = 'bazar-sementinha-2026-08-29'
)
insert into public.bazar_category_nodes (
  event_id,
  path,
  level_1,
  level_2,
  level_3,
  is_active,
  is_required,
  is_visible,
  sort_order
)
select
  target_event.id,
  source.path,
  source.level_1,
  source.level_2,
  source.level_3,
  source.is_active,
  source.is_required,
  source.is_visible,
  source.sort_order
from public.bazar_category_nodes source
cross join source_event
cross join target_event
where source.event_id = source_event.id
on conflict (event_id, path) do nothing;

-- Copia o cardápio do evento de 04/07 para 29/08.
with source_event as (
  select id from public.bazar_events where slug = 'bazar-sementinha-2026-07-04'
), target_event as (
  select id from public.bazar_events where slug = 'bazar-sementinha-2026-08-29'
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
  source.category,
  source.name,
  source.description,
  source.unit_label,
  source.price,
  source.is_active,
  source.sort_order
from public.bazar_menu_items source
cross join source_event
cross join target_event
where source.event_id = source_event.id
on conflict (event_id, category, name) do nothing;

-- Define 29/08 como evento público. O histórico de 04/07 permanece íntegro no banco.
update public.bazar_events
set is_public = false,
    updated_at = now()
where is_public = true;

update public.bazar_events
set is_public = true,
    status = 'ativo',
    updated_at = now()
where slug = 'bazar-sementinha-2026-08-29';

update public.bazar_events
set status = 'encerrado',
    updated_at = now()
where slug = 'bazar-sementinha-2026-07-04';

commit;

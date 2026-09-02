-- Automação Extrema — Bazar Sementinha
-- Receitas extraordinárias + retroclassificação segura de clientes históricos.
--
-- Objetivos:
-- 1) Permitir registrar doações/receitas sem criar venda ou pedido fictício.
-- 2) Atualizar clientes ainda não classificados do Bazar 04/07/2026 quando a mesma pessoa
--    foi identificada como Filho da Corrente / Filho de Fora no Bazar 29/08/2026.
--
-- A retroclassificação só atua em registros de 04/07 cujo is_corrente ainda é NULL.
-- Critérios de correspondência:
--   a) WhatsApp idêntico com pelo menos 10 dígitos; ou
--   b) nome normalizado idêntico e único em ambos os eventos.
-- Assim evitamos inferir classificação em nomes ambíguos.

begin;

create table if not exists public.bazar_extra_revenues (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.bazar_events(id) on delete cascade,
  revenue_type text not null default 'doacao'
    check (revenue_type in ('doacao', 'receita_extra')),
  description text not null default 'Doação',
  source text,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'confirmada'
    check (status in ('confirmada', 'pendente', 'cancelada')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bazar_extra_revenues_event_created
  on public.bazar_extra_revenues (event_id, created_at desc);

create index if not exists idx_bazar_extra_revenues_event_status
  on public.bazar_extra_revenues (event_id, status);

-- Retroclassifica 04/07 usando identificação confirmada em 29/08.
with
source_event as (
  select id
  from public.bazar_events
  where slug = 'bazar-sementinha-2026-07-04'
  limit 1
),
target_event as (
  select id
  from public.bazar_events
  where slug = 'bazar-sementinha-2026-08-29'
  limit 1
),
source_name_counts as (
  select normalized_name, count(*) as qty
  from public.bazar_clients
  where event_id = (select id from source_event)
    and nullif(trim(coalesce(normalized_name, '')), '') is not null
  group by normalized_name
),
target_name_counts as (
  select normalized_name, count(*) as qty
  from public.bazar_clients
  where event_id = (select id from target_event)
    and nullif(trim(coalesce(normalized_name, '')), '') is not null
  group by normalized_name
),
candidates as (
  select
    historical.id as historical_id,
    current.is_corrente,
    current.corrente_identified_at,
    case
      when length(regexp_replace(coalesce(historical.whatsapp, ''), '[^0-9]', '', 'g')) >= 10
       and regexp_replace(coalesce(historical.whatsapp, ''), '[^0-9]', '', 'g')
           = regexp_replace(coalesce(current.whatsapp, ''), '[^0-9]', '', 'g')
      then 1
      else 2
    end as match_rank
  from public.bazar_clients historical
  join public.bazar_clients current
    on current.event_id = (select id from target_event)
   and current.is_corrente is not null
   and (
     (
       length(regexp_replace(coalesce(historical.whatsapp, ''), '[^0-9]', '', 'g')) >= 10
       and regexp_replace(coalesce(historical.whatsapp, ''), '[^0-9]', '', 'g')
           = regexp_replace(coalesce(current.whatsapp, ''), '[^0-9]', '', 'g')
     )
     or
     (
       nullif(trim(coalesce(historical.normalized_name, '')), '') is not null
       and historical.normalized_name = current.normalized_name
       and coalesce(
         (select qty from source_name_counts where normalized_name = historical.normalized_name),
         0
       ) = 1
       and coalesce(
         (select qty from target_name_counts where normalized_name = current.normalized_name),
         0
       ) = 1
     )
   )
  where historical.event_id = (select id from source_event)
    and historical.is_corrente is null
),
chosen as (
  select distinct on (historical_id)
    historical_id,
    is_corrente,
    corrente_identified_at
  from candidates
  order by historical_id, match_rank
)
update public.bazar_clients historical
set
  is_corrente = chosen.is_corrente,
  corrente_identified_at = coalesce(chosen.corrente_identified_at, now()),
  updated_at = now()
from chosen
where historical.id = chosen.historical_id
  and historical.is_corrente is null;

commit;

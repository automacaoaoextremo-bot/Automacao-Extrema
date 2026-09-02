-- Automação Extrema — Bazar Sementinha — Ajustes/Evoluções 02
-- 1) Identificação simples de Filho da Corrente no primeiro pedido de cada evento.
-- 2) Configuração por evento para tornar a identificação obrigatória ou opcional.
-- 3) Suporte a relatórios segmentados sem alterar o histórico financeiro dos eventos anteriores.

begin;

alter table public.bazar_events
  add column if not exists require_corrente_identification boolean not null default false;

alter table public.bazar_clients
  add column if not exists is_corrente boolean;

alter table public.bazar_clients
  add column if not exists corrente_identified_at timestamptz;

create index if not exists idx_bazar_clients_event_is_corrente
  on public.bazar_clients (event_id, is_corrente);

-- Para o bazar de 29/08/2026, a identificação no primeiro pedido começa obrigatória.
-- A Gestão permite mudar para opcional a qualquer momento.
update public.bazar_events
set require_corrente_identification = true,
    updated_at = now()
where slug = 'bazar-sementinha-2026-08-29';

-- O evento histórico de 04/07/2026 permanece sem classificação retroativa.
update public.bazar_events
set require_corrente_identification = false,
    updated_at = now()
where slug = 'bazar-sementinha-2026-07-04';

commit;

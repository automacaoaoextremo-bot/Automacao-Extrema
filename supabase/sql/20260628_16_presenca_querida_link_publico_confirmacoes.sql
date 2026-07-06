-- Presença Querida — link público somente leitura para acompanhamento das confirmações.
-- Execute depois dos SQLs anteriores do Presença Querida.

create extension if not exists "pgcrypto";

alter table public.pq_events
  add column if not exists public_confirmation_token uuid,
  add column if not exists public_confirmation_enabled boolean not null default true;

update public.pq_events
set public_confirmation_token = gen_random_uuid()
where public_confirmation_token is null;

alter table public.pq_events
  alter column public_confirmation_token set default gen_random_uuid(),
  alter column public_confirmation_token set not null;

create unique index if not exists idx_pq_events_public_confirmation_token
  on public.pq_events(public_confirmation_token);

update public.pq_events
set public_confirmation_enabled = true
where slug in ('daniela-50-anos', 'daniela-50-anos-demo')
  and public_confirmation_enabled is distinct from true;

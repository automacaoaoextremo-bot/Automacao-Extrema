-- TUCXA Agenda Viva / Calendario anual - Evolucao 02.
-- Mantem os registros, status e RLS existentes de 2027.
-- O nome da tabela *_2027 e conservado por compatibilidade com o aplicativo.
-- Nao aprova, reclassifica ou publica eventos e nao altera Agenda Viva 2026.
-- Execute primeiro em um Supabase de homologacao.

begin;

do $$
begin
  if to_regclass('public.tucxa_annual_events_2027') is null then
    raise exception 'Tabela tucxa_annual_events_2027 nao encontrada. Aplique antes a migration V1.';
  end if;
end $$;

alter table public.tucxa_annual_events_2027
  drop constraint if exists tucxa_annual_events_2027_event_date_check;
alter table public.tucxa_annual_events_2027
  drop constraint if exists tucxa_annual_events_2027_end_date_check;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.tucxa_annual_events_2027'::regclass
      and conname = 'tucxa_annual_events_multiyear_date_check'
  ) then
    alter table public.tucxa_annual_events_2027
      add constraint tucxa_annual_events_multiyear_date_check
      check (event_date >= date '2027-01-01'
        and event_date <= date '2100-12-31');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.tucxa_annual_events_2027'::regclass
      and conname = 'tucxa_annual_events_multiyear_end_date_check'
  ) then
    alter table public.tucxa_annual_events_2027
      add constraint tucxa_annual_events_multiyear_end_date_check
      check (end_date is null or (
        end_date >= event_date
        and end_date <= make_date(extract(year from event_date)::integer, 12, 31)
      ));
  end if;
end $$;

commit;

-- SQL de conferencia, somente leitura (executar SEPARADAMENTE depois da migration):
-- select extract(year from event_date)::int as ano, status, is_public, count(*) as total
-- from public.tucxa_annual_events_2027
-- group by 1, 2, 3 order by 1, 2, 3;

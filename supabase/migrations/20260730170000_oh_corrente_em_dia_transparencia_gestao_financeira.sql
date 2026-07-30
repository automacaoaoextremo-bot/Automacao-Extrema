-- Corrente em Dia v3
-- Transparência em tempo real, controle explícito do popup e Gestão Financeira.
-- Mantém os campos legados para compatibilidade e acrescenta o novo modelo.

alter table public.oh_financial_settings
  add column if not exists public_popup_auto_open boolean not null default true;

alter table public.oh_financial_settings
  alter column public_headline set default 'Fortalecendo a confiança';

alter table public.oh_financial_settings
  alter column public_message set default 'Acompanhe os recursos do último mês finalizado e a previsão do mês atual, com clareza sobre receitas, despesas, resultado e saldo.';

update public.oh_financial_settings
set
  public_headline = case
    when public_headline is null
      or btrim(public_headline) = ''
      or public_headline = 'Transparência fortalece a confiança.'
    then 'Fortalecendo a confiança'
    else public_headline
  end,
  public_message = case
    when public_message is null
      or btrim(public_message) = ''
      or public_message ilike '%Nenhum nome ou valor individual é exibido%'
    then 'Acompanhe os recursos do último mês finalizado e a previsão do mês atual, com clareza sobre receitas, despesas, resultado e saldo.'
    else public_message
  end,
  public_show_simulator = false,
  public_show_provisional_data = false,
  updated_at = now();

alter table public.oh_financial_periods
  add column if not exists workflow_status text,
  add column if not exists data_nature text,
  add column if not exists finalized_at timestamptz,
  add column if not exists reopened_at timestamptz;

update public.oh_financial_periods
set workflow_status = case
  when workflow_status is not null then workflow_status
  when status in ('confirmado', 'fechado') then 'finalizado'
  when status = 'em_revisao' then 'em_revisao'
  when competence_month = date_trunc('month', current_date)::date then 'em_andamento'
  else 'rascunho'
end;

update public.oh_financial_periods
set data_nature = case
  when data_nature is not null then data_nature
  when status = 'provisorio' or needs_update then 'estimado'
  else 'realizado'
end;

update public.oh_financial_periods
set finalized_at = coalesce(finalized_at, approved_at, updated_at)
where workflow_status = 'finalizado';

alter table public.oh_financial_periods
  alter column workflow_status set default 'rascunho',
  alter column workflow_status set not null,
  alter column data_nature set default 'realizado',
  alter column data_nature set not null;

alter table public.oh_financial_periods
  drop constraint if exists oh_financial_periods_workflow_status_check;

alter table public.oh_financial_periods
  add constraint oh_financial_periods_workflow_status_check
  check (workflow_status in ('rascunho','em_andamento','em_revisao','finalizado','reaberto'));

alter table public.oh_financial_periods
  drop constraint if exists oh_financial_periods_data_nature_check;

alter table public.oh_financial_periods
  add constraint oh_financial_periods_data_nature_check
  check (data_nature in ('realizado','estimado'));

alter table public.oh_financial_entries
  add column if not exists workflow_status text,
  add column if not exists data_nature text,
  add column if not exists due_date date,
  add column if not exists financial_date date,
  add column if not exists financial_month date;

update public.oh_financial_entries
set workflow_status = case
  when workflow_status is not null then workflow_status
  when status = 'confirmado' then 'finalizado'
  when status = 'em_revisao' then 'em_revisao'
  when competence_month = date_trunc('month', current_date)::date then 'em_andamento'
  else 'rascunho'
end;

update public.oh_financial_entries
set data_nature = case
  when data_nature is not null then data_nature
  when status = 'provisorio' or is_provisional or needs_update then 'estimado'
  else 'realizado'
end;

update public.oh_financial_entries
set
  due_date = coalesce(due_date, entry_date),
  financial_date = coalesce(financial_date, entry_date),
  financial_month = coalesce(
    financial_month,
    date_trunc('month', coalesce(financial_date, entry_date))::date
  );

alter table public.oh_financial_entries
  alter column workflow_status set default 'rascunho',
  alter column workflow_status set not null,
  alter column data_nature set default 'realizado',
  alter column data_nature set not null;

alter table public.oh_financial_entries
  drop constraint if exists oh_financial_entries_workflow_status_check;

alter table public.oh_financial_entries
  add constraint oh_financial_entries_workflow_status_check
  check (workflow_status in ('rascunho','em_andamento','em_revisao','finalizado','reaberto'));

alter table public.oh_financial_entries
  drop constraint if exists oh_financial_entries_data_nature_check;

alter table public.oh_financial_entries
  add constraint oh_financial_entries_data_nature_check
  check (data_nature in ('realizado','estimado'));

create index if not exists idx_oh_fin_entries_org_financial_month
  on public.oh_financial_entries (
    organization_id,
    financial_month,
    entry_type,
    workflow_status,
    data_nature
  )
  where status <> 'cancelado';

create index if not exists idx_oh_fin_periods_org_workflow
  on public.oh_financial_periods (
    organization_id,
    workflow_status,
    competence_month desc
  );

comment on column public.oh_financial_periods.workflow_status is
  'Fluxo da competência: rascunho, em_andamento, em_revisao, finalizado ou reaberto.';

comment on column public.oh_financial_periods.data_nature is
  'Natureza predominante da competência: realizado ou estimado.';

comment on column public.oh_financial_entries.competence_month is
  'Mês ao qual a receita ou despesa pertence contabilmente.';

comment on column public.oh_financial_entries.due_date is
  'Data prevista de vencimento ou recebimento.';

comment on column public.oh_financial_entries.financial_date is
  'Data em que o valor efetivamente movimentou o caixa ou banco.';

comment on column public.oh_financial_entries.financial_month is
  'Mês financeiro usado na visão de fluxo de caixa e transparência.';

comment on column public.oh_financial_entries.data_nature is
  'Indica se o valor é realizado ou estimado.';

-- Corrente em Dia v3
-- Visão detalhada mobile, estimativas de 2026 pela média dos meses
-- finalizados e jornada pública de contribuição com comprovante privado.
--
-- Dependências:
--   20260729180000_oh_corrente_em_dia_v3_financeiro.sql
--   20260729213000_oh_corrente_em_dia_balancetes_detalhados.sql
--   20260730170000_oh_corrente_em_dia_transparencia_gestao_financeira.sql

alter table public.oh_financial_documents
  add column if not exists contribution_id uuid
  references public.oh_contributions(id) on delete set null;

create index if not exists idx_oh_financial_documents_contribution
  on public.oh_financial_documents (
    organization_id,
    contribution_id,
    created_at desc
  )
  where contribution_id is not null;

comment on column public.oh_financial_documents.contribution_id is
  'Contribuição vinculada ao comprovante enviado pelo fluxo público ou identificado.';

do $$
declare
  org_id uuid;
begin
  select id
    into org_id
  from public.oh_organizations
  where slug = 'tucxa'
     or name ilike '%tucxa%'
  order by created_at asc
  limit 1;

  if org_id is null then
    raise notice 'Organização Tucxa não localizada para atualizar as configurações públicas.';
    return;
  end if;

  insert into public.oh_module_settings (
    organization_id,
    module_slug,
    enabled,
    settings,
    updated_at
  )
  values (
    org_id,
    'corrente-em-dia',
    true,
    jsonb_build_object(
      'suggestedAmounts', jsonb_build_array(25, 50, 75, 100, 150),
      'publicContributionHeadline',
        'Um valor possível hoje ajuda a manter muitos cuidados de pé.',
      'publicContributionMessage',
        'Sua contribuição continua na água, na energia, na limpeza, na segurança e nos materiais que acolhem cada trabalho. Escolha uma forma simples e participe desse cuidado com liberdade, sigilo e transparência.',
      'receptionPaymentMessage',
        'Para cartão de crédito, débito ou dinheiro, registre sua intenção e fale com uma pessoa da Recepção.'
    ),
    now()
  )
  on conflict (organization_id, module_slug)
  do update set
    enabled = true,
    settings = coalesce(public.oh_module_settings.settings, '{}'::jsonb)
      || excluded.settings,
    updated_at = now();
end $$;

do $$
declare
  org_id uuid;
  finalized_count integer;
  average_closing_balance numeric(14,2);
  average_revenues numeric(14,2);
  average_expenses numeric(14,2);
  average_result numeric(14,2);
  average_opening_balance numeric(14,2);
  target_month date;
  target_period_id uuid;
  target_workflow text;
  category_average record;
begin
  select id
    into org_id
  from public.oh_organizations
  where slug = 'tucxa'
     or name ilike '%tucxa%'
  order by created_at asc
  limit 1;

  if org_id is null then
    raise notice 'Organização Tucxa não localizada para calcular as médias de 2026.';
    return;
  end if;

  select count(*)
    into finalized_count
  from public.oh_financial_periods period
  where period.organization_id = org_id
    and (
      period.workflow_status = 'finalizado'
      or (
        period.workflow_status is null
        and period.status in ('confirmado', 'fechado')
      )
    )
    and period.competence_month < '2026-01-01'::date;

  if finalized_count = 0 then
    raise notice 'Nenhum mês finalizado anterior a 2026 foi localizado. As estimativas não foram alteradas.';
    return;
  end if;

  select round(avg(period.closing_balance)::numeric, 2)
    into average_closing_balance
  from public.oh_financial_periods period
  where period.organization_id = org_id
    and (
      period.workflow_status = 'finalizado'
      or (
        period.workflow_status is null
        and period.status in ('confirmado', 'fechado')
      )
    )
    and period.competence_month < '2026-01-01'::date
    and period.closing_balance is not null;

  select
    round(
      coalesce(
        sum(case when entry.entry_type = 'receita' then entry.amount else 0 end),
        0
      ) / finalized_count,
      2
    ),
    round(
      coalesce(
        sum(case when entry.entry_type = 'despesa' then entry.amount else 0 end),
        0
      ) / finalized_count,
      2
    )
    into average_revenues, average_expenses
  from public.oh_financial_entries entry
  join public.oh_financial_periods period
    on period.id = entry.period_id
   and period.organization_id = entry.organization_id
  where entry.organization_id = org_id
    and entry.status <> 'cancelado'
    and coalesce(entry.data_nature, 'realizado') = 'realizado'
    and (
      period.workflow_status = 'finalizado'
      or (
        period.workflow_status is null
        and period.status in ('confirmado', 'fechado')
      )
    )
    and period.competence_month < '2026-01-01'::date;

  average_revenues := coalesce(average_revenues, 0);
  average_expenses := coalesce(average_expenses, 0);
  average_result := round(average_revenues - average_expenses, 2);
  average_closing_balance := coalesce(average_closing_balance, 0);
  average_opening_balance :=
    round(average_closing_balance - average_result, 2);

  -- Cancela somente as estimativas automáticas anteriores. Lançamentos
  -- manuais, realizados ou meses já finalizados são preservados.
  update public.oh_financial_entries entry
  set
    status = 'cancelado',
    workflow_status = case
      when entry.workflow_status = 'finalizado' then entry.workflow_status
      else 'rascunho'
    end,
    notes_internal = concat_ws(
      E'\n',
      entry.notes_internal,
      'Estimativa automática substituída pela média dos meses finalizados.'
    ),
    updated_at = now()
  where entry.organization_id = org_id
    and entry.competence_month between
      '2026-01-01'::date
      and least(
        date_trunc('month', current_date)::date,
        '2026-12-01'::date
      )
    and (
      entry.source_type in (
        'balancete_provisorio',
        'media_meses_finalizados'
      )
      or entry.metadata ->> 'replicatedFrom' = '2025-12'
    )
    and exists (
      select 1
      from public.oh_financial_periods period
      where period.id = entry.period_id
        and coalesce(period.workflow_status, '') <> 'finalizado'
    );

  for target_month in
    select month_value::date
    from generate_series(
      '2026-01-01'::date,
      least(
        date_trunc('month', current_date)::date,
        '2026-12-01'::date
      ),
      interval '1 month'
    ) as generated(month_value)
  loop
    target_period_id := null;

    target_workflow := case
      when target_month = date_trunc('month', current_date)::date
        then 'em_andamento'
      else 'rascunho'
    end;

    insert into public.oh_financial_periods (
      organization_id,
      competence_month,
      status,
      workflow_status,
      data_nature,
      opening_balance,
      closing_balance,
      needs_update,
      source_label,
      notes,
      approved_by,
      approved_at,
      finalized_at,
      reopened_at,
      updated_at
    )
    values (
      org_id,
      target_month,
      'provisorio',
      target_workflow,
      'estimado',
      average_opening_balance,
      average_closing_balance,
      true,
      concat(
        'Estimativa pela média de ',
        finalized_count,
        ' meses finalizados'
      ),
      concat(
        'Receitas, despesas, resultado e saldo estimados pela média dos ',
        finalized_count,
        ' meses finalizados anteriores a 2026. Substituir pelos valores realizados.'
      ),
      null,
      null,
      null,
      null,
      now()
    )
    on conflict (organization_id, competence_month)
    do update set
      status = excluded.status,
      workflow_status = excluded.workflow_status,
      data_nature = excluded.data_nature,
      opening_balance = excluded.opening_balance,
      closing_balance = excluded.closing_balance,
      needs_update = true,
      source_label = excluded.source_label,
      notes = excluded.notes,
      approved_by = null,
      approved_at = null,
      finalized_at = null,
      updated_at = now()
    where public.oh_financial_periods.workflow_status <> 'finalizado'
    returning id into target_period_id;

    if target_period_id is null then
      select id
        into target_period_id
      from public.oh_financial_periods
      where organization_id = org_id
        and competence_month = target_month
        and workflow_status <> 'finalizado'
      limit 1;
    end if;

    if target_period_id is null then
      continue;
    end if;

    for category_average in
      select
        entry.entry_type,
        entry.category_id,
        max(entry.description_internal) as description_internal,
        max(
          coalesce(
            entry.description_public,
            category.public_name,
            category.name
          )
        ) as description_public,
        round(sum(entry.amount) / finalized_count, 2) as average_amount
      from public.oh_financial_entries entry
      join public.oh_financial_periods period
        on period.id = entry.period_id
       and period.organization_id = entry.organization_id
      left join public.oh_financial_categories category
        on category.id = entry.category_id
      where entry.organization_id = org_id
        and entry.category_id is not null
        and entry.status <> 'cancelado'
        and coalesce(entry.data_nature, 'realizado') = 'realizado'
        and (
          period.workflow_status = 'finalizado'
          or (
            period.workflow_status is null
            and period.status in ('confirmado', 'fechado')
          )
        )
        and period.competence_month < '2026-01-01'::date
      group by entry.entry_type, entry.category_id
      having round(sum(entry.amount) / finalized_count, 2) > 0
    loop
      insert into public.oh_financial_entries (
        organization_id,
        period_id,
        category_id,
        entry_type,
        entry_date,
        competence_month,
        due_date,
        financial_date,
        financial_month,
        description_internal,
        description_public,
        amount,
        source_type,
        source_reference,
        status,
        workflow_status,
        data_nature,
        is_provisional,
        needs_update,
        public_visible,
        notes_internal,
        metadata,
        approved_by,
        approved_at,
        updated_at
      )
      values (
        org_id,
        target_period_id,
        category_average.category_id,
        category_average.entry_type,
        (
          date_trunc('month', target_month)
          + interval '1 month'
          - interval '1 day'
        )::date,
        target_month,
        (
          date_trunc('month', target_month)
          + interval '1 month'
          - interval '1 day'
        )::date,
        (
          date_trunc('month', target_month)
          + interval '1 month'
          - interval '1 day'
        )::date,
        target_month,
        coalesce(
          category_average.description_internal,
          category_average.description_public,
          'Estimativa pela média dos meses finalizados'
        ),
        coalesce(
          category_average.description_public,
          category_average.description_internal,
          'Estimativa pela média dos meses finalizados'
        ),
        category_average.average_amount,
        'media_meses_finalizados',
        concat(
          'media-finalizados:',
          to_char(target_month, 'YYYY-MM'),
          ':',
          category_average.entry_type,
          ':',
          category_average.category_id
        ),
        'provisorio',
        target_workflow,
        'estimado',
        true,
        true,
        true,
        concat(
          'Valor estimado pela média de ',
          finalized_count,
          ' meses finalizados. Substituir pelo realizado.'
        ),
        jsonb_build_object(
          'averageMethod', 'soma_categoria_dividida_pelos_meses_finalizados',
          'finalizedMonthsCount', finalized_count,
          'estimatedFor', to_char(target_month, 'YYYY-MM'),
          'generatedBy', '20260731150000'
        ),
        null,
        null,
        now()
      )
      on conflict (organization_id, source_type, source_reference)
      do update set
        period_id = excluded.period_id,
        category_id = excluded.category_id,
        entry_type = excluded.entry_type,
        entry_date = excluded.entry_date,
        competence_month = excluded.competence_month,
        due_date = excluded.due_date,
        financial_date = excluded.financial_date,
        financial_month = excluded.financial_month,
        description_internal = excluded.description_internal,
        description_public = excluded.description_public,
        amount = excluded.amount,
        status = excluded.status,
        workflow_status = excluded.workflow_status,
        data_nature = excluded.data_nature,
        is_provisional = true,
        needs_update = true,
        public_visible = true,
        notes_internal = excluded.notes_internal,
        metadata = excluded.metadata,
        approved_by = null,
        approved_at = null,
        updated_at = now();
    end loop;
  end loop;

  insert into public.oh_financial_audit_logs (
    organization_id,
    action,
    entity_type,
    after_data,
    justification
  )
  values (
    org_id,
    'estimativas_2026_recalculadas',
    'oh_financial_periods',
    jsonb_build_object(
      'metodo', 'media_meses_finalizados',
      'mesesFinalizadosConsiderados', finalized_count,
      'receitaMedia', average_revenues,
      'despesaMedia', average_expenses,
      'resultadoMedio', average_result,
      'saldoMedio', average_closing_balance,
      'periodoEstimadoInicial', '2026-01-01',
      'periodoEstimadoFinal',
        least(
          date_trunc('month', current_date)::date,
          '2026-12-01'::date
        )
    ),
    'Substituição dos valores repetidos de dezembro/2025 pela média dos meses finalizados.'
  );
end $$;

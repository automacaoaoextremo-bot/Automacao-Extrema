-- Corrente em Dia v3
-- Contribuição anônima: intenção aguardando comprovante, programação
-- recorrente e chave Pix oficial do Tucxa.
--
-- Dependências:
--   20260729180000_oh_corrente_em_dia_v3_financeiro.sql
--   20260731150000_oh_corrente_em_dia_media_2026_contribuicao_publica.sql

alter table if exists public.oh_contributions
  add column if not exists recurrence_start_date date,
  add column if not exists recurrence_occurrences integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'oh_contributions_recurrence_occurrences_check'
      and conrelid = 'public.oh_contributions'::regclass
  ) then
    alter table public.oh_contributions
      add constraint oh_contributions_recurrence_occurrences_check
      check (
        recurrence_occurrences is null
        or recurrence_occurrences between 2 and 120
      );
  end if;
end $$;

create index if not exists idx_oh_contributions_org_status_created
  on public.oh_contributions (organization_id, status, created_at desc);

create index if not exists idx_oh_contributions_org_recurrence_start
  on public.oh_contributions (
    organization_id,
    recurrence_start_date,
    recurrence_type
  )
  where recurrence_start_date is not null;

comment on column public.oh_contributions.recurrence_start_date is
  'Data informada para a primeira contribuição do Pix recorrente agendado no banco do contribuinte.';

comment on column public.oh_contributions.recurrence_occurrences is
  'Quantidade de contribuições planejadas no agendamento bancário. Não representa cobrança automática pelo sistema.';

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
    raise notice 'Organização Tucxa não localizada para atualizar a contribuição anônima.';
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
      'pixKey', '58.392.598/0001-91',
      'pixReceiverName', 'TUCXA',
      'pixCity', 'CAMPINAS',
      'publicContributionHeadline',
        'Um valor possível hoje ajuda a manter muitos cuidados de pé.',
      'publicContributionMessage',
        'Sua contribuição continua na água, na energia, na limpeza, na segurança e nos materiais que acolhem cada trabalho. Você escolhe como participar e ajuda a Casa a seguir preparada.',
      'anonymousContributionTitle', 'Contribuição Anônima',
      'anonymousContributionStatus', 'aguardando_comprovante',
      'scheduledPixMessage',
        'Quando o cuidado se repete, a Casa consegue planejar seus compromissos com mais segurança. O agendamento permanece sob controle do contribuinte no próprio banco.'
    ),
    now()
  )
  on conflict (organization_id, module_slug)
  do update set
    enabled = true,
    settings = coalesce(public.oh_module_settings.settings, '{}'::jsonb)
      || excluded.settings,
    updated_at = now();

  -- Migra informações de recorrência já registradas somente em metadata.
  update public.oh_contributions contribution
  set
    recurrence_start_date = case
      when contribution.recurrence_start_date is null
       and coalesce(contribution.metadata ->> 'recurrenceStartDate', '')
         ~ '^\d{4}-\d{2}-\d{2}$'
        then (contribution.metadata ->> 'recurrenceStartDate')::date
      else contribution.recurrence_start_date
    end,
    recurrence_occurrences = case
      when contribution.recurrence_occurrences is null
       and coalesce(contribution.metadata ->> 'recurrenceOccurrences', '')
         ~ '^\d+$'
       and (contribution.metadata ->> 'recurrenceOccurrences')::integer
         between 2 and 120
        then (contribution.metadata ->> 'recurrenceOccurrences')::integer
      else contribution.recurrence_occurrences
    end,
    updated_at = now()
  where contribution.organization_id = org_id
    and contribution.recurrence_type = 'pix_agendado';

  -- Intenções públicas por Pix, ainda sem comprovante, passam a aparecer
  -- claramente para a Tesouraria/Financeiro como pendentes de upload.
  update public.oh_contributions contribution
  set
    status = 'aguardando_comprovante',
    metadata = coalesce(contribution.metadata, '{}'::jsonb)
      || jsonb_build_object(
        'confidential', true,
        'awaitingProofSince',
          coalesce(
            contribution.metadata ->> 'awaitingProofSince',
            contribution.created_at::text
          )
      ),
    updated_at = now()
  where contribution.organization_id = org_id
    and contribution.payment_method = 'pix'
    and contribution.proof_url is null
    and contribution.status in (
      'intencao_registrada',
      'aguardando_pagamento'
    )
    and coalesce(
      contribution.metadata ->> 'source',
      ''
    ) = 'site_tucxa_contribuicao_publica';
end $$;

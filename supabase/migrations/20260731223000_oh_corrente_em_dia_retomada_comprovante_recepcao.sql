-- Corrente em Dia v3
-- Retomada segura do comprovante anônimo e atendimento assistido pela Recepção.
--
-- Dependências:
--   20260731150000_oh_corrente_em_dia_media_2026_contribuicao_publica.sql
--   20260731203000_oh_corrente_em_dia_contribuicao_anonima_recorrencia.sql

alter table if exists public.oh_contributions
  add column if not exists public_tracking_code_hash text,
  add column if not exists receipt_resume_token_hash text,
  add column if not exists receipt_resume_created_at timestamptz,
  add column if not exists receipt_resume_expires_at timestamptz,
  add column if not exists receipt_uploaded_at timestamptz;

create unique index if not exists idx_oh_contributions_tracking_code_hash
  on public.oh_contributions (public_tracking_code_hash)
  where public_tracking_code_hash is not null;

create unique index if not exists idx_oh_contributions_resume_token_hash
  on public.oh_contributions (receipt_resume_token_hash)
  where receipt_resume_token_hash is not null;

create index if not exists idx_oh_contributions_resume_pending
  on public.oh_contributions (
    organization_id,
    status,
    receipt_resume_expires_at,
    created_at desc
  )
  where status = 'aguardando_comprovante';

comment on column public.oh_contributions.public_tracking_code_hash is
  'SHA-256 do código aleatório entregue ao contribuinte para retomar o envio do comprovante sem identificação.';

comment on column public.oh_contributions.receipt_resume_token_hash is
  'SHA-256 do token longo utilizado no link público de retomada do comprovante.';

comment on column public.oh_contributions.receipt_resume_expires_at is
  'Prazo do link e do código de retomada. O comprovante permanece pendente para conciliação mesmo após o prazo.';

comment on column public.oh_contributions.receipt_uploaded_at is
  'Data em que o comprovante foi efetivamente recebido pelo fluxo público.';

update public.oh_contributions
set receipt_uploaded_at = coalesce(receipt_uploaded_at, updated_at, created_at)
where proof_url is not null
  and receipt_uploaded_at is null;

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
    raise notice 'Organização Tucxa não localizada para atualizar os textos de contribuição.';
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
      'receptionPaymentMessage',
        'Para cartão de crédito, débito ou dinheiro, registre sua intenção e fale com uma pessoa da Recepção clicando no nome.',
      'scheduledPixMessage',
        'Transforme um gesto possível em tranquilidade para todos os meses. Ao agendar a recorrência no seu banco, você ajuda o Tucxa a planejar água, energia, limpeza, segurança e materiais antes que virem urgência — e mantém a Casa preparada para acolher quando alguém precisar.',
      'receiptRecoveryMessage',
        'Ainda não está com o comprovante? Guarde o código ou copie o link para concluir depois, sem precisar se identificar.',
      'receiptRecoveryDays', 180
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

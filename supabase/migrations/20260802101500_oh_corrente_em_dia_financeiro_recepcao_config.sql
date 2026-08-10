-- Corrente em Dia v3
-- Configuração da Recepção, avisos de contribuição e compatibilidade
-- do fluxo identificado dos Filhos da Corrente.

alter table if exists public.oh_financial_settings
  add column if not exists reception_contact_name text,
  add column if not exists reception_whatsapp text,
  add column if not exists contribution_notification_emails text[]
    not null default array['automacao-ao-extremo@gmail.com'];

update public.oh_financial_settings
set
  reception_contact_name = coalesce(
    nullif(btrim(reception_contact_name), ''),
    'Recepção do Tucxa'
  ),
  contribution_notification_emails = case
    when contribution_notification_emails is null
      or cardinality(contribution_notification_emails) = 0
    then array['automacao-ao-extremo@gmail.com']
    else contribution_notification_emails
  end,
  updated_at = now();

comment on column public.oh_financial_settings.reception_contact_name is
  'Nome exibido no contato para pagamentos assistidos por cartão, débito ou dinheiro.';

comment on column public.oh_financial_settings.reception_whatsapp is
  'WhatsApp configurado pela Tesouraria/Financeiro para concluir pagamentos assistidos.';

comment on column public.oh_financial_settings.contribution_notification_emails is
  'Endereços adicionais que recebem avisos de registro, comprovante e aprovação de contribuições.';

create index if not exists idx_oh_contributions_org_payment_status
  on public.oh_contributions (
    organization_id,
    payment_method,
    status,
    created_at desc
  );

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
    raise notice 'Organização Tucxa não localizada.';
    return;
  end if;

  insert into public.oh_financial_settings (
    organization_id,
    reception_contact_name,
    contribution_notification_emails
  )
  values (
    org_id,
    'Recepção do Tucxa',
    array['automacao-ao-extremo@gmail.com']
  )
  on conflict (organization_id)
  do update set
    reception_contact_name = coalesce(
      nullif(btrim(public.oh_financial_settings.reception_contact_name), ''),
      excluded.reception_contact_name
    ),
    contribution_notification_emails = case
      when public.oh_financial_settings.contribution_notification_emails is null
        or cardinality(public.oh_financial_settings.contribution_notification_emails) = 0
      then excluded.contribution_notification_emails
      else public.oh_financial_settings.contribution_notification_emails
    end,
    updated_at = now();

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
      'identifiedContributionStatus', 'aguardando_comprovante',
      'assistedContributionStatus', 'aguardando_recepcao'
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

notify pgrst, 'reload schema';

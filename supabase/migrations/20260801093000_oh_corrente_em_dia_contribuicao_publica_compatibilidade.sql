-- Corrente em Dia v3
-- Compatibilidade da contribuição pública e correção do erro HTTP 500.
--
-- Migration aditiva e idempotente. Garante em uma única versão todas as
-- colunas utilizadas pelas APIs públicas de contribuição, recorrência,
-- retomada e comprovante.

create extension if not exists pgcrypto;

create table if not exists public.oh_contributions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.oh_organizations(id) on delete cascade,
  person_id uuid references public.oh_people(id) on delete set null,
  contributor_name text,
  contributor_email text,
  contributor_whatsapp text,
  amount numeric(12,2) not null default 0,
  due_date date not null default current_date,
  paid_at timestamptz,
  status text not null default 'aguardando_pagamento',
  payment_method text,
  proof_url text,
  notes text,
  contribution_kind text not null default 'mensal',
  is_anonymous boolean not null default false,
  recurrence_type text not null default 'pontual',
  preferred_due_day integer,
  recurrence_start_date date,
  recurrence_occurrences integer,
  public_identification_mode text not null default 'sigiloso',
  public_tracking_code_hash text,
  receipt_resume_token_hash text,
  receipt_resume_created_at timestamptz,
  receipt_resume_expires_at timestamptz,
  receipt_uploaded_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.oh_contributions
  add column if not exists contributor_email text,
  add column if not exists contributor_whatsapp text,
  add column if not exists contribution_kind text not null default 'mensal',
  add column if not exists is_anonymous boolean not null default false,
  add column if not exists recurrence_type text not null default 'pontual',
  add column if not exists preferred_due_day integer,
  add column if not exists recurrence_start_date date,
  add column if not exists recurrence_occurrences integer,
  add column if not exists public_identification_mode text not null default 'sigiloso',
  add column if not exists public_tracking_code_hash text,
  add column if not exists receipt_resume_token_hash text,
  add column if not exists receipt_resume_created_at timestamptz,
  add column if not exists receipt_resume_expires_at timestamptz,
  add column if not exists receipt_uploaded_at timestamptz;

alter table if exists public.oh_contributions
  alter column metadata set default '{}'::jsonb;

update public.oh_contributions
set metadata = '{}'::jsonb
where metadata is null;

alter table if exists public.oh_contributions
  alter column metadata set not null;

do $$
begin
  if to_regclass('public.oh_contributions') is not null
     and not exists (
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

create index if not exists idx_oh_contributions_org_person_due
  on public.oh_contributions (
    organization_id,
    person_id,
    due_date,
    status
  );

create index if not exists idx_oh_contributions_org_status_created
  on public.oh_contributions (
    organization_id,
    status,
    created_at desc
  );

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

alter table if exists public.oh_financial_documents
  add column if not exists contribution_id uuid
  references public.oh_contributions(id) on delete set null;

create index if not exists idx_oh_financial_documents_contribution
  on public.oh_financial_documents (
    organization_id,
    contribution_id,
    created_at desc
  )
  where contribution_id is not null;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'oh-financial-documents',
  'oh-financial-documents',
  false,
  15728640,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

update public.oh_contributions
set receipt_uploaded_at = coalesce(
  receipt_uploaded_at,
  updated_at,
  created_at
)
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
    raise notice 'Organização Tucxa não localizada para atualizar a contribuição pública.';
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
      'anonymousContributionStatus', 'aguardando_comprovante',
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

comment on column public.oh_contributions.public_tracking_code_hash is
  'SHA-256 do código aleatório de acompanhamento da contribuição pública.';

comment on column public.oh_contributions.receipt_resume_token_hash is
  'SHA-256 do token público usado para retomar o envio do comprovante.';

comment on column public.oh_contributions.receipt_uploaded_at is
  'Data em que o comprovante foi recebido pelo fluxo público.';

-- Solicita a atualização imediata do cache de esquema do PostgREST.
notify pgrst, 'reload schema';

-- Automação Extrema — Corrente em Dia
-- 04. Condições comerciais e contrato por cliente.
-- Execute no Supabase SQL Editor após os arquivos 01, 02 e 03.
-- Objetivo: permitir que todos os valores, taxas e benefícios sejam editados por cliente.

create extension if not exists "pgcrypto";

create table if not exists public.ced_client_terms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ced_organizations(id) on delete cascade,
  solution_id uuid references public.ae_solutions(id) on delete set null,
  condition_label text not null default 'Cliente Fundador',
  contract_status text not null default 'rascunho' check (contract_status in ('rascunho', 'enviado', 'aceito', 'em_revisao', 'encerrado')),
  fee_status text not null default 'em_definicao' check (fee_status in ('em_definicao', 'aprovada', 'em_revisao')),
  setup_fee numeric(12,2) not null default 0,
  monthly_fee numeric(12,2) not null default 0,
  operational_fee_percentage numeric(5,2),
  federation_percentage numeric(5,2) not null default 0.50,
  ae_percentage numeric(5,2) not null default 1.00,
  partner_percentage numeric(5,2) not null default 1.00,
  unlinked_reserve_percentage numeric(5,2) not null default 0.50,
  pilot_days integer not null default 90,
  founder_benefits text[] not null default array[
    'Implantação R$ 0,00 no período de Cliente Fundador',
    'Mensalidade R$ 0,00 no período de Cliente Fundador',
    'Acompanhamento inicial para cadastrar organização, responsáveis e contribuintes',
    'Prioridade nas melhorias da V1 de arrecadações, Pix, comprovantes e relatórios',
    'Acesso preferencial a evoluções como festas, campanhas e ações de arrecadação',
    'Condição comercial especial a ser validada antes do lançamento oficial'
  ],
  founder_obligations text[] not null default array[
    'Fornecer dados verdadeiros da organização e chave Pix oficial',
    'Autorizar responsáveis que poderão acessar, revisar e aprovar comprovantes',
    'Validar a solução em uso real e enviar feedback prático',
    'Autorizar uso de depoimento ou logo somente se desejar e de forma expressa',
    'Revisar condições comerciais antes da migração para versão paga ou fase futura'
  ],
  allow_testimonial boolean not null default false,
  allow_logo_use boolean not null default false,
  terms_accepted boolean not null default false,
  accepted_by_person_id uuid references public.ced_people(id) on delete set null,
  accepted_at timestamptz,
  lgpd_summary text not null default 'Os dados pessoais são tratados para organização de contribuições, gestão de comprovantes, prestação de contas interna e comunicação operacional. O contribuinte acessa seus próprios dados; a organização acessa dados necessários para gestão conforme consentimento e finalidade.',
  revision_notes text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, condition_label)
);

create index if not exists idx_ced_client_terms_org on public.ced_client_terms(organization_id);
create index if not exists idx_ced_client_terms_status on public.ced_client_terms(contract_status, fee_status);

alter table public.ced_client_terms enable row level security;

do $$
begin
  execute 'drop policy if exists "Authenticated can read ced_client_terms" on public.ced_client_terms';
  execute 'create policy "Authenticated can read ced_client_terms" on public.ced_client_terms for select to authenticated using (true)';
end $$;

do $$
begin
  execute 'drop trigger if exists trg_ced_client_terms_updated_at on public.ced_client_terms';
  execute 'create trigger trg_ced_client_terms_updated_at before update on public.ced_client_terms for each row execute function public.set_updated_at()';
end $$;

-- Sincroniza campos comerciais básicos na assinatura central AE, se as colunas ainda não refletirem a condição do piloto.
update public.ae_client_solution_subscriptions sub
set setup_fee = 0,
    monthly_fee = 0,
    operational_fee_percentage = 2.50,
    notes = coalesce(sub.notes, '') || ' | Condições podem ser editadas por cliente no Corrente em Dia.'
from public.ae_solutions s
where sub.solution_id = s.id
  and s.slug = 'corrente-em-dia';

-- Carga inicial de condições por cliente fictício/demo.
insert into public.ced_client_terms (
  organization_id,
  solution_id,
  condition_label,
  contract_status,
  fee_status,
  setup_fee,
  monthly_fee,
  operational_fee_percentage,
  federation_percentage,
  ae_percentage,
  partner_percentage,
  unlinked_reserve_percentage,
  pilot_days,
  allow_testimonial,
  allow_logo_use,
  notes
)
select
  o.id,
  s.id,
  'Cliente Fundador',
  case when o.slug in ('casa-pai-benedito-das-matas', 'tenda-cabocla-estrela-verde') then 'enviado' else 'rascunho' end,
  'em_definicao',
  0,
  0,
  null,
  0.50,
  1.00,
  1.00,
  0.50,
  90,
  false,
  false,
  'Condição fictícia para ensaio. Todos os valores, taxas e benefícios podem ser alterados por cliente antes do lançamento.'
from public.ced_organizations o
cross join public.ae_solutions s
where s.slug = 'corrente-em-dia'
on conflict (organization_id, condition_label) do update set
  solution_id = excluded.solution_id,
  contract_status = excluded.contract_status,
  fee_status = excluded.fee_status,
  setup_fee = excluded.setup_fee,
  monthly_fee = excluded.monthly_fee,
  operational_fee_percentage = excluded.operational_fee_percentage,
  federation_percentage = excluded.federation_percentage,
  ae_percentage = excluded.ae_percentage,
  partner_percentage = excluded.partner_percentage,
  unlinked_reserve_percentage = excluded.unlinked_reserve_percentage,
  pilot_days = excluded.pilot_days,
  notes = excluded.notes,
  is_active = true;

-- Exemplos opcionais de variação por cliente para testes:
-- 1) Casa com taxa já pré-aprovada.
update public.ced_client_terms t
set fee_status = 'aprovada',
    operational_fee_percentage = 2.50,
    contract_status = 'aceito',
    terms_accepted = true,
    accepted_at = coalesce(accepted_at, now()),
    revision_notes = 'Exemplo fake: condição aceita para testar tela do cliente.'
from public.ced_organizations o
where t.organization_id = o.id
  and o.slug = 'casa-pai-benedito-das-matas';

-- 2) Casa sem vínculo com taxa sugerida maior para testar negociação futura.
update public.ced_client_terms t
set fee_status = 'em_revisao',
    operational_fee_percentage = 3.00,
    revision_notes = 'Exemplo fake: terreiro sem vínculo, percentual em revisão por não haver federação/associação indicadora.'
from public.ced_organizations o
where t.organization_id = o.id
  and o.slug = 'tenda-cabocla-estrela-verde';

-- Vista simples para auditoria comercial por cliente.
create or replace view public.ced_v_client_terms_summary as
select
  o.id as organization_id,
  o.name as organization_name,
  o.slug as organization_slug,
  o.organization_type,
  t.condition_label,
  t.contract_status,
  t.fee_status,
  t.setup_fee,
  t.monthly_fee,
  t.operational_fee_percentage,
  t.federation_percentage,
  t.ae_percentage,
  t.partner_percentage,
  t.unlinked_reserve_percentage,
  t.pilot_days,
  t.allow_testimonial,
  t.allow_logo_use,
  t.terms_accepted,
  t.accepted_at,
  t.is_active
from public.ced_client_terms t
join public.ced_organizations o on o.id = t.organization_id;

-- Após criar usuário no Supabase Auth, este UPDATE é opcional.
-- A área do cliente também consegue localizar pelo e-mail do usuário autenticado.
-- update public.ced_people
-- set auth_user_id = 'COLE_AQUI_O_UUID_DO_AUTH_USER'
-- where email = 'rita.menezes@exemplo.com';

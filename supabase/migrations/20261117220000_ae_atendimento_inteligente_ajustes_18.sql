-- AE Atendimento Inteligente / Reparos RMC - Ajustes 18
-- Migration aditiva; executar apos os Ajustes 16 e 17.
-- Inativar preserva os registros existentes e nao altera historico/orcamentos.
alter table public.ae_ai_rmc_catalog
  add column if not exists is_active boolean not null default true;

create index if not exists ae_ai_rmc_catalog_active_v18
  on public.ae_ai_rmc_catalog(organization_id,kind,is_active);

comment on column public.ae_ai_rmc_catalog.is_active is
  'Situacao do cadastro operacional. false preserva o cadastro para reativacao.';

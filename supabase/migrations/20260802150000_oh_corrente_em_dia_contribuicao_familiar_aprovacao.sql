-- Corrente em Dia v3
-- Solicitação, análise e aprovação da contribuição familiar.

alter table public.oh_family_groups
  add column if not exists requested_amount numeric(12,2),
  add column if not exists approved_amount numeric(12,2),
  add column if not exists submitted_at timestamptz,
  add column if not exists decision_notes text,
  add column if not exists decided_at timestamptz;

comment on column public.oh_family_groups.requested_amount is
  'Valor familiar solicitado pelo Filho da Corrente.';
comment on column public.oh_family_groups.approved_amount is
  'Valor familiar aprovado pelo responsável do Tucxa em Harmonia.';
comment on column public.oh_family_groups.submitted_at is
  'Data em que a composição familiar foi enviada para análise.';
comment on column public.oh_family_groups.decision_notes is
  'Orientação ou justificativa registrada na análise.';
comment on column public.oh_family_groups.decided_at is
  'Data da aprovação ou da não aprovação da solicitação.';

create index if not exists idx_oh_family_groups_pending_review
  on public.oh_family_groups (
    organization_id,
    status,
    submitted_at desc
  );

create index if not exists idx_oh_family_groups_responsible_status
  on public.oh_family_groups (
    organization_id,
    responsible_person_id,
    status,
    created_at desc
  );

-- Mantém grupos ativos anteriores compatíveis com o novo fluxo.
update public.oh_family_groups as family_group
set
  requested_amount = coalesce(
    family_group.requested_amount,
    family_group.approved_amount,
    financial_settings.default_monthly_amount
  ),
  approved_amount = coalesce(
    family_group.approved_amount,
    family_group.requested_amount,
    financial_settings.default_monthly_amount
  ),
  submitted_at = coalesce(family_group.submitted_at, family_group.created_at),
  decided_at = coalesce(
    family_group.decided_at,
    family_group.approved_at,
    family_group.updated_at
  )
from public.oh_financial_settings as financial_settings
where financial_settings.organization_id = family_group.organization_id
  and family_group.status = 'ativo'
  and (
    family_group.requested_amount is null
    or family_group.approved_amount is null
    or family_group.submitted_at is null
    or family_group.decided_at is null
  );

-- Grupos sem configuração financeira recebem apenas as datas conhecidas.
update public.oh_family_groups
set
  submitted_at = coalesce(submitted_at, created_at),
  decided_at = case
    when status = 'ativo' then coalesce(decided_at, approved_at, updated_at)
    else decided_at
  end
where submitted_at is null
   or (status = 'ativo' and decided_at is null);

notify pgrst, 'reload schema';

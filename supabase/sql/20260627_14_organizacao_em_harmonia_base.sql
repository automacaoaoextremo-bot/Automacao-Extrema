-- Automação Extrema — Organização em Harmonia
-- 14. Base compartilhada para Corrente em Dia, Atendimento em Harmonia e Agenda Viva
-- Execute no Supabase SQL Editor após os SQLs do Corrente em Dia.
-- Idempotente: pode rodar novamente sem duplicar soluções ou cadastros base.

create extension if not exists "pgcrypto";

-- =========================================================
-- 1) Catálogo AE: suíte e módulos comerciais
-- =========================================================

create unique index if not exists idx_ae_solutions_slug_unique on public.ae_solutions(slug);

insert into public.ae_solutions (
  name,
  slug,
  short_description,
  target_audience,
  main_pains,
  current_status,
  stage,
  priority,
  source_file,
  is_active
) values
  (
    'Organização em Harmonia',
    'organizacao-em-harmonia',
    'Suíte modular para organizações com base única de pessoas, funções, permissões, agenda, atendimentos e contribuições.',
    'Terreiros, associações, federações, ONGs, grupos voluntários, centros comunitários, escolas livres, coletivos, clubes e instituições com rotina recorrente.',
    'Pessoas cadastradas em vários lugares, permissões pouco claras, calendário disperso, agenda por WhatsApp, atendimentos sem critério único, decisões na memória e retrabalho para diretoria e coordenação.',
    'validacao_com_cliente_fundador',
    'descoberta_e_mvp',
    20,
    'Tucxa-atendimento.pdf; Calendario-Tucxa-2026.jpeg',
    true
  ),
  (
    'Atendimento em Harmonia',
    'atendimento-em-harmonia',
    'Gestão de recepção, agenda, fila, retornos, check-in, capacidade, encaixes e cambonos, preservando o ambiente de atendimento sem eletrônicos.',
    'Terreiros, centros espirituais, instituições assistenciais, clínicas sociais, projetos voluntários e organizações com atendimento presencial/WhatsApp.',
    'Agendamento desigual entre presencial e WhatsApp, retornos sem registro, faltas e encaixes sem regra clara, cambonos/voluntários ausentes, percepção de falta de critério e tensão operacional.',
    'validacao_com_tucxa',
    'descoberta_e_mvp',
    21,
    'Tucxa-atendimento.pdf',
    true
  ),
  (
    'Agenda Viva',
    'agenda-viva',
    'Calendário único com atividades, eventos, recorrências, responsáveis, aprovações, conflitos, férias, grupos, mutirões e comunicação.',
    'Organizações com muitas atividades recorrentes, voluntários, responsáveis, eventos, reuniões, escalas, salas, períodos de férias e necessidade de aprovação.',
    'Calendário em imagem ou planilha sem histórico, alterações sem aprovação, conflitos de sala/responsável, dificuldade de avisar envolvidos e perda da visão anual da organização.',
    'validacao_com_tucxa',
    'descoberta_e_mvp',
    22,
    'Calendario-Tucxa-2026.jpeg',
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  short_description = excluded.short_description,
  target_audience = excluded.target_audience,
  main_pains = excluded.main_pains,
  current_status = excluded.current_status,
  stage = excluded.stage,
  priority = excluded.priority,
  source_file = excluded.source_file,
  is_active = excluded.is_active;

-- =========================================================
-- 2) Base compartilhada Organização em Harmonia
-- Prefixo oh_* para evitar conflito com o Corrente em Dia atual.
-- =========================================================

create table if not exists public.oh_organizations (
  id uuid primary key default gen_random_uuid(),
  ae_client_id uuid references public.ae_clients(id) on delete set null,
  name text not null,
  slug text not null unique,
  organization_type text not null default 'organizacao',
  email text,
  whatsapp text,
  state text,
  city text,
  address text,
  number text,
  complement text,
  zip_code text,
  status text not null default 'em_configuracao',
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.oh_people (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid,
  full_name text not null,
  email text,
  whatsapp text,
  document text,
  status text not null default 'ativo',
  lgpd_contact_consent boolean not null default false,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_oh_people_email_unique on public.oh_people(lower(email)) where email is not null;
create index if not exists idx_oh_people_whatsapp on public.oh_people(whatsapp);

create table if not exists public.oh_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.oh_organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  is_system_role boolean not null default false,
  is_admin_role boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.oh_permissions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  module text not null,
  description text,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.oh_role_permissions (
  role_id uuid not null references public.oh_roles(id) on delete cascade,
  permission_id uuid not null references public.oh_permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table if not exists public.oh_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  person_id uuid not null references public.oh_people(id) on delete cascade,
  role_id uuid references public.oh_roles(id) on delete set null,
  status text not null default 'ativo',
  is_main_contact boolean not null default false,
  can_receive_notifications boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, person_id)
);

create table if not exists public.oh_leads (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'site_organizacao_em_harmonia',
  interest_module text not null default 'organizacao-em-harmonia',
  solution_id uuid references public.ae_solutions(id) on delete set null,
  contact_name text not null,
  email text,
  whatsapp text,
  organization_name text,
  organization_type text,
  observations text,
  status text not null default 'interesse_recebido',
  founder_terms_accepted boolean not null default false,
  testimonial_permission boolean not null default false,
  lgpd_contact_consent boolean not null default false,
  trial_days integer not null default 30,
  email_sent_at timestamptz,
  botconversa_synced_at timestamptz,
  converted_organization_id uuid references public.oh_organizations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_oh_leads_interest_module on public.oh_leads(interest_module);
create index if not exists idx_oh_leads_email on public.oh_leads(lower(email));
create index if not exists idx_oh_leads_whatsapp on public.oh_leads(whatsapp);
create index if not exists idx_oh_leads_status on public.oh_leads(status);
create index if not exists idx_oh_leads_created_at on public.oh_leads(created_at desc);

-- =========================================================
-- 3) Módulo Agenda Viva
-- =========================================================

create table if not exists public.agv_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  title text not null,
  event_type text not null default 'atividade',
  status text not null default 'rascunho',
  starts_at timestamptz,
  ends_at timestamptz,
  recurrence_rule text,
  location text,
  responsible_person_id uuid references public.oh_people(id) on delete set null,
  created_by_person_id uuid references public.oh_people(id) on delete set null,
  approved_by_person_id uuid references public.oh_people(id) on delete set null,
  approved_at timestamptz,
  requires_approval boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agv_events_org_start on public.agv_events(organization_id, starts_at);
create index if not exists idx_agv_events_status on public.agv_events(status);

create table if not exists public.agv_event_approvals (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.agv_events(id) on delete cascade,
  requested_by_person_id uuid references public.oh_people(id) on delete set null,
  approved_by_person_id uuid references public.oh_people(id) on delete set null,
  status text not null default 'pendente',
  decision_notes text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

-- =========================================================
-- 4) Módulo Atendimento em Harmonia
-- =========================================================

create table if not exists public.aeh_service_days (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  title text not null,
  service_date date not null,
  service_type text not null default 'atendimento',
  capacity_total integer,
  status text not null default 'planejado',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, service_date, service_type)
);

create table if not exists public.aeh_attendance_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  service_day_id uuid references public.aeh_service_days(id) on delete set null,
  person_id uuid references public.oh_people(id) on delete set null,
  origin_channel text not null default 'recepcao',
  attendance_type text not null default 'atendimento',
  requested_entity text,
  return_requested boolean not null default false,
  priority_reason text,
  queue_number text,
  checked_in_at timestamptz,
  status text not null default 'solicitado',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_aeh_requests_org_day on public.aeh_attendance_requests(organization_id, service_day_id);
create index if not exists idx_aeh_requests_status on public.aeh_attendance_requests(status);

-- =========================================================
-- 5) Permissões iniciais configuráveis
-- =========================================================

insert into public.oh_permissions (slug, name, module, description, sort_order) values
  ('organizacao.ver', 'Ver organização', 'organizacao-em-harmonia', 'Visualizar dados gerais da organização.', 10),
  ('organizacao.editar', 'Editar organização', 'organizacao-em-harmonia', 'Alterar dados cadastrais, responsáveis e configurações gerais.', 11),
  ('pessoas.gerenciar', 'Gerenciar pessoas', 'organizacao-em-harmonia', 'Cadastrar pessoas, vínculos, funções e status.', 12),
  ('funcoes.gerenciar', 'Gerenciar funções e permissões', 'organizacao-em-harmonia', 'Definir quais telas e opções cada função acessa.', 13),
  ('agenda.ver', 'Ver Agenda Viva', 'agenda-viva', 'Visualizar calendário, atividades e responsáveis.', 20),
  ('agenda.criar', 'Criar atividades', 'agenda-viva', 'Criar eventos, grupos, mutirões, reuniões e atividades recorrentes.', 21),
  ('agenda.aprovar', 'Aprovar atividades', 'agenda-viva', 'Aprovar, reprovar, cancelar ou remanejar atividades.', 22),
  ('atendimento.ver', 'Ver Atendimento em Harmonia', 'atendimento-em-harmonia', 'Visualizar agenda, fila, check-in e status de atendimento.', 30),
  ('atendimento.operar', 'Operar recepção', 'atendimento-em-harmonia', 'Fazer check-in, chamar, atualizar status e registrar encaminhamentos.', 31),
  ('atendimento.aprovar', 'Aprovar encaixes e remanejamentos', 'atendimento-em-harmonia', 'Autorizar encaixes, retornos prioritários e mudanças de fila.', 32),
  ('corrente.ver', 'Ver Corrente em Dia', 'corrente-em-dia', 'Visualizar contribuições e histórico conforme função.', 40),
  ('corrente.aprovar', 'Aprovar comprovantes', 'corrente-em-dia', 'Aprovar, reprovar ou pedir correção de comprovantes.', 41)
on conflict (slug) do update set
  name = excluded.name,
  module = excluded.module,
  description = excluded.description,
  sort_order = excluded.sort_order;

-- =========================================================
-- 6) Trigger updated_at, se a função existir na base
-- =========================================================

do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    execute 'drop trigger if exists trg_oh_organizations_updated_at on public.oh_organizations';
    execute 'create trigger trg_oh_organizations_updated_at before update on public.oh_organizations for each row execute function public.set_updated_at()';
    execute 'drop trigger if exists trg_oh_people_updated_at on public.oh_people';
    execute 'create trigger trg_oh_people_updated_at before update on public.oh_people for each row execute function public.set_updated_at()';
    execute 'drop trigger if exists trg_oh_roles_updated_at on public.oh_roles';
    execute 'create trigger trg_oh_roles_updated_at before update on public.oh_roles for each row execute function public.set_updated_at()';
    execute 'drop trigger if exists trg_oh_memberships_updated_at on public.oh_memberships';
    execute 'create trigger trg_oh_memberships_updated_at before update on public.oh_memberships for each row execute function public.set_updated_at()';
    execute 'drop trigger if exists trg_oh_leads_updated_at on public.oh_leads';
    execute 'create trigger trg_oh_leads_updated_at before update on public.oh_leads for each row execute function public.set_updated_at()';
    execute 'drop trigger if exists trg_agv_events_updated_at on public.agv_events';
    execute 'create trigger trg_agv_events_updated_at before update on public.agv_events for each row execute function public.set_updated_at()';
    execute 'drop trigger if exists trg_aeh_service_days_updated_at on public.aeh_service_days';
    execute 'create trigger trg_aeh_service_days_updated_at before update on public.aeh_service_days for each row execute function public.set_updated_at()';
    execute 'drop trigger if exists trg_aeh_attendance_requests_updated_at on public.aeh_attendance_requests';
    execute 'create trigger trg_aeh_attendance_requests_updated_at before update on public.aeh_attendance_requests for each row execute function public.set_updated_at()';
  end if;
end $$;

-- =========================================================
-- 7) RLS: a aplicação usa SERVICE_ROLE nas rotas server-side.
-- Políticas de leitura autenticada para evolução futura.
-- =========================================================

alter table public.oh_organizations enable row level security;
alter table public.oh_people enable row level security;
alter table public.oh_roles enable row level security;
alter table public.oh_permissions enable row level security;
alter table public.oh_role_permissions enable row level security;
alter table public.oh_memberships enable row level security;
alter table public.oh_leads enable row level security;
alter table public.agv_events enable row level security;
alter table public.agv_event_approvals enable row level security;
alter table public.aeh_service_days enable row level security;
alter table public.aeh_attendance_requests enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'oh_organizations', 'oh_people', 'oh_roles', 'oh_permissions', 'oh_role_permissions', 'oh_memberships', 'oh_leads',
    'agv_events', 'agv_event_approvals', 'aeh_service_days', 'aeh_attendance_requests'
  ] loop
    execute format('drop policy if exists "Authenticated can read %s" on public.%I', t, t);
    execute format('create policy "Authenticated can read %s" on public.%I for select to authenticated using (true)', t, t);
  end loop;
end $$;

-- =========================================================
-- 8) Views para validação inicial
-- =========================================================

create or replace view public.oh_leads_dashboard as
select
  interest_module,
  status,
  count(*) as total,
  max(created_at) as last_lead_at
from public.oh_leads
group by interest_module, status
order by last_lead_at desc;

create or replace view public.oh_permissions_matrix as
select
  module,
  slug,
  name,
  description,
  sort_order
from public.oh_permissions
order by module, sort_order;

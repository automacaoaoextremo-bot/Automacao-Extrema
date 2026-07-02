-- Organização em Harmonia — Base Única + Agenda Viva Tucxa
-- Idempotente: pode rodar mais de uma vez sem apagar dados.
-- Compatível com versões anteriores que criaram oh_permissions com colunas legadas: module, module_slug, slug e permission_key.

create extension if not exists pgcrypto;

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
-- 2) Base Única
-- =========================================================

create table if not exists public.oh_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  organization_type text,
  city text,
  state text,
  whatsapp text,
  email text,
  active boolean not null default true,
  enabled_modules text[] not null default '{}',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.oh_organizations add column if not exists ae_client_id uuid;
alter table public.oh_organizations add column if not exists slug text;
alter table public.oh_organizations add column if not exists organization_type text;
alter table public.oh_organizations add column if not exists city text;
alter table public.oh_organizations add column if not exists state text;
alter table public.oh_organizations add column if not exists whatsapp text;
alter table public.oh_organizations add column if not exists email text;
alter table public.oh_organizations add column if not exists address text;
alter table public.oh_organizations add column if not exists number text;
alter table public.oh_organizations add column if not exists complement text;
alter table public.oh_organizations add column if not exists zip_code text;
alter table public.oh_organizations add column if not exists status text not null default 'em_configuracao';
alter table public.oh_organizations add column if not exists notes text;
alter table public.oh_organizations add column if not exists is_demo boolean not null default false;
alter table public.oh_organizations add column if not exists active boolean not null default true;
alter table public.oh_organizations add column if not exists enabled_modules text[] not null default '{}';
alter table public.oh_organizations add column if not exists settings jsonb not null default '{}'::jsonb;
alter table public.oh_organizations add column if not exists created_at timestamptz not null default now();
alter table public.oh_organizations add column if not exists updated_at timestamptz not null default now();
update public.oh_organizations set slug = lower(regexp_replace(coalesce(slug, name, id::text), '[^a-zA-Z0-9]+', '-', 'g')) where slug is null or btrim(slug) = '';
create unique index if not exists idx_oh_organizations_slug_unique on public.oh_organizations(slug) where slug is not null;

create table if not exists public.oh_people (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.oh_organizations(id) on delete cascade,
  full_name text not null,
  email text,
  whatsapp text,
  document text,
  auth_user_id uuid,
  active boolean not null default true,
  lgpd_consent_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.oh_people add column if not exists organization_id uuid references public.oh_organizations(id) on delete cascade;
alter table public.oh_people add column if not exists full_name text;
update public.oh_people set full_name = coalesce(full_name, email, whatsapp, 'Pessoa sem nome') where full_name is null;
alter table public.oh_people alter column full_name set not null;
alter table public.oh_people add column if not exists email text;
alter table public.oh_people add column if not exists whatsapp text;
alter table public.oh_people add column if not exists document text;
alter table public.oh_people add column if not exists auth_user_id uuid;
alter table public.oh_people add column if not exists active boolean not null default true;
alter table public.oh_people add column if not exists lgpd_consent_at timestamptz;
alter table public.oh_people add column if not exists notes text;
alter table public.oh_people add column if not exists created_at timestamptz not null default now();
alter table public.oh_people add column if not exists updated_at timestamptz not null default now();

create table if not exists public.oh_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.oh_organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  is_system boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.oh_roles add column if not exists organization_id uuid references public.oh_organizations(id) on delete cascade;
alter table public.oh_roles add column if not exists name text;
update public.oh_roles set name = coalesce(name, slug, 'Função sem nome') where name is null;
alter table public.oh_roles alter column name set not null;
alter table public.oh_roles add column if not exists slug text;
update public.oh_roles set slug = lower(regexp_replace(coalesce(slug, name), '[^a-zA-Z0-9]+', '-', 'g')) where slug is null or btrim(slug) = '';
alter table public.oh_roles alter column slug set not null;
alter table public.oh_roles add column if not exists description text;
alter table public.oh_roles add column if not exists is_system boolean not null default false;
alter table public.oh_roles add column if not exists active boolean not null default true;
alter table public.oh_roles add column if not exists created_at timestamptz not null default now();
alter table public.oh_roles add column if not exists updated_at timestamptz not null default now();
create unique index if not exists idx_oh_roles_org_slug_unique on public.oh_roles(organization_id, slug);

create table if not exists public.oh_permissions (
  id uuid primary key default gen_random_uuid(),
  slug text,
  name text not null,
  module text,
  description text,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  module_slug text,
  permission_key text
);

alter table public.oh_permissions add column if not exists module text;
alter table public.oh_permissions add column if not exists module_slug text;
alter table public.oh_permissions add column if not exists permission_key text;
alter table public.oh_permissions add column if not exists slug text;
alter table public.oh_permissions add column if not exists name text;
alter table public.oh_permissions add column if not exists description text;
alter table public.oh_permissions add column if not exists sort_order integer not null default 100;
alter table public.oh_permissions add column if not exists created_at timestamptz not null default now();

update public.oh_permissions set module_slug = coalesce(nullif(btrim(module_slug), ''), nullif(btrim(module), ''), 'base-unica');
update public.oh_permissions set module = coalesce(nullif(btrim(module), ''), module_slug, 'base-unica');
update public.oh_permissions set permission_key = coalesce(nullif(btrim(permission_key), ''), nullif(btrim(slug), ''), id::text);
update public.oh_permissions set slug = lower(regexp_replace(coalesce(nullif(btrim(slug), ''), module_slug || '-' || permission_key, permission_key, id::text), '[^a-zA-Z0-9]+', '-', 'g'));
update public.oh_permissions set name = coalesce(nullif(btrim(name), ''), permission_key, 'Permissão sem nome');

alter table public.oh_permissions alter column module set not null;
alter table public.oh_permissions alter column module_slug set not null;
alter table public.oh_permissions alter column permission_key set not null;
alter table public.oh_permissions alter column slug set not null;
alter table public.oh_permissions alter column name set not null;

create unique index if not exists idx_oh_permissions_module_permission_unique on public.oh_permissions(module_slug, permission_key);

create table if not exists public.oh_role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.oh_roles(id) on delete cascade,
  permission_id uuid not null references public.oh_permissions(id) on delete cascade,
  allowed boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.oh_role_permissions add column if not exists role_id uuid references public.oh_roles(id) on delete cascade;
alter table public.oh_role_permissions add column if not exists permission_id uuid references public.oh_permissions(id) on delete cascade;
alter table public.oh_role_permissions add column if not exists allowed boolean not null default true;
alter table public.oh_role_permissions add column if not exists created_at timestamptz not null default now();
create unique index if not exists idx_oh_role_permissions_role_permission_unique on public.oh_role_permissions(role_id, permission_id);

create table if not exists public.oh_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  person_id uuid not null references public.oh_people(id) on delete cascade,
  role_id uuid references public.oh_roles(id) on delete set null,
  module_slugs text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.oh_memberships add column if not exists organization_id uuid references public.oh_organizations(id) on delete cascade;
alter table public.oh_memberships add column if not exists person_id uuid references public.oh_people(id) on delete cascade;
alter table public.oh_memberships add column if not exists role_id uuid references public.oh_roles(id) on delete set null;
alter table public.oh_memberships add column if not exists module_slugs text[] not null default '{}';
alter table public.oh_memberships add column if not exists active boolean not null default true;
alter table public.oh_memberships add column if not exists status text not null default 'ativo';
alter table public.oh_memberships add column if not exists is_main_contact boolean not null default false;
alter table public.oh_memberships add column if not exists can_receive_notifications boolean not null default true;
alter table public.oh_memberships add column if not exists agenda_viva_profile jsonb not null default '{}'::jsonb;
alter table public.oh_memberships add column if not exists created_at timestamptz not null default now();
alter table public.oh_memberships add column if not exists updated_at timestamptz not null default now();
create unique index if not exists idx_oh_memberships_org_person_role_unique on public.oh_memberships(organization_id, person_id, role_id);

create table if not exists public.oh_module_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  module_slug text not null,
  enabled boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.oh_module_settings add column if not exists organization_id uuid references public.oh_organizations(id) on delete cascade;
alter table public.oh_module_settings add column if not exists module_slug text;
update public.oh_module_settings set module_slug = 'organizacao-em-harmonia' where module_slug is null or btrim(module_slug) = '';
alter table public.oh_module_settings alter column module_slug set not null;
alter table public.oh_module_settings add column if not exists enabled boolean not null default false;
alter table public.oh_module_settings add column if not exists settings jsonb not null default '{}'::jsonb;
alter table public.oh_module_settings add column if not exists created_at timestamptz not null default now();
alter table public.oh_module_settings add column if not exists updated_at timestamptz not null default now();
create unique index if not exists idx_oh_module_settings_org_module_unique on public.oh_module_settings(organization_id, module_slug);


create table if not exists public.oh_audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.oh_organizations(id) on delete set null,
  actor_person_id uuid references public.oh_people(id) on delete set null,
  module_slug text,
  action text not null,
  entity_table text,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.oh_audit_logs add column if not exists organization_id uuid references public.oh_organizations(id) on delete set null;
alter table public.oh_audit_logs add column if not exists actor_person_id uuid references public.oh_people(id) on delete set null;
alter table public.oh_audit_logs add column if not exists module_slug text;
alter table public.oh_audit_logs add column if not exists action text;
update public.oh_audit_logs set action = 'legacy' where action is null;
alter table public.oh_audit_logs alter column action set not null;
alter table public.oh_audit_logs add column if not exists entity_table text;
alter table public.oh_audit_logs add column if not exists entity_id uuid;
alter table public.oh_audit_logs add column if not exists details jsonb not null default '{}'::jsonb;
alter table public.oh_audit_logs add column if not exists created_at timestamptz not null default now();

create table if not exists public.oh_leads (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'site_organizacao_em_harmonia',
  interest_module text not null default 'organizacao-em-harmonia',
  priority_module text not null default 'agenda-viva',
  enabled_modules_requested text[] not null default '{agenda-viva,atendimento-em-harmonia,corrente-em-dia}',
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
  founder_evaluation_days integer not null default 30,
  implantation_due_at timestamptz,
  implantation_completed_at timestamptz,
  training_completed_at timestamptz,
  trial_starts_at timestamptz,
  trial_ends_at timestamptz,
  reminder_hours_before_due integer not null default 48,
  next_reminder_at timestamptz,
  last_reminder_sent_at timestamptz,
  email_sent_at timestamptz,
  botconversa_synced_at timestamptz,
  converted_organization_id uuid references public.oh_organizations(id) on delete set null,
  auth_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.oh_leads add column if not exists priority_module text not null default 'agenda-viva';
alter table public.oh_leads add column if not exists enabled_modules_requested text[] not null default '{agenda-viva,atendimento-em-harmonia,corrente-em-dia}';
alter table public.oh_leads add column if not exists founder_evaluation_days integer not null default 30;
alter table public.oh_leads add column if not exists implantation_due_at timestamptz;
alter table public.oh_leads add column if not exists implantation_completed_at timestamptz;
alter table public.oh_leads add column if not exists training_completed_at timestamptz;
alter table public.oh_leads add column if not exists trial_starts_at timestamptz;
alter table public.oh_leads add column if not exists trial_ends_at timestamptz;
alter table public.oh_leads add column if not exists reminder_hours_before_due integer not null default 48;
alter table public.oh_leads add column if not exists next_reminder_at timestamptz;
alter table public.oh_leads add column if not exists last_reminder_sent_at timestamptz;
alter table public.oh_leads add column if not exists botconversa_synced_at timestamptz;
alter table public.oh_leads add column if not exists converted_organization_id uuid references public.oh_organizations(id) on delete set null;
alter table public.oh_leads add column if not exists auth_user_id uuid;

create table if not exists public.oh_lead_reminders (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.oh_leads(id) on delete cascade,
  reminder_type text not null default 'implantacao_vencendo',
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  channel text not null default 'email',
  recipients text[] not null default '{}',
  status text not null default 'pendente',
  created_at timestamptz not null default now()
);
create index if not exists idx_oh_lead_reminders_pending on public.oh_lead_reminders(status, scheduled_at);

-- =========================================================
-- 3) Agenda Viva
-- =========================================================

create table if not exists public.agv_event_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.oh_organizations(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  requires_approval boolean not null default true,
  default_visibility text not null default 'interno',
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists idx_agv_event_types_org_slug_unique on public.agv_event_types(organization_id, slug);

create table if not exists public.agv_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  title text not null,
  event_type text not null default 'atividade',
  event_type_id uuid references public.agv_event_types(id) on delete set null,
  status text not null default 'rascunho',
  starts_at timestamptz,
  ends_at timestamptz,
  all_day boolean not null default false,
  recurrence_rule text,
  location text,
  group_slug text,
  responsible_person_id uuid references public.oh_people(id) on delete set null,
  created_by_person_id uuid references public.oh_people(id) on delete set null,
  approved_by_person_id uuid references public.oh_people(id) on delete set null,
  approved_at timestamptz,
  requires_approval boolean not null default true,
  conflict_status text not null default 'nao_verificado',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.agv_events add column if not exists event_type_id uuid references public.agv_event_types(id) on delete set null;
alter table public.agv_events add column if not exists all_day boolean not null default false;
alter table public.agv_events add column if not exists group_slug text;
alter table public.agv_events add column if not exists conflict_status text not null default 'nao_verificado';
alter table public.agv_events add column if not exists metadata jsonb not null default '{}'::jsonb;
create index if not exists idx_agv_events_org_start on public.agv_events(organization_id, starts_at);
create index if not exists idx_agv_events_status on public.agv_events(status);
create index if not exists idx_agv_events_type on public.agv_events(event_type);

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
create index if not exists idx_agv_event_approvals_status on public.agv_event_approvals(status, created_at);

-- =========================================================
-- 4) Atendimento em Harmonia — base futura compartilhada
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

-- =========================================================
-- 5) Seeds: permissões, Tucxa e Agenda Viva
-- =========================================================

insert into public.oh_permissions (module, module_slug, permission_key, slug, name, description, sort_order)
values
  ('base-unica', 'base-unica', 'people.view', 'base-unica-people-view', 'Ver pessoas', 'Permite visualizar pessoas cadastradas na Base Única.', 100),
  ('base-unica', 'base-unica', 'people.manage', 'base-unica-people-manage', 'Gerenciar pessoas', 'Permite criar, editar, ativar e inativar pessoas.', 110),
  ('base-unica', 'base-unica', 'roles.manage', 'base-unica-roles-manage', 'Gerenciar funções', 'Permite criar funções e configurar permissões.', 120),
  ('base-unica', 'base-unica', 'modules.manage', 'base-unica-modules-manage', 'Gerenciar módulos', 'Permite habilitar ou desabilitar módulos da organização.', 130),
  ('corrente-em-dia', 'corrente-em-dia', 'contributions.view', 'corrente-em-dia-contributions-view', 'Ver contribuições', 'Permite visualizar contribuições e status.', 200),
  ('corrente-em-dia', 'corrente-em-dia', 'proofs.approve', 'corrente-em-dia-proofs-approve', 'Aprovar comprovantes', 'Permite aprovar, reprovar ou pedir correção de comprovantes.', 210),
  ('atendimento-em-harmonia', 'atendimento-em-harmonia', 'attendance.view', 'atendimento-em-harmonia-attendance-view', 'Ver atendimentos', 'Permite visualizar agenda e fila de atendimento.', 300),
  ('atendimento-em-harmonia', 'atendimento-em-harmonia', 'attendance.manage', 'atendimento-em-harmonia-attendance-manage', 'Gerenciar atendimentos', 'Permite criar, remanejar, concluir e cancelar atendimentos.', 310),
  ('agenda-viva', 'agenda-viva', 'events.view', 'agenda-viva-events-view', 'Ver agenda', 'Permite visualizar atividades e calendário.', 400),
  ('agenda-viva', 'agenda-viva', 'events.manage', 'agenda-viva-events-manage', 'Gerenciar agenda', 'Permite criar e alterar atividades.', 410),
  ('agenda-viva', 'agenda-viva', 'events.approve', 'agenda-viva-events-approve', 'Aprovar agenda', 'Permite aprovar inclusão, alteração ou cancelamento de atividades.', 420)
on conflict (module_slug, permission_key) do update set
  module = excluded.module,
  slug = excluded.slug,
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;

insert into public.oh_organizations (
  name,
  slug,
  organization_type,
  city,
  state,
  active,
  enabled_modules,
  status,
  is_demo,
  settings,
  notes
) values (
  'Templo de Umbanda Caboclo Sete Flexa - TUCXA',
  'tucxa',
  'terreiro',
  'Campinas',
  'SP',
  true,
  '{agenda-viva,atendimento-em-harmonia,corrente-em-dia}',
  'cliente_fundador_em_configuracao',
  false,
  '{"cliente_fundador":true,"primeiro_modulo":"agenda-viva","implantacao_assistida_dias":30,"avaliacao_dias":30}'::jsonb,
  'Cliente Fundador da suíte Organização em Harmonia. Validação inicial recomendada pelo módulo Agenda Viva.'
)
on conflict (slug) do update set
  name = excluded.name,
  organization_type = excluded.organization_type,
  city = excluded.city,
  state = excluded.state,
  active = excluded.active,
  enabled_modules = excluded.enabled_modules,
  status = excluded.status,
  is_demo = excluded.is_demo,
  settings = excluded.settings,
  notes = excluded.notes,
  updated_at = now();

with tucxa as (
  select id from public.oh_organizations where slug = 'tucxa'
), roles as (
  select * from (values
    ('presidente', 'Presidente', 'Aprova decisões estratégicas e alterações críticas.'),
    ('diretoria', 'Diretoria', 'Acompanha e aprova eventos, regras e calendário.'),
    ('coordenacao', 'Coordenação', 'Acompanha trabalhos, alterações e exceções operacionais.'),
    ('organizacao', 'Organização', 'Opera cadastros, agenda, eventos e comunicação.'),
    ('cambono', 'Cambono', 'Apoia trabalhos, orientações, anotações e encaminhamentos.'),
    ('cavalinho', 'Cavalinho', 'Filho da corrente com atuação nos trabalhos.'),
    ('tesouraria', 'Tesouraria', 'Acompanha contribuições, comprovantes e prestação de contas.'),
    ('recepcao', 'Recepção', 'Opera check-in, fila, fichas e orientações iniciais.'),
    ('consulente', 'Consulente', 'Pessoa atendida pela organização.'),
    ('administrador', 'Administrador do sistema', 'Configura módulos, funções, permissões e integrações.')
  ) as r(slug, name, description)
)
insert into public.oh_roles (organization_id, slug, name, description, is_system, active)
select tucxa.id, roles.slug, roles.name, roles.description, true, true
from tucxa cross join roles
on conflict (organization_id, slug) do update set
  name = excluded.name,
  description = excluded.description,
  is_system = excluded.is_system,
  active = excluded.active,
  updated_at = now();

with tucxa as (
  select id from public.oh_organizations where slug = 'tucxa'
), modules as (
  select * from (values
    ('agenda-viva', true, '{"prioridade":"primeiro_modulo","status":"em_configuracao"}'::jsonb),
    ('atendimento-em-harmonia', true, '{"prioridade":"segundo_modulo","status":"planejado"}'::jsonb),
    ('corrente-em-dia', true, '{"prioridade":"terceiro_modulo","status":"planejado"}'::jsonb)
  ) as m(module_slug, enabled, settings)
)
insert into public.oh_module_settings (organization_id, module_slug, enabled, settings)
select tucxa.id, modules.module_slug, modules.enabled, modules.settings
from tucxa cross join modules
on conflict (organization_id, module_slug) do update set
  enabled = excluded.enabled,
  settings = excluded.settings,
  updated_at = now();

with tucxa as (
  select id from public.oh_organizations where slug = 'tucxa'
), types as (
  select * from (values
    ('atendimento-filhos-de-fora', 'Atendimento filhos de fora', 'Segundas e terças conforme calendário anual.', true, 10),
    ('atendimento-filhos-da-corrente', 'Atendimento filhos da corrente', 'Quintas-feiras para filhos da corrente, grupos I e II.', true, 20),
    ('tratamento-espiritual-transformacao', 'Tratamento espiritual / transformação', 'Quartas-feiras para encaminhados e agendados pela coordenação.', true, 30),
    ('grupo-segunda-feira', 'Grupo segunda-feira', 'Grupo recorrente de segunda-feira.', false, 40),
    ('grupo-terca-feira', 'Grupo terça-feira', 'Grupo recorrente de terça-feira.', false, 50),
    ('grupo-1', 'Grupo 1', '1ª e 3ª quinta-feira do mês.', false, 60),
    ('grupo-2', 'Grupo 2', '2ª e 4ª quinta-feira do mês.', false, 70),
    ('mutirao-limpeza', 'Mutirão de limpeza', 'Atividade de organização e cuidado com a casa.', true, 80),
    ('ferias', 'Férias', 'Período sem atividades regulares ou com operação reduzida.', true, 90),
    ('encerramento', 'Encerramento', 'Encerramento anual ou de ciclo.', true, 100),
    ('clube-livro', 'Clube do Livro', 'Encontro de leitura e estudo.', true, 110),
    ('grupo-estudos', 'Grupo de Estudos', 'Estudos e formação.', true, 120),
    ('bazar', 'Bazar', 'Evento beneficente de arrecadação.', true, 130),
    ('bingo', 'Bingo', 'Evento beneficente de arrecadação.', true, 140),
    ('venda-pizzas', 'Venda de pizzas', 'Campanha de arrecadação.', true, 150),
    ('acao-beneficente', 'Ação beneficente', 'Ação social ou campanha.', true, 160),
    ('feijoada', 'Feijoada', 'Evento de confraternização/arrecadação.', true, 170),
    ('festa-junina', 'Festa Junina', 'Evento de confraternização/arrecadação.', true, 180),
    ('rifa', 'Rifa', 'Campanha de arrecadação.', true, 190),
    ('vaquinha', 'Vaquinha', 'Campanha de arrecadação.', true, 200),
    ('reuniao-diretoria', 'Reunião de diretoria', 'Decisões estratégicas e aprovações.', true, 210),
    ('trabalho-especial', 'Trabalho especial', 'Casamentos, batizados e trabalhos autorizados.', true, 220)
  ) as t(slug, name, description, requires_approval, sort_order)
)
insert into public.agv_event_types (organization_id, slug, name, description, requires_approval, sort_order)
select tucxa.id, types.slug, types.name, types.description, types.requires_approval, types.sort_order
from tucxa cross join types
on conflict (organization_id, slug) do update set
  name = excluded.name,
  description = excluded.description,
  requires_approval = excluded.requires_approval,
  sort_order = excluded.sort_order,
  updated_at = now();


-- Eventos/atividades iniciais do Agenda Viva para facilitar a validação com o Tucxa.
with tucxa as (
  select id from public.oh_organizations where slug = 'tucxa'
), event_types as (
  select organization_id, slug, id from public.agv_event_types where organization_id = (select id from tucxa)
), events as (
  select * from (values
    ('agenda-viva-atendimento-segunda', 'Atendimento aos filhos de fora — Segunda-feira', 'grupo-segunda-feira', 'segunda', 'RRULE:FREQ=WEEKLY;BYDAY=MO', 'Atendimento voltado aos consulentes/filhos de fora, com cavalinhos, cambonos e equipe de organização.'),
    ('agenda-viva-atendimento-terca', 'Atendimento aos filhos de fora — Terça-feira', 'grupo-terca-feira', 'terca', 'RRULE:FREQ=WEEKLY;BYDAY=TU', 'Atendimento voltado aos consulentes/filhos de fora, com senhas, fichas individuais e orientação pela organização.'),
    ('agenda-viva-transformacao-quarta', 'Tratamento espiritual / transformação — Quarta-feira', 'tratamento-espiritual-transformacao', 'quarta', 'RRULE:FREQ=WEEKLY;BYDAY=WE', 'Atendimento para pessoas encaminhadas e previamente agendadas pela coordenação.'),
    ('agenda-viva-grupo-1-quinta', 'Filhos da corrente — Grupo 1', 'grupo-1', 'grupo-1', 'RRULE:FREQ=MONTHLY;BYDAY=1TH,3TH', 'Gira de desenvolvimento dos filhos da corrente do Grupo 1.'),
    ('agenda-viva-grupo-2-quinta', 'Filhos da corrente — Grupo 2', 'grupo-2', 'grupo-2', 'RRULE:FREQ=MONTHLY;BYDAY=2TH,4TH', 'Gira de desenvolvimento dos filhos da corrente do Grupo 2.'),
    ('agenda-viva-mutirao-2026-01-24', 'Mutirão de limpeza', 'mutirao-limpeza', 'evento', null, 'Mutirão de limpeza de 24/01 conforme calendário Tucxa 2026.'),
    ('agenda-viva-trabalho-todos-2026-01-29', 'Trabalho para todos os Cavalinhos e Cambonos', 'trabalho-especial', 'evento', null, 'Trabalho de 29/01 para todos os Cavalinhos e Cambonos.'),
    ('agenda-viva-trabalho-todos-2026-07-30', 'Trabalho para todos os Cavalinhos e Cambonos', 'trabalho-especial', 'evento', null, 'Trabalho de 30/07 para todos os Cavalinhos e Cambonos.'),
    ('agenda-viva-encerramento-2026-12-20', 'Encerramento anual', 'encerramento', 'evento', null, 'Encerramento de 20/12 conforme calendário Tucxa 2026.'),
    ('agenda-viva-ferias-janeiro-2026', 'Férias — janeiro até 28', 'ferias', 'ferias', null, 'Período de férias de janeiro até 28.'),
    ('agenda-viva-ferias-julho-2026', 'Férias — julho até 29', 'ferias', 'ferias', null, 'Período de férias de julho até 29.'),
    ('agenda-viva-ferias-dezembro-2026', 'Férias — a partir de 21/12', 'ferias', 'ferias', null, 'Período de férias a partir de 21 de dezembro.')
  ) as e(external_key, title, event_type_slug, group_slug, recurrence_rule, notes)
)
insert into public.agv_events (organization_id, title, event_type, event_type_id, status, recurrence_rule, group_slug, requires_approval, notes, metadata)
select
  tucxa.id,
  events.title,
  events.event_type_slug,
  event_types.id,
  case when events.group_slug in ('evento', 'ferias') then 'aprovado' else 'recorrente' end,
  events.recurrence_rule,
  events.group_slug,
  events.group_slug = 'evento',
  events.notes,
  jsonb_build_object('source', 'Calendario Tucxa 2026', 'external_key', events.external_key)
from tucxa
join events on true
left join event_types on event_types.slug = events.event_type_slug
where not exists (
  select 1 from public.agv_events existing
  where existing.organization_id = tucxa.id
    and existing.metadata->>'external_key' = events.external_key
);

create index if not exists idx_oh_people_email on public.oh_people(lower(email)) where email is not null;
create index if not exists idx_oh_people_auth_user_id on public.oh_people(auth_user_id) where auth_user_id is not null;
create index if not exists idx_oh_organizations_email on public.oh_organizations(lower(email)) where email is not null;
create index if not exists idx_oh_leads_email on public.oh_leads(lower(email)) where email is not null;
create index if not exists idx_oh_people_organization on public.oh_people(organization_id);
create index if not exists idx_oh_roles_organization on public.oh_roles(organization_id);
create index if not exists idx_oh_memberships_organization on public.oh_memberships(organization_id);
create index if not exists idx_oh_module_settings_organization on public.oh_module_settings(organization_id);
create index if not exists idx_oh_audit_logs_organization on public.oh_audit_logs(organization_id);
create index if not exists idx_oh_leads_status on public.oh_leads(status);
create index if not exists idx_oh_leads_created_at on public.oh_leads(created_at desc);
create index if not exists idx_oh_leads_implantation_due_at on public.oh_leads(implantation_due_at);
create index if not exists idx_oh_leads_next_reminder_at on public.oh_leads(next_reminder_at);
create index if not exists idx_oh_permissions_module on public.oh_permissions(module_slug);

-- =========================================================
-- Agenda Viva — atualização eventos, funções e aprovações (Julho Cultural / piloto Tucxa)
-- =========================================================

with tucxa as (
  select id from public.oh_organizations where slug = 'tucxa'
), types as (
  select * from (values
    ('caminhada', 'Caminhada', 'Atividade de convivência, cuidado e integração da comunidade.', true, 230),
    ('dia-filme', 'Dia do Filme', 'Encontro cultural com filme, conversa e convivência.', true, 240),
    ('mostra-cultural', 'Mostra Cultural', 'Atividade cultural, apresentações, leitura e integração.', true, 250),
    ('clube-livro-extra', 'Clube do Livro Extra', 'Encontro extra online ou presencial do Clube do Livro.', true, 260)
  ) as t(slug, name, description, requires_approval, sort_order)
)
insert into public.agv_event_types (organization_id, slug, name, description, requires_approval, sort_order)
select tucxa.id, types.slug, types.name, types.description, types.requires_approval, types.sort_order
from tucxa cross join types
on conflict (organization_id, slug) do update set
  name = excluded.name,
  description = excluded.description,
  requires_approval = excluded.requires_approval,
  sort_order = excluded.sort_order,
  updated_at = now();

-- Eventos de referência do calendário visual de Julho Cultural 2026.
with tucxa as (
  select id from public.oh_organizations where slug = 'tucxa'
), event_types as (
  select organization_id, slug, id from public.agv_event_types where organization_id = (select id from tucxa)
), events as (
  select * from (values
    ('agenda-viva-julho-cultural-bazar-2026-07-04', 'Bazar Sementinha', 'bazar', 'evento', '2026-07-04 09:00:00-03'::timestamptz, null::timestamptz, 'Evento beneficente do Sementinha no calendário cultural de julho.'),
    ('agenda-viva-julho-cultural-caminhada-2026-07-11', 'Caminhada TUCXA', 'caminhada', 'evento', '2026-07-11 08:00:00-03'::timestamptz, null::timestamptz, 'Atividade de convivência e integração.'),
    ('agenda-viva-julho-cultural-estudos-2026-07-12', 'Grupo de Estudos', 'grupo-estudos', 'evento', '2026-07-12 15:00:00-03'::timestamptz, null::timestamptz, 'Grupo de Estudos presencial às 15h.'),
    ('agenda-viva-julho-cultural-filme-2026-07-16', 'Dia do Filme', 'dia-filme', 'evento', '2026-07-16 19:00:00-03'::timestamptz, null::timestamptz, 'Dia do Filme às 19h.'),
    ('agenda-viva-julho-cultural-mostra-2026-07-21', 'Mostra Cultural e Clube do Livro', 'mostra-cultural', 'evento', '2026-07-21 19:00:00-03'::timestamptz, null::timestamptz, 'Mostra Cultural e Clube do Livro às 19h.'),
    ('agenda-viva-julho-cultural-estudos-2026-07-26', 'Grupo de Estudos', 'grupo-estudos', 'evento', '2026-07-26 15:00:00-03'::timestamptz, null::timestamptz, 'Grupo de Estudos presencial às 15h.'),
    ('agenda-viva-julho-cultural-livro-extra-2026-07-31', 'Clube do Livro Extra', 'clube-livro-extra', 'evento', '2026-07-31 19:00:00-03'::timestamptz, null::timestamptz, 'Clube do Livro Extra online às 19h.')
  ) as e(external_key, title, event_type_slug, group_slug, starts_at, ends_at, notes)
)
insert into public.agv_events (organization_id, title, event_type, event_type_id, status, starts_at, ends_at, all_day, group_slug, requires_approval, notes, metadata)
select
  tucxa.id,
  events.title,
  events.event_type_slug,
  event_types.id,
  'aprovado',
  events.starts_at,
  events.ends_at,
  false,
  events.group_slug,
  true,
  events.notes,
  jsonb_build_object('source', 'Julho Cultural Tucxa 2026', 'external_key', events.external_key, 'visual_calendar', true)
from tucxa
join events on true
left join event_types on event_types.slug = events.event_type_slug
where not exists (
  select 1 from public.agv_events existing
  where existing.organization_id = tucxa.id
    and existing.metadata->>'external_key' = events.external_key
);

-- =========================================================
-- Base Única — localidades, entidades e vínculos em lote
-- =========================================================

create table if not exists public.oh_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  name text not null,
  location_type text not null default 'sede',
  zip_code text,
  address text,
  number text,
  complement text,
  district text,
  city text,
  state text,
  is_primary boolean not null default false,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.oh_locations add column if not exists organization_id uuid references public.oh_organizations(id) on delete cascade;
alter table public.oh_locations add column if not exists name text;
alter table public.oh_locations add column if not exists location_type text not null default 'sede';
alter table public.oh_locations add column if not exists zip_code text;
alter table public.oh_locations add column if not exists address text;
alter table public.oh_locations add column if not exists number text;
alter table public.oh_locations add column if not exists complement text;
alter table public.oh_locations add column if not exists district text;
alter table public.oh_locations add column if not exists city text;
alter table public.oh_locations add column if not exists state text;
alter table public.oh_locations add column if not exists is_primary boolean not null default false;
alter table public.oh_locations add column if not exists active boolean not null default true;
alter table public.oh_locations add column if not exists notes text;
alter table public.oh_locations add column if not exists created_at timestamptz not null default now();
alter table public.oh_locations add column if not exists updated_at timestamptz not null default now();
update public.oh_locations set name = 'Localidade' where name is null or btrim(name) = '';
alter table public.oh_locations alter column name set not null;
create index if not exists idx_oh_locations_organization on public.oh_locations(organization_id);
create unique index if not exists idx_oh_locations_primary_unique on public.oh_locations(organization_id) where is_primary = true and active = true;

create table if not exists public.oh_spiritual_entities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  line text,
  entity_type text,
  usual_materials text,
  usual_days text[] not null default '{}',
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.oh_spiritual_entities add column if not exists organization_id uuid references public.oh_organizations(id) on delete cascade;
alter table public.oh_spiritual_entities add column if not exists name text;
alter table public.oh_spiritual_entities add column if not exists slug text;
alter table public.oh_spiritual_entities add column if not exists line text;
alter table public.oh_spiritual_entities add column if not exists entity_type text;
alter table public.oh_spiritual_entities add column if not exists usual_materials text;
alter table public.oh_spiritual_entities add column if not exists usual_days text[] not null default '{}';
alter table public.oh_spiritual_entities add column if not exists notes text;
alter table public.oh_spiritual_entities add column if not exists active boolean not null default true;
alter table public.oh_spiritual_entities add column if not exists created_at timestamptz not null default now();
alter table public.oh_spiritual_entities add column if not exists updated_at timestamptz not null default now();
update public.oh_spiritual_entities set name = 'Entidade' where name is null or btrim(name) = '';
update public.oh_spiritual_entities set slug = lower(regexp_replace(coalesce(nullif(btrim(slug), ''), name, id::text), '[^a-zA-Z0-9]+', '-', 'g')) where slug is null or btrim(slug) = '';
alter table public.oh_spiritual_entities alter column name set not null;
alter table public.oh_spiritual_entities alter column slug set not null;
create index if not exists idx_oh_spiritual_entities_organization on public.oh_spiritual_entities(organization_id);
create unique index if not exists idx_oh_spiritual_entities_org_slug on public.oh_spiritual_entities(organization_id, slug);

-- Localidade principal padrão do Tucxa, sincronizada com o cadastro da organização.
with tucxa as (
  select id, name, zip_code, address, number, complement, city, state
  from public.oh_organizations
  where slug = 'tucxa'
)
insert into public.oh_locations (organization_id, name, location_type, zip_code, address, number, complement, city, state, is_primary, active, notes)
select id, 'Sede principal', 'sede', zip_code, address, number, complement, coalesce(city, 'Campinas'), coalesce(state, 'SP'), true, true, 'Localidade principal criada para validação da Organização em Harmonia.'
from tucxa
where not exists (select 1 from public.oh_locations where organization_id = tucxa.id and is_primary = true);

-- Entidades/linhas iniciais para facilitar vínculos de cavalinhos e cambonos.
with tucxa as (
  select id from public.oh_organizations where slug = 'tucxa'
), entities as (
  select * from (values
    ('caboclo-sete-flexa', 'Caboclo Sete Flexa', 'Oxóssi', 'Caboclo', 'Entidade chefe/mentor espiritual da casa; exceções e diretrizes importantes podem depender de autorização espiritual e Diretoria.'),
    ('preto-velho', 'Preto Velho', 'Preto Velho', 'Preto Velho', 'Linha associada à sabedoria, humildade e orientação espiritual.'),
    ('linha-ogum', 'Linha de Ogum', 'Ogum', 'Linha de trabalho', 'Linha associada à luta contra males espirituais, demandas e desafios internos.'),
    ('linha-xango', 'Linha de Xangô', 'Xangô', 'Linha de trabalho', 'Linha associada à justiça, sabedoria e força.'),
    ('linha-oxossi', 'Linha de Oxóssi', 'Oxóssi', 'Linha de trabalho', 'Linha associada às matas, ervas, cura e forças da natureza.'),
    ('linha-aguas', 'Linha das Águas', 'Iemanjá / Iansã / Oxum', 'Linha de trabalho', 'Linha associada à limpeza fluídica em rios, cachoeiras e mar.')
  ) as e(slug, name, line, entity_type, notes)
)
insert into public.oh_spiritual_entities (organization_id, slug, name, line, entity_type, notes, active)
select tucxa.id, entities.slug, entities.name, entities.line, entities.entity_type, entities.notes, true
from tucxa cross join entities
on conflict (organization_id, slug) do update set
  name = excluded.name,
  line = excluded.line,
  entity_type = excluded.entity_type,
  notes = excluded.notes,
  active = true,
  updated_at = now();

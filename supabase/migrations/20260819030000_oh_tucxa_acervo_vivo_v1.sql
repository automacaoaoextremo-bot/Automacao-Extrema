-- Acervo Vivo v1 — Biblioteca do Tucxa
-- Catálogo, exemplares, circulação, conteúdos digitais, trilhas e curadorias.

create extension if not exists pgcrypto;

create table if not exists public.oh_acervo_settings (
  organization_id uuid primary key references public.oh_organizations(id) on delete cascade,
  loan_days integer not null default 30 check (loan_days between 1 and 365),
  daily_late_fee numeric(10,2) not null default 1.00 check (daily_late_fee >= 0),
  max_active_loans integer not null default 3 check (max_active_loans between 1 and 50),
  renewal_limit integer not null default 1 check (renewal_limit between 0 and 20),
  reservation_hold_days integer not null default 3 check (reservation_hold_days between 1 and 30),
  public_catalog_enabled boolean not null default true,
  member_reservations_enabled boolean not null default true,
  member_renewals_enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.oh_acervo_titles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  title text not null,
  normalized_title text not null,
  subtitle text,
  authors text[] not null default '{}'::text[],
  publisher text,
  edition text,
  publication_year integer,
  isbn10 text,
  isbn13 text,
  language text default 'pt-BR',
  description text,
  subjects text[] not null default '{}'::text[],
  keywords text[] not null default '{}'::text[],
  audience text[] not null default '{}'::text[],
  cover_url text,
  cover_source text,
  cover_external_id text,
  cover_match_status text not null default 'pendente'
    check (cover_match_status in ('pendente','sugerida','confirmada','manual','sem_capa')),
  cover_match_confidence numeric(5,2),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by_person_id uuid references public.oh_people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_oh_acervo_titles_search
  on public.oh_acervo_titles (organization_id, normalized_title);
create index if not exists idx_oh_acervo_titles_active
  on public.oh_acervo_titles (organization_id, active, updated_at desc);
create index if not exists idx_oh_acervo_titles_isbn13
  on public.oh_acervo_titles (organization_id, isbn13)
  where isbn13 is not null;

create table if not exists public.oh_acervo_copies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  title_id uuid not null references public.oh_acervo_titles(id) on delete cascade,
  legacy_code text,
  asset_code text not null,
  qr_token text not null default gen_random_uuid()::text,
  shelf text,
  shelf_position text,
  condition text not null default 'bom'
    check (condition in ('novo','otimo','bom','regular','danificado','em_restauro')),
  status text not null default 'disponivel'
    check (status in ('disponivel','emprestado','reservado','manutencao','perdido','baixado')),
  acquisition_type text not null default 'acervo_historico'
    check (acquisition_type in ('acervo_historico','compra','doacao','outro')),
  donor_person_id uuid references public.oh_people(id) on delete set null,
  acquired_at date,
  notes text,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, asset_code),
  unique (qr_token)
);

create index if not exists idx_oh_acervo_copies_title
  on public.oh_acervo_copies (organization_id, title_id, status);

create table if not exists public.oh_acervo_loans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  copy_id uuid not null references public.oh_acervo_copies(id) on delete restrict,
  person_id uuid not null references public.oh_people(id) on delete restrict,
  loaned_at timestamptz not null default now(),
  due_at timestamptz not null,
  returned_at timestamptz,
  renewed_count integer not null default 0,
  status text not null default 'ativo'
    check (status in ('ativo','atrasado','devolvido','perdido','cancelado')),
  late_fee_calculated numeric(10,2) not null default 0,
  late_fee_status text not null default 'nao_aplicavel'
    check (late_fee_status in ('nao_aplicavel','pendente','pago','isento')),
  late_fee_notes text,
  created_by_person_id uuid references public.oh_people(id) on delete set null,
  returned_by_person_id uuid references public.oh_people(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_oh_acervo_loans_one_active_copy
  on public.oh_acervo_loans (copy_id)
  where returned_at is null and status in ('ativo','atrasado','perdido');
create index if not exists idx_oh_acervo_loans_person
  on public.oh_acervo_loans (organization_id, person_id, due_at desc);

create table if not exists public.oh_acervo_reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  title_id uuid not null references public.oh_acervo_titles(id) on delete cascade,
  person_id uuid not null references public.oh_people(id) on delete cascade,
  status text not null default 'aguardando'
    check (status in ('aguardando','disponivel','atendida','cancelada','expirada')),
  requested_at timestamptz not null default now(),
  available_copy_id uuid references public.oh_acervo_copies(id) on delete set null,
  available_at timestamptz,
  hold_until timestamptz,
  fulfilled_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_oh_acervo_reservations_open_unique
  on public.oh_acervo_reservations (organization_id, title_id, person_id)
  where status in ('aguardando','disponivel');
create index if not exists idx_oh_acervo_reservations_queue
  on public.oh_acervo_reservations (organization_id, title_id, status, requested_at);

create table if not exists public.oh_acervo_resources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  resource_type text not null
    check (resource_type in ('regulamento','procedimento','manual','folha_verde','apostila','video','podcast','audio','memoria_da_casa','outro')),
  title text not null,
  description text,
  subjects text[] not null default '{}'::text[],
  audience text[] not null default '{}'::text[],
  owner_person_id uuid references public.oh_people(id) on delete set null,
  governance_status text not null default 'rascunho'
    check (governance_status in ('rascunho','em_revisao','vigente','arquivado')),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.oh_acervo_resource_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  resource_id uuid not null references public.oh_acervo_resources(id) on delete cascade,
  version_label text not null,
  effective_date date,
  source_url text,
  storage_path text,
  is_current boolean not null default false,
  approved_by_person_id uuid references public.oh_people(id) on delete set null,
  approved_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (resource_id, version_label)
);

create unique index if not exists idx_oh_acervo_resource_current
  on public.oh_acervo_resource_versions (resource_id)
  where is_current = true;

create table if not exists public.oh_acervo_trails (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  objective text,
  description text,
  audience text[] not null default '{}'::text[],
  level text not null default 'livre'
    check (level in ('inicio','fundamentos','aprofundamento','livre')),
  curator_person_id uuid references public.oh_people(id) on delete set null,
  official boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.oh_acervo_trail_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  trail_id uuid not null references public.oh_acervo_trails(id) on delete cascade,
  item_type text not null check (item_type in ('title','resource')),
  title_id uuid references public.oh_acervo_titles(id) on delete cascade,
  resource_id uuid references public.oh_acervo_resources(id) on delete cascade,
  sort_order integer not null default 100,
  required boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  check (
    (item_type = 'title' and title_id is not null and resource_id is null) or
    (item_type = 'resource' and resource_id is not null and title_id is null)
  )
);

create index if not exists idx_oh_acervo_trail_items
  on public.oh_acervo_trail_items (organization_id, trail_id, sort_order);
create unique index if not exists idx_oh_acervo_trail_title_unique
  on public.oh_acervo_trail_items (trail_id, title_id)
  where item_type = 'title';
create unique index if not exists idx_oh_acervo_trail_resource_unique
  on public.oh_acervo_trail_items (trail_id, resource_id)
  where item_type = 'resource';

create table if not exists public.oh_acervo_curations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  curation_type text not null
    check (curation_type in ('clube_do_livro','grupo_de_estudos','curso_preparatorio','aula','destaque','outro')),
  title text not null,
  description text,
  title_id uuid references public.oh_acervo_titles(id) on delete set null,
  resource_id uuid references public.oh_acervo_resources(id) on delete set null,
  course_id uuid references public.oh_courses(id) on delete set null,
  lesson_id uuid references public.oh_course_lessons(id) on delete set null,
  agenda_event_id uuid references public.agv_events(id) on delete set null,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_oh_acervo_curations_active
  on public.oh_acervo_curations (organization_id, active, curation_type, starts_at);

create table if not exists public.oh_acervo_inventory_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  name text not null,
  scope text not null default 'todo_acervo',
  status text not null default 'aberto'
    check (status in ('aberto','concluido','cancelado')),
  started_by_person_id uuid references public.oh_people(id) on delete set null,
  started_at timestamptz not null default now(),
  closed_by_person_id uuid references public.oh_people(id) on delete set null,
  closed_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.oh_acervo_inventory_scans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  session_id uuid not null references public.oh_acervo_inventory_sessions(id) on delete cascade,
  copy_id uuid not null references public.oh_acervo_copies(id) on delete cascade,
  scanned_by_person_id uuid references public.oh_people(id) on delete set null,
  scanned_at timestamptz not null default now(),
  observed_shelf text,
  note text,
  unique (session_id, copy_id)
);

create index if not exists idx_oh_acervo_inventory_sessions
  on public.oh_acervo_inventory_sessions (organization_id, status, started_at desc);
create index if not exists idx_oh_acervo_inventory_scans
  on public.oh_acervo_inventory_scans (organization_id, session_id, scanned_at desc);

create table if not exists public.oh_acervo_audit (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  actor_person_id uuid references public.oh_people(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.oh_acervo_settings enable row level security;
alter table public.oh_acervo_titles enable row level security;
alter table public.oh_acervo_copies enable row level security;
alter table public.oh_acervo_loans enable row level security;
alter table public.oh_acervo_reservations enable row level security;
alter table public.oh_acervo_resources enable row level security;
alter table public.oh_acervo_resource_versions enable row level security;
alter table public.oh_acervo_trails enable row level security;
alter table public.oh_acervo_trail_items enable row level security;
alter table public.oh_acervo_curations enable row level security;
alter table public.oh_acervo_inventory_sessions enable row level security;
alter table public.oh_acervo_inventory_scans enable row level security;
alter table public.oh_acervo_audit enable row level security;

-- Configuração e curadoria inicial: os itens abaixo são sugestões para validação do Tucxa.
do $$
declare
  tucxa_id uuid;
  trail_id uuid;
  resource_id uuid;
begin
  select id into tucxa_id
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by created_at desc
  limit 1;

  if tucxa_id is null then return; end if;

  insert into public.oh_acervo_settings (
    organization_id, loan_days, daily_late_fee, max_active_loans, renewal_limit,
    reservation_hold_days, public_catalog_enabled, member_reservations_enabled,
    member_renewals_enabled
  ) values (tucxa_id, 30, 1.00, 3, 1, 3, true, true, true)
  on conflict (organization_id) do update set
    loan_days = excluded.loan_days,
    daily_late_fee = excluded.daily_late_fee,
    updated_at = now();

  insert into public.oh_roles (
    organization_id, name, slug, description, active, is_system
  ) values (
    tucxa_id,
    'Biblioteca / Acervo Vivo',
    'biblioteca-acervo-vivo',
    'Pode administrar catálogo, exemplares, empréstimos, devoluções, reservas, conteúdos e trilhas do Acervo Vivo.',
    true,
    false
  ) on conflict do nothing;

  insert into public.oh_acervo_resources (
    organization_id, resource_type, title, description, subjects, audience, governance_status, active, metadata
  ) values
    (tucxa_id, 'regulamento', 'Regulamento do Tucxa 2025', 'Documento institucional com regras da Casa, incluindo Biblioteca e Curso Básico de Iniciação.', array['regulamento','biblioteca','entrada na corrente'], array['filhos da corrente','filhos de fora'], 'vigente', true, '{"source":"acervo-vivo-v1"}'::jsonb),
    (tucxa_id, 'procedimento', 'Procedimentos e Orientações Básicas do Tucxa 2025', 'Orientações de preparo, trabalhos, mediunidade, linhas e estudo constante.', array['procedimentos','mediunidade','umbanda'], array['filhos da corrente'], 'vigente', true, '{"source":"acervo-vivo-v1"}'::jsonb),
    (tucxa_id, 'manual', 'Manual para Cambonos 2025', 'Responsabilidades, materiais, sigilo, conduta e atuação dos cambonos.', array['cambonagem','atendimento','responsabilidade'], array['cambonos','filhos da corrente'], 'vigente', true, '{"source":"acervo-vivo-v1"}'::jsonb),
    (tucxa_id, 'folha_verde', 'Folha Verde 2025', 'Coleção do Folha Verde de 2025. Versões mensais devem ser cadastradas e validadas na gestão do Acervo Vivo.', array['folha verde','formação','memória'], array['filhos da corrente'], 'em_revisao', true, '{"year":2025,"source":"acervo-vivo-v1"}'::jsonb),
    (tucxa_id, 'folha_verde', 'Folha Verde 2026', 'Coleção do Folha Verde de 2026. Versões mensais devem ser cadastradas e validadas na gestão do Acervo Vivo.', array['folha verde','formação','memória'], array['filhos da corrente'], 'em_revisao', true, '{"year":2026,"source":"acervo-vivo-v1"}'::jsonb)
  on conflict do nothing;

  insert into public.oh_acervo_trails (
    organization_id, name, slug, objective, description, audience, level, official, active, sort_order, metadata
  ) values
    (tucxa_id, 'Começando no Tucxa', 'comecando-no-tucxa', 'Dar contexto, segurança e uma sequência simples de estudo para quem está iniciando.', 'Sugestão inicial baseada no Regulamento, Procedimentos e materiais de formação. Deve ser validada pelos responsáveis.', array['ingressantes','filhos da corrente'], 'inicio', false, true, 10, '{"validation":"pendente"}'::jsonb),
    (tucxa_id, 'Mediunidade e Desenvolvimento', 'mediunidade-e-desenvolvimento', 'Aprofundar estudo, reflexão e desenvolvimento mediúnico com referências da Casa e do acervo.', 'Trilha sugerida para organizar livros, conteúdos e encontros ligados a mediunidade.', array['filhos da corrente'], 'fundamentos', false, true, 20, '{"validation":"pendente"}'::jsonb),
    (tucxa_id, 'Cambonagem, Atendimento e Responsabilidade', 'cambonagem-atendimento-responsabilidade', 'Apoiar o cambono a estudar responsabilidades, sigilo, conduta, materiais e atendimento.', 'Integra Manual do Cambono, procedimentos e leituras relacionadas.', array['cambonos','filhos da corrente'], 'fundamentos', false, true, 30, '{"validation":"pendente"}'::jsonb),
    (tucxa_id, 'Fundamentos de Umbanda', 'fundamentos-de-umbanda', 'Organizar conteúdos introdutórios e de aprofundamento sobre Umbanda e linhas de trabalho.', 'Curadoria inicial sujeita à validação dos professores e Grupo de Estudos.', array['ingressantes','filhos da corrente'], 'fundamentos', false, true, 40, '{"validation":"pendente"}'::jsonb),
    (tucxa_id, 'Vida Espiritual e Evolução', 'vida-espiritual-e-evolucao', 'Conectar obras e conteúdos que apoiam reflexão sobre vida espiritual e evolução.', 'Curadoria inicial para validação.', array['filhos da corrente','filhos de fora'], 'livre', false, true, 50, '{"validation":"pendente"}'::jsonb),
    (tucxa_id, 'Caridade, Ética e Vida na Casa', 'caridade-etica-vida-na-casa', 'Reforçar valores, convivência, responsabilidade e prática da caridade.', 'Conecta documentos institucionais, Folha Verde e leituras selecionadas.', array['filhos da corrente'], 'livre', false, true, 60, '{"validation":"pendente"}'::jsonb)
  on conflict (organization_id, slug) do nothing;

  select id into trail_id from public.oh_acervo_trails where organization_id = tucxa_id and slug = 'comecando-no-tucxa';
  if trail_id is not null then
    for resource_id in
      select id from public.oh_acervo_resources
      where organization_id = tucxa_id and title in ('Regulamento do Tucxa 2025','Procedimentos e Orientações Básicas do Tucxa 2025')
      order by title
    loop
      insert into public.oh_acervo_trail_items (organization_id, trail_id, item_type, resource_id, sort_order, required)
      values (tucxa_id, trail_id, 'resource', resource_id, 10, true)
      on conflict do nothing;
    end loop;
  end if;

  select id into trail_id from public.oh_acervo_trails where organization_id = tucxa_id and slug = 'cambonagem-atendimento-responsabilidade';
  select id into resource_id from public.oh_acervo_resources where organization_id = tucxa_id and title = 'Manual para Cambonos 2025' limit 1;
  if trail_id is not null and resource_id is not null then
    insert into public.oh_acervo_trail_items (organization_id, trail_id, item_type, resource_id, sort_order, required)
    values (tucxa_id, trail_id, 'resource', resource_id, 10, true)
    on conflict do nothing;
  end if;
end $$;

comment on table public.oh_acervo_titles is 'Obras/títulos do Acervo Vivo; um título pode possuir vários exemplares físicos.';
comment on table public.oh_acervo_copies is 'Exemplares físicos, cada um com código patrimonial/QR e situação própria.';
comment on table public.oh_acervo_resources is 'Conteúdos não-livro do Acervo Vivo: documentos, Folha Verde, apostilas, vídeos, podcasts, áudios e memória da Casa.';
comment on table public.oh_acervo_trails is 'Trilhas de estudo que conectam títulos e recursos por jornada de aprendizagem.';
comment on table public.oh_acervo_inventory_sessions is 'Sessões de inventário físico do Acervo Vivo.';
comment on table public.oh_acervo_inventory_scans is 'Exemplares encontrados durante uma sessão de inventário.';

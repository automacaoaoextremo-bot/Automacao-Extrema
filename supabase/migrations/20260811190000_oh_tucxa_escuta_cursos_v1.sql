-- Organização em Harmonia / TUCXA
-- Evolução 01 pós-apresentação: Escuta em Harmonia + Cursos em Harmonia.
-- Mantém a Base Única e a Agenda Viva como fontes centrais de pessoas, funções e eventos.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Escuta em Harmonia
-- Ciclo fechado: pergunta -> resposta -> confirmação -> ação institucional.
-- ---------------------------------------------------------------------------

create table if not exists public.oh_listening_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  response_due_days integer not null default 5 check (response_due_days between 1 and 90),
  action_followup_enabled boolean not null default true,
  allow_anonymous boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

create table if not exists public.oh_listening_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  requester_person_id uuid not null references public.oh_people(id) on delete restrict,
  protocol text not null,
  anonymous_to_directorate boolean not null default false,
  category text not null default 'questionamento',
  subject text not null,
  message text not null,
  status text not null default 'aberto'
    check (status in ('aberto','respondido','aguardando_confirmacao','nao_resolvido','resolvido','encerrado')),
  due_at timestamptz not null,
  director_response text,
  response_person_id uuid references public.oh_people(id) on delete set null,
  responded_at timestamptz,
  requester_resolution text check (requester_resolution is null or requester_resolution in ('resolvido','nao_resolvido')),
  requester_feedback text,
  requester_confirmed_at timestamptz,
  closed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, protocol)
);

create index if not exists idx_oh_listening_requests_org_status_due
  on public.oh_listening_requests (organization_id, status, due_at, created_at desc);

create index if not exists idx_oh_listening_requests_requester
  on public.oh_listening_requests (organization_id, requester_person_id, created_at desc);

create table if not exists public.oh_listening_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  request_id uuid not null references public.oh_listening_requests(id) on delete cascade,
  action_type text not null
    check (action_type in ('plano_acao','procedimento','treinamento','comunicacao','outro')),
  title text not null,
  description text,
  responsible_person_id uuid references public.oh_people(id) on delete set null,
  due_date date,
  status text not null default 'planejada'
    check (status in ('planejada','em_andamento','concluida','cancelada')),
  completion_notes text,
  completed_at timestamptz,
  created_by_person_id uuid references public.oh_people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_oh_listening_actions_request
  on public.oh_listening_actions (organization_id, request_id, status, due_date);

-- ---------------------------------------------------------------------------
-- Cursos em Harmonia
-- Cadastro pedagógico conectado à Base Única + Agenda Viva + presença.
-- ---------------------------------------------------------------------------

create table if not exists public.oh_courses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  objective text,
  rules text,
  planned_content text,
  status text not null default 'planejamento'
    check (status in ('planejamento','inscricoes','em_andamento','concluido','cancelado')),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by_person_id uuid references public.oh_people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.oh_course_lessons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  course_id uuid not null references public.oh_courses(id) on delete cascade,
  title text not null,
  planned_content text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  agenda_event_id uuid references public.agv_events(id) on delete set null,
  checkin_code_hash text,
  checkin_code_generated_at timestamptz,
  checkin_window_minutes_before integer not null default 30,
  checkin_window_minutes_after integer not null default 30,
  status text not null default 'prevista'
    check (status in ('prevista','realizada','cancelada')),
  metadata jsonb not null default '{}'::jsonb,
  created_by_person_id uuid references public.oh_people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists idx_oh_course_lessons_course_date
  on public.oh_course_lessons (organization_id, course_id, starts_at);

create table if not exists public.oh_course_teachers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  lesson_id uuid not null references public.oh_course_lessons(id) on delete cascade,
  teacher_person_id uuid not null references public.oh_people(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (lesson_id, teacher_person_id)
);

create index if not exists idx_oh_course_teachers_person
  on public.oh_course_teachers (organization_id, teacher_person_id, lesson_id);

create table if not exists public.oh_course_students (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  course_id uuid not null references public.oh_courses(id) on delete cascade,
  person_id uuid references public.oh_people(id) on delete set null,
  invited_name text,
  invited_email text,
  invited_whatsapp text,
  invitation_token text not null default gen_random_uuid()::text,
  invitation_status text not null default 'convidado'
    check (invitation_status in ('convidado','aguardando_cadastro','aceito','recusado','cancelado')),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  declined_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by_person_id uuid references public.oh_people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (invitation_token)
);

create unique index if not exists idx_oh_course_students_unique_person
  on public.oh_course_students (course_id, person_id)
  where person_id is not null and invitation_status <> 'cancelado';

create index if not exists idx_oh_course_students_course_status
  on public.oh_course_students (organization_id, course_id, invitation_status, invited_at desc);

create table if not exists public.oh_course_attendance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  lesson_id uuid not null references public.oh_course_lessons(id) on delete cascade,
  course_student_id uuid not null references public.oh_course_students(id) on delete cascade,
  status text not null default 'presente'
    check (status in ('presente','ausente','justificada')),
  checkin_method text not null default 'professor'
    check (checkin_method in ('aluno','professor')),
  checked_in_at timestamptz,
  marked_by_person_id uuid references public.oh_people(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, course_student_id)
);

create index if not exists idx_oh_course_attendance_lesson
  on public.oh_course_attendance (organization_id, lesson_id, status);

-- As novas tabelas são acessadas somente pelas APIs server-side com service role.
alter table public.oh_listening_settings enable row level security;
alter table public.oh_listening_requests enable row level security;
alter table public.oh_listening_actions enable row level security;
alter table public.oh_courses enable row level security;
alter table public.oh_course_lessons enable row level security;
alter table public.oh_course_teachers enable row level security;
alter table public.oh_course_students enable row level security;
alter table public.oh_course_attendance enable row level security;

-- ---------------------------------------------------------------------------
-- Configuração inicial do Tucxa: SLA, função Professor e tipo de evento Curso.
-- ---------------------------------------------------------------------------

do $$
declare
  tucxa_id uuid;
  filho_role_id uuid;
begin
  select id into tucxa_id
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by created_at desc
  limit 1;

  if tucxa_id is null then
    return;
  end if;

  insert into public.oh_listening_settings (
    organization_id,
    response_due_days,
    action_followup_enabled,
    allow_anonymous
  )
  values (tucxa_id, 5, true, true)
  on conflict (organization_id) do nothing;

  select id into filho_role_id
  from public.oh_roles
  where organization_id = tucxa_id
    and slug in ('filho-da-corrente','filho-corrente')
  order by created_at asc
  limit 1;

  insert into public.oh_roles (
    organization_id,
    name,
    slug,
    description,
    active,
    is_system,
    parent_role_id
  )
  values (
    tucxa_id,
    'Professor',
    'professor',
    'Docente de cursos do Tucxa. Pode planejar cursos e aulas, acompanhar alunos e registrar presença.',
    true,
    false,
    filho_role_id
  )
  on conflict do nothing;

  update public.oh_roles
  set
    name = 'Professor',
    description = 'Docente de cursos do Tucxa. Pode planejar cursos e aulas, acompanhar alunos e registrar presença.',
    active = true,
    parent_role_id = coalesce(parent_role_id, filho_role_id),
    updated_at = now()
  where organization_id = tucxa_id
    and slug = 'professor';

  if to_regclass('public.agv_event_types') is not null then
    insert into public.agv_event_types (
      organization_id,
      slug,
      name,
      description,
      requires_approval,
      active,
      sort_order
    )
    values (
      tucxa_id,
      'curso',
      'Curso / Formação',
      'Aulas, cursos e formações do Tucxa integrados à Agenda Viva.',
      false,
      true,
      75
    )
    on conflict do nothing;
  end if;
end $$;

comment on table public.oh_listening_requests is
  'Questionamentos dos Filhos da Corrente com SLA, resposta e confirmação de resolução.';
comment on column public.oh_listening_requests.anonymous_to_directorate is
  'Mantém o vínculo técnico para o próprio solicitante, mas a API da Diretoria oculta sua identidade.';
comment on table public.oh_listening_actions is
  'Ações institucionais decorrentes de um questionamento: plano, procedimento, treinamento, comunicação ou outro.';
comment on table public.oh_courses is
  'Cursos do Tucxa conectados à Base Única, Agenda Viva, professores, alunos e presença.';
comment on column public.oh_course_lessons.checkin_code_hash is
  'Hash SHA-256 do código temporário gerado pelo professor; o código em claro não é persistido.';

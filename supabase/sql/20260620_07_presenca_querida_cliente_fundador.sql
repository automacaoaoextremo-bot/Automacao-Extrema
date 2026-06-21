-- Automação Extrema — Presença Querida: Cliente Fundador, eventos, convidados e confirmação afetiva
-- Rode este arquivo no Supabase SQL Editor depois dos scripts gerais da AE e do catálogo multi-soluções.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Garante slug único e cadastro da solução no catálogo AE.
-- Estrutura real da ae_solutions:
-- name, slug, short_description, target_audience, main_pains,
-- current_status, stage, priority, source_file, is_active.
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
)
values (
  'Presença Querida',
  'presenca-querida',
  'Gestão afetiva de presença para eventos sociais: convite, RSVP, grupos, lembretes, mensagens, recados, orientações finais e pós-evento.',
  'Famílias, aniversários, casamentos, bodas, confraternizações, cerimonialistas, buffets e pequenos organizadores sociais.',
  'Confirmações espalhadas, ansiedade do organizador, pendentes sem retorno, acompanhantes incertos, mensagens manuais e falta de previsibilidade para buffet e lembranças.',
  'validando',
  'cliente_fundador',
  22,
  'AE - Presença Querida OA.docx',
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
  is_active = excluded.is_active,
  updated_at = now();

create table if not exists public.pq_events (
  id uuid primary key default gen_random_uuid(),
  ae_client_id uuid references public.ae_clients(id) on delete set null,
  event_type text not null default 'aniversario',
  name text not null,
  slug text not null unique,
  host_name text,
  event_date date,
  event_time text,
  venue_name text,
  address text,
  city text,
  state text,
  whatsapp text,
  email text,
  public_headline text,
  invitation_message text,
  dress_code text,
  parking_info text,
  status text not null default 'configuracao',
  is_surprise boolean not null default false,
  is_demo boolean not null default false,
  primary_color text not null default '#E85D75',
  accent_color text not null default '#31C16B',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pq_people (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid,
  full_name text not null,
  email text,
  whatsapp text,
  document text,
  person_type text not null default 'organizador',
  status text not null default 'ativo',
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_pq_people_email_unique on public.pq_people(lower(email)) where email is not null;
create index if not exists idx_pq_people_auth_user on public.pq_people(auth_user_id);

create table if not exists public.pq_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  is_manager boolean not null default false,
  is_guest_role boolean not null default false,
  sort_order integer not null default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.pq_roles (name, slug, description, is_manager, is_guest_role, sort_order)
values
  ('Organizador', 'organizador', 'Responsável principal pela configuração do evento, convidados e mensagens.', true, false, 10),
  ('Anfitrião', 'anfitriao', 'Pessoa celebrada ou responsável afetivo pelo convite.', true, false, 20),
  ('Apoio', 'apoio', 'Pessoa que apoia cadastro, confirmação e operação do evento.', true, false, 30),
  ('Visualizador', 'visualizador', 'Acesso somente leitura para acompanhar indicadores.', false, false, 40),
  ('Convidado', 'convidado', 'Pessoa convidada para responder confirmação pelo link individual.', false, true, 50)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  is_manager = excluded.is_manager,
  is_guest_role = excluded.is_guest_role,
  sort_order = excluded.sort_order,
  updated_at = now();

create table if not exists public.pq_person_events (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.pq_people(id) on delete cascade,
  event_id uuid not null references public.pq_events(id) on delete cascade,
  role_id uuid references public.pq_roles(id) on delete set null,
  is_manager boolean not null default false,
  is_support boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(person_id, event_id)
);

create table if not exists public.pq_guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.pq_events(id) on delete cascade,
  full_name text not null,
  email text,
  whatsapp text,
  group_name text,
  guest_status text not null default 'pendente',
  adults_count integer not null default 1 check (adults_count >= 0),
  children_count integer not null default 0 check (children_count >= 0),
  companions_allowed integer not null default 0 check (companions_allowed >= 0),
  companions_confirmed_count integer not null default 0 check (companions_confirmed_count >= 0),
  dietary_notes text,
  notes text,
  individual_token uuid not null default gen_random_uuid(),
  invited_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_pq_guests_event_token on public.pq_guests(event_id, individual_token);
create index if not exists idx_pq_guests_event_status on public.pq_guests(event_id, guest_status);
create index if not exists idx_pq_guests_event_group on public.pq_guests(event_id, group_name);
create index if not exists idx_pq_guests_whatsapp on public.pq_guests(whatsapp);

create table if not exists public.pq_guest_messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.pq_events(id) on delete cascade,
  guest_id uuid references public.pq_guests(id) on delete set null,
  message_phase text not null,
  channel text not null default 'whatsapp',
  template_label text,
  message_text text not null,
  status text not null default 'rascunho',
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pq_client_terms (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.pq_events(id) on delete cascade,
  solution_id uuid references public.ae_solutions(id) on delete set null,
  condition_label text not null default 'Cliente Fundador',
  contract_status text not null default 'pendente_no_primeiro_acesso',
  fee_status text not null default 'em_definicao',
  setup_fee numeric(10,2) not null default 0,
  event_fee numeric(10,2) not null default 0,
  monthly_fee numeric(10,2) not null default 0,
  pilot_days integer not null default 30,
  allow_testimonial boolean not null default false,
  allow_logo_use boolean not null default false,
  allow_prints_use boolean not null default false,
  terms_accepted boolean not null default false,
  accepted_by_person_id uuid references public.pq_people(id) on delete set null,
  accepted_at timestamptz,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, condition_label)
);

create table if not exists public.pq_leads (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'site_presenca_querida_minimo',
  event_type text not null default 'aniversario',
  event_name text not null,
  event_slug text,
  responsible_name text not null,
  email text,
  whatsapp text,
  state text,
  city text,
  guests_estimate integer,
  event_date date,
  event_context text,
  observations text,
  status text not null default 'novo_whatsapp',
  founder_terms_accepted boolean not null default false,
  testimonial_permission boolean not null default false,
  lgpd_contact_consent boolean not null default false,
  access_user_email text,
  access_sent_at timestamptz,
  access_due_at timestamptz,
  internal_alert_at timestamptz,
  internal_alert_sent_at timestamptz,
  trial_days integer not null default 30,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  ae_client_id uuid references public.ae_clients(id) on delete set null,
  event_id uuid references public.pq_events(id) on delete set null,
  responsible_person_id uuid references public.pq_people(id) on delete set null,
  auth_user_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pq_leads_email on public.pq_leads(lower(email));
create index if not exists idx_pq_leads_whatsapp on public.pq_leads(whatsapp);
create index if not exists idx_pq_leads_status on public.pq_leads(status);
create index if not exists idx_pq_leads_event on public.pq_leads(event_id);

create or replace view public.pq_v_dashboard_events as
select
  e.id as event_id,
  e.name as event_name,
  e.slug as event_slug,
  e.event_type,
  e.event_date,
  count(g.id)::integer as total_guests,
  count(*) filter (where g.guest_status in ('confirmado','confirmado_com_acompanhantes'))::integer as confirmed_count,
  count(*) filter (where g.guest_status = 'talvez')::integer as maybe_count,
  count(*) filter (where g.guest_status = 'nao_podera_ir')::integer as declined_count,
  count(*) filter (where g.guest_status in ('pendente','reservou_data'))::integer as pending_count,
  coalesce(sum(g.adults_count), 0)::integer as adults_count,
  coalesce(sum(g.children_count), 0)::integer as children_count,
  coalesce(sum(g.companions_confirmed_count), 0)::integer as companions_count,
  case
    when count(g.id) = 0 then 0
    else round((count(*) filter (where g.guest_status not in ('pendente','reservou_data'))::numeric / count(g.id)::numeric) * 100, 0)
  end as response_rate
from public.pq_events e
left join public.pq_guests g on g.event_id = e.id
group by e.id, e.name, e.slug, e.event_type, e.event_date;

-- Triggers updated_at
drop trigger if exists trg_pq_events_updated_at on public.pq_events;
create trigger trg_pq_events_updated_at before update on public.pq_events for each row execute function public.set_updated_at();
drop trigger if exists trg_pq_people_updated_at on public.pq_people;
create trigger trg_pq_people_updated_at before update on public.pq_people for each row execute function public.set_updated_at();
drop trigger if exists trg_pq_roles_updated_at on public.pq_roles;
create trigger trg_pq_roles_updated_at before update on public.pq_roles for each row execute function public.set_updated_at();
drop trigger if exists trg_pq_person_events_updated_at on public.pq_person_events;
create trigger trg_pq_person_events_updated_at before update on public.pq_person_events for each row execute function public.set_updated_at();
drop trigger if exists trg_pq_guests_updated_at on public.pq_guests;
create trigger trg_pq_guests_updated_at before update on public.pq_guests for each row execute function public.set_updated_at();
drop trigger if exists trg_pq_guest_messages_updated_at on public.pq_guest_messages;
create trigger trg_pq_guest_messages_updated_at before update on public.pq_guest_messages for each row execute function public.set_updated_at();
drop trigger if exists trg_pq_client_terms_updated_at on public.pq_client_terms;
create trigger trg_pq_client_terms_updated_at before update on public.pq_client_terms for each row execute function public.set_updated_at();
drop trigger if exists trg_pq_leads_updated_at on public.pq_leads;
create trigger trg_pq_leads_updated_at before update on public.pq_leads for each row execute function public.set_updated_at();

alter table public.pq_events enable row level security;
alter table public.pq_people enable row level security;
alter table public.pq_roles enable row level security;
alter table public.pq_person_events enable row level security;
alter table public.pq_guests enable row level security;
alter table public.pq_guest_messages enable row level security;
alter table public.pq_client_terms enable row level security;
alter table public.pq_leads enable row level security;

-- A aplicação usa SERVICE_ROLE nas rotas server-side. As políticas abaixo liberam leitura futura para usuários autenticados.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pq_events' and policyname = 'Authenticated can read pq_events') then
    create policy "Authenticated can read pq_events" on public.pq_events for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pq_people' and policyname = 'Authenticated can read pq_people') then
    create policy "Authenticated can read pq_people" on public.pq_people for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pq_roles' and policyname = 'Authenticated can read pq_roles') then
    create policy "Authenticated can read pq_roles" on public.pq_roles for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pq_person_events' and policyname = 'Authenticated can read pq_person_events') then
    create policy "Authenticated can read pq_person_events" on public.pq_person_events for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pq_guests' and policyname = 'Authenticated can read pq_guests') then
    create policy "Authenticated can read pq_guests" on public.pq_guests for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pq_guest_messages' and policyname = 'Authenticated can read pq_guest_messages') then
    create policy "Authenticated can read pq_guest_messages" on public.pq_guest_messages for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pq_client_terms' and policyname = 'Authenticated can read pq_client_terms') then
    create policy "Authenticated can read pq_client_terms" on public.pq_client_terms for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pq_leads' and policyname = 'Authenticated can read pq_leads') then
    create policy "Authenticated can read pq_leads" on public.pq_leads for select to authenticated using (true);
  end if;
end $$;

-- Demo navegável: Daniela 50 anos, com convidados fictícios para validar painel e relatórios.
with solution as (
  select id from public.ae_solutions where slug = 'presenca-querida'
), client_upsert as (
  insert into public.ae_clients (client_type, display_name, slug, email, whatsapp, city, state, status, notes, is_demo)
  values ('pessoa_fisica', 'Daniela 50 anos', 'daniela-50-anos-presenca-querida-demo', 'demo@automacaoextrema.com', '5519999990000', 'Campinas', 'SP', 'piloto', 'Evento demo do Presença Querida para validação de Cliente Fundador.', true)
  on conflict (slug) do update set display_name = excluded.display_name, updated_at = now()
  returning id
), event_upsert as (
  insert into public.pq_events (ae_client_id, event_type, name, slug, host_name, event_date, event_time, venue_name, city, state, whatsapp, email, public_headline, invitation_message, dress_code, parking_info, status, is_surprise, is_demo, notes)
  select client_upsert.id, 'aniversario', 'Daniela 50 anos', 'daniela-50-anos-demo', 'Daniela', '2026-09-12', '19h30', 'Espaço Jardim das Flores', 'Campinas', 'SP', '5519999990000', 'demo@automacaoextrema.com', 'Sua presença é muito querida nessa celebração.', 'Vamos celebrar os 50 anos da Daniela com alegria, carinho e muitas memórias. Confirme sua presença pelo link individual para nos ajudar na organização.', 'Esporte fino confortável', 'Estacionamento no local sujeito à lotação.', 'configuracao', false, true, 'Demo inicial para validar Save the Date, convite, confirmação e painel.'
  from client_upsert
  on conflict (slug) do update set name = excluded.name, updated_at = now()
  returning id
), role_org as (
  select id from public.pq_roles where slug = 'organizador' limit 1
), person_existing as (
  select id from public.pq_people where lower(email) = lower('demo@automacaoextrema.com') limit 1
), person_insert as (
  insert into public.pq_people (full_name, email, whatsapp, person_type, status, notes, is_demo)
  select 'Organizador Demo', 'demo@automacaoextrema.com', '5519999990000', 'organizador', 'ativo', 'Pessoa demo para o painel Presença Querida.', true
  where not exists (select 1 from person_existing)
  returning id
), person_upsert as (
  select id from person_insert
  union all
  select id from person_existing
  limit 1
), link_upsert as (
  insert into public.pq_person_events (person_id, event_id, role_id, is_manager, is_support)
  select person_upsert.id, event_upsert.id, role_org.id, true, true
  from person_upsert, event_upsert, role_org
  on conflict (person_id, event_id) do update set is_manager = true, is_support = true, updated_at = now()
  returning id
)
insert into public.pq_client_terms (event_id, solution_id, condition_label, contract_status, fee_status, setup_fee, event_fee, monthly_fee, pilot_days, allow_testimonial, allow_logo_use, allow_prints_use, terms_accepted, notes)
select event_upsert.id, solution.id, 'Cliente Fundador Demo', 'pendente_no_primeiro_acesso', 'em_definicao', 0, 0, 0, 30, true, false, true, false, 'Condição demo para validação do Presença Querida.'
from event_upsert, solution
on conflict (event_id, condition_label) do update set updated_at = now();

with ev as (select id from public.pq_events where slug = 'daniela-50-anos-demo'),
rows(full_name, whatsapp, group_name, guest_status, adults_count, children_count, companions_allowed, companions_confirmed_count, notes) as (
  values
    ('Ana Paula', '5519999991111', 'Família', 'pendente', 1, 0, 1, 0, 'Convidada próxima da família.'),
    ('Carlos Roberto', '5519999992222', 'Trabalho', 'confirmado', 1, 0, 0, 0, 'Confirmou sem acompanhante.'),
    ('Marina e João', '5519999993333', 'Amigos', 'talvez', 2, 1, 0, 0, 'Casal com uma criança.'),
    ('Tia Lúcia', '5519999994444', 'Família', 'confirmado_com_acompanhantes', 1, 0, 2, 2, 'Vai com duas pessoas.'),
    ('Rafael', '5519999995555', 'Grupo espiritual', 'nao_podera_ir', 1, 0, 0, 0, 'Agradeceu o convite.')
)
insert into public.pq_guests (event_id, full_name, whatsapp, group_name, guest_status, adults_count, children_count, companions_allowed, companions_confirmed_count, notes, invited_at, confirmed_at)
select ev.id, rows.full_name, rows.whatsapp, rows.group_name, rows.guest_status, rows.adults_count, rows.children_count, rows.companions_allowed, rows.companions_confirmed_count, rows.notes, now(), case when rows.guest_status in ('confirmado','confirmado_com_acompanhantes','nao_podera_ir','talvez') then now() else null end
from ev, rows
where not exists (
  select 1 from public.pq_guests g where g.event_id = ev.id and g.full_name = rows.full_name and coalesce(g.whatsapp, '') = coalesce(rows.whatsapp, '')
);

with ev as (select id from public.pq_events where slug = 'daniela-50-anos-demo'),
rows(phase, label, text) as (
  values
    ('save_the_date', 'Save the Date', 'Reserve essa data com carinho. Em breve enviaremos o convite oficial com todos os detalhes.'),
    ('convite_oficial', 'Convite oficial', 'Sua presença é muito importante para celebrar esse momento. Confirme pelo link para nos ajudar na organização.'),
    ('lembrete', 'Lembrete carinhoso', 'Passando só para lembrar do convite. Quando puder, confirme sua presença pelo link para organizarmos tudo com cuidado.'),
    ('orientacao_final', 'Orientação final', 'Está chegando! Seguem horário, endereço, traje, estacionamento e observações para chegar com tranquilidade.'),
    ('agradecimento', 'Agradecimento pós-evento', 'Foi muito especial ter você com a gente. Obrigado por fazer parte dessa memória querida.')
)
insert into public.pq_guest_messages (event_id, message_phase, template_label, message_text, status)
select ev.id, rows.phase, rows.label, rows.text, 'rascunho'
from ev, rows
where not exists (
  select 1 from public.pq_guest_messages m where m.event_id = ev.id and m.message_phase = rows.phase and m.template_label = rows.label
);

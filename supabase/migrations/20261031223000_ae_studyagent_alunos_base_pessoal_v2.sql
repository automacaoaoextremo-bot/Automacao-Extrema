begin;

-- StudyAgent V2 — cadastro próprio, progresso individual e base pessoal de conhecimento.
-- Não reutiliza pessoas/memberships da Organização em Harmonia/TUCXA.

create extension if not exists pgcrypto;

update public.ae_study_programs
set founder_label = null, updated_at = now()
where slug = 'residencia-ia';

create table if not exists public.ae_study_learners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ae_study_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.ae_study_programs(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'paused', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, program_id)
);

create table if not exists public.ae_study_user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.ae_study_programs(id) on delete cascade,
  competency_code text not null,
  current_level text not null default 'iniciante',
  status text not null default 'em_estudo' check (status in ('em_estudo', 'simulado', 'aprovado', 'revisar')),
  simulated_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, program_id, competency_code),
  foreign key(program_id, competency_code)
    references public.ae_study_competencies(program_id, code)
    on update cascade on delete cascade
);

create table if not exists public.ae_study_tutor_consultations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.ae_study_programs(id) on delete cascade,
  competency_code text,
  question text not null,
  answer text not null,
  provider text not null default 'integrated',
  created_at timestamptz not null default now(),
  foreign key(program_id, competency_code)
    references public.ae_study_competencies(program_id, code)
    on update cascade on delete restrict
);

create table if not exists public.ae_study_personal_knowledge (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.ae_study_programs(id) on delete cascade,
  competency_code text,
  title text not null,
  content text not null,
  source_type text not null default 'manual',
  source_reference text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(program_id, competency_code)
    references public.ae_study_competencies(program_id, code)
    on update cascade on delete restrict
);

create table if not exists public.ae_study_knowledge_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.ae_study_programs(id) on delete cascade,
  competency_code text,
  consultation_id uuid references public.ae_study_tutor_consultations(id) on delete set null,
  suggestion_type text not null check (suggestion_type in ('new', 'complement', 'divergence')),
  proposed_title text not null,
  proposed_content text not null,
  rationale text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  accepted_knowledge_id uuid references public.ae_study_personal_knowledge(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  foreign key(program_id, competency_code)
    references public.ae_study_competencies(program_id, code)
    on update cascade on delete restrict
);

create index if not exists ae_study_enrollments_user_idx
  on public.ae_study_enrollments(user_id, program_id);
create index if not exists ae_study_progress_user_idx
  on public.ae_study_user_progress(user_id, program_id, competency_code);
create index if not exists ae_study_consultations_user_idx
  on public.ae_study_tutor_consultations(user_id, program_id, created_at desc);
create index if not exists ae_study_personal_knowledge_user_idx
  on public.ae_study_personal_knowledge(user_id, program_id, updated_at desc);
create index if not exists ae_study_suggestions_user_idx
  on public.ae_study_knowledge_suggestions(user_id, program_id, status, created_at desc);

alter table public.ae_study_learners enable row level security;
alter table public.ae_study_enrollments enable row level security;
alter table public.ae_study_user_progress enable row level security;
alter table public.ae_study_tutor_consultations enable row level security;
alter table public.ae_study_personal_knowledge enable row level security;
alter table public.ae_study_knowledge_suggestions enable row level security;

-- Perfil do aluno
 drop policy if exists "study_learners_read_own" on public.ae_study_learners;
create policy "study_learners_read_own" on public.ae_study_learners
  for select using (auth.uid() = user_id);
 drop policy if exists "study_learners_update_own" on public.ae_study_learners;
create policy "study_learners_update_own" on public.ae_study_learners
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Matrículas
 drop policy if exists "study_enrollments_read_own" on public.ae_study_enrollments;
create policy "study_enrollments_read_own" on public.ae_study_enrollments
  for select using (auth.uid() = user_id);

-- Progresso
 drop policy if exists "study_progress_read_own" on public.ae_study_user_progress;
create policy "study_progress_read_own" on public.ae_study_user_progress
  for select using (auth.uid() = user_id);
 drop policy if exists "study_progress_insert_own" on public.ae_study_user_progress;
create policy "study_progress_insert_own" on public.ae_study_user_progress
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.ae_study_enrollments e
      where e.user_id = auth.uid() and e.program_id = ae_study_user_progress.program_id and e.status = 'active'
    )
  );
 drop policy if exists "study_progress_update_own" on public.ae_study_user_progress;
create policy "study_progress_update_own" on public.ae_study_user_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Consultas: leitura pelo usuário; inserção feita pela API autenticada do StudyAgent.
 drop policy if exists "study_consultations_read_own" on public.ae_study_tutor_consultations;
create policy "study_consultations_read_own" on public.ae_study_tutor_consultations
  for select using (auth.uid() = user_id);

-- Base pessoal
 drop policy if exists "study_personal_knowledge_read_own" on public.ae_study_personal_knowledge;
create policy "study_personal_knowledge_read_own" on public.ae_study_personal_knowledge
  for select using (auth.uid() = user_id);
 drop policy if exists "study_personal_knowledge_insert_own" on public.ae_study_personal_knowledge;
create policy "study_personal_knowledge_insert_own" on public.ae_study_personal_knowledge
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.ae_study_enrollments e
      where e.user_id = auth.uid() and e.program_id = ae_study_personal_knowledge.program_id and e.status = 'active'
    )
  );
 drop policy if exists "study_personal_knowledge_update_own" on public.ae_study_personal_knowledge;
create policy "study_personal_knowledge_update_own" on public.ae_study_personal_knowledge
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
 drop policy if exists "study_personal_knowledge_delete_own" on public.ae_study_personal_knowledge;
create policy "study_personal_knowledge_delete_own" on public.ae_study_personal_knowledge
  for delete using (auth.uid() = user_id);

-- Sugestões: usuário lê e decide; criação é feita pela API autenticada.
 drop policy if exists "study_suggestions_read_own" on public.ae_study_knowledge_suggestions;
create policy "study_suggestions_read_own" on public.ae_study_knowledge_suggestions
  for select using (auth.uid() = user_id);
 drop policy if exists "study_suggestions_update_own" on public.ae_study_knowledge_suggestions;
create policy "study_suggestions_update_own" on public.ae_study_knowledge_suggestions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, update on public.ae_study_learners to authenticated;
grant select on public.ae_study_enrollments to authenticated;
grant select, insert, update on public.ae_study_user_progress to authenticated;
grant select on public.ae_study_tutor_consultations to authenticated;
grant select, insert, update, delete on public.ae_study_personal_knowledge to authenticated;
grant select, update on public.ae_study_knowledge_suggestions to authenticated;

create or replace function public.ae_study_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

 drop trigger if exists ae_study_learners_touch_updated_at on public.ae_study_learners;
create trigger ae_study_learners_touch_updated_at
before update on public.ae_study_learners
for each row execute function public.ae_study_touch_updated_at();

 drop trigger if exists ae_study_enrollments_touch_updated_at on public.ae_study_enrollments;
create trigger ae_study_enrollments_touch_updated_at
before update on public.ae_study_enrollments
for each row execute function public.ae_study_touch_updated_at();

 drop trigger if exists ae_study_progress_touch_updated_at on public.ae_study_user_progress;
create trigger ae_study_progress_touch_updated_at
before update on public.ae_study_user_progress
for each row execute function public.ae_study_touch_updated_at();

 drop trigger if exists ae_study_personal_knowledge_touch_updated_at on public.ae_study_personal_knowledge;
create trigger ae_study_personal_knowledge_touch_updated_at
before update on public.ae_study_personal_knowledge
for each row execute function public.ae_study_touch_updated_at();

-- Cria perfil e matrícula somente para cadastros explicitamente originados do StudyAgent.
create or replace function public.ae_study_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_program_slug text;
  requested_program_id uuid;
begin
  if coalesce(new.raw_user_meta_data->>'studyagent_profile', '') <> 'learner' then
    return new;
  end if;

  insert into public.ae_study_learners(user_id, full_name, phone)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), '')
  )
  on conflict (user_id) do update set
    full_name = coalesce(excluded.full_name, ae_study_learners.full_name),
    phone = coalesce(excluded.phone, ae_study_learners.phone),
    updated_at = now();

  requested_program_slug := coalesce(nullif(trim(new.raw_user_meta_data->>'study_program_slug'), ''), 'residencia-ia');
  select id into requested_program_id
  from public.ae_study_programs
  where slug = requested_program_slug and active = true
  limit 1;

  if requested_program_id is not null then
    insert into public.ae_study_enrollments(user_id, program_id, status)
    values (new.id, requested_program_id, 'active')
    on conflict (user_id, program_id) do update set
      status = 'active',
      updated_at = now();
  end if;

  return new;
end;
$$;

 drop trigger if exists on_auth_user_created_studyagent on auth.users;
create trigger on_auth_user_created_studyagent
after insert on auth.users
for each row execute function public.ae_study_handle_new_auth_user();

comment on table public.ae_study_learners is 'Perfil próprio do aluno StudyAgent, independente das tabelas de clientes/TUCXA.';
comment on table public.ae_study_personal_knowledge is 'Conhecimento pessoal confirmado pelo estudante. Não é base oficial do programa.';
comment on table public.ae_study_knowledge_suggestions is 'Sugestões do Tutor aguardando decisão humana antes de alterar a base pessoal.';

commit;

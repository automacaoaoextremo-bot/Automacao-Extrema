begin;

-- StudyAgent V3 — competências dinâmicas, plano estruturado, compartilhamento e revalidação.
-- Base funcional: ResidênciaIA-Conhecimentos + Residência IA - Plano de Conhecimentos.
-- Não altera tabelas do TUCXA.

create extension if not exists pgcrypto;

alter table public.ae_study_competencies
  add column if not exists content_version integer not null default 1,
  add column if not exists source_type text not null default 'reflection',
  add column if not exists source_reference text,
  add column if not exists change_note text;

alter table public.ae_study_competency_edges
  add column if not exists active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

update public.ae_study_competencies
set source_type = coalesce(nullif(source_type, ''), 'reflection'),
    source_reference = coalesce(
      source_reference,
      'ResidênciaIA-Conhecimentos + Residência IA - Plano de Conhecimentos'
    ),
    content_version = greatest(coalesce(content_version, 1), 1)
where program_id = '7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid;

create table if not exists public.ae_study_competency_level_plans (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.ae_study_programs(id) on delete cascade,
  competency_code text not null,
  level_key text not null,
  level_order integer not null check (level_order between 1 and 20),
  level_label text not null,
  objective text not null,
  criterion_original text,
  practical_requirements text,
  best_practices text,
  study_suggested text,
  practical_exercise text,
  assessment_suggested text,
  evidence_expected text,
  market_differential text,
  planned_hours numeric(8,2),
  resource_1 text,
  resource_2 text,
  reflection_source text,
  content_version integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(program_id, competency_code, level_key),
  foreign key(program_id, competency_code)
    references public.ae_study_competencies(program_id, code)
    on update cascade on delete cascade
);

create index if not exists ae_study_level_plans_program_idx
  on public.ae_study_competency_level_plans(program_id, competency_code, level_order);

alter table public.ae_study_competency_level_plans enable row level security;

drop policy if exists "study_level_plans_public_read" on public.ae_study_competency_level_plans;
create policy "study_level_plans_public_read"
  on public.ae_study_competency_level_plans for select
  using (
    active = true
    and exists (
      select 1
      from public.ae_study_programs p
      where p.id = program_id and p.active = true
    )
  );

grant select on public.ae_study_competency_level_plans to anon, authenticated;

create table if not exists public.ae_study_user_competencies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.ae_study_programs(id) on delete cascade,
  title text not null,
  summary text not null,
  category text not null default 'Competência pessoal',
  why_it_matters text,
  evidence_suggestion text,
  related_official_codes text[] not null default '{}',
  visibility text not null default 'private' check (visibility in ('private', 'shared')),
  status text not null default 'active' check (status in ('active', 'archived')),
  content_version integer not null default 1,
  change_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ae_study_user_competencies_owner_idx
  on public.ae_study_user_competencies(user_id, program_id, updated_at desc);
create index if not exists ae_study_user_competencies_shared_idx
  on public.ae_study_user_competencies(program_id, visibility, status, updated_at desc);

alter table public.ae_study_user_competencies enable row level security;

drop policy if exists "study_user_competencies_read" on public.ae_study_user_competencies;
create policy "study_user_competencies_read"
  on public.ae_study_user_competencies for select
  using (
    auth.uid() = user_id
    or (visibility = 'shared' and status = 'active')
  );

drop policy if exists "study_user_competencies_insert_own" on public.ae_study_user_competencies;
create policy "study_user_competencies_insert_own"
  on public.ae_study_user_competencies for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.ae_study_enrollments e
      where e.user_id = auth.uid()
        and e.program_id = ae_study_user_competencies.program_id
        and e.status = 'active'
    )
  );

drop policy if exists "study_user_competencies_update_own" on public.ae_study_user_competencies;
create policy "study_user_competencies_update_own"
  on public.ae_study_user_competencies for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "study_user_competencies_delete_own" on public.ae_study_user_competencies;
create policy "study_user_competencies_delete_own"
  on public.ae_study_user_competencies for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.ae_study_user_competencies to authenticated;

create table if not exists public.ae_study_user_competency_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_competency_id uuid not null references public.ae_study_user_competencies(id) on delete cascade,
  subscribed_version integer not null default 1,
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, user_competency_id)
);

alter table public.ae_study_user_competency_subscriptions enable row level security;

drop policy if exists "study_user_comp_subscriptions_own" on public.ae_study_user_competency_subscriptions;
create policy "study_user_comp_subscriptions_own"
  on public.ae_study_user_competency_subscriptions for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.ae_study_user_competencies c
      where c.id = user_competency_id
        and c.visibility = 'shared'
        and c.status = 'active'
    )
  );

grant select, insert, update, delete on public.ae_study_user_competency_subscriptions to authenticated;

alter table public.ae_study_personal_knowledge
  add column if not exists visibility text not null default 'private',
  add column if not exists content_version integer not null default 1,
  add column if not exists change_note text,
  add column if not exists shared_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ae_study_personal_knowledge_visibility_check'
  ) then
    alter table public.ae_study_personal_knowledge
      add constraint ae_study_personal_knowledge_visibility_check
      check (visibility in ('private', 'shared'));
  end if;
end;
$$;

drop policy if exists "study_personal_knowledge_read_shared" on public.ae_study_personal_knowledge;
create policy "study_personal_knowledge_read_shared"
  on public.ae_study_personal_knowledge for select
  using (visibility = 'shared' and status = 'active');

create table if not exists public.ae_study_shared_knowledge_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  knowledge_id uuid not null references public.ae_study_personal_knowledge(id) on delete cascade,
  subscribed_version integer not null default 1,
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, knowledge_id)
);

alter table public.ae_study_shared_knowledge_subscriptions enable row level security;

drop policy if exists "study_shared_knowledge_subscriptions_own" on public.ae_study_shared_knowledge_subscriptions;
create policy "study_shared_knowledge_subscriptions_own"
  on public.ae_study_shared_knowledge_subscriptions for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.ae_study_personal_knowledge k
      where k.id = knowledge_id
        and k.visibility = 'shared'
        and k.status = 'active'
    )
  );

grant select, insert, update, delete on public.ae_study_shared_knowledge_subscriptions to authenticated;

create table if not exists public.ae_study_revalidation_notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.ae_study_programs(id) on delete cascade,
  source_kind text not null check (
    source_kind in ('official_competency', 'shared_competency', 'shared_knowledge')
  ),
  source_key text not null,
  source_title text not null,
  competency_code text,
  from_version integer not null,
  to_version integer not null,
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'revalidated', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique(user_id, source_kind, source_key, to_version)
);

create index if not exists ae_study_revalidation_notices_user_idx
  on public.ae_study_revalidation_notices(user_id, program_id, status, created_at desc);

alter table public.ae_study_revalidation_notices enable row level security;

drop policy if exists "study_revalidation_read_own" on public.ae_study_revalidation_notices;
create policy "study_revalidation_read_own"
  on public.ae_study_revalidation_notices for select
  using (auth.uid() = user_id);

drop policy if exists "study_revalidation_update_own" on public.ae_study_revalidation_notices;
create policy "study_revalidation_update_own"
  on public.ae_study_revalidation_notices for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, update on public.ae_study_revalidation_notices to authenticated;

create table if not exists public.ae_study_level_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.ae_study_programs(id) on delete cascade,
  competency_code text not null,
  level_key text not null,
  attempt integer not null default 1 check (attempt >= 1),
  quiz_score numeric(5,2),
  practice_score numeric(5,2),
  explanation_score numeric(5,2),
  final_score numeric(5,2),
  result text not null default 'pending'
    check (result in ('pending', 'approved', 'review')),
  feedback text,
  review_points text,
  evidence_link text,
  assessed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, program_id, competency_code, level_key, attempt),
  foreign key(program_id, competency_code)
    references public.ae_study_competencies(program_id, code)
    on update cascade on delete cascade
);

create table if not exists public.ae_study_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.ae_study_programs(id) on delete cascade,
  competency_code text not null,
  level_key text,
  evidence_type text not null,
  description text not null,
  link text,
  reviewer text,
  feedback_received text,
  improvement_action text,
  status text not null default 'planned'
    check (status in ('planned', 'in_review', 'validated', 'rejected')),
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(program_id, competency_code)
    references public.ae_study_competencies(program_id, code)
    on update cascade on delete cascade
);

alter table public.ae_study_level_assessments enable row level security;
alter table public.ae_study_evidence enable row level security;

drop policy if exists "study_level_assessments_own" on public.ae_study_level_assessments;
create policy "study_level_assessments_own"
  on public.ae_study_level_assessments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "study_evidence_own" on public.ae_study_evidence;
create policy "study_evidence_own"
  on public.ae_study_evidence for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.ae_study_level_assessments to authenticated;
grant select, insert, update, delete on public.ae_study_evidence to authenticated;

create or replace function public.ae_study_bump_official_competency_version()
returns trigger
language plpgsql
as $$
begin
  if row(
    new.title, new.summary, new.category, new.why_it_matters,
    new.evidence_suggestion, new.reflection_sources, new.active
  ) is distinct from row(
    old.title, old.summary, old.category, old.why_it_matters,
    old.evidence_suggestion, old.reflection_sources, old.active
  ) then
    new.content_version := greatest(coalesce(old.content_version, 1) + 1, 2);
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists ae_study_competency_bump_version on public.ae_study_competencies;
create trigger ae_study_competency_bump_version
before update on public.ae_study_competencies
for each row execute function public.ae_study_bump_official_competency_version();

create or replace function public.ae_study_notify_official_competency_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.content_version > old.content_version then
    insert into public.ae_study_revalidation_notices(
      user_id, program_id, source_kind, source_key, source_title,
      competency_code, from_version, to_version, reason
    )
    select
      p.user_id,
      new.program_id,
      'official_competency',
      new.code,
      new.title,
      new.code,
      old.content_version,
      new.content_version,
      coalesce(nullif(new.change_note, ''), 'A competência oficial foi atualizada. Revise o que mudou antes de considerar seu conhecimento atual.')
    from public.ae_study_user_progress p
    where p.program_id = new.program_id
      and p.competency_code = new.code
      and (
        p.simulated_completed = true
        or p.status in ('simulado', 'aprovado', 'revisar')
      )
    on conflict (user_id, source_kind, source_key, to_version) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists ae_study_competency_notify_revalidation on public.ae_study_competencies;
create trigger ae_study_competency_notify_revalidation
after update on public.ae_study_competencies
for each row execute function public.ae_study_notify_official_competency_change();


create or replace function public.ae_study_bump_level_plan_version()
returns trigger
language plpgsql
as $$
begin
  if row(
    new.objective, new.criterion_original, new.practical_requirements,
    new.best_practices, new.study_suggested, new.practical_exercise,
    new.assessment_suggested, new.evidence_expected, new.market_differential,
    new.planned_hours, new.resource_1, new.resource_2, new.active
  ) is distinct from row(
    old.objective, old.criterion_original, old.practical_requirements,
    old.best_practices, old.study_suggested, old.practical_exercise,
    old.assessment_suggested, old.evidence_expected, old.market_differential,
    old.planned_hours, old.resource_1, old.resource_2, old.active
  ) then
    new.content_version := greatest(coalesce(old.content_version, 1) + 1, 2);
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists ae_study_level_plan_bump_version on public.ae_study_competency_level_plans;
create trigger ae_study_level_plan_bump_version
before update on public.ae_study_competency_level_plans
for each row execute function public.ae_study_bump_level_plan_version();

create or replace function public.ae_study_notify_level_plan_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.content_version > old.content_version then
    insert into public.ae_study_revalidation_notices(
      user_id, program_id, source_kind, source_key, source_title,
      competency_code, from_version, to_version, reason
    )
    select
      p.user_id,
      new.program_id,
      'official_competency',
      new.competency_code || ':' || new.level_key,
      new.competency_code || ' · ' || new.level_label,
      new.competency_code,
      old.content_version,
      new.content_version,
      'O plano oficial deste nível foi atualizado. Revise objetivo, prática, avaliação e evidência antes de considerar o conhecimento plenamente atual.'
    from public.ae_study_user_progress p
    where p.program_id = new.program_id
      and p.competency_code = new.competency_code
      and (
        p.simulated_completed = true
        or p.status in ('simulado', 'aprovado', 'revisar')
      )
    on conflict (user_id, source_kind, source_key, to_version) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists ae_study_level_plan_notify_revalidation on public.ae_study_competency_level_plans;
create trigger ae_study_level_plan_notify_revalidation
after update on public.ae_study_competency_level_plans
for each row execute function public.ae_study_notify_level_plan_change();

create or replace function public.ae_study_bump_user_competency_version()
returns trigger
language plpgsql
as $$
begin
  if row(
    new.title, new.summary, new.category, new.why_it_matters,
    new.evidence_suggestion, new.related_official_codes, new.visibility, new.status
  ) is distinct from row(
    old.title, old.summary, old.category, old.why_it_matters,
    old.evidence_suggestion, old.related_official_codes, old.visibility, old.status
  ) then
    new.content_version := greatest(coalesce(old.content_version, 1) + 1, 2);
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists ae_study_user_competency_bump_version on public.ae_study_user_competencies;
create trigger ae_study_user_competency_bump_version
before update on public.ae_study_user_competencies
for each row execute function public.ae_study_bump_user_competency_version();

create or replace function public.ae_study_notify_shared_competency_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.content_version > old.content_version and new.visibility = 'shared' then
    insert into public.ae_study_revalidation_notices(
      user_id, program_id, source_kind, source_key, source_title,
      competency_code, from_version, to_version, reason
    )
    select
      s.user_id,
      new.program_id,
      'shared_competency',
      new.id::text,
      new.title,
      null,
      old.content_version,
      new.content_version,
      coalesce(nullif(new.change_note, ''), 'Uma competência compartilhada que você acompanha foi atualizada. Revise a mudança antes de reutilizar o conhecimento.')
    from public.ae_study_user_competency_subscriptions s
    where s.user_competency_id = new.id
      and s.status = 'active'
      and s.user_id <> new.user_id
    on conflict (user_id, source_kind, source_key, to_version) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists ae_study_user_competency_notify_revalidation on public.ae_study_user_competencies;
create trigger ae_study_user_competency_notify_revalidation
after update on public.ae_study_user_competencies
for each row execute function public.ae_study_notify_shared_competency_change();

create or replace function public.ae_study_bump_personal_knowledge_version()
returns trigger
language plpgsql
as $$
begin
  if row(
    new.title, new.content, new.competency_code, new.visibility, new.status
  ) is distinct from row(
    old.title, old.content, old.competency_code, old.visibility, old.status
  ) then
    new.content_version := greatest(coalesce(old.content_version, 1) + 1, 2);
    new.updated_at := now();
    if new.visibility = 'shared' and old.visibility <> 'shared' then
      new.shared_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists ae_study_personal_knowledge_bump_version on public.ae_study_personal_knowledge;
create trigger ae_study_personal_knowledge_bump_version
before update on public.ae_study_personal_knowledge
for each row execute function public.ae_study_bump_personal_knowledge_version();

create or replace function public.ae_study_notify_shared_knowledge_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.content_version > old.content_version and new.visibility = 'shared' then
    insert into public.ae_study_revalidation_notices(
      user_id, program_id, source_kind, source_key, source_title,
      competency_code, from_version, to_version, reason
    )
    select
      s.user_id,
      new.program_id,
      'shared_knowledge',
      new.id::text,
      new.title,
      new.competency_code,
      old.content_version,
      new.content_version,
      coalesce(nullif(new.change_note, ''), 'Um conhecimento compartilhado que você acompanha foi atualizado. Verifique se seu estudo precisa ser revisto.')
    from public.ae_study_shared_knowledge_subscriptions s
    where s.knowledge_id = new.id
      and s.status = 'active'
      and s.user_id <> new.user_id
    on conflict (user_id, source_kind, source_key, to_version) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists ae_study_personal_knowledge_notify_revalidation on public.ae_study_personal_knowledge;
create trigger ae_study_personal_knowledge_notify_revalidation
after update on public.ae_study_personal_knowledge
for each row execute function public.ae_study_notify_shared_knowledge_change();

insert into public.ae_study_competency_level_plans (
  program_id, competency_code, level_key, level_order, level_label,
  objective, criterion_original, practical_requirements, best_practices,
  study_suggested, practical_exercise, assessment_suggested, evidence_expected,
  market_differential, planned_hours, resource_1, resource_2, reflection_source, active
)
values
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K01', 'iniciante', 1, 'Iniciante', 'Distinguir problema de negócio, automação por regras e problema potencial de IA.', 'Propõe IA como solução para qualquer problema, sem avaliar viabilidade.', 'Distinguir problema de negócio, automação por regras e problema potencial de IA.', 'Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Propõe IA como solução para qualquer problema, sem avaliar viabilidade. Requisitos práticos: Distinguir problema de negócio, automação por regras e problema potencial de IA. Boas práticas: Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Reproduza um exemplo guiado e depois explique cada etapa sem consultar o roteiro.', 'Quiz de 10 questões + explicação oral curta + exercício guiado alterado.', 'Classificar 10 problemas como IA/não-IA com justificativa.', 'Vocabulário técnico correto e execução consciente.', 2.5, 'https://developers.google.com/machine-learning/problem-framing', 'https://developers.google.com/machine-learning/crash-course/', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K01', 'basico', 2, 'Básico', 'Mapear objetivo, saída esperada, dados disponíveis e um baseline não-IA.', 'Reconhece problemas típicos onde IA é aplicável (classificação, previsão) com apoio.', 'Mapear objetivo, saída esperada, dados disponíveis e um baseline não-IA.', 'Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Reconhece problemas típicos onde IA é aplicável (classificação, previsão) com apoio. Requisitos práticos: Mapear objetivo, saída esperada, dados disponíveis e um baseline não-IA. Boas práticas: Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Refaça em um cenário/dataset simples diferente, sem copiar o exemplo, registrando decisões.', 'Quiz de 12 questões + exercício autônomo em cenário simples + explicação das decisões.', 'Canvas de problem framing para um caso simples + baseline não-IA.', 'Autonomia em casos simples e comunicação clara do raciocínio.', 3.0, 'https://developers.google.com/machine-learning/problem-framing', 'https://developers.google.com/machine-learning/crash-course/', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K01', 'intermediario', 3, 'Intermediário', 'Avaliar viabilidade técnica, dados, riscos, custo, métrica de sucesso e alternativa simples.', 'Mapeia dores de negócio e avalia disponibilidade de dados/recursos para julgar a viabilidade de uma solução com IA.', 'Avaliar viabilidade técnica, dados, riscos, custo, métrica de sucesso e alternativa simples.', 'Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Mapeia dores de negócio e avalia disponibilidade de dados/recursos para julgar a viabilidade de uma solução com IA. Requisitos práticos: Avaliar viabilidade técnica, dados, riscos, custo, métrica de sucesso e alternativa simples. Boas práticas: Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Aplique em um caso real, compare alternativas e documente hipóteses, métricas e limitações.', 'Mini-case de 60–90 min + defesa técnica + análise de premissas e limitações.', 'Memo de viabilidade com dados, métrica, restrições, riscos e recomendação.', 'Decisão orientada por evidências e adaptação ao contexto.', 4.0, 'https://developers.google.com/machine-learning/problem-framing', 'https://developers.google.com/machine-learning/crash-course/', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K01', 'avancado', 4, 'Avançado', 'Construir um framework de decisão IA vs solução simples considerando valor, custo, manutenção e risco.', 'Distingue com precisão quando IA agrega valor real versus quando uma solução mais simples resolveria o problema, evitando over-engineering.', 'Construir um framework de decisão IA vs solução simples considerando valor, custo, manutenção e risco.', 'Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Distingue com precisão quando IA agrega valor real versus quando uma solução mais simples resolveria o problema, evitando over-engineering. Requisitos práticos: Construir um framework de decisão IA vs solução simples considerando valor, custo, manutenção e risco. Boas práticas: Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Crie versão robusta/reutilizável, faça revisão por pares e valide se outra pessoa consegue reproduzir.', 'Case aberto + defesa de trade-offs + revisão por pares + evidência reproduzível.', 'Decisão arquitetural comparando IA e solução simples com trade-offs e custo de ciclo de vida.', 'Maturidade profissional para lidar com trade-offs, escala, risco e governança.', 4.5, 'https://developers.google.com/machine-learning/problem-framing', 'https://developers.google.com/machine-learning/crash-course/', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K02', 'iniciante', 1, 'Iniciante', 'Reconhecer supervisionado, não supervisionado, reforço, regras e IA generativa.', 'Conhece os nomes dos paradigmas (supervisionado, não supervisionado, LLMs) mas não sabe quando aplicar cada um.', 'Reconhecer supervisionado, não supervisionado, reforço, regras e IA generativa.', 'Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Conhece os nomes dos paradigmas (supervisionado, não supervisionado, LLMs) mas não sabe quando aplicar cada um. Requisitos práticos: Reconhecer supervisionado, não supervisionado, reforço, regras e IA generativa. Boas práticas: Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Reproduza um exemplo guiado e depois explique cada etapa sem consultar o roteiro.', 'Quiz de 10 questões + explicação oral curta + exercício guiado alterado.', 'Tabela com paradigmas, sinais de uso e exemplos.', 'Vocabulário técnico correto e execução consciente.', 2.5, 'https://developers.google.com/machine-learning/problem-framing/ml-framing', 'https://developers.google.com/machine-learning/crash-course/', '25/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K02', 'basico', 2, 'Básico', 'Escolher supervisionado vs não supervisionado pela presença de rótulos e objetivo.', 'Escolhe entre paradigmas básicos (supervisionado vs. não supervisionado) em problemas simples e bem definidos.', 'Escolher supervisionado vs não supervisionado pela presença de rótulos e objetivo.', 'Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Escolhe entre paradigmas básicos (supervisionado vs. não supervisionado) em problemas simples e bem definidos. Requisitos práticos: Escolher supervisionado vs não supervisionado pela presença de rótulos e objetivo. Boas práticas: Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Refaça em um cenário/dataset simples diferente, sem copiar o exemplo, registrando decisões.', 'Quiz de 12 questões + exercício autônomo em cenário simples + explicação das decisões.', 'Resolver 10 cenários escolhendo paradigma e justificando.', 'Autonomia em casos simples e comunicação clara do raciocínio.', 3.0, 'https://developers.google.com/machine-learning/problem-framing/ml-framing', 'https://developers.google.com/machine-learning/crash-course/', '25/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K02', 'intermediario', 3, 'Intermediário', 'Comparar regras, ML clássico, reforço e LLMs por dados, saída, risco e custo.', 'Seleciona o paradigma mais adequado (incluindo reforço, LLMs, regras) considerando o problema e o contexto.', 'Comparar regras, ML clássico, reforço e LLMs por dados, saída, risco e custo.', 'Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Seleciona o paradigma mais adequado (incluindo reforço, LLMs, regras) considerando o problema e o contexto. Requisitos práticos: Comparar regras, ML clássico, reforço e LLMs por dados, saída, risco e custo. Boas práticas: Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Aplique em um caso real, compare alternativas e documente hipóteses, métricas e limitações.', 'Mini-case de 60–90 min + defesa técnica + análise de premissas e limitações.', 'Case comparativo com pelo menos 3 abordagens e trade-offs.', 'Decisão orientada por evidências e adaptação ao contexto.', 4.0, 'https://developers.google.com/machine-learning/problem-framing/ml-framing', 'https://developers.google.com/machine-learning/crash-course/', '25/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K02', 'avancado', 4, 'Avançado', 'Projetar solução híbrida quando necessário e justificar integração e manutenção.', 'Combina múltiplos paradigmas de forma justificada em soluções complexas, avaliando trade-offs de custo, dado e manutenção.', 'Projetar solução híbrida quando necessário e justificar integração e manutenção.', 'Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Combina múltiplos paradigmas de forma justificada em soluções complexas, avaliando trade-offs de custo, dado e manutenção. Requisitos práticos: Projetar solução híbrida quando necessário e justificar integração e manutenção. Boas práticas: Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Crie versão robusta/reutilizável, faça revisão por pares e valide se outra pessoa consegue reproduzir.', 'Case aberto + defesa de trade-offs + revisão por pares + evidência reproduzível.', 'Arquitetura híbrida com justificativa, riscos e critérios de evolução.', 'Maturidade profissional para lidar com trade-offs, escala, risco e governança.', 4.5, 'https://developers.google.com/machine-learning/problem-framing/ml-framing', 'https://developers.google.com/machine-learning/crash-course/', '25/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K03', 'iniciante', 1, 'Iniciante', 'Identificar X, y, rótulos, classes, regressão e clusters; executar exemplo guiado.', 'Reconhece a diferença conceitual entre supervisionado e não supervisionado, mas não implementa sozinho.', 'Identificar X, y, rótulos, classes, regressão e clusters; executar exemplo guiado.', 'Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Reconhece a diferença conceitual entre supervisionado e não supervisionado, mas não implementa sozinho. Requisitos práticos: Identificar X, y, rótulos, classes, regressão e clusters; executar exemplo guiado. Boas práticas: Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Reproduza um exemplo guiado e depois explique cada etapa sem consultar o roteiro.', 'Quiz de 10 questões + explicação oral curta + exercício guiado alterado.', 'Notebook guiado com um exemplo supervisionado e um clustering.', 'Vocabulário técnico correto e execução consciente.', 2.5, 'https://scikit-learn.org/stable/user_guide.html', 'https://developers.google.com/machine-learning/crash-course/', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K03', 'basico', 2, 'Básico', 'Implementar classificação/regressão e clustering simples do zero com sklearn.', 'Implementa um modelo supervisionado simples (classificação/regressão) e um algoritmo básico de clustering.', 'Implementar classificação/regressão e clustering simples do zero com sklearn.', 'Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Implementa um modelo supervisionado simples (classificação/regressão) e um algoritmo básico de clustering. Requisitos práticos: Implementar classificação/regressão e clustering simples do zero com sklearn. Boas práticas: Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Refaça em um cenário/dataset simples diferente, sem copiar o exemplo, registrando decisões.', 'Quiz de 12 questões + exercício autônomo em cenário simples + explicação das decisões.', 'Dois notebooks autônomos: um supervisionado e um não supervisionado.', 'Autonomia em casos simples e comunicação clara do raciocínio.', 3.0, 'https://scikit-learn.org/stable/user_guide.html', 'https://developers.google.com/machine-learning/crash-course/', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K03', 'intermediario', 3, 'Intermediário', 'Escolher paradigma conforme rótulos, objetivo e validação; aplicar a dados reais.', 'Aplica ambos os paradigmas para resolver problemas reais, escolhendo o adequado conforme a disponibilidade de rótulos.', 'Escolher paradigma conforme rótulos, objetivo e validação; aplicar a dados reais.', 'Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Aplica ambos os paradigmas para resolver problemas reais, escolhendo o adequado conforme a disponibilidade de rótulos. Requisitos práticos: Escolher paradigma conforme rótulos, objetivo e validação; aplicar a dados reais. Boas práticas: Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Aplique em um caso real, compare alternativas e documente hipóteses, métricas e limitações.', 'Mini-case de 60–90 min + defesa técnica + análise de premissas e limitações.', 'Case real comparando decisão de paradigma, validação e limitações.', 'Decisão orientada por evidências e adaptação ao contexto.', 4.0, 'https://scikit-learn.org/stable/user_guide.html', 'https://developers.google.com/machine-learning/crash-course/', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K03', 'avancado', 4, 'Avançado', 'Combinar paradigmas e validar se a combinação melhora o resultado sem leakage.', 'Combina técnicas supervisionadas e não supervisionadas (ex: pseudo-rotulagem, clustering para feature engineering) em soluções mais sofisticadas.', 'Combinar paradigmas e validar se a combinação melhora o resultado sem leakage.', 'Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Combina técnicas supervisionadas e não supervisionadas (ex: pseudo-rotulagem, clustering para feature engineering) em soluções mais sofisticadas. Requisitos práticos: Combinar paradigmas e validar se a combinação melhora o resultado sem leakage. Boas práticas: Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Crie versão robusta/reutilizável, faça revisão por pares e valide se outra pessoa consegue reproduzir.', 'Case aberto + defesa de trade-offs + revisão por pares + evidência reproduzível.', 'Pipeline combinado com ablation/ comparação que demonstre o ganho da combinação.', 'Maturidade profissional para lidar com trade-offs, escala, risco e governança.', 4.5, 'https://scikit-learn.org/stable/user_guide.html', 'https://developers.google.com/machine-learning/crash-course/', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K04', 'iniciante', 1, 'Iniciante', 'Saber carregar CSV/planilha, usar head/info/describe e gerar histogramas/barras.', 'Gera estatísticas descritivas e gráficos básicos seguindo um roteiro/tutorial, sem interpretar os resultados.', 'Saber carregar CSV/planilha, usar head/info/describe e gerar histogramas/barras.', 'Notebook reproduzível; separar observação de conclusão; registrar perguntas sobre os dados.', 'Gera estatísticas descritivas e gráficos básicos seguindo um roteiro/tutorial, sem interpretar os resultados. Requisitos práticos: Saber carregar CSV/planilha, usar head/info/describe e gerar histogramas/barras. Boas práticas: Notebook reproduzível; separar observação de conclusão; registrar perguntas sobre os dados.', 'Reproduza um exemplo guiado e depois explique cada etapa sem consultar o roteiro.', 'Quiz de 10 questões + explicação oral curta + exercício guiado alterado.', 'Notebook curto com describe + 3 gráficos + comentários do que cada gráfico mostra.', 'Portfólio com EDA clara e orientada a perguntas, não apenas gráficos.', 2.5, 'https://pandas.pydata.org/docs/getting_started/', 'https://www.kaggle.com/learn/pandas', '18/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K04', 'basico', 2, 'Básico', 'Investigar tipos, distribuição, ausentes, duplicados, outliers e relações simples.', 'Executa uma EDA padrão (distribuições, valores ausentes, outliers) de forma autônoma em datasets simples.', 'Investigar tipos, distribuição, ausentes, duplicados, outliers e relações simples.', 'Criar checklist de qualidade; justificar tratamentos; evitar olhar apenas médias.', 'Executa uma EDA padrão (distribuições, valores ausentes, outliers) de forma autônoma em datasets simples. Requisitos práticos: Investigar tipos, distribuição, ausentes, duplicados, outliers e relações simples. Boas práticas: Criar checklist de qualidade; justificar tratamentos; evitar olhar apenas médias.', 'Refaça em um cenário/dataset simples diferente, sem copiar o exemplo, registrando decisões.', 'Quiz de 12 questões + exercício autônomo em cenário simples + explicação das decisões.', 'EDA autônoma de dataset simples, com seção de qualidade de dados e conclusões.', 'Capacidade de detectar data leakage, vieses e problemas de qualidade cedo.', 3.0, 'https://pandas.pydata.org/docs/getting_started/', 'https://www.kaggle.com/learn/pandas', '18/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K04', 'intermediario', 3, 'Intermediário', 'Relacionar variáveis, segmentar, comparar grupos, levantar hipóteses e conectar ao domínio.', 'Conduz EDA aprofundada, relacionando variáveis, formulando hipóteses iniciais e adaptando a análise ao domínio do problema.', 'Relacionar variáveis, segmentar, comparar grupos, levantar hipóteses e conectar ao domínio.', 'Usar visualizações adequadas, análise multivariada e hipóteses explícitas; priorizar achados acionáveis.', 'Conduz EDA aprofundada, relacionando variáveis, formulando hipóteses iniciais e adaptando a análise ao domínio do problema. Requisitos práticos: Relacionar variáveis, segmentar, comparar grupos, levantar hipóteses e conectar ao domínio. Boas práticas: Usar visualizações adequadas, análise multivariada e hipóteses explícitas; priorizar achados acionáveis.', 'Aplique em um caso real, compare alternativas e documente hipóteses, métricas e limitações.', 'Mini-case de 60–90 min + defesa técnica + análise de premissas e limitações.', 'Relatório/notebook com 3+ hipóteses, evidências e implicações para modelagem.', 'Storytelling com dados e tradução de achados técnicos para decisão.', 4.0, 'https://pandas.pydata.org/docs/getting_started/', 'https://www.kaggle.com/learn/pandas', '18/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K04', 'avancado', 4, 'Avançado', 'Usar EDA para redefinir features, amostragem, validação e direção de modelagem.', 'Conduz EDA como ferramenta estratégica, identificando padrões não óbvios e definindo direcionamentos de modelagem, comunicando insights com clareza.', 'Usar EDA para redefinir features, amostragem, validação e direção de modelagem.', 'Triangular estatística + domínio + qualidade; automatizar checks sem terceirizar a interpretação.', 'Conduz EDA como ferramenta estratégica, identificando padrões não óbvios e definindo direcionamentos de modelagem, comunicando insights com clareza. Requisitos práticos: Usar EDA para redefinir features, amostragem, validação e direção de modelagem. Boas práticas: Triangular estatística + domínio + qualidade; automatizar checks sem terceirizar a interpretação.', 'Crie versão robusta/reutilizável, faça revisão por pares e valide se outra pessoa consegue reproduzir.', 'Case aberto + defesa de trade-offs + revisão por pares + evidência reproduzível.', 'EDA auditável que muda decisões de modelagem e apresenta limitações.', 'Capacidade de encontrar padrões não óbvios e orientar estratégia de dados/modelo.', 4.5, 'https://pandas.pydata.org/docs/getting_started/', 'https://www.kaggle.com/learn/pandas', '18/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K05', 'iniciante', 1, 'Iniciante', 'Calcular média, mediana, moda, variância, desvio padrão e percentis.', 'Reconhece termos como média, mediana e desvio padrão, mas comete erros ao calculá-los ou interpretá-los.', 'Calcular média, mediana, moda, variância, desvio padrão e percentis.', 'Sempre associar medida ao significado e à distribuição; conferir unidades.', 'Reconhece termos como média, mediana e desvio padrão, mas comete erros ao calculá-los ou interpretá-los. Requisitos práticos: Calcular média, mediana, moda, variância, desvio padrão e percentis. Boas práticas: Sempre associar medida ao significado e à distribuição; conferir unidades.', 'Reproduza um exemplo guiado e depois explique cada etapa sem consultar o roteiro.', 'Quiz de 10 questões + explicação oral curta + exercício guiado alterado.', 'Lista de exercícios resolvidos manualmente e em Python.', 'Explicar estatística em linguagem simples.', 2.5, 'https://docs.scipy.org/doc/scipy/tutorial/stats/hypothesis_tests.html', 'https://www.youtube.com/@statquest', '18/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K05', 'basico', 2, 'Básico', 'Interpretar dispersão, quantis, assimetria e amostras simples.', 'Calcula e interpreta corretamente medidas descritivas simples em datasets bem comportados.', 'Interpretar dispersão, quantis, assimetria e amostras simples.', 'Comparar média x mediana; visualizar antes de concluir; reportar tamanho da amostra.', 'Calcula e interpreta corretamente medidas descritivas simples em datasets bem comportados. Requisitos práticos: Interpretar dispersão, quantis, assimetria e amostras simples. Boas práticas: Comparar média x mediana; visualizar antes de concluir; reportar tamanho da amostra.', 'Refaça em um cenário/dataset simples diferente, sem copiar o exemplo, registrando decisões.', 'Quiz de 12 questões + exercício autônomo em cenário simples + explicação das decisões.', 'Mini-análise com medidas + gráficos e interpretação correta.', 'Saber escolher a estatística descritiva apropriada ao contexto.', 3.0, 'https://docs.scipy.org/doc/scipy/tutorial/stats/hypothesis_tests.html', 'https://www.youtube.com/@statquest', '18/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K05', 'intermediario', 3, 'Intermediário', 'Probabilidade, intervalos de confiança, testes de hipótese e p-valor.', 'Aplica probabilidade e testes de hipótese para investigar fenômenos, interpretando significância estatística com correção.', 'Probabilidade, intervalos de confiança, testes de hipótese e p-valor.', 'Declarar H0/H1, alfa, pressupostos, tamanho de efeito; não tratar p-valor como prova.', 'Aplica probabilidade e testes de hipótese para investigar fenômenos, interpretando significância estatística com correção. Requisitos práticos: Probabilidade, intervalos de confiança, testes de hipótese e p-valor. Boas práticas: Declarar H0/H1, alfa, pressupostos, tamanho de efeito; não tratar p-valor como prova.', 'Aplique em um caso real, compare alternativas e documente hipóteses, métricas e limitações.', 'Mini-case de 60–90 min + defesa técnica + análise de premissas e limitações.', 'Notebook com teste de hipótese, pressupostos, efeito e conclusão.', 'Comunicar incerteza e diferença entre significância estatística e relevância prática.', 4.0, 'https://docs.scipy.org/doc/scipy/tutorial/stats/hypothesis_tests.html', 'https://www.youtube.com/@statquest', '18/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K05', 'avancado', 4, 'Avançado', 'Validar premissas, comparar testes, trabalhar com múltiplas comparações e robustez.', 'Utiliza estatística de forma crítica para validar suposições de modelos e comunicar incerteza, questionando premissas estatísticas de terceiros.', 'Validar premissas, comparar testes, trabalhar com múltiplas comparações e robustez.', 'Questionar pressupostos, usar análise de sensibilidade e intervalos de confiança.', 'Utiliza estatística de forma crítica para validar suposições de modelos e comunicar incerteza, questionando premissas estatísticas de terceiros. Requisitos práticos: Validar premissas, comparar testes, trabalhar com múltiplas comparações e robustez. Boas práticas: Questionar pressupostos, usar análise de sensibilidade e intervalos de confiança.', 'Crie versão robusta/reutilizável, faça revisão por pares e valide se outra pessoa consegue reproduzir.', 'Case aberto + defesa de trade-offs + revisão por pares + evidência reproduzível.', 'Revisão crítica de uma análise estatística de terceiros + alternativa.', 'Pensamento estatístico crítico e comunicação de risco/incerteza.', 4.5, 'https://docs.scipy.org/doc/scipy/tutorial/stats/hypothesis_tests.html', 'https://www.youtube.com/@statquest', '18/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K06', 'iniciante', 1, 'Iniciante', 'Identificar ausentes, duplicados, tipos errados e strings inconsistentes.', 'Executa passos de limpeza seguindo um script pronto, sem entender o motivo de cada etapa.', 'Identificar ausentes, duplicados, tipos errados e strings inconsistentes.', 'Nunca sobrescrever dado bruto; registrar cada transformação.', 'Executa passos de limpeza seguindo um script pronto, sem entender o motivo de cada etapa. Requisitos práticos: Identificar ausentes, duplicados, tipos errados e strings inconsistentes. Boas práticas: Nunca sobrescrever dado bruto; registrar cada transformação.', 'Reproduza um exemplo guiado e depois explique cada etapa sem consultar o roteiro.', 'Quiz de 10 questões + explicação oral curta + exercício guiado alterado.', 'Script guiado que gera dataset limpo separado do original.', 'Disciplina de preservar dados brutos e registrar decisões.', 2.5, 'https://pandas.pydata.org/docs/user_guide/missing_data.html', 'https://www.kaggle.com/learn/data-cleaning', '18/09/2026 + 25/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K06', 'basico', 2, 'Básico', 'Tratar ausentes/duplicados, padronizar datas/textos/categorias e tipos.', 'Trata valores ausentes e duplicados e normaliza formatos em datasets estruturados simples, de forma autônoma.', 'Tratar ausentes/duplicados, padronizar datas/textos/categorias e tipos.', 'Definir regras explícitas; validar antes/depois; evitar imputação sem justificativa.', 'Trata valores ausentes e duplicados e normaliza formatos em datasets estruturados simples, de forma autônoma. Requisitos práticos: Tratar ausentes/duplicados, padronizar datas/textos/categorias e tipos. Boas práticas: Definir regras explícitas; validar antes/depois; evitar imputação sem justificativa.', 'Refaça em um cenário/dataset simples diferente, sem copiar o exemplo, registrando decisões.', 'Quiz de 12 questões + exercício autônomo em cenário simples + explicação das decisões.', 'Pipeline simples com relatório de linhas afetadas.', 'Confiabilidade e rastreabilidade da preparação.', 3.0, 'https://pandas.pydata.org/docs/user_guide/missing_data.html', 'https://www.kaggle.com/learn/data-cleaning', '18/09/2026 + 25/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K06', 'intermediario', 3, 'Intermediário', 'Diagnosticar outliers, inconsistências entre colunas e formatos mistos.', 'Diagnostica e corrige anomalias diversas (outliers, inconsistências, formatos mistos) em datasets reais, documentando as decisões tomadas.', 'Diagnosticar outliers, inconsistências entre colunas e formatos mistos.', 'Criar funções reutilizáveis, asserts/checks e documentação das regras.', 'Diagnostica e corrige anomalias diversas (outliers, inconsistências, formatos mistos) em datasets reais, documentando as decisões tomadas. Requisitos práticos: Diagnosticar outliers, inconsistências entre colunas e formatos mistos. Boas práticas: Criar funções reutilizáveis, asserts/checks e documentação das regras.', 'Aplique em um caso real, compare alternativas e documente hipóteses, métricas e limitações.', 'Mini-case de 60–90 min + defesa técnica + análise de premissas e limitações.', 'Pipeline reproduzível com testes/checks e log de decisões.', 'Data quality engineering aplicada ao ML.', 4.0, 'https://pandas.pydata.org/docs/user_guide/missing_data.html', 'https://www.kaggle.com/learn/data-cleaning', '18/09/2026 + 25/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K06', 'avancado', 4, 'Avançado', 'Projetar pipeline robusto a dados futuros e mudanças de esquema.', 'Projeta pipelines de limpeza reprodutíveis e robustos a novos dados, antecipando classes de erro ainda não vistas.', 'Projetar pipeline robusto a dados futuros e mudanças de esquema.', 'Schemas, validações automatizadas, monitoramento de drift/qualidade e idempotência.', 'Projeta pipelines de limpeza reprodutíveis e robustos a novos dados, antecipando classes de erro ainda não vistas. Requisitos práticos: Projetar pipeline robusto a dados futuros e mudanças de esquema. Boas práticas: Schemas, validações automatizadas, monitoramento de drift/qualidade e idempotência.', 'Crie versão robusta/reutilizável, faça revisão por pares e valide se outra pessoa consegue reproduzir.', 'Case aberto + defesa de trade-offs + revisão por pares + evidência reproduzível.', 'Pipeline que falha de forma informativa em dados inválidos e gera relatório.', 'Maturidade de produção: qualidade, lineage e observabilidade.', 4.5, 'https://pandas.pydata.org/docs/user_guide/missing_data.html', 'https://www.kaggle.com/learn/data-cleaning', '18/09/2026 + 25/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K07', 'iniciante', 1, 'Iniciante', 'Reconhecer diferença entre coluna original, feature e target; criar uma derivação guiada.', 'Usa as colunas originais do dataset sem propor novas features.', 'Reconhecer diferença entre coluna original, feature e target; criar uma derivação guiada.', 'Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Usa as colunas originais do dataset sem propor novas features. Requisitos práticos: Reconhecer diferença entre coluna original, feature e target; criar uma derivação guiada. Boas práticas: Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Reproduza um exemplo guiado e depois explique cada etapa sem consultar o roteiro.', 'Quiz de 10 questões + explicação oral curta + exercício guiado alterado.', 'Notebook com 2 features derivadas e explicação do significado.', 'Vocabulário técnico correto e execução consciente.', 2.5, 'https://www.kaggle.com/learn/feature-engineering', 'https://scikit-learn.org/stable/user_guide.html', '25/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K07', 'basico', 2, 'Básico', 'Criar datas derivadas, razões, agregações e encodings simples com justificativa.', 'Cria features derivadas simples (ex: razões, datas) seguindo exemplos vistos em aula.', 'Criar datas derivadas, razões, agregações e encodings simples com justificativa.', 'Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Cria features derivadas simples (ex: razões, datas) seguindo exemplos vistos em aula. Requisitos práticos: Criar datas derivadas, razões, agregações e encodings simples com justificativa. Boas práticas: Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Refaça em um cenário/dataset simples diferente, sem copiar o exemplo, registrando decisões.', 'Quiz de 12 questões + exercício autônomo em cenário simples + explicação das decisões.', 'Dataset com 5+ features derivadas e comparação antes/depois.', 'Autonomia em casos simples e comunicação clara do raciocínio.', 3.0, 'https://www.kaggle.com/learn/feature-engineering', 'https://scikit-learn.org/stable/user_guide.html', '25/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K07', 'intermediario', 3, 'Intermediário', 'Criar features de domínio e selecionar por estatística/importância evitando leakage.', 'Realiza feature engineering criativo e seleciona atributos relevantes usando critérios estatísticos ou de importância do modelo.', 'Criar features de domínio e selecionar por estatística/importância evitando leakage.', 'Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Realiza feature engineering criativo e seleciona atributos relevantes usando critérios estatísticos ou de importância do modelo. Requisitos práticos: Criar features de domínio e selecionar por estatística/importância evitando leakage. Boas práticas: Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Aplique em um caso real, compare alternativas e documente hipóteses, métricas e limitações.', 'Mini-case de 60–90 min + defesa técnica + análise de premissas e limitações.', 'Feature engineering + seleção com CV/importância e análise de leakage.', 'Decisão orientada por evidências e adaptação ao contexto.', 4.0, 'https://www.kaggle.com/learn/feature-engineering', 'https://scikit-learn.org/stable/user_guide.html', '25/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K07', 'avancado', 4, 'Avançado', 'Projetar estratégia de features de domínio e medir impacto incremental com validação robusta.', 'Projeta estratégias de feature engineering específicas do domínio que melhoram significativamente o desempenho do modelo, validando o impacto de cada feature.', 'Projetar estratégia de features de domínio e medir impacto incremental com validação robusta.', 'Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Projeta estratégias de feature engineering específicas do domínio que melhoram significativamente o desempenho do modelo, validando o impacto de cada feature. Requisitos práticos: Projetar estratégia de features de domínio e medir impacto incremental com validação robusta. Boas práticas: Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Crie versão robusta/reutilizável, faça revisão por pares e valide se outra pessoa consegue reproduzir.', 'Case aberto + defesa de trade-offs + revisão por pares + evidência reproduzível.', 'Ablation study mostrando impacto de grupos de features e estabilidade do ganho.', 'Maturidade profissional para lidar com trade-offs, escala, risco e governança.', 4.5, 'https://www.kaggle.com/learn/feature-engineering', 'https://scikit-learn.org/stable/user_guide.html', '25/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K08', 'iniciante', 1, 'Iniciante', 'Gerar barras, linhas, histogramas e scatter plots.', 'Gera gráficos padrão (barras, linhas) usando bibliotecas com configuração mínima.', 'Gerar barras, linhas, histogramas e scatter plots.', 'Título, rótulos, unidades e escala coerente; evitar 3D e excesso visual.', 'Gera gráficos padrão (barras, linhas) usando bibliotecas com configuração mínima. Requisitos práticos: Gerar barras, linhas, histogramas e scatter plots. Boas práticas: Título, rótulos, unidades e escala coerente; evitar 3D e excesso visual.', 'Reproduza um exemplo guiado e depois explique cada etapa sem consultar o roteiro.', 'Quiz de 10 questões + explicação oral curta + exercício guiado alterado.', '4 gráficos corretos a partir de um dataset simples.', 'Clareza visual e fundamentos de comunicação.', 2.5, 'https://matplotlib.org/stable/tutorials/index', 'https://www.kaggle.com/learn/data-visualization', '18/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K08', 'basico', 2, 'Básico', 'Escolher gráfico pelo tipo de pergunta e variável.', 'Escolhe o tipo de gráfico adequado para o dado e cria visualizações claras para uso próprio.', 'Escolher gráfico pelo tipo de pergunta e variável.', 'Usar cor com parcimônia; comparar escalas; destacar mensagem principal.', 'Escolhe o tipo de gráfico adequado para o dado e cria visualizações claras para uso próprio. Requisitos práticos: Escolher gráfico pelo tipo de pergunta e variável. Boas práticas: Usar cor com parcimônia; comparar escalas; destacar mensagem principal.', 'Refaça em um cenário/dataset simples diferente, sem copiar o exemplo, registrando decisões.', 'Quiz de 12 questões + exercício autônomo em cenário simples + explicação das decisões.', 'Painel simples com gráficos adequados e uma conclusão por gráfico.', 'Escolha consciente de codificação visual.', 3.0, 'https://matplotlib.org/stable/tutorials/index', 'https://www.kaggle.com/learn/data-visualization', '18/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K08', 'intermediario', 3, 'Intermediário', 'Criar dashboard/narrativa para públicos diferentes.', 'Cria dashboards e visualizações destinadas a comunicar insights para públicos técnicos e não técnicos.', 'Criar dashboard/narrativa para públicos diferentes.', 'Definir público, decisão e mensagem antes do layout; acessibilidade e contexto.', 'Cria dashboards e visualizações destinadas a comunicar insights para públicos técnicos e não técnicos. Requisitos práticos: Criar dashboard/narrativa para públicos diferentes. Boas práticas: Definir público, decisão e mensagem antes do layout; acessibilidade e contexto.', 'Aplique em um caso real, compare alternativas e documente hipóteses, métricas e limitações.', 'Mini-case de 60–90 min + defesa técnica + análise de premissas e limitações.', 'Dashboard com resumo executivo + detalhe técnico.', 'Data storytelling e comunicação com stakeholders.', 4.0, 'https://matplotlib.org/stable/tutorials/index', 'https://www.kaggle.com/learn/data-visualization', '18/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K08', 'avancado', 4, 'Avançado', 'Projetar visualizações que apoiem decisões estratégicas.', 'Projeta visualizações e dashboards que orientam decisões estratégicas, adaptando a narrativa visual ao público e ao objetivo de negócio.', 'Projetar visualizações que apoiem decisões estratégicas.', 'Design orientado à decisão; hierarquia, interação e métricas de uso.', 'Projeta visualizações e dashboards que orientam decisões estratégicas, adaptando a narrativa visual ao público e ao objetivo de negócio. Requisitos práticos: Projetar visualizações que apoiem decisões estratégicas. Boas práticas: Design orientado à decisão; hierarquia, interação e métricas de uso.', 'Crie versão robusta/reutilizável, faça revisão por pares e valide se outra pessoa consegue reproduzir.', 'Case aberto + defesa de trade-offs + revisão por pares + evidência reproduzível.', 'Dashboard revisado por usuários e iterado com feedback.', 'Capacidade de transformar análise em ferramenta decisória.', 4.5, 'https://matplotlib.org/stable/tutorials/index', 'https://www.kaggle.com/learn/data-visualization', '18/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K09', 'iniciante', 1, 'Iniciante', 'Distinguir opinião, pergunta e hipótese testável.', 'Reconhece a diferença entre hipótese e opinião, mas não formula hipóteses testáveis sozinho.', 'Distinguir opinião, pergunta e hipótese testável.', 'Escrever hipótese com variável, direção/efeito e critério observável.', 'Reconhece a diferença entre hipótese e opinião, mas não formula hipóteses testáveis sozinho. Requisitos práticos: Distinguir opinião, pergunta e hipótese testável. Boas práticas: Escrever hipótese com variável, direção/efeito e critério observável.', 'Reproduza um exemplo guiado e depois explique cada etapa sem consultar o roteiro.', 'Quiz de 10 questões + explicação oral curta + exercício guiado alterado.', 'Transformar 10 opiniões em hipóteses testáveis.', 'Disciplina de formular perguntas verificáveis.', 2.5, 'https://docs.scipy.org/doc/scipy/tutorial/stats/hypothesis_tests.html', 'https://www.youtube.com/@statquest', '18/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K09', 'basico', 2, 'Básico', 'Gerar hipóteses simples a partir de EDA.', 'Formula hipóteses simples a partir de padrões óbvios identificados na EDA.', 'Gerar hipóteses simples a partir de EDA.', 'Registrar hipótese antes de testar; definir variável-alvo e comparação.', 'Formula hipóteses simples a partir de padrões óbvios identificados na EDA. Requisitos práticos: Gerar hipóteses simples a partir de EDA. Boas práticas: Registrar hipótese antes de testar; definir variável-alvo e comparação.', 'Refaça em um cenário/dataset simples diferente, sem copiar o exemplo, registrando decisões.', 'Quiz de 12 questões + exercício autônomo em cenário simples + explicação das decisões.', 'Lista priorizada de hipóteses com como testar cada uma.', 'Mentalidade científica aplicada a produto/dados.', 3.0, 'https://docs.scipy.org/doc/scipy/tutorial/stats/hypothesis_tests.html', 'https://www.youtube.com/@statquest', '18/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K09', 'intermediario', 3, 'Intermediário', 'Escolher teste, executar e interpretar efeito + incerteza.', 'Formula e testa hipóteses estatisticamente, interpretando os resultados para orientar decisões.', 'Escolher teste, executar e interpretar efeito + incerteza.', 'Checar pressupostos, poder/amostra quando aplicável e evitar p-hacking.', 'Formula e testa hipóteses estatisticamente, interpretando os resultados para orientar decisões. Requisitos práticos: Escolher teste, executar e interpretar efeito + incerteza. Boas práticas: Checar pressupostos, poder/amostra quando aplicável e evitar p-hacking.', 'Aplique em um caso real, compare alternativas e documente hipóteses, métricas e limitações.', 'Mini-case de 60–90 min + defesa técnica + análise de premissas e limitações.', 'Notebook com ciclo hipótese→teste→interpretação→decisão.', 'Tomada de decisão orientada por evidência.', 4.0, 'https://docs.scipy.org/doc/scipy/tutorial/stats/hypothesis_tests.html', 'https://www.youtube.com/@statquest', '18/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K09', 'avancado', 4, 'Avançado', 'Refinar hipóteses em ciclos e integrar experimentos/negócio.', 'Conduz ciclos completos de formulação, teste e refinamento de hipóteses, integrando resultados a decisões de negócio complexas.', 'Refinar hipóteses em ciclos e integrar experimentos/negócio.', 'Pré-registro quando adequado, desenho experimental e análise de sensibilidade.', 'Conduz ciclos completos de formulação, teste e refinamento de hipóteses, integrando resultados a decisões de negócio complexas. Requisitos práticos: Refinar hipóteses em ciclos e integrar experimentos/negócio. Boas práticas: Pré-registro quando adequado, desenho experimental e análise de sensibilidade.', 'Crie versão robusta/reutilizável, faça revisão por pares e valide se outra pessoa consegue reproduzir.', 'Case aberto + defesa de trade-offs + revisão por pares + evidência reproduzível.', 'Estudo completo com hipóteses concorrentes e recomendação condicionada a evidências.', 'Experimentação madura e pensamento causal.', 4.5, 'https://docs.scipy.org/doc/scipy/tutorial/stats/hypothesis_tests.html', 'https://www.youtube.com/@statquest', '18/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K10', 'iniciante', 1, 'Iniciante', 'Definir correlação e causalidade com exemplos.', 'Confunde correlação com causalidade com frequência.', 'Definir correlação e causalidade com exemplos.', 'Evitar verbos causais sem desenho que permita inferência causal.', 'Confunde correlação com causalidade com frequência. Requisitos práticos: Definir correlação e causalidade com exemplos. Boas práticas: Evitar verbos causais sem desenho que permita inferência causal.', 'Reproduza um exemplo guiado e depois explique cada etapa sem consultar o roteiro.', 'Quiz de 10 questões + explicação oral curta + exercício guiado alterado.', 'Explicar 5 exemplos de correlação espúria/confundimento.', 'Comunicação responsável de relações.', 2.5, 'https://developers.google.com/machine-learning/guides/data-traps/analysis-traps?hl=pt-br', 'https://www.youtube.com/watch?v=xZ_z8KWkhXE', '18/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K10', 'basico', 2, 'Básico', 'Reconhecer que associação não implica causa.', 'Reconhece a diferença conceitual entre correlação e causalidade, mas tem dificuldade em aplicá-la na prática.', 'Reconhecer que associação não implica causa.', 'Procurar variáveis de confusão e direção reversa.', 'Reconhece a diferença conceitual entre correlação e causalidade, mas tem dificuldade em aplicá-la na prática. Requisitos práticos: Reconhecer que associação não implica causa. Boas práticas: Procurar variáveis de confusão e direção reversa.', 'Refaça em um cenário/dataset simples diferente, sem copiar o exemplo, registrando decisões.', 'Quiz de 12 questões + exercício autônomo em cenário simples + explicação das decisões.', 'Análise correlacional com seção explícita ''o que não podemos concluir''.', 'Evitar conclusões causais indevidas.', 3.0, 'https://developers.google.com/machine-learning/guides/data-traps/analysis-traps?hl=pt-br', 'https://www.youtube.com/watch?v=xZ_z8KWkhXE', '18/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K10', 'intermediario', 3, 'Intermediário', 'Identificar confundidores, segmentar e controlar variáveis quando apropriado.', 'Identifica corretamente quando uma relação é apenas correlacional, evitando conclusões causais indevidas.', 'Identificar confundidores, segmentar e controlar variáveis quando apropriado.', 'Usar desenho do estudo, DAGs conceituais e testes de robustez.', 'Identifica corretamente quando uma relação é apenas correlacional, evitando conclusões causais indevidas. Requisitos práticos: Identificar confundidores, segmentar e controlar variáveis quando apropriado. Boas práticas: Usar desenho do estudo, DAGs conceituais e testes de robustez.', 'Aplique em um caso real, compare alternativas e documente hipóteses, métricas e limitações.', 'Mini-case de 60–90 min + defesa técnica + análise de premissas e limitações.', 'Estudo observacional com limitações e alternativas explicativas.', 'Raciocínio causal básico, raro e valorizado em análise.', 4.0, 'https://developers.google.com/machine-learning/guides/data-traps/analysis-traps?hl=pt-br', 'https://www.youtube.com/watch?v=xZ_z8KWkhXE', '18/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K10', 'avancado', 4, 'Avançado', 'Desenhar experimento/quase-experimento ou estratégia causal.', 'Desenha análises (ex: controle de variáveis, experimentos) para investigar causalidade, comunicando limites de inferência.', 'Desenhar experimento/quase-experimento ou estratégia causal.', 'Definir intervenção, contrafactual, controles e suposições.', 'Desenha análises (ex: controle de variáveis, experimentos) para investigar causalidade, comunicando limites de inferência. Requisitos práticos: Desenhar experimento/quase-experimento ou estratégia causal. Boas práticas: Definir intervenção, contrafactual, controles e suposições.', 'Crie versão robusta/reutilizável, faça revisão por pares e valide se outra pessoa consegue reproduzir.', 'Case aberto + defesa de trade-offs + revisão por pares + evidência reproduzível.', 'Plano causal com experimento/A-B test ou método observacional justificado.', 'Capacidade de separar previsão de inferência causal.', 4.5, 'https://developers.google.com/machine-learning/guides/data-traps/analysis-traps?hl=pt-br', 'https://www.youtube.com/watch?v=xZ_z8KWkhXE', '18/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K11', 'iniciante', 1, 'Iniciante', 'Treinar modelo com fit/predict e entender X, y, treino e teste.', 'Treina um modelo seguindo um tutorial, sem entender os parâmetros usados.', 'Treinar modelo com fit/predict e entender X, y, treino e teste.', 'Separar treino/teste; não ajustar no conjunto de teste.', 'Treina um modelo seguindo um tutorial, sem entender os parâmetros usados. Requisitos práticos: Treinar modelo com fit/predict e entender X, y, treino e teste. Boas práticas: Separar treino/teste; não ajustar no conjunto de teste.', 'Reproduza um exemplo guiado e depois explique cada etapa sem consultar o roteiro.', 'Quiz de 10 questões + explicação oral curta + exercício guiado alterado.', 'Notebook guiado de regressão ou KNN com avaliação.', 'Fundamento prático sólido em sklearn.', 2.5, 'https://scikit-learn.org/stable/user_guide.html', 'https://www.youtube.com/watch?v=pqNCD_5r0IU', '18/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K11', 'basico', 2, 'Básico', 'Implementar regressão/KNN e avaliar métricas.', 'Implementa, treina e avalia modelos clássicos simples (regressão, KNN) com scikit-learn de forma autônoma.', 'Implementar regressão/KNN e avaliar métricas.', 'Pipeline básico, preprocessing consistente e baseline.', 'Implementa, treina e avalia modelos clássicos simples (regressão, KNN) com scikit-learn de forma autônoma. Requisitos práticos: Implementar regressão/KNN e avaliar métricas. Boas práticas: Pipeline básico, preprocessing consistente e baseline.', 'Refaça em um cenário/dataset simples diferente, sem copiar o exemplo, registrando decisões.', 'Quiz de 12 questões + exercício autônomo em cenário simples + explicação das decisões.', 'Projeto simples do zero sem copiar tutorial passo a passo.', 'Autonomia para entregar um modelo clássico funcional.', 3.0, 'https://scikit-learn.org/stable/user_guide.html', 'https://www.youtube.com/watch?v=pqNCD_5r0IU', '18/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K11', 'intermediario', 3, 'Intermediário', 'Comparar árvores/SVM/outros e ajustar hiperparâmetros.', 'Compara múltiplos modelos clássicos (árvores, SVM) ajustando parâmetros e validando resultados.', 'Comparar árvores/SVM/outros e ajustar hiperparâmetros.', 'Cross-validation, Grid/Random Search, múltiplas métricas e prevenção de leakage.', 'Compara múltiplos modelos clássicos (árvores, SVM) ajustando parâmetros e validando resultados. Requisitos práticos: Comparar árvores/SVM/outros e ajustar hiperparâmetros. Boas práticas: Cross-validation, Grid/Random Search, múltiplas métricas e prevenção de leakage.', 'Aplique em um caso real, compare alternativas e documente hipóteses, métricas e limitações.', 'Mini-case de 60–90 min + defesa técnica + análise de premissas e limitações.', 'Pipeline sklearn completo com tuning e relatório.', 'Boas práticas de model selection e reprodutibilidade.', 4.0, 'https://scikit-learn.org/stable/user_guide.html', 'https://www.youtube.com/watch?v=pqNCD_5r0IU', '18/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K11', 'avancado', 4, 'Avançado', 'Construir pipeline robusto e sistemático.', 'Constrói pipelines de treino robustos e reprodutíveis para modelos clássicos, incluindo validação e tuning sistemático.', 'Construir pipeline robusto e sistemático.', 'ColumnTransformer/Pipeline, tuning, validação, serialização, testes e tracking.', 'Constrói pipelines de treino robustos e reprodutíveis para modelos clássicos, incluindo validação e tuning sistemático. Requisitos práticos: Construir pipeline robusto e sistemático. Boas práticas: ColumnTransformer/Pipeline, tuning, validação, serialização, testes e tracking.', 'Crie versão robusta/reutilizável, faça revisão por pares e valide se outra pessoa consegue reproduzir.', 'Case aberto + defesa de trade-offs + revisão por pares + evidência reproduzível.', 'Projeto reproduzível end-to-end com experiment tracking.', 'Prontidão para integrar ML clássico em fluxo de engenharia.', 4.5, 'https://scikit-learn.org/stable/user_guide.html', 'https://www.youtube.com/watch?v=pqNCD_5r0IU', '18/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K12', 'iniciante', 1, 'Iniciante', 'Entender o objetivo do algoritmo usado no tutorial.', 'Utiliza o algoritmo sugerido por um tutorial, sem comparar alternativas.', 'Entender o objetivo do algoritmo usado no tutorial.', 'Sempre criar baseline e registrar métrica antes de sofisticar.', 'Utiliza o algoritmo sugerido por um tutorial, sem comparar alternativas. Requisitos práticos: Entender o objetivo do algoritmo usado no tutorial. Boas práticas: Sempre criar baseline e registrar métrica antes de sofisticar.', 'Reproduza um exemplo guiado e depois explique cada etapa sem consultar o roteiro.', 'Quiz de 10 questões + explicação oral curta + exercício guiado alterado.', 'Treinar 1 modelo e explicar entradas, saída, métrica e parâmetros principais.', 'Capacidade de explicar o modelo, não só executar código.', 2.5, 'https://scikit-learn.org/stable/auto_examples/model_selection/index.html', 'https://developers.google.com/machine-learning/crash-course/', '18/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K12', 'basico', 2, 'Básico', 'Comparar pelo menos 2 modelos simples com mesma divisão/métrica.', 'Testa mais de um algoritmo simples e compara resultados usando métricas básicas.', 'Comparar pelo menos 2 modelos simples com mesma divisão/métrica.', 'Usar train/test split consistente; escolher métrica ligada ao problema.', 'Testa mais de um algoritmo simples e compara resultados usando métricas básicas. Requisitos práticos: Comparar pelo menos 2 modelos simples com mesma divisão/métrica. Boas práticas: Usar train/test split consistente; escolher métrica ligada ao problema.', 'Refaça em um cenário/dataset simples diferente, sem copiar o exemplo, registrando decisões.', 'Quiz de 12 questões + exercício autônomo em cenário simples + explicação das decisões.', 'Tabela comparativa com 2-3 modelos e justificativa.', 'Benchmarking básico e seleção baseada em evidência.', 3.0, 'https://scikit-learn.org/stable/auto_examples/model_selection/index.html', 'https://developers.google.com/machine-learning/crash-course/', '18/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K12', 'intermediario', 3, 'Intermediário', 'Considerar tipo de dado, tamanho, hardware, interpretabilidade e custo.', 'Seleciona algoritmos considerando natureza do problema, hardware disponível e características dos dados.', 'Considerar tipo de dado, tamanho, hardware, interpretabilidade e custo.', 'Cross-validation, pipeline consistente e múltiplas métricas relevantes.', 'Seleciona algoritmos considerando natureza do problema, hardware disponível e características dos dados. Requisitos práticos: Considerar tipo de dado, tamanho, hardware, interpretabilidade e custo. Boas práticas: Cross-validation, pipeline consistente e múltiplas métricas relevantes.', 'Aplique em um caso real, compare alternativas e documente hipóteses, métricas e limitações.', 'Mini-case de 60–90 min + defesa técnica + análise de premissas e limitações.', 'Benchmark com CV, tempo de treino/inferência e discussão de trade-offs.', 'Decisão técnica equilibrando qualidade, custo e explicabilidade.', 4.0, 'https://scikit-learn.org/stable/auto_examples/model_selection/index.html', 'https://developers.google.com/machine-learning/crash-course/', '18/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K12', 'avancado', 4, 'Avançado', 'Avaliar tuning, ensembles/híbridos e restrições de produção.', 'Justifica a escolha de algoritmos com trade-offs sofisticados (interpretabilidade, custo, escalabilidade) e propõe abordagens híbridas quando necessário.', 'Avaliar tuning, ensembles/híbridos e restrições de produção.', 'Curvas de aprendizado, calibração quando aplicável, otimização multiobjetivo.', 'Justifica a escolha de algoritmos com trade-offs sofisticados (interpretabilidade, custo, escalabilidade) e propõe abordagens híbridas quando necessário. Requisitos práticos: Avaliar tuning, ensembles/híbridos e restrições de produção. Boas práticas: Curvas de aprendizado, calibração quando aplicável, otimização multiobjetivo.', 'Crie versão robusta/reutilizável, faça revisão por pares e valide se outra pessoa consegue reproduzir.', 'Case aberto + defesa de trade-offs + revisão por pares + evidência reproduzível.', 'Relatório de arquitetura/model selection com trade-offs explícitos.', 'Pensamento de sistema: modelo como parte de um produto/serviço.', 4.5, 'https://scikit-learn.org/stable/auto_examples/model_selection/index.html', 'https://developers.google.com/machine-learning/crash-course/', '18/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K13', 'iniciante', 1, 'Iniciante', 'Distinguir métricas de classificação/regressão e interpretar erro/acerto.', 'Usa a métrica padrão (ex: acurácia) sem questionar se é adequada ao problema.', 'Distinguir métricas de classificação/regressão e interpretar erro/acerto.', 'Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Usa a métrica padrão (ex: acurácia) sem questionar se é adequada ao problema. Requisitos práticos: Distinguir métricas de classificação/regressão e interpretar erro/acerto. Boas práticas: Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Reproduza um exemplo guiado e depois explique cada etapa sem consultar o roteiro.', 'Quiz de 10 questões + explicação oral curta + exercício guiado alterado.', 'Tabela de cenários escolhendo métrica e justificando.', 'Vocabulário técnico correto e execução consciente.', 2.5, 'https://scikit-learn.org/stable/modules/model_evaluation.html', 'https://scikit-learn.org/stable/user_guide.html', '25/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K13', 'basico', 2, 'Básico', 'Calcular e interpretar precision, recall, F1, AUC, MAE/RMSE conforme o caso.', 'Reconhece métricas alternativas (F1, RMSE, AUC) e as aplica quando indicado.', 'Calcular e interpretar precision, recall, F1, AUC, MAE/RMSE conforme o caso.', 'Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Reconhece métricas alternativas (F1, RMSE, AUC) e as aplica quando indicado. Requisitos práticos: Calcular e interpretar precision, recall, F1, AUC, MAE/RMSE conforme o caso. Boas práticas: Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Refaça em um cenário/dataset simples diferente, sem copiar o exemplo, registrando decisões.', 'Quiz de 12 questões + exercício autônomo em cenário simples + explicação das decisões.', 'Notebook com matriz de confusão + métricas alternativas.', 'Autonomia em casos simples e comunicação clara do raciocínio.', 3.0, 'https://scikit-learn.org/stable/modules/model_evaluation.html', 'https://scikit-learn.org/stable/user_guide.html', '25/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K13', 'intermediario', 3, 'Intermediário', 'Escolher métrica por custo de FP/FN, desbalanceamento, objetivo e decisão de negócio.', 'Escolhe métricas adequadas ao objetivo de negócio e à natureza dos dados de forma independente.', 'Escolher métrica por custo de FP/FN, desbalanceamento, objetivo e decisão de negócio.', 'Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Escolhe métricas adequadas ao objetivo de negócio e à natureza dos dados de forma independente. Requisitos práticos: Escolher métrica por custo de FP/FN, desbalanceamento, objetivo e decisão de negócio. Boas práticas: Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Aplique em um caso real, compare alternativas e documente hipóteses, métricas e limitações.', 'Mini-case de 60–90 min + defesa técnica + análise de premissas e limitações.', 'Memo de métrica principal/secundárias alinhadas ao objetivo e threshold.', 'Decisão orientada por evidências e adaptação ao contexto.', 4.0, 'https://scikit-learn.org/stable/modules/model_evaluation.html', 'https://scikit-learn.org/stable/user_guide.html', '25/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K13', 'avancado', 4, 'Avançado', 'Construir métrica composta/customizada e testar sensibilidade e consequências.', 'Desenha métricas customizadas ou compostas quando as métricas padrão não capturam o objetivo real do negócio.', 'Construir métrica composta/customizada e testar sensibilidade e consequências.', 'Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Desenha métricas customizadas ou compostas quando as métricas padrão não capturam o objetivo real do negócio. Requisitos práticos: Construir métrica composta/customizada e testar sensibilidade e consequências. Boas práticas: Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Crie versão robusta/reutilizável, faça revisão por pares e valide se outra pessoa consegue reproduzir.', 'Case aberto + defesa de trade-offs + revisão por pares + evidência reproduzível.', 'Implementar e validar métrica customizada/composta em case com trade-offs.', 'Maturidade profissional para lidar com trade-offs, escala, risco e governança.', 4.5, 'https://scikit-learn.org/stable/modules/model_evaluation.html', 'https://scikit-learn.org/stable/user_guide.html', '25/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K14', 'iniciante', 1, 'Iniciante', 'Entender generalização e reconhecer padrões básicos de treino vs validação.', 'Não percebe overfitting/underfitting sem apoio externo.', 'Entender generalização e reconhecer padrões básicos de treino vs validação.', 'Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Não percebe overfitting/underfitting sem apoio externo. Requisitos práticos: Entender generalização e reconhecer padrões básicos de treino vs validação. Boas práticas: Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Reproduza um exemplo guiado e depois explique cada etapa sem consultar o roteiro.', 'Quiz de 10 questões + explicação oral curta + exercício guiado alterado.', 'Explicar 6 cenários de curvas como overfit/underfit/adequado.', 'Vocabulário técnico correto e execução consciente.', 2.5, 'https://scikit-learn.org/stable/modules/learning_curve.html', 'https://scikit-learn.org/stable/auto_examples/model_selection/plot_underfitting_overfitting.html', '25/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K14', 'basico', 2, 'Básico', 'Comparar treino/teste e interpretar gap de desempenho.', 'Identifica overfitting/underfitting comparando métricas de treino e teste.', 'Comparar treino/teste e interpretar gap de desempenho.', 'Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Identifica overfitting/underfitting comparando métricas de treino e teste. Requisitos práticos: Comparar treino/teste e interpretar gap de desempenho. Boas práticas: Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Refaça em um cenário/dataset simples diferente, sem copiar o exemplo, registrando decisões.', 'Quiz de 12 questões + exercício autônomo em cenário simples + explicação das decisões.', 'Notebook comparando treino/teste em modelos de complexidade diferente.', 'Autonomia em casos simples e comunicação clara do raciocínio.', 3.0, 'https://scikit-learn.org/stable/modules/learning_curve.html', 'https://scikit-learn.org/stable/auto_examples/model_selection/plot_underfitting_overfitting.html', '25/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K14', 'intermediario', 3, 'Intermediário', 'Usar curvas de aprendizado/validação para diagnosticar causa e testar correções.', 'Diagnostica a causa raiz (complexidade, dados insuficientes) e aplica técnicas corretivas (regularização, mais dados, simplificação).', 'Usar curvas de aprendizado/validação para diagnosticar causa e testar correções.', 'Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Diagnostica a causa raiz (complexidade, dados insuficientes) e aplica técnicas corretivas (regularização, mais dados, simplificação). Requisitos práticos: Usar curvas de aprendizado/validação para diagnosticar causa e testar correções. Boas práticas: Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Aplique em um caso real, compare alternativas e documente hipóteses, métricas e limitações.', 'Mini-case de 60–90 min + defesa técnica + análise de premissas e limitações.', 'Diagnóstico com learning curves + correção justificada.', 'Decisão orientada por evidências e adaptação ao contexto.', 4.0, 'https://scikit-learn.org/stable/modules/learning_curve.html', 'https://scikit-learn.org/stable/auto_examples/model_selection/plot_underfitting_overfitting.html', '25/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K14', 'avancado', 4, 'Avançado', 'Projetar validação e regularização sistemática, prevenindo leakage e seleção otimista.', 'Previne overfitting/underfitting desde o design do experimento, usando validação cruzada e curvas de aprendizado de forma sistemática.', 'Projetar validação e regularização sistemática, prevenindo leakage e seleção otimista.', 'Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Previne overfitting/underfitting desde o design do experimento, usando validação cruzada e curvas de aprendizado de forma sistemática. Requisitos práticos: Projetar validação e regularização sistemática, prevenindo leakage e seleção otimista. Boas práticas: Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Crie versão robusta/reutilizável, faça revisão por pares e valide se outra pessoa consegue reproduzir.', 'Case aberto + defesa de trade-offs + revisão por pares + evidência reproduzível.', 'Pipeline com CV, curvas, regularização e relatório de generalização.', 'Maturidade profissional para lidar com trade-offs, escala, risco e governança.', 4.5, 'https://scikit-learn.org/stable/modules/learning_curve.html', 'https://scikit-learn.org/stable/auto_examples/model_selection/plot_underfitting_overfitting.html', '25/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K15', 'iniciante', 1, 'Iniciante', 'Distinguir parâmetro aprendido de hiperparâmetro e alterar um hiperparâmetro simples.', 'Usa os hiperparâmetros padrão sugeridos em exemplos, sem ajustá-los.', 'Distinguir parâmetro aprendido de hiperparâmetro e alterar um hiperparâmetro simples.', 'Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Usa os hiperparâmetros padrão sugeridos em exemplos, sem ajustá-los. Requisitos práticos: Distinguir parâmetro aprendido de hiperparâmetro e alterar um hiperparâmetro simples. Boas práticas: Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Reproduza um exemplo guiado e depois explique cada etapa sem consultar o roteiro.', 'Quiz de 10 questões + explicação oral curta + exercício guiado alterado.', 'Experimento variando 1 hiperparâmetro com tabela de resultados.', 'Vocabulário técnico correto e execução consciente.', 2.5, 'https://scikit-learn.org/stable/modules/grid_search.html', 'https://scikit-learn.org/stable/auto_examples/model_selection/plot_randomized_search.html', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K15', 'basico', 2, 'Básico', 'Planejar busca manual pequena e comparar resultados com mesma validação.', 'Ajusta manualmente learning rate, batch size e epochs testando algumas combinações.', 'Planejar busca manual pequena e comparar resultados com mesma validação.', 'Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Ajusta manualmente learning rate, batch size e epochs testando algumas combinações. Requisitos práticos: Planejar busca manual pequena e comparar resultados com mesma validação. Boas práticas: Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Refaça em um cenário/dataset simples diferente, sem copiar o exemplo, registrando decisões.', 'Quiz de 12 questões + exercício autônomo em cenário simples + explicação das decisões.', 'Busca manual documentada com 3+ combinações.', 'Autonomia em casos simples e comunicação clara do raciocínio.', 3.0, 'https://scikit-learn.org/stable/modules/grid_search.html', 'https://scikit-learn.org/stable/auto_examples/model_selection/plot_randomized_search.html', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K15', 'intermediario', 3, 'Intermediário', 'Usar GridSearchCV/RandomizedSearchCV com pipeline e métrica correta.', 'Realiza busca sistemática (grid/random search) de hiperparâmetros, interpretando o impacto de cada um.', 'Usar GridSearchCV/RandomizedSearchCV com pipeline e métrica correta.', 'Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Realiza busca sistemática (grid/random search) de hiperparâmetros, interpretando o impacto de cada um. Requisitos práticos: Usar GridSearchCV/RandomizedSearchCV com pipeline e métrica correta. Boas práticas: Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Aplique em um caso real, compare alternativas e documente hipóteses, métricas e limitações.', 'Mini-case de 60–90 min + defesa técnica + análise de premissas e limitações.', 'Grid/Random Search com CV, best_params e análise de impacto.', 'Decisão orientada por evidências e adaptação ao contexto.', 4.0, 'https://scikit-learn.org/stable/modules/grid_search.html', 'https://scikit-learn.org/stable/auto_examples/model_selection/plot_randomized_search.html', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K15', 'avancado', 4, 'Avançado', 'Definir budget, estratégia eficiente e critérios de parada comparando ganho x custo.', 'Utiliza estratégias eficientes de tuning (ex: busca bayesiana) e justifica escolhas com base em custo computacional e ganho de desempenho.', 'Definir budget, estratégia eficiente e critérios de parada comparando ganho x custo.', 'Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Utiliza estratégias eficientes de tuning (ex: busca bayesiana) e justifica escolhas com base em custo computacional e ganho de desempenho. Requisitos práticos: Definir budget, estratégia eficiente e critérios de parada comparando ganho x custo. Boas práticas: Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Crie versão robusta/reutilizável, faça revisão por pares e valide se outra pessoa consegue reproduzir.', 'Case aberto + defesa de trade-offs + revisão por pares + evidência reproduzível.', 'Tuning eficiente com orçamento computacional e curva ganho x custo.', 'Maturidade profissional para lidar com trade-offs, escala, risco e governança.', 4.5, 'https://scikit-learn.org/stable/modules/grid_search.html', 'https://scikit-learn.org/stable/auto_examples/model_selection/plot_randomized_search.html', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K16', 'iniciante', 1, 'Iniciante', 'Alterar uma variável por vez e registrar hipótese do ajuste.', 'Faz ajustes aleatórios no modelo sem relacioná-los aos resultados obtidos.', 'Alterar uma variável por vez e registrar hipótese do ajuste.', 'Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Faz ajustes aleatórios no modelo sem relacioná-los aos resultados obtidos. Requisitos práticos: Alterar uma variável por vez e registrar hipótese do ajuste. Boas práticas: Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Reproduza um exemplo guiado e depois explique cada etapa sem consultar o roteiro.', 'Quiz de 10 questões + explicação oral curta + exercício guiado alterado.', 'Log de 5 iterações com hipótese→mudança→resultado.', 'Vocabulário técnico correto e execução consciente.', 2.5, 'https://mlflow.org/docs/latest/ml/tracking', 'https://scikit-learn.org/stable/auto_examples/model_selection/index.html', '25/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K16', 'basico', 2, 'Básico', 'Usar métricas para escolher o próximo ajuste simples.', 'Ajusta hiperparâmetros básicos após observar métricas ruins.', 'Usar métricas para escolher o próximo ajuste simples.', 'Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Ajusta hiperparâmetros básicos após observar métricas ruins. Requisitos práticos: Usar métricas para escolher o próximo ajuste simples. Boas práticas: Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Refaça em um cenário/dataset simples diferente, sem copiar o exemplo, registrando decisões.', 'Quiz de 12 questões + exercício autônomo em cenário simples + explicação das decisões.', 'Série de ajustes com justificativa baseada em métricas.', 'Autonomia em casos simples e comunicação clara do raciocínio.', 3.0, 'https://mlflow.org/docs/latest/ml/tracking', 'https://scikit-learn.org/stable/auto_examples/model_selection/index.html', '25/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K16', 'intermediario', 3, 'Intermediário', 'Criar matriz de experimentos envolvendo dados, features, modelo e hiperparâmetros.', 'Itera de forma estruturada (hiperparâmetros, arquitetura, dados) guiado por análise dos resultados experimentais.', 'Criar matriz de experimentos envolvendo dados, features, modelo e hiperparâmetros.', 'Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Itera de forma estruturada (hiperparâmetros, arquitetura, dados) guiado por análise dos resultados experimentais. Requisitos práticos: Criar matriz de experimentos envolvendo dados, features, modelo e hiperparâmetros. Boas práticas: Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Aplique em um caso real, compare alternativas e documente hipóteses, métricas e limitações.', 'Mini-case de 60–90 min + defesa técnica + análise de premissas e limitações.', 'Experimento estruturado com baseline e comparação de famílias de mudança.', 'Decisão orientada por evidências e adaptação ao contexto.', 4.0, 'https://mlflow.org/docs/latest/ml/tracking', 'https://scikit-learn.org/stable/auto_examples/model_selection/index.html', '25/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K16', 'avancado', 4, 'Avançado', 'Priorizar experimentos por impacto esperado, custo e informação obtida.', 'Conduz ciclos de experimentação sistemáticos e eficientes, priorizando iterações de maior impacto no tempo disponível.', 'Priorizar experimentos por impacto esperado, custo e informação obtida.', 'Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Conduz ciclos de experimentação sistemáticos e eficientes, priorizando iterações de maior impacto no tempo disponível. Requisitos práticos: Priorizar experimentos por impacto esperado, custo e informação obtida. Boas práticas: Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Crie versão robusta/reutilizável, faça revisão por pares e valide se outra pessoa consegue reproduzir.', 'Case aberto + defesa de trade-offs + revisão por pares + evidência reproduzível.', 'Plano de experimentação priorizado + análise de ganho por custo/tempo.', 'Maturidade profissional para lidar com trade-offs, escala, risco e governança.', 4.5, 'https://mlflow.org/docs/latest/ml/tracking', 'https://scikit-learn.org/stable/auto_examples/model_selection/index.html', '25/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K17', 'iniciante', 1, 'Iniciante', 'Criar checklist de limitações de dados, hardware, software, prazo e acesso.', 'Identifica limitações óbvias (ex: dataset pequeno) apenas quando apontadas por terceiros.', 'Criar checklist de limitações de dados, hardware, software, prazo e acesso.', 'Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Identifica limitações óbvias (ex: dataset pequeno) apenas quando apontadas por terceiros. Requisitos práticos: Criar checklist de limitações de dados, hardware, software, prazo e acesso. Boas práticas: Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Reproduza um exemplo guiado e depois explique cada etapa sem consultar o roteiro.', 'Quiz de 10 questões + explicação oral curta + exercício guiado alterado.', 'Checklist aplicado a um caso simples.', 'Vocabulário técnico correto e execução consciente.', 2.5, 'https://developers.google.com/machine-learning/problem-framing', 'https://developers.google.com/machine-learning/problem-framing/ml-framing', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K17', 'basico', 2, 'Básico', 'Avaliar um projeto simples e listar restrições e consequências.', 'Reconhece restrições comuns de hardware, dados e tempo em projetos simples e conhecidos.', 'Avaliar um projeto simples e listar restrições e consequências.', 'Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Reconhece restrições comuns de hardware, dados e tempo em projetos simples e conhecidos. Requisitos práticos: Avaliar um projeto simples e listar restrições e consequências. Boas práticas: Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Refaça em um cenário/dataset simples diferente, sem copiar o exemplo, registrando decisões.', 'Quiz de 12 questões + exercício autônomo em cenário simples + explicação das decisões.', 'Tabela restrição→impacto→mitigação para um projeto.', 'Autonomia em casos simples e comunicação clara do raciocínio.', 3.0, 'https://developers.google.com/machine-learning/problem-framing', 'https://developers.google.com/machine-learning/problem-framing/ml-framing', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K17', 'intermediario', 3, 'Intermediário', 'Quantificar memória, latência, volume, qualidade de dados, dependências e prazo; ajustar escopo.', 'Avalia de forma proativa restrições de hardware, software, dados e prazo, ajustando o escopo da solução.', 'Quantificar memória, latência, volume, qualidade de dados, dependências e prazo; ajustar escopo.', 'Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Avalia de forma proativa restrições de hardware, software, dados e prazo, ajustando o escopo da solução. Requisitos práticos: Quantificar memória, latência, volume, qualidade de dados, dependências e prazo; ajustar escopo. Boas práticas: Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Aplique em um caso real, compare alternativas e documente hipóteses, métricas e limitações.', 'Mini-case de 60–90 min + defesa técnica + análise de premissas e limitações.', 'Memo técnico com limites quantificados e escopo revisado.', 'Decisão orientada por evidências e adaptação ao contexto.', 4.0, 'https://developers.google.com/machine-learning/problem-framing', 'https://developers.google.com/machine-learning/problem-framing/ml-framing', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K17', 'avancado', 4, 'Avançado', 'Fazer risk assessment antes da implementação e comparar arquiteturas/escopos mitigadores.', 'Antecipa limitações antes de iniciar o projeto e propõe alternativas de arquitetura/escopo que mitigam essas restrições.', 'Fazer risk assessment antes da implementação e comparar arquiteturas/escopos mitigadores.', 'Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Antecipa limitações antes de iniciar o projeto e propõe alternativas de arquitetura/escopo que mitigam essas restrições. Requisitos práticos: Fazer risk assessment antes da implementação e comparar arquiteturas/escopos mitigadores. Boas práticas: Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Crie versão robusta/reutilizável, faça revisão por pares e valide se outra pessoa consegue reproduzir.', 'Case aberto + defesa de trade-offs + revisão por pares + evidência reproduzível.', 'Risk register + decisão arquitetural com cenários e contingências.', 'Maturidade profissional para lidar com trade-offs, escala, risco e governança.', 4.5, 'https://developers.google.com/machine-learning/problem-framing', 'https://developers.google.com/machine-learning/problem-framing/ml-framing', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K18', 'iniciante', 1, 'Iniciante', 'Registrar dataset, código, parâmetros e resultado principal.', 'Registra resultados de forma informal e inconsistente (ex: comentários soltos).', 'Registrar dataset, código, parâmetros e resultado principal.', 'Um experimento = uma entrada identificável; evitar anotações soltas.', 'Registra resultados de forma informal e inconsistente (ex: comentários soltos). Requisitos práticos: Registrar dataset, código, parâmetros e resultado principal. Boas práticas: Um experimento = uma entrada identificável; evitar anotações soltas.', 'Reproduza um exemplo guiado e depois explique cada etapa sem consultar o roteiro.', 'Quiz de 10 questões + explicação oral curta + exercício guiado alterado.', 'Tabela com data, versão, parâmetros, métrica e observação.', 'Organização básica e rastreabilidade.', 2.5, 'https://mlflow.org/docs/latest/ml/tracking', 'https://dvc.org/blog/ml-experiment-versioning/', '18/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K18', 'basico', 2, 'Básico', 'Padronizar relatório de experimentos.', 'Documenta métricas e configurações principais de cada experimento em um arquivo ou planilha.', 'Padronizar relatório de experimentos.', 'Fixar random_state quando aplicável, registrar versões e artefatos.', 'Documenta métricas e configurações principais de cada experimento em um arquivo ou planilha. Requisitos práticos: Padronizar relatório de experimentos. Boas práticas: Fixar random_state quando aplicável, registrar versões e artefatos.', 'Refaça em um cenário/dataset simples diferente, sem copiar o exemplo, registrando decisões.', 'Quiz de 12 questões + exercício autônomo em cenário simples + explicação das decisões.', 'Template de experimento preenchido para vários runs.', 'Reprodutibilidade básica.', 3.0, 'https://mlflow.org/docs/latest/ml/tracking', 'https://dvc.org/blog/ml-experiment-versioning/', '18/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K18', 'intermediario', 3, 'Intermediário', 'Usar Git/DVC e relatórios estruturados.', 'Utiliza versionamento (DVC/Git) e relatórios estruturados para tornar os experimentos reproduzíveis.', 'Usar Git/DVC e relatórios estruturados.', 'Versionar código/dados/metadados; automatizar logging com MLflow/DVC quando útil.', 'Utiliza versionamento (DVC/Git) e relatórios estruturados para tornar os experimentos reproduzíveis. Requisitos práticos: Usar Git/DVC e relatórios estruturados. Boas práticas: Versionar código/dados/metadados; automatizar logging com MLflow/DVC quando útil.', 'Aplique em um caso real, compare alternativas e documente hipóteses, métricas e limitações.', 'Mini-case de 60–90 min + defesa técnica + análise de premissas e limitações.', 'Repositório reproduzível + histórico de experimentos.', 'Práticas MLOps que diferenciam projetos acadêmicos de profissionais.', 4.0, 'https://mlflow.org/docs/latest/ml/tracking', 'https://dvc.org/blog/ml-experiment-versioning/', '18/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K18', 'avancado', 4, 'Avançado', 'Tornar experimentos auditáveis por outra pessoa.', 'Estabelece um processo de documentação e rastreabilidade de experimentos que outros conseguem auditar e reproduzir de forma independente.', 'Tornar experimentos auditáveis por outra pessoa.', 'Lineage, ambientes reproduzíveis, automação, revisão e governança.', 'Estabelece um processo de documentação e rastreabilidade de experimentos que outros conseguem auditar e reproduzir de forma independente. Requisitos práticos: Tornar experimentos auditáveis por outra pessoa. Boas práticas: Lineage, ambientes reproduzíveis, automação, revisão e governança.', 'Crie versão robusta/reutilizável, faça revisão por pares e valide se outra pessoa consegue reproduzir.', 'Case aberto + defesa de trade-offs + revisão por pares + evidência reproduzível.', 'Terceiro reproduz o resultado a partir da documentação.', 'Maturidade de engenharia e colaboração em equipe.', 4.5, 'https://mlflow.org/docs/latest/ml/tracking', 'https://dvc.org/blog/ml-experiment-versioning/', '18/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K19', 'iniciante', 1, 'Iniciante', 'Distinguir opinião de evidência e registrar por que uma escolha foi feita.', 'Justifica escolhas técnicas com base em preferência pessoal, sem evidências.', 'Distinguir opinião de evidência e registrar por que uma escolha foi feita.', 'Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Justifica escolhas técnicas com base em preferência pessoal, sem evidências. Requisitos práticos: Distinguir opinião de evidência e registrar por que uma escolha foi feita. Boas práticas: Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Reproduza um exemplo guiado e depois explique cada etapa sem consultar o roteiro.', 'Quiz de 10 questões + explicação oral curta + exercício guiado alterado.', 'Revisar 10 decisões e separar preferência de evidência.', 'Vocabulário técnico correto e execução consciente.', 2.5, 'https://mlflow.org/docs/latest/ml/tracking', 'https://skills.github.com/', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K19', 'basico', 2, 'Básico', 'Citar métrica, teste ou referência simples para uma decisão.', 'Aponta ao menos uma métrica ou referência simples para justificar uma escolha.', 'Citar métrica, teste ou referência simples para uma decisão.', 'Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Aponta ao menos uma métrica ou referência simples para justificar uma escolha. Requisitos práticos: Citar métrica, teste ou referência simples para uma decisão. Boas práticas: Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Refaça em um cenário/dataset simples diferente, sem copiar o exemplo, registrando decisões.', 'Quiz de 12 questões + exercício autônomo em cenário simples + explicação das decisões.', 'Decision note curta com pelo menos uma evidência objetiva.', 'Autonomia em casos simples e comunicação clara do raciocínio.', 3.0, 'https://mlflow.org/docs/latest/ml/tracking', 'https://skills.github.com/', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K19', 'intermediario', 3, 'Intermediário', 'Criar decision log com alternativas, experimentos, métricas, limitações e referências.', 'Embasa escolhas de design, algoritmo ou arquitetura com experimentos, métricas e referências, de forma auditável.', 'Criar decision log com alternativas, experimentos, métricas, limitações e referências.', 'Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Embasa escolhas de design, algoritmo ou arquitetura com experimentos, métricas e referências, de forma auditável. Requisitos práticos: Criar decision log com alternativas, experimentos, métricas, limitações e referências. Boas práticas: Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Aplique em um caso real, compare alternativas e documente hipóteses, métricas e limitações.', 'Mini-case de 60–90 min + defesa técnica + análise de premissas e limitações.', 'ADR/memo técnico com experimento e comparação reproduzível.', 'Decisão orientada por evidências e adaptação ao contexto.', 4.0, 'https://mlflow.org/docs/latest/ml/tracking', 'https://skills.github.com/', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K19', 'avancado', 4, 'Avançado', 'Produzir decisão reprodutível com trade-offs, evidências independentes e resposta a objeções.', 'Constrói argumentações técnicas robustas e reprodutíveis que resistem a questionamentos de pares mais experientes.', 'Produzir decisão reprodutível com trade-offs, evidências independentes e resposta a objeções.', 'Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Constrói argumentações técnicas robustas e reprodutíveis que resistem a questionamentos de pares mais experientes. Requisitos práticos: Produzir decisão reprodutível com trade-offs, evidências independentes e resposta a objeções. Boas práticas: Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Crie versão robusta/reutilizável, faça revisão por pares e valide se outra pessoa consegue reproduzir.', 'Case aberto + defesa de trade-offs + revisão por pares + evidência reproduzível.', 'Defesa técnica revisada por pares com rastreabilidade completa das evidências.', 'Maturidade profissional para lidar com trade-offs, escala, risco e governança.', 4.5, 'https://mlflow.org/docs/latest/ml/tracking', 'https://skills.github.com/', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K20', 'iniciante', 1, 'Iniciante', 'Reconhecer alucinação, inconsistência e necessidade de checagem de fontes.', 'Aceita as saídas de modelos generativos sem verificação.', 'Reconhecer alucinação, inconsistência e necessidade de checagem de fontes.', 'Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Aceita as saídas de modelos generativos sem verificação. Requisitos práticos: Reconhecer alucinação, inconsistência e necessidade de checagem de fontes. Boas práticas: Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Reproduza um exemplo guiado e depois explique cada etapa sem consultar o roteiro.', 'Quiz de 10 questões + explicação oral curta + exercício guiado alterado.', 'Avaliar 10 respostas e registrar erros encontrados.', 'Vocabulário técnico correto e execução consciente.', 2.5, 'https://notebooklm.google.com/', 'https://docs.google.com/document/d/1PMOxuDgDpM85539xoY0JGnVkIPJz8lIlo-WD0zVtiWg/edit?usp=sharing', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K20', 'basico', 2, 'Básico', 'Aplicar checklist manual de factualidade, consistência e adequação.', 'Verifica manualmente respostas óbvias incorretas ou inconsistentes.', 'Aplicar checklist manual de factualidade, consistência e adequação.', 'Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Verifica manualmente respostas óbvias incorretas ou inconsistentes. Requisitos práticos: Aplicar checklist manual de factualidade, consistência e adequação. Boas práticas: Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Refaça em um cenário/dataset simples diferente, sem copiar o exemplo, registrando decisões.', 'Quiz de 12 questões + exercício autônomo em cenário simples + explicação das decisões.', 'Checklist aplicado a respostas de diferentes tipos.', 'Autonomia em casos simples e comunicação clara do raciocínio.', 3.0, 'https://notebooklm.google.com/', 'https://docs.google.com/document/d/1PMOxuDgDpM85539xoY0JGnVkIPJz8lIlo-WD0zVtiWg/edit?usp=sharing', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K20', 'intermediario', 3, 'Intermediário', 'Criar conjunto de avaliação, rubrica e processo de revisão de qualidade/segurança.', 'Estabelece critérios e processos para verificar qualidade, consistência e segurança das saídas antes de usá-las.', 'Criar conjunto de avaliação, rubrica e processo de revisão de qualidade/segurança.', 'Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Estabelece critérios e processos para verificar qualidade, consistência e segurança das saídas antes de usá-las. Requisitos práticos: Criar conjunto de avaliação, rubrica e processo de revisão de qualidade/segurança. Boas práticas: Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Aplique em um caso real, compare alternativas e documente hipóteses, métricas e limitações.', 'Mini-case de 60–90 min + defesa técnica + análise de premissas e limitações.', 'Eval set + rubrica + relatório de falhas e critérios de aceite.', 'Decisão orientada por evidências e adaptação ao contexto.', 4.0, 'https://notebooklm.google.com/', 'https://docs.google.com/document/d/1PMOxuDgDpM85539xoY0JGnVkIPJz8lIlo-WD0zVtiWg/edit?usp=sharing', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K20', 'avancado', 4, 'Avançado', 'Implementar checks automáticos, guardrails, monitoramento e human-in-the-loop.', 'Implementa validação automatizada (guardrails, testes, human-in-the-loop) para garantir confiabilidade das saídas em produção.', 'Implementar checks automáticos, guardrails, monitoramento e human-in-the-loop.', 'Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Implementa validação automatizada (guardrails, testes, human-in-the-loop) para garantir confiabilidade das saídas em produção. Requisitos práticos: Implementar checks automáticos, guardrails, monitoramento e human-in-the-loop. Boas práticas: Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Crie versão robusta/reutilizável, faça revisão por pares e valide se outra pessoa consegue reproduzir.', 'Case aberto + defesa de trade-offs + revisão por pares + evidência reproduzível.', 'Protótipo de guardrails/evals automáticos com fallback humano.', 'Maturidade profissional para lidar com trade-offs, escala, risco e governança.', 4.5, 'https://notebooklm.google.com/', 'https://docs.google.com/document/d/1PMOxuDgDpM85539xoY0JGnVkIPJz8lIlo-WD0zVtiWg/edit?usp=sharing', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K21', 'iniciante', 1, 'Iniciante', 'Relacionar problema, usuário, decisão e KPI de negócio.', 'Não relaciona o desempenho técnico do modelo a impacto de negócio.', 'Relacionar problema, usuário, decisão e KPI de negócio.', 'Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Não relaciona o desempenho técnico do modelo a impacto de negócio. Requisitos práticos: Relacionar problema, usuário, decisão e KPI de negócio. Boas práticas: Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Reproduza um exemplo guiado e depois explique cada etapa sem consultar o roteiro.', 'Quiz de 10 questões + explicação oral curta + exercício guiado alterado.', 'Mapa modelo→decisão→KPI para 3 casos.', 'Vocabulário técnico correto e execução consciente.', 2.5, 'https://developers.google.com/machine-learning/problem-framing/ml-framing', 'https://docs.google.com/document/d/1PMOxuDgDpM85539xoY0JGnVkIPJz8lIlo-WD0zVtiWg/edit?usp=sharing', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K21', 'basico', 2, 'Básico', 'Mapear métrica técnica para um KPI com suposições explícitas.', 'Relaciona métricas técnicas a resultados de negócio de forma simples (ex: ''modelo melhor = mais vendas'').', 'Mapear métrica técnica para um KPI com suposições explícitas.', 'Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Relaciona métricas técnicas a resultados de negócio de forma simples (ex: ''modelo melhor = mais vendas''). Requisitos práticos: Mapear métrica técnica para um KPI com suposições explícitas. Boas práticas: Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Refaça em um cenário/dataset simples diferente, sem copiar o exemplo, registrando decisões.', 'Quiz de 12 questões + exercício autônomo em cenário simples + explicação das decisões.', 'Mini business case com KPI antes/depois e hipóteses.', 'Autonomia em casos simples e comunicação clara do raciocínio.', 3.0, 'https://developers.google.com/machine-learning/problem-framing/ml-framing', 'https://docs.google.com/document/d/1PMOxuDgDpM85539xoY0JGnVkIPJz8lIlo-WD0zVtiWg/edit?usp=sharing', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K21', 'intermediario', 3, 'Intermediário', 'Estimar benefício, custo, ROI, riscos e adoção alinhados à meta estratégica.', 'Projeta retorno sobre investimento (ROI) e alinha a solução às metas estratégicas da organização.', 'Estimar benefício, custo, ROI, riscos e adoção alinhados à meta estratégica.', 'Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Projeta retorno sobre investimento (ROI) e alinha a solução às metas estratégicas da organização. Requisitos práticos: Estimar benefício, custo, ROI, riscos e adoção alinhados à meta estratégica. Boas práticas: Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Aplique em um caso real, compare alternativas e documente hipóteses, métricas e limitações.', 'Mini-case de 60–90 min + defesa técnica + análise de premissas e limitações.', 'Business case com ROI estimado, custos, riscos e cenários.', 'Decisão orientada por evidências e adaptação ao contexto.', 4.0, 'https://developers.google.com/machine-learning/problem-framing/ml-framing', 'https://docs.google.com/document/d/1PMOxuDgDpM85539xoY0JGnVkIPJz8lIlo-WD0zVtiWg/edit?usp=sharing', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K21', 'avancado', 4, 'Avançado', 'Avaliar efeitos de segunda ordem, manutenção, mudança de comportamento e impacto de longo prazo.', 'Avalia impacto de forma sofisticada, considerando efeitos de segunda ordem e o horizonte de longo prazo da organização.', 'Avaliar efeitos de segunda ordem, manutenção, mudança de comportamento e impacto de longo prazo.', 'Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Avalia impacto de forma sofisticada, considerando efeitos de segunda ordem e o horizonte de longo prazo da organização. Requisitos práticos: Avaliar efeitos de segunda ordem, manutenção, mudança de comportamento e impacto de longo prazo. Boas práticas: Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Crie versão robusta/reutilizável, faça revisão por pares e valide se outra pessoa consegue reproduzir.', 'Case aberto + defesa de trade-offs + revisão por pares + evidência reproduzível.', 'Análise estratégica com cenários, efeitos indiretos e métricas de monitoramento.', 'Maturidade profissional para lidar com trade-offs, escala, risco e governança.', 4.5, 'https://developers.google.com/machine-learning/problem-framing/ml-framing', 'https://docs.google.com/document/d/1PMOxuDgDpM85539xoY0JGnVkIPJz8lIlo-WD0zVtiWg/edit?usp=sharing', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K22', 'iniciante', 1, 'Iniciante', 'Identificar audiência, objetivo e termos que precisam ser explicados.', 'Explica conceitos técnicos apenas com jargão, dificultando o entendimento por não especialistas.', 'Identificar audiência, objetivo e termos que precisam ser explicados.', 'Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Explica conceitos técnicos apenas com jargão, dificultando o entendimento por não especialistas. Requisitos práticos: Identificar audiência, objetivo e termos que precisam ser explicados. Boas práticas: Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Reproduza um exemplo guiado e depois explique cada etapa sem consultar o roteiro.', 'Quiz de 10 questões + explicação oral curta + exercício guiado alterado.', 'Gravar explicação de 3 minutos sem jargão desnecessário.', 'Vocabulário técnico correto e execução consciente.', 2.5, 'https://developers.google.com/tech-writing', 'https://notebooklm.google.com/', '25/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K22', 'basico', 2, 'Básico', 'Explicar o mesmo conceito em versão técnica e leiga curta.', 'Explica conceitos técnicos simples de forma compreensível quando solicitado.', 'Explicar o mesmo conceito em versão técnica e leiga curta.', 'Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Explica conceitos técnicos simples de forma compreensível quando solicitado. Requisitos práticos: Explicar o mesmo conceito em versão técnica e leiga curta. Boas práticas: Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Refaça em um cenário/dataset simples diferente, sem copiar o exemplo, registrando decisões.', 'Quiz de 12 questões + exercício autônomo em cenário simples + explicação das decisões.', 'Duas versões do mesmo conteúdo para públicos diferentes.', 'Autonomia em casos simples e comunicação clara do raciocínio.', 3.0, 'https://developers.google.com/tech-writing', 'https://notebooklm.google.com/', '25/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K22', 'intermediario', 3, 'Intermediário', 'Criar resumo executivo e anexo técnico da mesma análise.', 'Explica arquiteturas, métricas e metodologias com terminologia precisa para times técnicos, e traduz para públicos não técnicos.', 'Criar resumo executivo e anexo técnico da mesma análise.', 'Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Explica arquiteturas, métricas e metodologias com terminologia precisa para times técnicos, e traduz para públicos não técnicos. Requisitos práticos: Criar resumo executivo e anexo técnico da mesma análise. Boas práticas: Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Aplique em um caso real, compare alternativas e documente hipóteses, métricas e limitações.', 'Mini-case de 60–90 min + defesa técnica + análise de premissas e limitações.', 'Apresentação com resumo executivo + seção técnica e perguntas.', 'Decisão orientada por evidências e adaptação ao contexto.', 4.0, 'https://developers.google.com/tech-writing', 'https://notebooklm.google.com/', '25/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K22', 'avancado', 4, 'Avançado', 'Adaptar mensagem, profundidade, riscos e recomendação a executivo, técnico e cliente.', 'Adapta a comunicação a diferentes audiências e contextos (executivos, técnicos, clientes) de forma natural e eficaz.', 'Adaptar mensagem, profundidade, riscos e recomendação a executivo, técnico e cliente.', 'Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Adapta a comunicação a diferentes audiências e contextos (executivos, técnicos, clientes) de forma natural e eficaz. Requisitos práticos: Adaptar mensagem, profundidade, riscos e recomendação a executivo, técnico e cliente. Boas práticas: Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Crie versão robusta/reutilizável, faça revisão por pares e valide se outra pessoa consegue reproduzir.', 'Case aberto + defesa de trade-offs + revisão por pares + evidência reproduzível.', 'Mesma decisão defendida para três audiências, revisada por pares.', 'Maturidade profissional para lidar com trade-offs, escala, risco e governança.', 4.5, 'https://developers.google.com/tech-writing', 'https://notebooklm.google.com/', '25/09/2026 + 02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K23', 'iniciante', 1, 'Iniciante', 'Registrar uma solução curta ou aprendizado.', 'Raramente documenta ou compartilha o que aprendeu com o grupo.', 'Registrar uma solução curta ou aprendizado.', 'Explicar contexto, problema, solução e limite.', 'Raramente documenta ou compartilha o que aprendeu com o grupo. Requisitos práticos: Registrar uma solução curta ou aprendizado. Boas práticas: Explicar contexto, problema, solução e limite.', 'Reproduza um exemplo guiado e depois explique cada etapa sem consultar o roteiro.', 'Quiz de 10 questões + explicação oral curta + exercício guiado alterado.', 'Nota de 1 página ou mensagem técnica bem estruturada.', 'Comunicação clara aumenta impacto técnico.', 2.5, 'https://developers.google.com/tech-writing', 'https://skills.github.com/', '18/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K23', 'basico', 2, 'Básico', 'Compartilhar solução com exemplos.', 'Compartilha soluções pontuais quando solicitado pelos colegas.', 'Compartilhar solução com exemplos.', 'Incluir código mínimo reproduzível e referência.', 'Compartilha soluções pontuais quando solicitado pelos colegas. Requisitos práticos: Compartilhar solução com exemplos. Boas práticas: Incluir código mínimo reproduzível e referência.', 'Refaça em um cenário/dataset simples diferente, sem copiar o exemplo, registrando decisões.', 'Quiz de 12 questões + exercício autônomo em cenário simples + explicação das decisões.', 'Mini tutorial interno revisado por colega.', 'Colaboração e capacidade de desbloquear pares.', 3.0, 'https://developers.google.com/tech-writing', 'https://skills.github.com/', '18/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K23', 'intermediario', 3, 'Intermediário', 'Criar tutorial/apresentação e receber feedback.', 'Documenta soluções, cria tutoriais internos e apresenta temas técnicos para os pares da turma.', 'Criar tutorial/apresentação e receber feedback.', 'Adaptar linguagem ao público; incluir demo e exercício.', 'Documenta soluções, cria tutoriais internos e apresenta temas técnicos para os pares da turma. Requisitos práticos: Criar tutorial/apresentação e receber feedback. Boas práticas: Adaptar linguagem ao público; incluir demo e exercício.', 'Aplique em um caso real, compare alternativas e documente hipóteses, métricas e limitações.', 'Mini-case de 60–90 min + defesa técnica + análise de premissas e limitações.', 'Apresentação de 10-15 min + notebook/README.', 'Visibilidade técnica e influência positiva no time.', 4.0, 'https://developers.google.com/tech-writing', 'https://skills.github.com/', '18/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K23', 'avancado', 4, 'Avançado', 'Mentorar, revisar e criar ativos reutilizáveis.', 'Atua como referência técnica e mentor informal, elevando o nível de conhecimento coletivo do grupo.', 'Mentorar, revisar e criar ativos reutilizáveis.', 'Criar padrões, guias e ciclos de feedback; medir adoção.', 'Atua como referência técnica e mentor informal, elevando o nível de conhecimento coletivo do grupo. Requisitos práticos: Mentorar, revisar e criar ativos reutilizáveis. Boas práticas: Criar padrões, guias e ciclos de feedback; medir adoção.', 'Crie versão robusta/reutilizável, faça revisão por pares e valide se outra pessoa consegue reproduzir.', 'Case aberto + defesa de trade-offs + revisão por pares + evidência reproduzível.', 'Playbook usado pelo grupo e sessões de mentoria.', 'Liderança técnica sem depender de cargo formal.', 4.5, 'https://developers.google.com/tech-writing', 'https://skills.github.com/', '18/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K24', 'iniciante', 1, 'Iniciante', 'Separar observação, impacto e sugestão; praticar escuta sem defesa imediata.', 'Evita dar ou recebe feedback de forma defensiva.', 'Separar observação, impacto e sugestão; praticar escuta sem defesa imediata.', 'Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Evita dar ou recebe feedback de forma defensiva. Requisitos práticos: Separar observação, impacto e sugestão; praticar escuta sem defesa imediata. Boas práticas: Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Reproduza um exemplo guiado e depois explique cada etapa sem consultar o roteiro.', 'Quiz de 10 questões + explicação oral curta + exercício guiado alterado.', 'Reescrever 10 feedbacks vagos em feedbacks acionáveis.', 'Vocabulário técnico correto e execução consciente.', 2.5, 'https://skills.github.com/', 'https://developers.google.com/tech-writing', '25/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K24', 'basico', 2, 'Básico', 'Fazer revisão pontual de código/artefato com comentários específicos e respeitosos.', 'Participa de revisões de código/peer review de forma pontual, com feedback superficial.', 'Fazer revisão pontual de código/artefato com comentários específicos e respeitosos.', 'Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Participa de revisões de código/peer review de forma pontual, com feedback superficial. Requisitos práticos: Fazer revisão pontual de código/artefato com comentários específicos e respeitosos. Boas práticas: Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Refaça em um cenário/dataset simples diferente, sem copiar o exemplo, registrando decisões.', 'Quiz de 12 questões + exercício autônomo em cenário simples + explicação das decisões.', 'Peer review de um artefato com 5 comentários específicos.', 'Autonomia em casos simples e comunicação clara do raciocínio.', 3.0, 'https://skills.github.com/', 'https://developers.google.com/tech-writing', '25/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K24', 'intermediario', 3, 'Intermediário', 'Dar e receber revisão embasada em critérios, evidências e alternativas.', 'Oferece e aceita críticas com embasamento técnico e postura colaborativa em revisões e retrospectivas.', 'Dar e receber revisão embasada em critérios, evidências e alternativas.', 'Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Oferece e aceita críticas com embasamento técnico e postura colaborativa em revisões e retrospectivas. Requisitos práticos: Dar e receber revisão embasada em critérios, evidências e alternativas. Boas práticas: Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Aplique em um caso real, compare alternativas e documente hipóteses, métricas e limitações.', 'Mini-case de 60–90 min + defesa técnica + análise de premissas e limitações.', 'Revisão técnica bidirecional com registro de decisões e melhorias.', 'Decisão orientada por evidências e adaptação ao contexto.', 4.0, 'https://skills.github.com/', 'https://developers.google.com/tech-writing', '25/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K24', 'avancado', 4, 'Avançado', 'Facilitar revisão/retrospectiva, mediar divergências e transformar feedback em padrão de qualidade.', 'Cria um ambiente de feedback construtivo no time, mediando situações difíceis e elevando o padrão de qualidade do grupo.', 'Facilitar revisão/retrospectiva, mediar divergências e transformar feedback em padrão de qualidade.', 'Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Cria um ambiente de feedback construtivo no time, mediando situações difíceis e elevando o padrão de qualidade do grupo. Requisitos práticos: Facilitar revisão/retrospectiva, mediar divergências e transformar feedback em padrão de qualidade. Boas práticas: Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Crie versão robusta/reutilizável, faça revisão por pares e valide se outra pessoa consegue reproduzir.', 'Case aberto + defesa de trade-offs + revisão por pares + evidência reproduzível.', 'Facilitar sessão de feedback e produzir ações/padrões adotados pelo grupo.', 'Maturidade profissional para lidar com trade-offs, escala, risco e governança.', 4.5, 'https://skills.github.com/', 'https://developers.google.com/tech-writing', '25/09/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K25', 'iniciante', 1, 'Iniciante', 'Manter registro de erros, dúvidas e conceitos não dominados.', 'Não reconhece as próprias lacunas de conhecimento sem feedback externo.', 'Manter registro de erros, dúvidas e conceitos não dominados.', 'Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Não reconhece as próprias lacunas de conhecimento sem feedback externo. Requisitos práticos: Manter registro de erros, dúvidas e conceitos não dominados. Boas práticas: Registrar definições, exemplos e limites; explicar com palavras próprias antes de usar ferramentas.', 'Reproduza um exemplo guiado e depois explique cada etapa sem consultar o roteiro.', 'Quiz de 10 questões + explicação oral curta + exercício guiado alterado.', 'Diário de lacunas com 10 itens e plano curto.', 'Vocabulário técnico correto e execução consciente.', 2.5, 'https://notebooklm.google.com/', 'https://docs.google.com/document/d/1PMOxuDgDpM85539xoY0JGnVkIPJz8lIlo-WD0zVtiWg/edit?usp=sharing', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K25', 'basico', 2, 'Básico', 'Transformar feedback em backlog de aprendizagem priorizado.', 'Reconhece lacunas óbvias após receber feedback.', 'Transformar feedback em backlog de aprendizagem priorizado.', 'Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Reconhece lacunas óbvias após receber feedback. Requisitos práticos: Transformar feedback em backlog de aprendizagem priorizado. Boas práticas: Aplicar em cenário simples sem depender de tutorial; justificar escolhas e registrar resultado.', 'Refaça em um cenário/dataset simples diferente, sem copiar o exemplo, registrando decisões.', 'Quiz de 12 questões + exercício autônomo em cenário simples + explicação das decisões.', 'Backlog de estudo priorizado após uma avaliação.', 'Autonomia em casos simples e comunicação clara do raciocínio.', 3.0, 'https://notebooklm.google.com/', 'https://docs.google.com/document/d/1PMOxuDgDpM85539xoY0JGnVkIPJz8lIlo-WD0zVtiWg/edit?usp=sharing', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K25', 'intermediario', 3, 'Intermediário', 'Aplicar habilidade já estudada em dataset/problema diferente e avaliar onde falha.', 'Faz autoavaliação honesta de suas competências e transfere conhecimento para problemas diferentes.', 'Aplicar habilidade já estudada em dataset/problema diferente e avaliar onde falha.', 'Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Faz autoavaliação honesta de suas competências e transfere conhecimento para problemas diferentes. Requisitos práticos: Aplicar habilidade já estudada em dataset/problema diferente e avaliar onde falha. Boas práticas: Comparar alternativas, explicitar premissas e limitações e sustentar decisões com evidências.', 'Aplique em um caso real, compare alternativas e documente hipóteses, métricas e limitações.', 'Mini-case de 60–90 min + defesa técnica + análise de premissas e limitações.', 'Transfer task para novo contexto + reflexão sobre diferenças.', 'Decisão orientada por evidências e adaptação ao contexto.', 4.0, 'https://notebooklm.google.com/', 'https://docs.google.com/document/d/1PMOxuDgDpM85539xoY0JGnVkIPJz8lIlo-WD0zVtiWg/edit?usp=sharing', '02/10/2026', true),
  ('7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid, 'K25', 'avancado', 4, 'Avançado', 'Construir roadmap de competências futuras baseado em próximos desafios e dependências.', 'Antecipa lacunas futuras e busca proativamente desenvolvê-las antes que se tornem um bloqueio.', 'Construir roadmap de competências futuras baseado em próximos desafios e dependências.', 'Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Antecipa lacunas futuras e busca proativamente desenvolvê-las antes que se tornem um bloqueio. Requisitos práticos: Construir roadmap de competências futuras baseado em próximos desafios e dependências. Boas práticas: Trabalhar com trade-offs, robustez, custo/impacto, reprodutibilidade e revisão por pares.', 'Crie versão robusta/reutilizável, faça revisão por pares e valide se outra pessoa consegue reproduzir.', 'Case aberto + defesa de trade-offs + revisão por pares + evidência reproduzível.', 'Roadmap trimestral de aprendizagem com sinais de risco e ações antecipadas.', 'Maturidade profissional para lidar com trade-offs, escala, risco e governança.', 4.5, 'https://notebooklm.google.com/', 'https://docs.google.com/document/d/1PMOxuDgDpM85539xoY0JGnVkIPJz8lIlo-WD0zVtiWg/edit?usp=sharing', '02/10/2026', true)
on conflict (program_id, competency_code, level_key) do update set
  level_order = excluded.level_order,
  level_label = excluded.level_label,
  objective = excluded.objective,
  criterion_original = excluded.criterion_original,
  practical_requirements = excluded.practical_requirements,
  best_practices = excluded.best_practices,
  study_suggested = excluded.study_suggested,
  practical_exercise = excluded.practical_exercise,
  assessment_suggested = excluded.assessment_suggested,
  evidence_expected = excluded.evidence_expected,
  market_differential = excluded.market_differential,
  planned_hours = excluded.planned_hours,
  resource_1 = excluded.resource_1,
  resource_2 = excluded.resource_2,
  reflection_source = excluded.reflection_source,
  active = excluded.active,
  updated_at = now();

comment on table public.ae_study_competency_level_plans is
  'Plano estruturado por competência e nível, derivado da planilha Residência IA - Plano de Conhecimentos.';
comment on table public.ae_study_user_competencies is
  'Competências adicionais criadas pelo estudante, privadas ou compartilháveis.';
comment on table public.ae_study_revalidation_notices is
  'Avisos de revisão/revalidação disparados quando uma fonte oficial ou compartilhada evolui.';

commit;

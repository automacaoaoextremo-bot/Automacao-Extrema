-- StudyAgent V3 — conferência após migration 20261101203000
-- Execute no SQL Editor do Supabase após a migration V3.

select
  p.slug,
  p.name,
  count(distinct c.id) as competencias_oficiais,
  count(distinct l.id) as planos_competencia_nivel,
  count(distinct e.id) filter (where coalesce(e.active, true)) as relacoes_ativas
from public.ae_study_programs p
left join public.ae_study_competencies c on c.program_id = p.id and c.active = true
left join public.ae_study_competency_level_plans l on l.program_id = p.id and l.active = true
left join public.ae_study_competency_edges e on e.program_id = p.id
where p.slug = 'residencia-ia'
group by p.slug, p.name;

select
  level_key,
  count(*) as etapas
from public.ae_study_competency_level_plans
where program_id = '7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid
  and active = true
group by level_key
order by min(level_order);

select
  to_regclass('public.ae_study_user_competencies') as user_competencies,
  to_regclass('public.ae_study_user_competency_subscriptions') as user_competency_subscriptions,
  to_regclass('public.ae_study_shared_knowledge_subscriptions') as shared_knowledge_subscriptions,
  to_regclass('public.ae_study_revalidation_notices') as revalidation_notices,
  to_regclass('public.ae_study_level_assessments') as level_assessments,
  to_regclass('public.ae_study_evidence') as evidence;

select
  count(*) as planos_sem_competencia
from public.ae_study_competency_level_plans l
left join public.ae_study_competencies c
  on c.program_id = l.program_id and c.code = l.competency_code
where c.id is null;

select
  count(*) as competencias_sem_quatro_niveis
from (
  select competency_code
  from public.ae_study_competency_level_plans
  where program_id = '7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001'::uuid
    and active = true
  group by competency_code
  having count(*) <> 4
) x;

select
  policyname,
  tablename,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'ae_study_competency_level_plans',
    'ae_study_user_competencies',
    'ae_study_user_competency_subscriptions',
    'ae_study_personal_knowledge',
    'ae_study_shared_knowledge_subscriptions',
    'ae_study_revalidation_notices',
    'ae_study_level_assessments',
    'ae_study_evidence'
  )
order by tablename, policyname;

select
  tgname as trigger_name,
  relname as table_name
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
where not t.tgisinternal
  and tgname in (
    'ae_study_competency_bump_version',
    'ae_study_competency_notify_revalidation',
    'ae_study_level_plan_bump_version',
    'ae_study_level_plan_notify_revalidation',
    'ae_study_user_competency_bump_version',
    'ae_study_user_competency_notify_revalidation',
    'ae_study_personal_knowledge_bump_version',
    'ae_study_personal_knowledge_notify_revalidation'
  )
order by tgname;

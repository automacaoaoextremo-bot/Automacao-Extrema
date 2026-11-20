-- StudyAgent V2 — conferência pós-migration

select
  to_regclass('public.ae_study_learners') as learners,
  to_regclass('public.ae_study_enrollments') as enrollments,
  to_regclass('public.ae_study_user_progress') as progress,
  to_regclass('public.ae_study_tutor_consultations') as consultations,
  to_regclass('public.ae_study_personal_knowledge') as personal_knowledge,
  to_regclass('public.ae_study_knowledge_suggestions') as suggestions;

select
  p.slug,
  count(distinct c.id) as competencias,
  count(distinct l.id) as niveis,
  count(distinct e.id) as arestas
from public.ae_study_programs p
left join public.ae_study_competencies c on c.program_id = p.id
left join public.ae_study_level_definitions l on l.program_id = p.id
left join public.ae_study_competency_edges e on e.program_id = p.id
where p.slug = 'residencia-ia'
group by p.slug;

select
  schemaname,
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'ae_study_learners',
    'ae_study_enrollments',
    'ae_study_user_progress',
    'ae_study_tutor_consultations',
    'ae_study_personal_knowledge',
    'ae_study_knowledge_suggestions'
  )
order by tablename, policyname;

select
  trigger_name,
  event_object_schema,
  event_object_table,
  action_timing,
  event_manipulation
from information_schema.triggers
where trigger_name = 'on_auth_user_created_studyagent';

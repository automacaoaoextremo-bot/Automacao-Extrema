-- Organização em Harmonia / TUCXA
-- Ajustes e Evoluções 07
-- Registra presença histórica de Gabriel Mattano da Silva e Lucas Delaqua
-- em todas as aulas do curso concluído do primeiro semestre de 2026.

insert into public.oh_course_attendance (
  organization_id,
  lesson_id,
  course_student_id,
  status,
  checkin_method,
  checked_in_at,
  notes
)
select
  c.organization_id,
  l.id,
  s.id,
  'presente',
  'professor',
  l.starts_at,
  'Presença histórica incluída pelos Ajustes e Evoluções 07.'
from public.oh_courses c
join public.oh_course_lessons l
  on l.organization_id = c.organization_id
 and l.course_id = c.id
join public.oh_course_students s
  on s.organization_id = c.organization_id
 and s.course_id = c.id
left join public.oh_people p
  on p.organization_id = c.organization_id
 and p.id = s.person_id
where c.slug = 'curso-tucxa-2026-primeiro-semestre'
  and lower(trim(coalesce(p.full_name, s.invited_name, ''))) in (
    'gabriel mattano da silva',
    'lucas delaqua'
  )
  and s.invitation_status <> 'cancelado'
on conflict (lesson_id, course_student_id) do update
set
  status = 'presente',
  checkin_method = 'professor',
  checked_in_at = excluded.checked_in_at,
  notes = excluded.notes,
  updated_at = now();

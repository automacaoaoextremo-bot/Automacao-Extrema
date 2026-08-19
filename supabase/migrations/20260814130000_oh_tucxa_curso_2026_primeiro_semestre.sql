-- Organização em Harmonia / TUCXA
-- Ajustes e Evoluções 05
-- Carga histórica do curso realizado no primeiro semestre de 2026.
-- Dados definidos em TucxaAjustesEvoluções-05.docx.

do $$
<<seed>>
declare
  tucxa_id uuid;
  course_id uuid;
  lesson_id uuid;
  agenda_id uuid;
  person_id uuid;
  student_id uuid;
  lesson_row record;
  student_name text;
  lesson_start timestamptz;
  lesson_end timestamptz;
  agenda_slug text;
begin
  select id into tucxa_id
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by created_at desc
  limit 1;

  if tucxa_id is null then
    raise notice 'Organização Tucxa não encontrada. Carga histórica do curso não executada.';
    return;
  end if;

  insert into public.oh_courses (
    organization_id,
    name,
    slug,
    objective,
    rules,
    planned_content,
    status,
    active,
    metadata
  )
  values (
    tucxa_id,
    'CRONOGRAMA CURSO TUCXA / 2026 - Primeiro Semestre',
    'curso-tucxa-2026-primeiro-semestre',
    null,
    null,
    E'Acolhimento 19/03\nCaridade 26/03\nMediunidade I 09/04\nMed. II 16/04\nMed. III 23/04\nEnergia/ Chakras I 30/04\nEn. / Chak II 07/05\nUmbanda I 14/05\nUmb.II 21/05\nTucxatour 29/05 sexta f.\nHorário das aulas: 19:30 às 21:20.',
    'concluido',
    true,
    jsonb_build_object(
      'source', 'tucxa-ajustes-evolucoes-05',
      'historical', true,
      'semester', 1,
      'year', 2026
    )
  )
  on conflict (organization_id, slug) do update
  set
    name = excluded.name,
    planned_content = excluded.planned_content,
    status = excluded.status,
    active = true,
    metadata = coalesce(oh_courses.metadata, '{}'::jsonb) || excluded.metadata,
    updated_at = now()
  returning id into course_id;

  for lesson_row in
    select *
    from (values
      ('Acolhimento'::text, '2026-03-19'::date, 1),
      ('Caridade'::text, '2026-03-26'::date, 2),
      ('Mediunidade I'::text, '2026-04-09'::date, 3),
      ('Med. II'::text, '2026-04-16'::date, 4),
      ('Med. III'::text, '2026-04-23'::date, 5),
      ('Energia/ Chakras I'::text, '2026-04-30'::date, 6),
      ('En. / Chak II'::text, '2026-05-07'::date, 7),
      ('Umbanda I'::text, '2026-05-14'::date, 8),
      ('Umb.II'::text, '2026-05-21'::date, 9),
      ('Tucxatour'::text, '2026-05-29'::date, 10)
    ) as lessons(title, lesson_date, sort_order)
  loop
    lesson_start := (lesson_row.lesson_date::text || ' 19:30:00-03')::timestamptz;
    lesson_end := (lesson_row.lesson_date::text || ' 21:20:00-03')::timestamptz;
    agenda_slug := 'curso-tucxa-2026-1s-' || to_char(lesson_row.lesson_date, 'YYYYMMDD');

    select id into agenda_id
    from public.agv_events
    where organization_id = tucxa_id
      and group_slug = agenda_slug
    order by created_at asc
    limit 1;

    if agenda_id is null then
      insert into public.agv_events (
        organization_id,
        title,
        event_type,
        status,
        active,
        starts_at,
        ends_at,
        all_day,
        location,
        group_slug,
        requires_approval,
        notes,
        metadata
      )
      values (
        tucxa_id,
        'Curso Tucxa 2026 · ' || lesson_row.title,
        'curso',
        'aprovado',
        true,
        lesson_start,
        lesson_end,
        false,
        'Tucxa',
        agenda_slug,
        false,
        'Aula histórica do curso do primeiro semestre de 2026.',
        jsonb_build_object(
          'source', 'curso-tucxa-2026-primeiro-semestre',
          'eventClassification', 'estudos',
          'historical', true,
          'courseSlug', 'curso-tucxa-2026-primeiro-semestre',
          'lessonOrder', lesson_row.sort_order,
          'timeLabel', '19h30 às 21h20'
        )
      )
      returning id into agenda_id;
    else
      update public.agv_events
      set
        title = 'Curso Tucxa 2026 · ' || lesson_row.title,
        event_type = 'curso',
        status = 'aprovado',
        active = true,
        starts_at = lesson_start,
        ends_at = lesson_end,
        all_day = false,
        location = 'Tucxa',
        requires_approval = false,
        notes = 'Aula histórica do curso do primeiro semestre de 2026.',
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
          'source', 'curso-tucxa-2026-primeiro-semestre',
          'eventClassification', 'estudos',
          'historical', true,
          'courseSlug', 'curso-tucxa-2026-primeiro-semestre',
          'lessonOrder', lesson_row.sort_order,
          'timeLabel', '19h30 às 21h20'
        ),
        updated_at = now()
      where id = agenda_id;
    end if;

    select l.id into lesson_id
    from public.oh_course_lessons l
    where l.organization_id = tucxa_id
      and l.course_id = seed.course_id
      and lower(trim(l.title)) = lower(trim(lesson_row.title))
      and l.starts_at = lesson_start
    order by l.created_at asc
    limit 1;

    if lesson_id is null then
      select l.id into lesson_id
      from public.oh_course_lessons l
      where l.organization_id = tucxa_id
        and l.course_id = seed.course_id
        and lower(trim(l.title)) = lower(trim(lesson_row.title))
      order by l.created_at asc
      limit 1;
    end if;

    if lesson_id is null then
      insert into public.oh_course_lessons (
        organization_id,
        course_id,
        title,
        planned_content,
        starts_at,
        ends_at,
        location,
        agenda_event_id,
        status,
        metadata
      )
      values (
        tucxa_id,
        course_id,
        lesson_row.title,
        null,
        lesson_start,
        lesson_end,
        'Tucxa',
        agenda_id,
        'realizada',
        jsonb_build_object(
          'source', 'tucxa-ajustes-evolucoes-05',
          'historical', true,
          'lessonOrder', lesson_row.sort_order
        )
      )
      returning id into lesson_id;
    else
      update public.oh_course_lessons
      set
        title = lesson_row.title,
        starts_at = lesson_start,
        ends_at = lesson_end,
        location = 'Tucxa',
        agenda_event_id = agenda_id,
        status = 'realizada',
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
          'source', 'tucxa-ajustes-evolucoes-05',
          'historical', true,
          'lessonOrder', lesson_row.sort_order
        ),
        updated_at = now()
      where id = lesson_id;
    end if;

    lesson_id := null;
    agenda_id := null;
  end loop;

  foreach student_name in array array[
    'Gabriel Mattano da Silva',
    'Lucas Delaqua'
  ]
  loop
    person_id := null;
    student_id := null;

    select p.id into person_id
    from public.oh_people p
    where p.organization_id = tucxa_id
      and p.active = true
      and lower(trim(p.full_name)) = lower(trim(student_name))
    order by p.created_at asc
    limit 1;

    if person_id is not null then
      select s.id into student_id
      from public.oh_course_students s
      where s.course_id = seed.course_id
        and s.person_id = seed.person_id
        and s.invitation_status <> 'cancelado'
      order by s.created_at asc
      limit 1;

      if student_id is null then
        select s.id into student_id
        from public.oh_course_students s
        where s.course_id = seed.course_id
          and lower(trim(coalesce(s.invited_name, ''))) = lower(trim(student_name))
          and s.invitation_status <> 'cancelado'
        order by s.created_at asc
        limit 1;
      end if;

      if student_id is null then
        insert into public.oh_course_students (
          organization_id,
          course_id,
          person_id,
          invited_name,
          invited_email,
          invited_whatsapp,
          invitation_status,
          accepted_at,
          metadata
        )
        select
          tucxa_id,
          course_id,
          p.id,
          p.full_name,
          p.email,
          p.whatsapp,
          'aceito',
          '2026-03-19 19:30:00-03'::timestamptz,
          jsonb_build_object(
            'source', 'tucxa-ajustes-evolucoes-05',
            'historical', true
          )
        from public.oh_people p
        where p.id = seed.person_id;
      else
        update public.oh_course_students s
        set
          person_id = seed.person_id,
          invited_name = student_name,
          invitation_status = 'aceito',
          accepted_at = coalesce(s.accepted_at, '2026-03-19 19:30:00-03'::timestamptz),
          metadata = coalesce(s.metadata, '{}'::jsonb) || jsonb_build_object(
            'source', 'tucxa-ajustes-evolucoes-05',
            'historical', true
          ),
          updated_at = now()
        where s.id = student_id;
      end if;
    else
      select s.id into student_id
      from public.oh_course_students s
      where s.course_id = seed.course_id
        and lower(trim(coalesce(s.invited_name, ''))) = lower(trim(student_name))
        and s.invitation_status <> 'cancelado'
      order by s.created_at asc
      limit 1;

      if student_id is null then
        insert into public.oh_course_students (
          organization_id,
          course_id,
          invited_name,
          invitation_status,
          accepted_at,
          metadata
        )
        values (
          tucxa_id,
          course_id,
          student_name,
          'aceito',
          '2026-03-19 19:30:00-03'::timestamptz,
          jsonb_build_object(
            'source', 'tucxa-ajustes-evolucoes-05',
            'historical', true,
            'personLinkPending', true
          )
        );
      end if;
    end if;
  end loop;
end $$;

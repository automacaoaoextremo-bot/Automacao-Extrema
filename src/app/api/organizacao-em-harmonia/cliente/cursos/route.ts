import { NextResponse } from "next/server";
import { getTucxaManagementAccess } from "@/lib/organizacao-em-harmonia/tucxa-management-access";
import {
  buildCourseWhatsappUrl,
  sendCourseInvitationEmail,
} from "@/lib/organizacao-em-harmonia/course-notifications";
import { supabaseAdmin } from "@/lib/supabase-admin";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function list(value: unknown) {
  return Array.isArray(value) ? value.map((item) => text(item)).filter(Boolean) : [];
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalize(value: unknown) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function slugify(value: string) {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `curso-${Date.now()}`;
}

function dateIso(value: unknown) {
  const raw = text(value);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
    const parsed = new Date(`${raw.length === 16 ? `${raw}:00` : raw}-03:00`);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/$/, "");
}

function errorRecord(value: unknown) {
  return record(value);
}

function errorMessage(value: unknown, fallback: string) {
  if (value instanceof Error && value.message) return value.message;
  const current = errorRecord(value);
  return text(current.message) || text(current.details) || text(current.hint) || fallback;
}

function isMissingCourseSchema(value: unknown) {
  const current = errorRecord(value);
  const code = text(current.code).toUpperCase();
  const message = normalize([
    current.message,
    current.details,
    current.hint,
  ].map((item) => text(item)).filter(Boolean).join(" "));

  return (
    code === "42P01" ||
    code === "PGRST205" ||
    ((message.includes("oh_course") || message.includes("oh_courses")) &&
      (message.includes("does not exist") ||
        message.includes("nao existe") ||
        message.includes("could not find") ||
        message.includes("schema cache")))
  );
}

function courseLoadError(value: unknown) {
  if (isMissingCourseSchema(value)) {
    return {
      message:
        "A estrutura do Cursos em Harmonia ainda não está disponível no banco. Verifique se a migration 20260811190000_oh_tucxa_escuta_cursos_v1.sql foi aplicada no Supabase.",
      status: 503,
    };
  }

  return {
    message: errorMessage(value, "Erro ao carregar os cursos."),
    status: 500,
  };
}

function professorFromProfile(value: unknown) {
  const profile = record(value);
  const tokens = [
    ...(Array.isArray(profile.functionSlugs) ? profile.functionSlugs : []),
    ...(Array.isArray(profile.selectedFunctions) ? profile.selectedFunctions.flatMap((item) => {
      const current = record(item);
      return [current.slug, current.label, current.name];
    }) : []),
  ]
    .map((item) => normalize(item))
    .filter(Boolean);
  return tokens.some((token) => token.includes("professor") || token.includes("docente"));
}

async function loadPayload(organizationId: string) {
  const [
    coursesResult,
    lessonsResult,
    teachersResult,
    studentsResult,
    attendanceResult,
    peopleResult,
    membershipsResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("oh_courses")
      .select("id,name,slug,objective,rules,planned_content,status,active,metadata,created_at,updated_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("oh_course_lessons")
      .select("id,course_id,title,planned_content,starts_at,ends_at,location,agenda_event_id,checkin_code_generated_at,status,metadata,created_at,updated_at")
      .eq("organization_id", organizationId)
      .order("starts_at", { ascending: true }),
    supabaseAdmin
      .from("oh_course_teachers")
      .select("id,lesson_id,teacher_person_id")
      .eq("organization_id", organizationId),
    supabaseAdmin
      .from("oh_course_students")
      .select("id,course_id,person_id,invited_name,invited_email,invited_whatsapp,invitation_token,invitation_status,invited_at,accepted_at,declined_at,metadata,created_at,updated_at")
      .eq("organization_id", organizationId)
      .order("invited_at", { ascending: false }),
    supabaseAdmin
      .from("oh_course_attendance")
      .select("id,lesson_id,course_student_id,status,checkin_method,checked_in_at,marked_by_person_id,notes,created_at,updated_at")
      .eq("organization_id", organizationId),
    supabaseAdmin
      .from("oh_people")
      .select("id,full_name,email,whatsapp,active")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .order("full_name", { ascending: true }),
    supabaseAdmin
      .from("oh_memberships")
      .select("person_id,active,status,agenda_viva_profile")
      .eq("organization_id", organizationId)
      .eq("active", true),
  ]);

  for (const result of [
    coursesResult,
    lessonsResult,
    teachersResult,
    studentsResult,
    attendanceResult,
    peopleResult,
    membershipsResult,
  ]) {
    if (result.error) throw result.error;
  }

  // A Agenda Viva agrega valor à gestão, mas uma indisponibilidade dela não deve
  // impedir a Coordenação de Cursos de abrir a página e administrar o curso.
  const eventsResult = await supabaseAdmin
    .from("agv_events")
    .select("id,title,event_type,status,active,starts_at,ends_at,all_day,recurrence_rule,location,group_slug,responsible_person_id,metadata")
    .eq("organization_id", organizationId)
    .neq("active", false)
    .order("starts_at", { ascending: true, nullsFirst: false });

  const people = peopleResult.data ?? [];
  const personMap = new Map(people.map((person) => [person.id, person]));
  const professorIds = new Set(
    (membershipsResult.data ?? [])
      .filter((membership) => professorFromProfile(membership.agenda_viva_profile))
      .map((membership) => membership.person_id),
  );

  return {
    courses: coursesResult.data ?? [],
    lessons: lessonsResult.data ?? [],
    teachers: (teachersResult.data ?? []).map((row) => ({
      ...row,
      teacher: personMap.get(row.teacher_person_id) ?? null,
    })),
    students: (studentsResult.data ?? []).map((row) => ({
      ...row,
      person: row.person_id ? personMap.get(row.person_id) ?? null : null,
      invitationUrl: `${siteUrl()}/solucoes/organizacao-em-harmonia/tucxa/cursos/convite/${row.invitation_token}`,
    })),
    attendance: attendanceResult.data ?? [],
    people,
    teacherCandidates: people.filter((person) => professorIds.has(person.id)),
    agendaEvents: eventsResult.error ? [] : eventsResult.data ?? [],
    agendaWarning: eventsResult.error
      ? `A gestão de cursos foi carregada, mas a Agenda Viva não pôde ser consultada agora: ${errorMessage(
          eventsResult.error,
          "erro não identificado",
        )}`
      : null,
  };
}

async function teacherConflicts(input: {
  organizationId: string;
  teacherIds: string[];
  startsAt: string;
  endsAt: string;
  lessonId?: string;
}) {
  const conflicts: Array<{ teacherId: string; source: string; title: string; startsAt: string; endsAt: string }> = [];

  for (const teacherId of input.teacherIds) {
    const { data: assignedRows, error: assignedError } = await supabaseAdmin
      .from("oh_course_teachers")
      .select("lesson_id")
      .eq("organization_id", input.organizationId)
      .eq("teacher_person_id", teacherId);
    if (assignedError) throw assignedError;

    const lessonIds = (assignedRows ?? [])
      .map((row) => row.lesson_id)
      .filter((id) => id && id !== input.lessonId);
    if (lessonIds.length) {
      const { data: lessons, error } = await supabaseAdmin
        .from("oh_course_lessons")
        .select("id,title,starts_at,ends_at,status")
        .eq("organization_id", input.organizationId)
        .in("id", lessonIds)
        .neq("status", "cancelada")
        .lt("starts_at", input.endsAt)
        .gt("ends_at", input.startsAt);
      if (error) throw error;
      for (const lesson of lessons ?? []) {
        conflicts.push({
          teacherId,
          source: "curso",
          title: lesson.title || "Outra aula",
          startsAt: lesson.starts_at,
          endsAt: lesson.ends_at,
        });
      }
    }

    const { data: agendaEvents, error: agendaError } = await supabaseAdmin
      .from("agv_events")
      .select("id,title,starts_at,ends_at,status,active")
      .eq("organization_id", input.organizationId)
      .eq("responsible_person_id", teacherId)
      .neq("active", false)
      .lt("starts_at", input.endsAt)
      .gt("ends_at", input.startsAt);
    if (agendaError) throw agendaError;
    for (const event of agendaEvents ?? []) {
      conflicts.push({
        teacherId,
        source: "agenda-viva",
        title: event.title || "Compromisso no Tucxa",
        startsAt: event.starts_at,
        endsAt: event.ends_at,
      });
    }
  }

  return conflicts;
}

export async function GET(request: Request) {
  const auth = await getTucxaManagementAccess(request, [
    "coordenacao-de-cursos",
    "coordenador-de-cursos",
    "coordenacao-cursos",
    "coordenador-cursos",
  ]);
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json(await loadPayload(auth.context.organizationId));
  } catch (error) {
    console.error("[Cursos em Harmonia][GET]", error);
    const current = courseLoadError(error);
    return NextResponse.json(
      { error: current.message },
      { status: current.status },
    );
  }
}

export async function POST(request: Request) {
  const auth = await getTucxaManagementAccess(request, [
    "coordenacao-de-cursos",
    "coordenador-de-cursos",
    "coordenacao-cursos",
    "coordenador-cursos",
  ]);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = text(body.action);
  const organizationId = auth.context.organizationId;
  const actorPersonId = text(auth.context.person?.id) || null;
  const now = new Date().toISOString();

  try {
    if (action === "save-course") {
      const courseId = text(body.courseId);
      const name = text(body.name);
      if (name.length < 3) {
        return NextResponse.json({ error: "Informe o nome do curso." }, { status: 400 });
      }

      const payload = {
        organization_id: organizationId,
        name,
        slug: slugify(text(body.slug) || name),
        objective: text(body.objective) || null,
        rules: text(body.rules) || null,
        planned_content: text(body.plannedContent) || null,
        status: text(body.status) || "planejamento",
        active: body.active !== false,
        updated_at: now,
      };

      if (courseId) {
        const { data, error } = await supabaseAdmin
          .from("oh_courses")
          .update(payload)
          .eq("organization_id", organizationId)
          .eq("id", courseId)
          .select("id")
          .single();
        if (error) throw error;
        return NextResponse.json({ ok: true, courseId: data.id });
      }

      const { data, error } = await supabaseAdmin
        .from("oh_courses")
        .insert({ ...payload, created_by_person_id: actorPersonId })
        .select("id")
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, courseId: data.id });
    }

    if (action === "check-conflicts") {
      const startsAt = dateIso(body.startsAt);
      const endsAt = dateIso(body.endsAt);
      const teacherIds = list(body.teacherIds);
      if (!startsAt || !endsAt || !teacherIds.length) {
        return NextResponse.json({ conflicts: [] });
      }
      return NextResponse.json({
        conflicts: await teacherConflicts({
          organizationId,
          teacherIds,
          startsAt,
          endsAt,
          lessonId: text(body.lessonId),
        }),
      });
    }

    if (action === "save-lesson") {
      const lessonId = text(body.lessonId);
      const courseId = text(body.courseId);
      const title = text(body.title);
      const startsAt = dateIso(body.startsAt);
      const endsAt = dateIso(body.endsAt);
      const teacherIds = list(body.teacherIds);
      const force = body.force === true;

      if (!courseId || title.length < 2 || !startsAt || !endsAt || new Date(endsAt) <= new Date(startsAt)) {
        return NextResponse.json({ error: "Informe curso, aula e um período válido." }, { status: 400 });
      }
      if (!teacherIds.length) {
        return NextResponse.json({ error: "Associe pelo menos um Professor à aula." }, { status: 400 });
      }

      const { data: course, error: courseError } = await supabaseAdmin
        .from("oh_courses")
        .select("id,name,slug,status")
        .eq("organization_id", organizationId)
        .eq("id", courseId)
        .single();
      if (courseError) throw courseError;

      const courseStatus = normalize(course.status);
      if (["concluido", "finalizado", "encerrado"].some((token) => courseStatus.includes(token))) {
        return NextResponse.json(
          { error: "Este curso está concluído e o cronograma é somente para consulta." },
          { status: 409 },
        );
      }

      const conflicts = await teacherConflicts({
        organizationId,
        teacherIds,
        startsAt,
        endsAt,
        lessonId,
      });
      if (conflicts.length && !force) {
        return NextResponse.json(
          {
            error: "Existe conflito de agenda para um ou mais professores. Revise antes de salvar.",
            conflicts,
          },
          { status: 409 },
        );
      }

      const lessonPayload = {
        organization_id: organizationId,
        course_id: courseId,
        title,
        planned_content: text(body.plannedContent) || null,
        starts_at: startsAt,
        ends_at: endsAt,
        location: text(body.location) || "Tucxa",
        status: text(body.status) || "prevista",
        metadata: {
          source: "cursos-em-harmonia",
          conflictOverride: force && conflicts.length > 0,
          conflictsAtSave: conflicts,
        },
        updated_at: now,
      };

      let savedLessonId = lessonId;
      let agendaEventId = "";
      if (lessonId) {
        const { data: existing, error: existingError } = await supabaseAdmin
          .from("oh_course_lessons")
          .select("id,agenda_event_id")
          .eq("organization_id", organizationId)
          .eq("id", lessonId)
          .single();
        if (existingError) throw existingError;
        agendaEventId = text(existing.agenda_event_id);

        const { error } = await supabaseAdmin
          .from("oh_course_lessons")
          .update(lessonPayload)
          .eq("organization_id", organizationId)
          .eq("id", lessonId);
        if (error) throw error;
      } else {
        const { data, error } = await supabaseAdmin
          .from("oh_course_lessons")
          .insert({ ...lessonPayload, created_by_person_id: actorPersonId })
          .select("id")
          .single();
        if (error) throw error;
        savedLessonId = data.id;
      }

      await supabaseAdmin
        .from("oh_course_teachers")
        .delete()
        .eq("organization_id", organizationId)
        .eq("lesson_id", savedLessonId);
      const { error: teacherError } = await supabaseAdmin.from("oh_course_teachers").insert(
        teacherIds.map((teacherPersonId) => ({
          organization_id: organizationId,
          lesson_id: savedLessonId,
          teacher_person_id: teacherPersonId,
        })),
      );
      if (teacherError) throw teacherError;

      const eventPayload = {
        organization_id: organizationId,
        title: `${course.name} — ${title}`,
        event_type: "curso",
        status: "aprovado",
        active: true,
        starts_at: startsAt,
        ends_at: endsAt,
        all_day: false,
        location: text(body.location) || "Tucxa",
        group_slug: `curso-${course.slug}-${savedLessonId}`,
        responsible_person_id: teacherIds[0],
        requires_approval: false,
        notes: text(body.plannedContent) || `Aula do curso ${course.name}.`,
        metadata: {
          source: "cursos-em-harmonia",
          courseId,
          lessonId: savedLessonId,
          teacherIds,
          eventClassification: "estudos",
          publicOption: false,
        },
        updated_at: now,
      };

      if (agendaEventId) {
        const { error } = await supabaseAdmin
          .from("agv_events")
          .update(eventPayload)
          .eq("organization_id", organizationId)
          .eq("id", agendaEventId);
        if (error) throw error;
      } else {
        const { data, error } = await supabaseAdmin
          .from("agv_events")
          .insert(eventPayload)
          .select("id")
          .single();
        if (error) throw error;
        agendaEventId = data.id;
        const { error: linkError } = await supabaseAdmin
          .from("oh_course_lessons")
          .update({ agenda_event_id: agendaEventId, updated_at: now })
          .eq("organization_id", organizationId)
          .eq("id", savedLessonId);
        if (linkError) throw linkError;
      }

      return NextResponse.json({
        ok: true,
        lessonId: savedLessonId,
        agendaEventId,
        conflicts,
      });
    }

    if (action === "invite-student") {
      const courseId = text(body.courseId);
      const personId = text(body.personId);
      let invitedName = text(body.name);
      let invitedEmail = text(body.email);
      let invitedWhatsapp = text(body.whatsapp);

      if (!courseId) {
        return NextResponse.json({ error: "Selecione o curso." }, { status: 400 });
      }

      if (personId) {
        const { data: person, error: personError } = await supabaseAdmin
          .from("oh_people")
          .select("id,full_name,email,whatsapp")
          .eq("organization_id", organizationId)
          .eq("id", personId)
          .single();
        if (personError) throw personError;
        invitedName = text(person.full_name);
        invitedEmail = text(person.email);
        invitedWhatsapp = text(person.whatsapp);
      }

      if (!invitedName || (!invitedEmail && !invitedWhatsapp)) {
        return NextResponse.json(
          { error: "Informe o aluno e pelo menos WhatsApp ou e-mail." },
          { status: 400 },
        );
      }

      const { data: course, error: courseError } = await supabaseAdmin
        .from("oh_courses")
        .select("id,name")
        .eq("organization_id", organizationId)
        .eq("id", courseId)
        .single();
      if (courseError) throw courseError;

      if (personId) {
        const { data: existing } = await supabaseAdmin
          .from("oh_course_students")
          .select("id,invitation_token")
          .eq("organization_id", organizationId)
          .eq("course_id", courseId)
          .eq("person_id", personId)
          .neq("invitation_status", "cancelado")
          .maybeSingle();
        if (existing?.id) {
          const invitationUrl = `${siteUrl()}/solucoes/organizacao-em-harmonia/tucxa/cursos/convite/${existing.invitation_token}`;
          return NextResponse.json({
            ok: true,
            alreadyInvited: true,
            invitationUrl,
            whatsappUrl: buildCourseWhatsappUrl({
              whatsapp: invitedWhatsapp,
              studentName: invitedName,
              courseName: course.name,
              invitationUrl,
              needsRegistration: false,
            }),
          });
        }
      }

      const { data: student, error: studentError } = await supabaseAdmin
        .from("oh_course_students")
        .insert({
          organization_id: organizationId,
          course_id: courseId,
          person_id: personId || null,
          invited_name: invitedName,
          invited_email: invitedEmail || null,
          invited_whatsapp: invitedWhatsapp || null,
          invitation_status: personId ? "convidado" : "aguardando_cadastro",
          metadata: { source: "gestao-cursos" },
          created_by_person_id: actorPersonId,
        })
        .select("id,invitation_token")
        .single();
      if (studentError) throw studentError;

      const invitationUrl = `${siteUrl()}/solucoes/organizacao-em-harmonia/tucxa/cursos/convite/${student.invitation_token}`;
      const needsRegistration = !personId;
      const emailResult = invitedEmail
        ? await sendCourseInvitationEmail({
            email: invitedEmail,
            studentName: invitedName,
            courseName: course.name,
            invitationUrl,
            needsRegistration,
          }).catch((error: unknown) => ({
            sent: false,
            reason: error instanceof Error ? error.message : "Falha ao enviar e-mail.",
          }))
        : { sent: false, reason: "Aluno sem e-mail." };

      return NextResponse.json({
        ok: true,
        studentId: student.id,
        invitationUrl,
        needsRegistration,
        email: emailResult,
        whatsappUrl: buildCourseWhatsappUrl({
          whatsapp: invitedWhatsapp,
          studentName: invitedName,
          courseName: course.name,
          invitationUrl,
          needsRegistration,
        }),
      });
    }

    return NextResponse.json({ error: "Ação não reconhecida." }, { status: 400 });
  } catch (error) {
    console.error("[Cursos em Harmonia][POST]", { action, error });
    const current = courseLoadError(error);
    return NextResponse.json(
      {
        error:
          current.status === 503
            ? current.message
            : errorMessage(error, "Erro ao atualizar os cursos."),
      },
      { status: current.status },
    );
  }
}

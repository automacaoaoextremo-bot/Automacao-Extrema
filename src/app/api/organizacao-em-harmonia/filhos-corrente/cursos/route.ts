import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  getMemberAccessContext,
  memberHasFunction,
} from "@/lib/organizacao-em-harmonia/member-access";
import { supabaseAdmin } from "@/lib/supabase-admin";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

async function professorContext(request: Request) {
  const auth = await getMemberAccessContext(request);
  if (!auth.ok) return auth;
  if (!memberHasFunction(auth.context, ["professor", "docente"])) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Esta área é destinada aos Filhos da Corrente com a função Professor." },
        { status: 403 },
      ),
    };
  }
  return auth;
}

async function loadProfessorPayload(organizationId: string, personId: string) {
  const { data: teacherRows, error: teacherError } = await supabaseAdmin
    .from("oh_course_teachers")
    .select("lesson_id")
    .eq("organization_id", organizationId)
    .eq("teacher_person_id", personId);
  if (teacherError) throw teacherError;

  const lessonIds = (teacherRows ?? []).map((row) => row.lesson_id).filter(Boolean);
  if (!lessonIds.length) {
    return { courses: [], lessons: [], students: [], attendance: [] };
  }

  const { data: lessons, error: lessonsError } = await supabaseAdmin
    .from("oh_course_lessons")
    .select("id,course_id,title,planned_content,starts_at,ends_at,location,checkin_code_generated_at,status")
    .eq("organization_id", organizationId)
    .in("id", lessonIds)
    .order("starts_at", { ascending: true });
  if (lessonsError) throw lessonsError;

  const courseIds = Array.from(new Set((lessons ?? []).map((lesson) => lesson.course_id)));
  const [coursesResult, studentsResult, attendanceResult] = await Promise.all([
    supabaseAdmin
      .from("oh_courses")
      .select("id,name,objective,rules,planned_content,status,active")
      .eq("organization_id", organizationId)
      .in("id", courseIds),
    supabaseAdmin
      .from("oh_course_students")
      .select("id,course_id,person_id,invited_name,invited_email,invited_whatsapp,invitation_status,accepted_at")
      .eq("organization_id", organizationId)
      .in("course_id", courseIds)
      .neq("invitation_status", "cancelado")
      .order("invited_name", { ascending: true }),
    supabaseAdmin
      .from("oh_course_attendance")
      .select("id,lesson_id,course_student_id,status,checkin_method,checked_in_at,notes")
      .eq("organization_id", organizationId)
      .in("lesson_id", lessonIds),
  ]);
  for (const result of [coursesResult, studentsResult, attendanceResult]) {
    if (result.error) throw result.error;
  }

  const students = studentsResult.data ?? [];
  const personIds = students.map((student) => student.person_id).filter(Boolean);
  let people: Array<Record<string, unknown>> = [];
  if (personIds.length) {
    const result = await supabaseAdmin
      .from("oh_people")
      .select("id,full_name,email,whatsapp")
      .eq("organization_id", organizationId)
      .in("id", personIds);
    if (result.error) throw result.error;
    people = (result.data ?? []) as Array<Record<string, unknown>>;
  }
  const peopleMap = new Map(people.map((person) => [person.id, person]));

  return {
    courses: coursesResult.data ?? [],
    lessons: lessons ?? [],
    students: students.map((student) => ({
      ...student,
      person: student.person_id ? peopleMap.get(student.person_id) ?? null : null,
    })),
    attendance: attendanceResult.data ?? [],
  };
}

export async function GET(request: Request) {
  const auth = await professorContext(request);
  if (!auth.ok) return auth.response;

  try {
    return NextResponse.json({
      currentPerson: { fullName: auth.context.personName },
      ...(await loadProfessorPayload(auth.context.organizationId, auth.context.personId)),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao carregar sua sala de aula." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await professorContext(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = text(body.action);
  const organizationId = auth.context.organizationId;
  const now = new Date().toISOString();

  try {
    const lessonId = text(body.lessonId);
    if (!lessonId) {
      return NextResponse.json({ error: "Informe a aula." }, { status: 400 });
    }

    const { data: teacherLink, error: teacherError } = await supabaseAdmin
      .from("oh_course_teachers")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("lesson_id", lessonId)
      .eq("teacher_person_id", auth.context.personId)
      .maybeSingle();
    if (teacherError) throw teacherError;
    if (!teacherLink?.id) {
      return NextResponse.json({ error: "Esta aula não está atribuída a você." }, { status: 403 });
    }

    if (action === "generate-checkin-code") {
      const code = String(crypto.randomInt(100000, 1000000));
      const { error } = await supabaseAdmin
        .from("oh_course_lessons")
        .update({
          checkin_code_hash: hashCode(code),
          checkin_code_generated_at: now,
          updated_at: now,
        })
        .eq("organization_id", organizationId)
        .eq("id", lessonId);
      if (error) throw error;

      return NextResponse.json({
        ok: true,
        code,
        message: "Código temporário gerado. Mostre-o somente aos alunos presentes na aula.",
      });
    }

    if (action === "set-attendance") {
      const courseStudentId = text(body.courseStudentId);
      const status = text(body.status);
      if (!courseStudentId || !["presente", "ausente", "justificada"].includes(status)) {
        return NextResponse.json({ error: "Aluno ou presença inválida." }, { status: 400 });
      }

      const { data: lesson, error: lessonError } = await supabaseAdmin
        .from("oh_course_lessons")
        .select("course_id")
        .eq("organization_id", organizationId)
        .eq("id", lessonId)
        .single();
      if (lessonError) throw lessonError;

      const { data: student, error: studentError } = await supabaseAdmin
        .from("oh_course_students")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("course_id", lesson.course_id)
        .eq("id", courseStudentId)
        .maybeSingle();
      if (studentError) throw studentError;
      if (!student?.id) {
        return NextResponse.json({ error: "Aluno não pertence a este curso." }, { status: 409 });
      }

      const { error } = await supabaseAdmin
        .from("oh_course_attendance")
        .upsert(
          {
            organization_id: organizationId,
            lesson_id: lessonId,
            course_student_id: courseStudentId,
            status,
            checkin_method: "professor",
            checked_in_at: status === "presente" ? now : null,
            marked_by_person_id: auth.context.personId,
            notes: text(body.notes) || null,
            updated_at: now,
          },
          { onConflict: "lesson_id,course_student_id" },
        );
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Ação não reconhecida." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar a sala de aula." },
      { status: 500 },
    );
  }
}

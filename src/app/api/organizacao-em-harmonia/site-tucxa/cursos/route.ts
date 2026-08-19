import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: unknown) {
  return text(value).toLowerCase();
}

function digits(value: unknown) {
  return text(value).replace(/\D/g, "");
}

function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

async function invitationByToken(token: string) {
  const { data: invitation, error } = await supabaseAdmin
    .from("oh_course_students")
    .select("id,organization_id,course_id,person_id,invited_name,invited_email,invited_whatsapp,invitation_status,invited_at,accepted_at")
    .eq("invitation_token", token)
    .maybeSingle();
  if (error) throw error;
  return invitation;
}

async function publicPayload(token: string) {
  const invitation = await invitationByToken(token);
  if (!invitation?.id || invitation.invitation_status === "cancelado") return null;

  const [courseResult, lessonsResult, attendanceResult] = await Promise.all([
    supabaseAdmin
      .from("oh_courses")
      .select("id,name,objective,rules,planned_content,status,active")
      .eq("organization_id", invitation.organization_id)
      .eq("id", invitation.course_id)
      .maybeSingle(),
    supabaseAdmin
      .from("oh_course_lessons")
      .select("id,title,planned_content,starts_at,ends_at,location,status")
      .eq("organization_id", invitation.organization_id)
      .eq("course_id", invitation.course_id)
      .neq("status", "cancelada")
      .order("starts_at", { ascending: true }),
    supabaseAdmin
      .from("oh_course_attendance")
      .select("lesson_id,status,checkin_method,checked_in_at")
      .eq("organization_id", invitation.organization_id)
      .eq("course_student_id", invitation.id),
  ]);
  for (const result of [courseResult, lessonsResult, attendanceResult]) {
    if (result.error) throw result.error;
  }

  return {
    invitation: {
      id: invitation.id,
      name: invitation.invited_name || "Aluno",
      email: invitation.invited_email || null,
      whatsapp: invitation.invited_whatsapp || null,
      status: invitation.invitation_status,
      linked: Boolean(invitation.person_id),
      invitedAt: invitation.invited_at,
      acceptedAt: invitation.accepted_at,
    },
    course: courseResult.data,
    lessons: lessonsResult.data ?? [],
    attendance: attendanceResult.data ?? [],
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = text(url.searchParams.get("token"));
  if (!token) return NextResponse.json({ error: "Convite não informado." }, { status: 400 });

  try {
    const payload = await publicPayload(token);
    if (!payload?.course) {
      return NextResponse.json({ error: "Convite não localizado ou não está mais disponível." }, { status: 404 });
    }
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao abrir o convite." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const token = text(body.token);
  const action = text(body.action);
  if (!token) return NextResponse.json({ error: "Convite não informado." }, { status: 400 });

  try {
    const invitation = await invitationByToken(token);
    if (!invitation?.id || invitation.invitation_status === "cancelado") {
      return NextResponse.json({ error: "Convite não localizado." }, { status: 404 });
    }

    if (action === "accept") {
      let personId = text(invitation.person_id);
      if (!personId) {
        const email = normalizeEmail(body.email || invitation.invited_email);
        const whatsapp = digits(body.whatsapp || invitation.invited_whatsapp);
        const queryText = text(body.search || body.email || body.whatsapp);

        let person: { id?: string } | null = null;
        if (email) {
          const result = await supabaseAdmin
            .from("oh_people")
            .select("id")
            .eq("organization_id", invitation.organization_id)
            .ilike("email", email)
            .limit(1)
            .maybeSingle();
          if (result.error) throw result.error;
          person = result.data;
        }
        if (!person?.id && whatsapp) {
          const { data: people, error } = await supabaseAdmin
            .from("oh_people")
            .select("id,whatsapp")
            .eq("organization_id", invitation.organization_id)
            .eq("active", true);
          if (error) throw error;
          person = (people ?? []).find((item) => digits(item.whatsapp) === whatsapp) ?? null;
        }
        if (!person?.id && queryText) {
          const result = await supabaseAdmin
            .from("oh_people")
            .select("id")
            .eq("organization_id", invitation.organization_id)
            .ilike("full_name", `%${queryText}%`)
            .limit(1)
            .maybeSingle();
          if (result.error) throw result.error;
          person = result.data;
        }

        if (!person?.id) {
          const now = new Date().toISOString();
          await supabaseAdmin
            .from("oh_course_students")
            .update({
              invited_email: email || null,
              invited_whatsapp: whatsapp || invitation.invited_whatsapp || null,
              invitation_status: "aguardando_cadastro",
              updated_at: now,
            })
            .eq("id", invitation.id);

          const registerParams = new URLSearchParams({
            name: invitation.invited_name || "",
            whatsapp: whatsapp || invitation.invited_whatsapp || "",
            returnTo: `/solucoes/organizacao-em-harmonia/tucxa/cursos/convite/${token}`,
          });
          if (email) registerParams.set("email", email);

          return NextResponse.json({
            ok: false,
            needsRegistration: true,
            message: "Seu cadastro ainda não foi localizado. Confirme os dados no cadastro rápido e depois volte a este convite para finalizar a participação.",
            registerUrl: `/solucoes/organizacao-em-harmonia/tucxa/consulente/cadastro?${registerParams.toString()}`,
          });
        }
        personId = person.id;
      }

      const now = new Date().toISOString();
      const { error } = await supabaseAdmin
        .from("oh_course_students")
        .update({
          person_id: personId,
          invitation_status: "aceito",
          accepted_at: now,
          updated_at: now,
        })
        .eq("id", invitation.id);
      if (error) throw error;
      return NextResponse.json({ ok: true, accepted: true });
    }

    if (action === "decline") {
      const now = new Date().toISOString();
      const { error } = await supabaseAdmin
        .from("oh_course_students")
        .update({ invitation_status: "recusado", declined_at: now, updated_at: now })
        .eq("id", invitation.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "check-in") {
      if (!invitation.person_id || invitation.invitation_status !== "aceito") {
        return NextResponse.json(
          { error: "Confirme sua participação no curso antes de registrar presença." },
          { status: 409 },
        );
      }

      const lessonId = text(body.lessonId);
      const code = text(body.code);
      if (!lessonId || !/^\d{6}$/.test(code)) {
        return NextResponse.json({ error: "Informe a aula e o código de 6 dígitos." }, { status: 400 });
      }

      const { data: lesson, error: lessonError } = await supabaseAdmin
        .from("oh_course_lessons")
        .select("id,course_id,starts_at,ends_at,checkin_code_hash,checkin_code_generated_at,checkin_window_minutes_before,checkin_window_minutes_after,status")
        .eq("organization_id", invitation.organization_id)
        .eq("course_id", invitation.course_id)
        .eq("id", lessonId)
        .maybeSingle();
      if (lessonError) throw lessonError;
      if (!lesson?.id || lesson.status === "cancelada") {
        return NextResponse.json({ error: "Aula não localizada." }, { status: 404 });
      }
      if (!text(lesson.checkin_code_hash) || text(lesson.checkin_code_hash) !== hashCode(code)) {
        return NextResponse.json({ error: "Código de presença inválido." }, { status: 403 });
      }

      const now = new Date();
      const start = new Date(lesson.starts_at);
      const end = new Date(lesson.ends_at);
      const before = Number(lesson.checkin_window_minutes_before ?? 30) * 60_000;
      const after = Number(lesson.checkin_window_minutes_after ?? 30) * 60_000;
      if (now.getTime() < start.getTime() - before || now.getTime() > end.getTime() + after) {
        return NextResponse.json(
          {
            error: "A presença pelo aluno só pode ser registrada no período da aula.",
            allowedFrom: new Date(start.getTime() - before).toISOString(),
            allowedUntil: new Date(end.getTime() + after).toISOString(),
          },
          { status: 409 },
        );
      }

      const nowIso = now.toISOString();
      const { error } = await supabaseAdmin
        .from("oh_course_attendance")
        .upsert(
          {
            organization_id: invitation.organization_id,
            lesson_id: lessonId,
            course_student_id: invitation.id,
            status: "presente",
            checkin_method: "aluno",
            checked_in_at: nowIso,
            marked_by_person_id: invitation.person_id,
            notes: "Presença validada por convite + código temporário + janela de horário do servidor.",
            updated_at: nowIso,
          },
          { onConflict: "lesson_id,course_student_id" },
        );
      if (error) throw error;
      return NextResponse.json({ ok: true, checkedInAt: nowIso });
    }

    return NextResponse.json({ error: "Ação não reconhecida." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao processar o convite." },
      { status: 500 },
    );
  }
}

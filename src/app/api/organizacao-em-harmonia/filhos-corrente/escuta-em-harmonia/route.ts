import { NextResponse } from "next/server";
import { getMemberAccessContext } from "@/lib/organizacao-em-harmonia/member-access";
import { supabaseAdmin } from "@/lib/supabase-admin";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function integer(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function protocol() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase();
  return `ESC-${date}-${suffix}`;
}

async function loadOwnRequests(organizationId: string, personId: string) {
  const { data: requests, error } = await supabaseAdmin
    .from("oh_listening_requests")
    .select("id,protocol,anonymous_to_directorate,category,subject,message,status,due_at,director_response,responded_at,requester_resolution,requester_feedback,requester_confirmed_at,created_at,updated_at")
    .eq("organization_id", organizationId)
    .eq("requester_person_id", personId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const requestIds = (requests ?? []).map((item) => item.id);
  let actions: Array<Record<string, unknown>> = [];
  if (requestIds.length) {
    const result = await supabaseAdmin
      .from("oh_listening_actions")
      .select("id,request_id,action_type,title,description,due_date,status,completion_notes,completed_at,created_at,updated_at")
      .eq("organization_id", organizationId)
      .in("request_id", requestIds)
      .order("created_at", { ascending: true });
    if (result.error) throw result.error;
    actions = (result.data ?? []) as Array<Record<string, unknown>>;
  }

  return (requests ?? []).map((request) => ({
    ...request,
    actions: actions.filter((action) => action.request_id === request.id),
  }));
}

export async function GET(request: Request) {
  const auth = await getMemberAccessContext(request);
  if (!auth.ok) return auth.response;

  try {
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("oh_listening_settings")
      .select("response_due_days,allow_anonymous,action_followup_enabled")
      .eq("organization_id", auth.context.organizationId)
      .maybeSingle();
    if (settingsError) throw settingsError;

    return NextResponse.json({
      currentPerson: {
        fullName: auth.context.personName,
      },
      settings: settings ?? {
        response_due_days: 5,
        allow_anonymous: true,
        action_followup_enabled: true,
      },
      requests: await loadOwnRequests(
        auth.context.organizationId,
        auth.context.personId,
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao carregar seus questionamentos.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await getMemberAccessContext(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = text(body.action) || "create";

  try {
    if (action === "create") {
      const subject = text(body.subject);
      const message = text(body.message);
      const category = text(body.category) || "questionamento";
      const anonymous = body.anonymous === true;

      if (subject.length < 3 || message.length < 10) {
        return NextResponse.json(
          { error: "Informe um assunto e descreva o questionamento com um pouco mais de detalhe." },
          { status: 400 },
        );
      }

      const { data: settings, error: settingsError } = await supabaseAdmin
        .from("oh_listening_settings")
        .select("response_due_days,allow_anonymous")
        .eq("organization_id", auth.context.organizationId)
        .maybeSingle();
      if (settingsError) throw settingsError;

      const dueDays = Math.min(90, Math.max(1, integer(settings?.response_due_days, 5)));
      const canBeAnonymous = settings?.allow_anonymous !== false;
      const now = new Date();

      const { data, error } = await supabaseAdmin
        .from("oh_listening_requests")
        .insert({
          organization_id: auth.context.organizationId,
          requester_person_id: auth.context.personId,
          protocol: protocol(),
          anonymous_to_directorate: canBeAnonymous && anonymous,
          category,
          subject,
          message,
          status: "aberto",
          due_at: addDays(now, dueDays).toISOString(),
          metadata: {
            source: "filho-da-corrente",
            responseDueDaysAtCreation: dueDays,
          },
        })
        .select("id,protocol,due_at")
        .single();
      if (error) throw error;

      return NextResponse.json({ ok: true, request: data });
    }

    if (action === "confirm-resolution") {
      const requestId = text(body.requestId);
      const resolution = text(body.resolution);
      const feedback = text(body.feedback);
      if (!requestId || !["resolvido", "nao_resolvido"].includes(resolution)) {
        return NextResponse.json(
          { error: "Informe o questionamento e se a resposta resolveu ou não." },
          { status: 400 },
        );
      }

      const { data: current, error: currentError } = await supabaseAdmin
        .from("oh_listening_requests")
        .select("id,director_response,responded_at")
        .eq("organization_id", auth.context.organizationId)
        .eq("requester_person_id", auth.context.personId)
        .eq("id", requestId)
        .maybeSingle();
      if (currentError) throw currentError;
      if (!current?.id) {
        return NextResponse.json({ error: "Questionamento não localizado." }, { status: 404 });
      }
      if (!text(current.director_response) || !current.responded_at) {
        return NextResponse.json(
          { error: "A confirmação fica disponível depois que a Diretoria responder." },
          { status: 409 },
        );
      }

      const now = new Date().toISOString();
      const { error } = await supabaseAdmin
        .from("oh_listening_requests")
        .update({
          requester_resolution: resolution,
          requester_feedback: feedback || null,
          requester_confirmed_at: now,
          status: resolution === "resolvido" ? "resolvido" : "nao_resolvido",
          closed_at: resolution === "resolvido" ? now : null,
          updated_at: now,
        })
        .eq("organization_id", auth.context.organizationId)
        .eq("requester_person_id", auth.context.personId)
        .eq("id", requestId);
      if (error) throw error;

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Ação não reconhecida." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao registrar o questionamento.",
      },
      { status: 500 },
    );
  }
}

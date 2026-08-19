import { NextResponse } from "next/server";
import { getTucxaManagementAccess } from "@/lib/organizacao-em-harmonia/tucxa-management-access";
import { supabaseAdmin } from "@/lib/supabase-admin";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function integer(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function loadPayload(organizationId: string) {
  const [settingsResult, requestsResult, actionsResult, peopleResult] = await Promise.all([
    supabaseAdmin
      .from("oh_listening_settings")
      .select("id,response_due_days,action_followup_enabled,allow_anonymous,updated_at")
      .eq("organization_id", organizationId)
      .maybeSingle(),
    supabaseAdmin
      .from("oh_listening_requests")
      .select("id,requester_person_id,protocol,anonymous_to_directorate,category,subject,message,status,due_at,director_response,response_person_id,responded_at,requester_resolution,requester_feedback,requester_confirmed_at,closed_at,created_at,updated_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("oh_listening_actions")
      .select("id,request_id,action_type,title,description,responsible_person_id,due_date,status,completion_notes,completed_at,created_at,updated_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("oh_people")
      .select("id,full_name,email,whatsapp,active")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .order("full_name", { ascending: true }),
  ]);

  for (const result of [settingsResult, requestsResult, actionsResult, peopleResult]) {
    if (result.error) throw result.error;
  }

  const people = peopleResult.data ?? [];
  const personMap = new Map(people.map((person) => [person.id, person]));
  const actions = actionsResult.data ?? [];
  const requests = (requestsResult.data ?? []).map((request) => {
    const requester = request.anonymous_to_directorate
      ? null
      : personMap.get(request.requester_person_id);
    return {
      ...request,
      requester_person_id: request.anonymous_to_directorate ? null : request.requester_person_id,
      requesterName: request.anonymous_to_directorate
        ? "Anônimo"
        : requester?.full_name || "Filho da Corrente",
      requesterEmail: request.anonymous_to_directorate ? "" : requester?.email || "",
      requesterWhatsapp: request.anonymous_to_directorate ? "" : requester?.whatsapp || "",
      actions: actions.filter((action) => action.request_id === request.id),
    };
  });

  return {
    settings: settingsResult.data ?? {
      response_due_days: 5,
      action_followup_enabled: true,
      allow_anonymous: true,
    },
    requests,
    people,
  };
}

export async function GET(request: Request) {
  const auth = await getTucxaManagementAccess(request, [
    "presidente",
    "vice-presidente",
    "diretoria",
    "diretor",
    "secretario",
    "secretaria",
    "coordenacao",
    "coordenador",
  ]);
  if (!auth.ok) return auth.response;

  try {
    return NextResponse.json(await loadPayload(auth.context.organizationId));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao carregar a Escuta em Harmonia." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await getTucxaManagementAccess(request, [
    "presidente",
    "vice-presidente",
    "diretoria",
    "diretor",
    "secretario",
    "secretaria",
    "coordenacao",
    "coordenador",
  ]);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = text(body.action);
  const organizationId = auth.context.organizationId;
  const actorPersonId = text(auth.context.person?.id) || null;
  const now = new Date().toISOString();

  try {
    if (action === "update-settings") {
      const responseDueDays = Math.min(90, Math.max(1, integer(body.responseDueDays, 5)));
      const { error } = await supabaseAdmin
        .from("oh_listening_settings")
        .upsert(
          {
            organization_id: organizationId,
            response_due_days: responseDueDays,
            allow_anonymous: body.allowAnonymous !== false,
            action_followup_enabled: body.actionFollowupEnabled !== false,
            updated_at: now,
          },
          { onConflict: "organization_id" },
        );
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "respond") {
      const requestId = text(body.requestId);
      const response = text(body.response);
      if (!requestId || response.length < 3) {
        return NextResponse.json({ error: "Informe o questionamento e a resposta da Diretoria." }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from("oh_listening_requests")
        .update({
          director_response: response,
          response_person_id: actorPersonId,
          responded_at: now,
          status: "aguardando_confirmacao",
          updated_at: now,
        })
        .eq("organization_id", organizationId)
        .eq("id", requestId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "create-action") {
      const requestId = text(body.requestId);
      const actionType = text(body.actionType) || "plano_acao";
      const title = text(body.title);
      const allowedTypes = ["plano_acao", "procedimento", "treinamento", "comunicacao", "outro"];
      if (!requestId || title.length < 3 || !allowedTypes.includes(actionType)) {
        return NextResponse.json({ error: "Informe o tipo e o título da ação institucional." }, { status: 400 });
      }

      const { error } = await supabaseAdmin.from("oh_listening_actions").insert({
        organization_id: organizationId,
        request_id: requestId,
        action_type: actionType,
        title,
        description: text(body.description) || null,
        responsible_person_id: text(body.responsiblePersonId) || null,
        due_date: text(body.dueDate) || null,
        status: "planejada",
        created_by_person_id: actorPersonId,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "update-action") {
      const actionId = text(body.actionId);
      const status = text(body.status);
      if (!actionId || !["planejada", "em_andamento", "concluida", "cancelada"].includes(status)) {
        return NextResponse.json({ error: "Ação ou status inválido." }, { status: 400 });
      }
      const { error } = await supabaseAdmin
        .from("oh_listening_actions")
        .update({
          status,
          completion_notes: text(body.completionNotes) || null,
          completed_at: status === "concluida" ? now : null,
          updated_at: now,
        })
        .eq("organization_id", organizationId)
        .eq("id", actionId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Ação não reconhecida." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar a Escuta em Harmonia." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { currentPilotReception, todayInSaoPaulo, loadPilotDates } from "@/lib/organizacao-em-harmonia/tucxa-appointment-pilot";
import { GET as runPreflight } from "@/app/api/cron/tucxa-agendamento-preflight/route";

export const dynamic = "force-dynamic";

/** Endpoint de consulta para a Recepção autenticada: nunca envia WhatsApp ou e-mail. */
export async function GET(request: Request) {
  const reception = await currentPilotReception(request);
  if (!reception?.canManage) {
    return NextResponse.json({ error: "Acesso restrito à Recepção autorizada." },
      { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  const query = new URL(request.url).searchParams;
  if (query.get("mode") === "dates") {
    try {
      const dates = await loadPilotDates(reception.organizationId, 180);
      return NextResponse.json({ ok: true, dates: dates.map((item) => item.date) },
        { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      console.error("[TUCXA diagnostico] consulta das datas", error);
      return NextResponse.json({ error: "Não foi possível consultar a programação." }, { status: 500 });
    }
  }
  const date = query.get("date") || todayInSaoPaulo();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date + "T12:00:00Z")) ||
      new Date(date + "T12:00:00Z").toISOString().slice(0, 10) !== date) {
    return NextResponse.json({ error: "Data inválida." }, { status: 400 });
  }
  const secret = (process.env.TUCXA_SCHEDULER_SECRET || process.env.CRON_SECRET || "").trim();
  if (!secret) return NextResponse.json({ error: "Preflight indisponível: segredo do cron não configurado." }, { status: 503 });

  // Invoca apenas a rotina de diagnóstico read-only no servidor.
  // O segredo jamais é enviado ao navegador.
  const internalRequest = new Request(
    `https://preflight.internal/api/cron/tucxa-agendamento-preflight?date=${encodeURIComponent(date)}`,
    { headers: { authorization: `Bearer ${secret}` } },
  );
  const result = await runPreflight(internalRequest);
  if (!result.ok) {
    return NextResponse.json({ error: "Falha ao calcular diagnóstico dos envios." },
      { status: result.status || 500, headers: { "Cache-Control": "no-store" } });
  }
  const data = await result.json();
  const { data: history, error: historyError } = await supabaseAdmin
    .from("oh_tucxa_pilot_daily_dispatches")
    .select("audience,recipient_person_id,status,audit_email_status,sent_at")
    .eq("organization_id", reception.organizationId).eq("dispatch_date", date)
    .limit(500);
  if (historyError) {
    return NextResponse.json({ error: "Falha ao consultar historico das execucoes." },
      { status: 500, headers: { "Cache-Control": "no-store" } });
  }
  const distinctEligible = (values: Array<{personId?: string; eligible?: boolean}>): number =>
    new Set(values.filter(x => x.eligible && x.personId).map(x => x.personId)).size;
  const response = {
    ...data,
    safeReadOnly: true,
    previewNotAnExecution: true,
    dispatchHistory: history ?? [],
    counts: {
      reminders: (data.consulentes || []).filter((x: {eligible?: boolean}) => x.eligible).length,
      reception: distinctEligible(data.recepcao || []),
      cavalinhos: distinctEligible(data.cavalinhos || []),
    },
  };
  return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
}

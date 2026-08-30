import { NextResponse } from "next/server";
import { getBazarEventFromRequest, parseMoney, requireBazarSession, sessionErrorStatus } from "@/lib/bazar-sementinha";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type RevenuePayload = {
  id?: unknown;
  eventId?: unknown;
  revenueType?: unknown;
  description?: unknown;
  source?: unknown;
  amount?: unknown;
  status?: unknown;
  notes?: unknown;
};

const ALLOWED_TYPES = new Set(["doacao", "receita_extra"]);
const ALLOWED_STATUSES = new Set(["confirmada", "pendente", "cancelada"]);

function normalizePayload(body: RevenuePayload) {
  const revenueType = ALLOWED_TYPES.has(String(body.revenueType || ""))
    ? String(body.revenueType)
    : "doacao";
  const description = String(body.description || "Doação").trim() || "Doação";
  const source = String(body.source || "").trim() || null;
  const amount = parseMoney(body.amount);
  const status = ALLOWED_STATUSES.has(String(body.status || ""))
    ? String(body.status)
    : "confirmada";
  const notes = String(body.notes || "").trim() || null;

  if (amount <= 0) {
    throw new Error("O valor da receita precisa ser maior que zero.");
  }

  return {
    revenue_type: revenueType,
    description,
    source,
    amount,
    status,
    notes,
  };
}

export async function GET(request: Request) {
  try {
    const event = await getBazarEventFromRequest(request);
    const { data, error } = await supabaseAdmin
      .from("bazar_extra_revenues")
      .select("*")
      .eq("event_id", event.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ revenues: data || [] });
  } catch (error) {
    console.error("[bazar-sementinha/revenues][GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao carregar receitas extraordinárias." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireBazarSession(request);
    const body = (await request.json()) as RevenuePayload;
    const event = await getBazarEventFromRequest(request, body as Record<string, unknown>);
    const payload = normalizePayload(body);

    const { data, error } = await supabaseAdmin
      .from("bazar_extra_revenues")
      .insert({
        event_id: event.id,
        ...payload,
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ revenue: data }, { status: 201 });
  } catch (error) {
    console.error("[bazar-sementinha/revenues][POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao registrar receita extraordinária." },
      { status: sessionErrorStatus(error) },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await requireBazarSession(request);
    const body = (await request.json()) as RevenuePayload;
    const id = String(body.id || "").trim();

    if (!id) {
      return NextResponse.json({ error: "Informe a receita que será atualizada." }, { status: 400 });
    }

    const event = await getBazarEventFromRequest(request, body as Record<string, unknown>);
    const payload = normalizePayload(body);

    const { data, error } = await supabaseAdmin
      .from("bazar_extra_revenues")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("event_id", event.id)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ revenue: data });
  } catch (error) {
    console.error("[bazar-sementinha/revenues][PATCH]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar receita extraordinária." },
      { status: sessionErrorStatus(error) },
    );
  }
}

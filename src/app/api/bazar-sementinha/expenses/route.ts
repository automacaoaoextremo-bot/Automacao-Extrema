import { NextResponse } from "next/server";
import { getBazarEventFromRequest, parseMoney, requireBazarSession, sessionErrorStatus } from "@/lib/bazar-sementinha";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type ExpensePayload = {
  id?: unknown;
  category?: unknown;
  description?: unknown;
  amount?: unknown;
  status?: unknown;
  notes?: unknown;
};

const ALLOWED_STATUSES = new Set(["confirmada", "pendente", "cancelada"]);

function normalizeExpensePayload(body: ExpensePayload) {
  const category = String(body.category || "Geral").trim() || "Geral";
  const description = String(body.description || "Despesa").trim() || "Despesa";
  const amount = parseMoney(body.amount);
  const status = ALLOWED_STATUSES.has(String(body.status || "")) ? String(body.status) : "confirmada";
  const notes = String(body.notes || "").trim() || null;

  return { category, description, amount, status, notes };
}

export async function GET(request: Request) {
  try {
    const event = await getBazarEventFromRequest(request);
    const { data, error } = await supabaseAdmin.from("bazar_expenses").select("*").eq("event_id", event.id).order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ expenses: data || [] });
  } catch (error) {
    console.error("[bazar-sementinha/expenses][GET]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao carregar despesas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireBazarSession(request);
    const body = (await request.json()) as ExpensePayload & { eventId?: unknown };
    const event = await getBazarEventFromRequest(request, body as Record<string, unknown>);
    const payload = normalizeExpensePayload(body);

    const { data, error } = await supabaseAdmin
      .from("bazar_expenses")
      .insert({
        event_id: event.id,
        ...payload,
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ expense: data });
  } catch (error) {
    console.error("[bazar-sementinha/expenses][POST]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao salvar despesa." }, { status: sessionErrorStatus(error) });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireBazarSession(request);
    const body = (await request.json()) as ExpensePayload & { eventId?: unknown };
    const id = String(body.id || "").trim();

    if (!id) {
      return NextResponse.json({ error: "Informe a despesa que será editada." }, { status: 400 });
    }

    const event = await getBazarEventFromRequest(request, body as Record<string, unknown>);
    const payload = normalizeExpensePayload(body);

    const { data, error } = await supabaseAdmin
      .from("bazar_expenses")
      .update(payload)
      .eq("event_id", event.id)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ expense: data });
  } catch (error) {
    console.error("[bazar-sementinha/expenses][PATCH]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao editar despesa." }, { status: sessionErrorStatus(error) });
  }
}

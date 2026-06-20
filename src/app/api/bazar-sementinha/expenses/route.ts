import { NextResponse } from "next/server";
import { getBazarEvent, parseMoney, requireBazarSession } from "@/lib/bazar-sementinha";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const event = await getBazarEvent();
    const { data, error } = await supabaseAdmin.from("bazar_expenses").select("*").eq("event_id", event.id).order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ expenses: data || [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao carregar despesas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireBazarSession();
    const body = await request.json();
    const event = await getBazarEvent();
    const { data, error } = await supabaseAdmin
      .from("bazar_expenses")
      .insert({
        event_id: event.id,
        category: String(body.category || "Geral").trim(),
        description: String(body.description || "Despesa").trim(),
        amount: parseMoney(body.amount),
        status: body.status || "confirmada",
        notes: body.notes || null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ expense: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao salvar despesa." }, { status: 500 });
  }
}

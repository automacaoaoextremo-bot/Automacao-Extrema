import { NextResponse } from "next/server";
import { ConfigKind, getBazarEvent, parseMoney, requireBazarSession } from "@/lib/bazar-sementinha";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // GET fica liberado para a área de gestão carregar mesmo se o navegador não enviar o cookie na primeira chamada.
    // Alterações continuam protegidas em POST/PATCH/DELETE.
    const event = await getBazarEvent();
    const [prices, categories, menu] = await Promise.all([
      supabaseAdmin.from("bazar_price_points").select("*").eq("event_id", event.id).order("amount"),
      supabaseAdmin.from("bazar_category_nodes").select("*").eq("event_id", event.id).order("sort_order"),
      supabaseAdmin.from("bazar_menu_items").select("*").eq("event_id", event.id).order("category").order("name"),
    ]);
    return NextResponse.json({ event, prices: prices.data || [], categories: categories.data || [], menuItems: menu.data || [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao carregar configurações." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireBazarSession();
    const body = await request.json();
    const kind = String(body.kind || "") as ConfigKind;
    const event = await getBazarEvent();

    if (kind === "price") {
      const { data, error } = await supabaseAdmin
        .from("bazar_price_points")
        .insert({ event_id: event.id, amount: parseMoney(body.amount), label: body.label || null, is_active: body.is_active ?? true })
        .select("*")
        .single();
      if (error) throw error;
      return NextResponse.json({ item: data });
    }

    if (kind === "category") {
      const { data, error } = await supabaseAdmin
        .from("bazar_category_nodes")
        .insert({
          event_id: event.id,
          path: String(body.path || "").trim(),
          level_1: body.level_1 || null,
          level_2: body.level_2 || null,
          level_3: body.level_3 || null,
          is_active: body.is_active ?? true,
          is_required: body.is_required ?? false,
          is_visible: body.is_visible ?? true,
          sort_order: Number(body.sort_order || 50),
        })
        .select("*")
        .single();
      if (error) throw error;
      return NextResponse.json({ item: data });
    }

    if (kind === "menu") {
      const { data, error } = await supabaseAdmin
        .from("bazar_menu_items")
        .insert({
          event_id: event.id,
          category: String(body.category || "Geral").trim(),
          name: String(body.name || "").trim(),
          description: body.description || null,
          unit_label: body.unit_label || "unidade",
          price: parseMoney(body.price),
          is_active: body.is_active ?? true,
        })
        .select("*")
        .single();
      if (error) throw error;
      return NextResponse.json({ item: data });
    }

    return NextResponse.json({ error: "Tipo de configuração inválido." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao salvar configuração." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireBazarSession();
    const body = await request.json();
    const kind = String(body.kind || "") as ConfigKind;
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "ID obrigatório." }, { status: 400 });

    const table = kind === "price" ? "bazar_price_points" : kind === "category" ? "bazar_category_nodes" : kind === "menu" ? "bazar_menu_items" : null;
    if (!table) return NextResponse.json({ error: "Tipo de configuração inválido." }, { status: 400 });

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of ["label", "path", "level_1", "level_2", "level_3", "is_active", "is_required", "is_visible", "sort_order", "category", "name", "description", "unit_label"] ) {
      if (key in body) patch[key] = body[key];
    }
    if ("amount" in body) patch.amount = parseMoney(body.amount);
    if ("price" in body) patch.price = parseMoney(body.price);

    const { data, error } = await supabaseAdmin.from(table).update(patch).eq("id", id).select("*").single();
    if (error) throw error;
    return NextResponse.json({ item: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao atualizar configuração." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireBazarSession();
    const { searchParams } = new URL(request.url);
    const kind = searchParams.get("kind") as ConfigKind;
    const id = searchParams.get("id");
    const table = kind === "price" ? "bazar_price_points" : kind === "category" ? "bazar_category_nodes" : kind === "menu" ? "bazar_menu_items" : null;
    if (!table || !id) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    const { error } = await supabaseAdmin.from(table).delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao excluir configuração." }, { status: 500 });
  }
}

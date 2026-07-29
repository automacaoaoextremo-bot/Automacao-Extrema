import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function organizationId() {
  const { data, error } = await supabaseAdmin
    .from("oh_organizations")
    .select("id")
    .or("slug.eq.tucxa,name.ilike.%tucxa%")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.id as string | undefined;
}

export async function GET() {
  try {
    const id = await organizationId();
    if (!id) {
      return NextResponse.json(
        { error: "Organização Tucxa não localizada." },
        { status: 404 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("oh_public_financial_snapshots")
      .select(
        "id, reference_month, detail_level, payload, published_at",
      )
      .eq("organization_id", id)
      .eq("status", "publicado")
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({
        snapshot: null,
        message:
          "A prestação de contas ainda está sendo preparada pela Tesouraria/Financeiro.",
      });
    }

    return NextResponse.json({ snapshot: data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao carregar transparência.",
      },
      { status: 500 },
    );
  }
}

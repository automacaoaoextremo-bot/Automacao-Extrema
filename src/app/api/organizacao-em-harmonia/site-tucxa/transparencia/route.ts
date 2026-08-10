import { NextResponse } from "next/server";
import { buildLiveFinancialTransparency } from "@/lib/organizacao-em-harmonia/live-financial-transparency";
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

    const live = await buildLiveFinancialTransparency(id);
    return NextResponse.json({ live });
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

import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/impacto-no-controle/supabase/admin";

type RouteProps = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: RouteProps) {
  const { token } = await params;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("inc_contribution_tracking")
    .select("*")
    .eq("acompanhamento_token", token)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: "Participação não encontrada." }, { status: 404 });
  return NextResponse.json({ contribution: data });
}

import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/impacto-no-controle/adminAuth";

export async function GET(request: Request) {
  try {
    const { supabase } = await requireAdminFromRequest(request);
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");
    if (!path) return NextResponse.json({ error: "Caminho do comprovante não informado." }, { status: 400 });

    const { data, error } = await supabase.storage.from("impacto-no-controle-proofs").createSignedUrl(path, 60 * 5);
    if (error || !data) throw error;
    return NextResponse.json({ url: data.signedUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao abrir comprovante." }, { status: 500 });
  }
}

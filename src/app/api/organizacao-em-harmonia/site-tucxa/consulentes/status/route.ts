import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeEmail(email: string | null | undefined) {
  if (!email) return "";
  return email.endsWith("@organizacao-em-harmonia.local") ? "" : email;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = asText(url.searchParams.get("token"));

  if (!token) {
    return NextResponse.json({ error: "Link de acompanhamento não informado." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("oh_public_site_requests")
    .select("id, request_type, full_name, whatsapp, email, status, created_at, updated_at, metadata")
    .eq("status_tracking_token", token)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Não foi possível consultar o acompanhamento agora." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Cadastro não localizado para este link." }, { status: 404 });
  }

  const row = data as {
    id: string;
    request_type: string | null;
    full_name: string | null;
    whatsapp: string | null;
    email: string | null;
    status: string | null;
    created_at: string | null;
    updated_at: string | null;
    metadata: Record<string, unknown> | null;
  };

  return NextResponse.json({
    ok: true,
    request: {
      id: row.id,
      requestType: row.request_type,
      fullName: row.full_name,
      whatsapp: row.whatsapp,
      email: safeEmail(row.email),
      status: row.status || "novo",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      modules: Array.isArray(row.metadata?.modules) ? row.metadata?.modules : ["agenda-viva", "atendimento-em-harmonia", "corrente-em-dia"],
    },
  });
}

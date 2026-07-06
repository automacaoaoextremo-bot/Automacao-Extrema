import { NextResponse } from "next/server";
import { getOrganizacaoAuthContext } from "@/lib/organizacao-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CONTENT_TYPE, normalizeTucxaPublicContent } from "@/lib/organizacao-em-harmonia/tucxa-public-content";
import { defaultTucxaPublicContent } from "@/lib/organizacao-em-harmonia/tucxa-public-content-defaults";

export const dynamic = "force-dynamic";

type ContentRow = {
  id: string;
  content: unknown;
};

async function readContent(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("oh_client_public_content")
    .select("id, content")
    .eq("organization_id", organizationId)
    .eq("content_type", CONTENT_TYPE)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as ContentRow | null) ?? null;
}

export async function GET(request: Request) {
  const auth = await getOrganizacaoAuthContext(request);
  if (!auth.ok) return auth.response;

  try {
    const existing = await readContent(auth.context.organizationId);
    return NextResponse.json({
      ok: true,
      content: existing?.content ? normalizeTucxaPublicContent(existing.content) : defaultTucxaPublicContent,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao carregar regulamento e orientações." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await getOrganizacaoAuthContext(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const content = normalizeTucxaPublicContent(body?.content ?? body);
    const existing = await readContent(auth.context.organizationId);

    if (existing?.id) {
      const { error } = await supabaseAdmin
        .from("oh_client_public_content")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from("oh_client_public_content").insert({
        organization_id: auth.context.organizationId,
        content_type: CONTENT_TYPE,
        content,
      });
      if (error) throw error;
    }

    return NextResponse.json({ ok: true, content });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao salvar regulamento e orientações." },
      { status: 500 },
    );
  }
}

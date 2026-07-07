import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const fallbackOptions = [
  { slug: "atendimento-segunda", label: "Atendimento de Segunda" },
  { slug: "atendimento-terca", label: "Atendimento de Terça" },
  { slug: "atendimento-quarta", label: "Atendimento de Quarta" },
  { slug: "quinta-grupo-1", label: "Quinta - Grupo 1" },
  { slug: "quinta-grupo-2", label: "Quinta - Grupo 2" },
  { slug: "quinta-grupo-1-e-2", label: "Quinta - Grupo 1 e 2" },
  { slug: "coordenacao-grupo-estudos", label: "Coordenação no Grupo de Estudos" },
  { slug: "participacao-grupo-estudos", label: "Participação no Grupo de Estudos" },
  { slug: "coordenacao-clube-livro", label: "Coordenação no Clube do Livro" },
  { slug: "participacao-clube-livro", label: "Participação no Clube do Livro" },
  { slug: "coordenacao-sementinha", label: "Coordenação Sementinha" },
  { slug: "voluntario-sementinha", label: "Voluntário Sementinha" },
  { slug: "organizacao-eventos", label: "Organização de Eventos" },
  { slug: "voluntario-eventos", label: "Voluntário Eventos" },
];

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function findTucxaOrganizationId() {
  const { data: bySlug } = await supabaseAdmin.from("oh_organizations").select("id").eq("slug", "tucxa").maybeSingle();
  if (bySlug?.id) return bySlug.id as string;

  const { data: byName } = await supabaseAdmin.from("oh_organizations").select("id").ilike("name", "%tucxa%").order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (byName?.id as string | undefined) ?? null;
}

export async function GET() {
  try {
    const organizationId = await findTucxaOrganizationId();
    if (!organizationId) return NextResponse.json({ options: fallbackOptions, source: "fallback" });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const { data, error } = await supabaseAdmin
      .from("agv_events")
      .select("title, event_type, group_slug, starts_at, status, metadata")
      .eq("organization_id", organizationId)
      .in("status", ["aprovado", "recorrente"])
      .or(`starts_at.is.null,starts_at.gte.${now.toISOString()}`)
      .order("starts_at", { ascending: true, nullsFirst: true })
      .limit(120);

    if (error) throw error;

    const generated = (data ?? [])
      .map((event) => {
        const record = event as { title?: string | null; event_type?: string | null; group_slug?: string | null };
        const label = record.title || record.event_type || record.group_slug || "Atividade";
        const slug = record.group_slug || record.event_type || slugify(label);
        return { slug, label };
      })
      .filter((item, index, array) => item.slug && array.findIndex((candidate) => candidate.slug === item.slug) === index);

    return NextResponse.json({ options: generated.length ? generated : fallbackOptions, source: generated.length ? "agenda-viva" : "fallback" });
  } catch {
    return NextResponse.json({ options: fallbackOptions, source: "fallback" });
  }
}

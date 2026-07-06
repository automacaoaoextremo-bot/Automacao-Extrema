import { NextResponse } from "next/server";
import { getOrganizacaoAuthContext } from "@/lib/organizacao-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type SettingsBody = {
  publicSlug?: string;
  organizationName?: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  headline?: string;
  showFilhoDaCorrente?: boolean;
  showConsulente?: boolean;
  showClienteFundador?: boolean;
  enabledSections?: string[];
};

const defaultSettings = {
  publicSlug: "tucxa",
  organizationName: "TUCXA - Templo de Umbanda Caboclo Sete Flexa",
  logoUrl: "/clientes/tucxa/tucxa-logo.jpg",
  primaryColor: "#123D2C",
  accentColor: "#2F6B43",
  headline: "Um ponto simples para orientar, organizar e cuidar melhor da nossa corrente.",
  showFilhoDaCorrente: true,
  showConsulente: true,
  showClienteFundador: false,
  enabledSections: ["visao", "modulos", "base-harmonia", "beneficios", "como-funciona"],
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asBool(value: unknown, fallback = true) {
  return typeof value === "boolean" ? value : fallback;
}

function asList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => asText(item)).filter(Boolean) : [];
}

async function readSettings(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("oh_client_site_settings")
    .select("id, public_slug, settings")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function GET(request: Request) {
  const auth = await getOrganizacaoAuthContext(request);
  if (!auth.ok) return auth.response;

  try {
    const existing = await readSettings(auth.context.organizationId);
    return NextResponse.json({
      ok: true,
      settings: existing?.settings ? { ...defaultSettings, ...(existing.settings as Record<string, unknown>) } : defaultSettings,
      publicSlug: existing?.public_slug || defaultSettings.publicSlug,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao carregar configuração do site." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await getOrganizacaoAuthContext(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json().catch(() => ({}))) as SettingsBody;
    const publicSlug = (asText(body.publicSlug) || "tucxa").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "tucxa";
    const settings = {
      publicSlug,
      organizationName: asText(body.organizationName) || defaultSettings.organizationName,
      logoUrl: asText(body.logoUrl) || defaultSettings.logoUrl,
      primaryColor: asText(body.primaryColor) || defaultSettings.primaryColor,
      accentColor: asText(body.accentColor) || defaultSettings.accentColor,
      headline: asText(body.headline) || defaultSettings.headline,
      showFilhoDaCorrente: asBool(body.showFilhoDaCorrente, true),
      showConsulente: asBool(body.showConsulente, true),
      showClienteFundador: asBool(body.showClienteFundador, false),
      enabledSections: asList(body.enabledSections).length ? asList(body.enabledSections) : defaultSettings.enabledSections,
    };

    const existing = await readSettings(auth.context.organizationId);
    if (existing?.id) {
      const { error } = await supabaseAdmin
        .from("oh_client_site_settings")
        .update({ public_slug: publicSlug, settings, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from("oh_client_site_settings").insert({
        organization_id: auth.context.organizationId,
        public_slug: publicSlug,
        settings,
      });
      if (error) throw error;
    }

    return NextResponse.json({ ok: true, settings, publicSlug });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao salvar configuração do site." }, { status: 500 });
  }
}

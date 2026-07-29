import { NextResponse } from "next/server";
import { getOrganizacaoAuthContext } from "@/lib/organizacao-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

type ChecklistState = Record<string, { percent: number; completed: boolean; updatedAt?: string }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clampPercent(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numberValue)) return 0;
  return Math.max(0, Math.min(100, Math.round(numberValue)));
}

function readChecklist(settings: unknown): ChecklistState {
  if (!isRecord(settings)) return {};
  const raw = settings.checklistProgress;
  if (!isRecord(raw)) return {};

  const checklist: ChecklistState = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!isRecord(value)) continue;
    const percent = clampPercent(value.percent);
    checklist[key] = {
      percent,
      completed: typeof value.completed === "boolean" ? value.completed : percent >= 100,
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : undefined,
    };
  }
  return checklist;
}

export async function GET(request: Request) {
  const auth = await getOrganizacaoAuthContext(request);
  if (!auth.ok) return auth.response;

  try {
    const { data, error } = await supabaseAdmin
      .from("oh_organizations")
      .select("settings")
      .eq("id", auth.context.organizationId)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ ok: true, checklist: readChecklist(data?.settings) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao carregar checklist." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await getOrganizacaoAuthContext(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const itemKey = typeof body.itemKey === "string" ? body.itemKey.trim() : "";
    if (!itemKey) return NextResponse.json({ error: "Item do checklist não informado." }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("oh_organizations")
      .select("settings")
      .eq("id", auth.context.organizationId)
      .maybeSingle();

    if (error) throw error;

    const currentSettings = isRecord(data?.settings) ? data.settings : {};
    const checklist = readChecklist(currentSettings);
    const percent = clampPercent(body.percent);
    const nextChecklist: ChecklistState = {
      ...checklist,
      [itemKey]: {
        percent,
        completed: percent >= 100,
        updatedAt: new Date().toISOString(),
      },
    };

    const nextSettings = {
      ...currentSettings,
      checklistProgress: nextChecklist,
    };

    const { error: updateError } = await supabaseAdmin
      .from("oh_organizations")
      .update({ settings: nextSettings, updated_at: new Date().toISOString() })
      .eq("id", auth.context.organizationId);

    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, checklist: nextChecklist });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao salvar checklist." }, { status: 500 });
  }
}

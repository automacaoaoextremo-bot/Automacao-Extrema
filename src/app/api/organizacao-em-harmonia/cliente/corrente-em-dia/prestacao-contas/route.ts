import { NextResponse } from "next/server";
import {
  asNumber,
  asText,
  monthKey,
  normalizeFinancialSettings,
} from "@/lib/organizacao-em-harmonia/corrente-financeiro";
import {
  getFinancialAuthContext,
  writeFinancialAudit,
} from "@/lib/organizacao-em-harmonia/financial-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Entry = {
  id: string;
  entry_type: "receita" | "despesa";
  competence_month: string;
  description_public: string | null;
  amount: number | string;
  status: string;
  is_provisional: boolean;
  needs_update: boolean;
  category:
    | {
        name: string;
        public_name: string | null;
        group_name: string;
        public_visible: boolean;
      }
    | Array<{
        name: string;
        public_name: string | null;
        group_name: string;
        public_visible: boolean;
      }>
    | null;
};

function categoryFrom(value: Entry["category"]) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function last12Months(reference = new Date()) {
  const months: string[] = [];
  for (let offset = 11; offset >= 0; offset -= 1) {
    months.push(
      monthKey(
        new Date(
          reference.getFullYear(),
          reference.getMonth() - offset,
          1,
          12,
        ),
      ),
    );
  }
  return months;
}

async function buildPublicPayload(organizationId: string) {
  const { data: rawSettings, error: settingsError } = await supabaseAdmin
    .from("oh_financial_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (settingsError) throw settingsError;
  const settings = normalizeFinancialSettings(rawSettings);
  const months = last12Months();

  const { data, error } = await supabaseAdmin
    .from("oh_financial_entries")
    .select(
      "id, entry_type, competence_month, description_public, amount, status, is_provisional, needs_update, category:oh_financial_categories(name, public_name, group_name, public_visible)",
    )
    .eq("organization_id", organizationId)
    .gte("competence_month", months[0])
    .neq("status", "cancelado")
    .eq("public_visible", true)
    .order("competence_month", { ascending: true });

  if (error) throw error;
  const entries = (data ?? []) as Entry[];

  const usableEntries = entries.filter((entry) => {
    if (
      !settings.publicShowProvisionalData &&
      (entry.is_provisional || entry.status === "provisorio")
    ) {
      return false;
    }
    const category = categoryFrom(entry.category);
    return category?.public_visible !== false;
  });

  const monthly = months.map((month) => {
    const rows = usableEntries.filter(
      (entry) => entry.competence_month === month,
    );
    const revenues = rows
      .filter((entry) => entry.entry_type === "receita")
      .reduce((sum, entry) => sum + asNumber(entry.amount), 0);
    const expenses = rows
      .filter((entry) => entry.entry_type === "despesa")
      .reduce((sum, entry) => sum + asNumber(entry.amount), 0);

    return {
      month,
      revenues,
      expenses,
      result: revenues - expenses,
      provisional: rows.some(
        (entry) =>
          entry.is_provisional ||
          entry.needs_update ||
          entry.status === "provisorio",
      ),
    };
  });

  const groups = new Map<
    string,
    {
      type: "receita" | "despesa";
      group: string;
      total: number;
      items: Map<string, number>;
    }
  >();

  for (const entry of usableEntries) {
    const category = categoryFrom(entry.category);
    const group = category?.group_name || "Outros";
    const key = `${entry.entry_type}:${group}`;
    const existing = groups.get(key) ?? {
      type: entry.entry_type,
      group,
      total: 0,
      items: new Map<string, number>(),
    };
    const amount = asNumber(entry.amount);
    existing.total += amount;
    const item =
      category?.public_name ||
      category?.name ||
      entry.description_public ||
      "Outros";
    existing.items.set(item, (existing.items.get(item) ?? 0) + amount);
    groups.set(key, existing);
  }

  const grouped = Array.from(groups.values())
    .map((item) => ({
      type: item.type,
      group: item.group,
      total: item.total,
      items: Array.from(item.items.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => b.total - a.total);

  const totals = monthly.reduce(
    (acc, item) => ({
      revenues: acc.revenues + item.revenues,
      expenses: acc.expenses + item.expenses,
      result: acc.result + item.result,
    }),
    { revenues: 0, expenses: 0, result: 0 },
  );

  const latest = monthly[monthly.length - 1] ?? {
    month: monthKey(new Date()),
    revenues: 0,
    expenses: 0,
    result: 0,
    provisional: false,
  };

  const confirmedMonths = monthly.filter((item) => !item.provisional).length;

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    settings: {
      detailLevel: settings.publicDetailLevel,
      showLast12Months: settings.publicShowLast12Months,
      showDrilldown: settings.publicShowDrilldown,
      showTopExpenses: settings.publicShowTopExpenses,
      showTopRevenues: settings.publicShowTopRevenues,
      showNegativeResults: settings.publicShowNegativeResults,
      showAccumulatedBalance: settings.publicShowAccumulatedBalance,
      showSimulator: settings.publicShowSimulator,
      showProvisionalData: settings.publicShowProvisionalData,
      popupFrequency: settings.publicPopupFrequency,
      headline: settings.publicHeadline,
      message: settings.publicMessage,
    },
    monthly,
    groups: grouped,
    totals,
    latest,
    confirmedPercentage:
      monthly.length > 0
        ? Math.round((confirmedMonths / monthly.length) * 100)
        : 0,
    provisionalNotice: monthly.some((item) => item.provisional)
      ? "Os meses destacados como provisórios foram baseados nos dados disponíveis e ainda precisam ser substituídos pelos valores realizados."
      : null,
  };
}

export async function GET(request: Request) {
  try {
    const auth = await getFinancialAuthContext(request, "view");
    if (!auth.ok) return auth.response;

    const [payload, snapshots] = await Promise.all([
      buildPublicPayload(auth.context.organizationId),
      supabaseAdmin
        .from("oh_public_financial_snapshots")
        .select(
          "id, reference_month, detail_level, status, published_at, created_at",
        )
        .eq("organization_id", auth.context.organizationId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (snapshots.error) throw snapshots.error;

    return NextResponse.json({
      canManage: auth.context.canManage,
      preview: payload,
      snapshots: snapshots.data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao preparar prestação de contas.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getFinancialAuthContext(request, "manage");
    if (!auth.ok) return auth.response;

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const action = asText(body.action);

    if (action === "publish") {
      const payload = await buildPublicPayload(auth.context.organizationId);
      const referenceMonth = payload.latest.month;

      const { data: existing, error: existingError } = await supabaseAdmin
        .from("oh_public_financial_snapshots")
        .select("id")
        .eq("organization_id", auth.context.organizationId)
        .eq("reference_month", referenceMonth)
        .eq("status", "publicado");

      if (existingError) throw existingError;

      if ((existing ?? []).length > 0) {
        const { error: replaceError } = await supabaseAdmin
          .from("oh_public_financial_snapshots")
          .update({
            status: "substituido",
            updated_at: new Date().toISOString(),
          })
          .in(
            "id",
            (existing ?? []).map((item) => item.id),
          );
        if (replaceError) throw replaceError;
      }

      const { data: snapshot, error } = await supabaseAdmin
        .from("oh_public_financial_snapshots")
        .insert({
          organization_id: auth.context.organizationId,
          reference_month: referenceMonth,
          detail_level: payload.settings.detailLevel,
          payload,
          status: "publicado",
          published_by: auth.context.personId,
          published_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) throw error;

      await writeFinancialAudit({
        organizationId: auth.context.organizationId,
        personId: auth.context.personId,
        action: "prestacao_publicada",
        entityType: "oh_public_financial_snapshots",
        entityId: snapshot.id,
        afterData: {
          referenceMonth,
          detailLevel: payload.settings.detailLevel,
        },
      });

      return NextResponse.json({
        ok: true,
        snapshot,
        message: "Prestação de contas publicada.",
      });
    }

    throw new Error("Ação não reconhecida.");
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao publicar prestação de contas.",
      },
      { status: 500 },
    );
  }
}

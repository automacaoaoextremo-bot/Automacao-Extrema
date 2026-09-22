/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/impacto-no-controle/adminAuth";
import { formatMoneyFromCents } from "@/lib/impacto-no-controle/format";
import {
  buildContributionPdf,
  buildContributionXlsx,
  type ContributionReportRow,
} from "@/lib/impacto-no-controle/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteProps = { params: Promise<{ id: string }> };

const statusLabels: Record<string, string> = {
  awaiting_payment: "aguardando pagamento/comprovante",
  pending_approval: "aguardando conferência do pagamento",
  approved: "pagamento aprovado",
  rejected: "pagamento não aprovado",
  canceled: "cancelado",
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function paymentMethodLabel(value: string | null | undefined) {
  if (value === "other") return "Outra forma combinada com o Suporte";
  if (value === "pix") return "Pix";
  return "Não informado";
}

function payerMatchLabel(value: boolean | null | undefined) {
  if (value === true) return "Sim";
  if (value === false) return "Não";
  return "Não informado";
}

export async function GET(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params;
    const { supabase, appUser } = await requireAdminFromRequest(request);

    const { data: campaign, error: campaignError } = await supabase
      .from("inc_campaigns")
      .select("id,title,slug,client_id")
      .eq("id", id)
      .maybeSingle();

    if (campaignError) throw campaignError;
    if (!campaign) {
      return NextResponse.json({ error: "Campanha não encontrada." }, { status: 404 });
    }

    if (appUser.role !== "owner" && appUser.client_id !== campaign.client_id) {
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }

    const { data: contributions, error: contributionsError } = await supabase
      .from("inc_admin_contributions")
      .select("*")
      .eq("campaign_id", id)
      .order("created_at", { ascending: true });

    if (contributionsError) throw contributionsError;

    const rows: ContributionReportRow[] = (contributions || []).map((row: any) => ({
      createdAt: formatDateTime(row.created_at),
      participantName: row.participant_name || "Participante",
      phone: row.phone || null,
      email: row.email || null,
      numbers: Array.isArray(row.selected_numbers)
        ? row.selected_numbers.map((number: number) => String(number).padStart(2, "0")).join(", ")
        : "",
      amount: formatMoneyFromCents(Number(row.amount_cents || 0)),
      paymentMethod: paymentMethodLabel(row.payment_method),
      paymentOccurredAt: formatDateTime(row.payment_occurred_at),
      payerMatchesParticipant: payerMatchLabel(row.payer_matches_participant),
      payerName: row.payer_name || null,
      status: statusLabels[row.status] || row.status || "Não informado",
      approvedAt: formatDateTime(row.approved_at),
    }));

    const format = new URL(request.url).searchParams.get("format")?.toLowerCase() || "xlsx";
    const safeSlug = String(campaign.slug || "campanha").replace(/[^a-z0-9-_]+/gi, "-");

    if (format === "pdf") {
      const generatedAt = new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Sao_Paulo",
      }).format(new Date());
      const file = buildContributionPdf({
        campaignTitle: campaign.title || "Campanha",
        generatedAt,
        rows,
      });

      return new Response(new Uint8Array(file), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="relatorio-contribuicoes-${safeSlug}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const file = buildContributionXlsx(rows);
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="relatorio-contribuicoes-${safeSlug}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro ao gerar relatório de contribuições." },
      { status: 500 },
    );
  }
}

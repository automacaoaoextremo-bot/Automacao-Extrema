import { NextResponse } from "next/server";
import {
  asBoolean,
  asNumber,
  asText,
  monthKey,
} from "@/lib/organizacao-em-harmonia/corrente-financeiro";
import {
  getFinancialAuthContext,
  writeFinancialAudit,
} from "@/lib/organizacao-em-harmonia/financial-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type WorkflowStatus =
  | "rascunho"
  | "em_andamento"
  | "em_revisao"
  | "finalizado"
  | "reaberto";

type DataNature = "realizado" | "estimado";

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validWorkflowStatus(value: string): value is WorkflowStatus {
  return [
    "rascunho",
    "em_andamento",
    "em_revisao",
    "finalizado",
    "reaberto",
  ].includes(value);
}

function validDataNature(value: string): value is DataNature {
  return value === "realizado" || value === "estimado";
}

function legacyStatus(workflowStatus: WorkflowStatus, dataNature: DataNature) {
  if (workflowStatus === "finalizado") return "confirmado";
  if (dataNature === "estimado") return "provisorio";
  if (workflowStatus === "rascunho") return "rascunho";
  return "em_revisao";
}

async function ensurePeriod(input: {
  organizationId: string;
  competenceMonth: string;
  workflowStatus: WorkflowStatus;
  dataNature: DataNature;
}) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("oh_financial_periods")
    .select("id, workflow_status, status")
    .eq("organization_id", input.organizationId)
    .eq("competence_month", input.competenceMonth)
    .maybeSingle();

  if (existingError) throw existingError;

  const wasFinalized = existing?.workflow_status === "finalizado";
  const nextWorkflowStatus = wasFinalized
    ? "reaberto"
    : input.workflowStatus;
  const now = new Date().toISOString();

  const periodPayload: Record<string, unknown> = {
    organization_id: input.organizationId,
    competence_month: input.competenceMonth,
    status: legacyStatus(nextWorkflowStatus, input.dataNature),
    workflow_status: nextWorkflowStatus,
    data_nature: input.dataNature,
    needs_update: input.dataNature === "estimado",
    source_label:
      input.dataNature === "estimado" ? "Cadastro estimado" : "Cadastro manual",
    updated_at: now,
  };

  if (wasFinalized) {
    periodPayload.approved_by = null;
    periodPayload.approved_at = null;
    periodPayload.finalized_at = null;
    periodPayload.reopened_at = now;
  }

  const { data, error } = await supabaseAdmin
    .from("oh_financial_periods")
    .upsert(periodPayload, { onConflict: "organization_id,competence_month" })
    .select("id")
    .single();

  if (error) throw error;
  if (!data) {
    throw new Error("Não foi possível localizar ou criar a competência.");
  }
  return data.id as string;
}

async function loadEntries(request: Request, organizationId: string) {
  const url = new URL(request.url);
  const month = asText(url.searchParams.get("month"));
  const financialMonth = asText(url.searchParams.get("financialMonth"));
  const type = asText(url.searchParams.get("type"));
  const status = asText(url.searchParams.get("status"));
  const queryText = asText(url.searchParams.get("q")).toLowerCase();

  let query = supabaseAdmin
    .from("oh_financial_entries")
    .select(
      "id, period_id, category_id, import_id, entry_type, entry_date, due_date, financial_date, financial_month, competence_month, description_internal, description_public, amount, payment_method, financial_account, counterparty_name, source_type, source_reference, status, workflow_status, data_nature, is_provisional, needs_update, public_visible, notes_internal, metadata, created_at, updated_at, category:oh_financial_categories(id, name, public_name, group_name)",
    )
    .eq("organization_id", organizationId)
    .neq("status", "cancelado")
    .order("financial_date", { ascending: false, nullsFirst: false })
    .order("entry_date", { ascending: false })
    .limit(1000);

  if (month) query = query.eq("competence_month", monthKey(month));
  if (financialMonth) {
    query = query.eq("financial_month", monthKey(financialMonth));
  }
  if (type) query = query.eq("entry_type", type);
  if (status) query = query.eq("workflow_status", status);

  const { data, error } = await query;
  if (error) throw error;

  const entries = (data ?? []).filter((item: Record<string, unknown>) => {
    if (!queryText) return true;
    return [
      item.description_internal,
      item.description_public,
      item.counterparty_name,
      item.payment_method,
      item.financial_account,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(queryText));
  });

  const { data: categories, error: categoriesError } = await supabaseAdmin
    .from("oh_financial_categories")
    .select(
      "id, entry_type, name, public_name, group_name, public_visible, active, sort_order",
    )
    .eq("organization_id", organizationId)
    .eq("active", true)
    .order("entry_type", { ascending: true })
    .order("sort_order", { ascending: true });

  if (categoriesError) throw categoriesError;

  return { entries, categories: categories ?? [] };
}

export async function GET(request: Request) {
  try {
    const auth = await getFinancialAuthContext(request, "view");
    if (!auth.ok) return auth.response;

    return NextResponse.json({
      canManage: auth.context.canManage,
      ...(await loadEntries(request, auth.context.organizationId)),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao carregar lançamentos.",
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

    if (action === "save") {
      const id = asText(body.id);
      const entryType = asText(body.entryType);
      const entryDate = asText(body.entryDate);
      const dueDate = asText(body.dueDate) || entryDate;
      const financialDate = asText(body.financialDate) || entryDate;
      const amount = Math.abs(asNumber(body.amount));
      const descriptionInternal = asText(body.descriptionInternal);
      const requestedWorkflowStatus = asText(body.workflowStatus);
      const requestedDataNature = asText(body.dataNature);
      const workflowStatus: WorkflowStatus = validWorkflowStatus(
        requestedWorkflowStatus,
      )
        ? requestedWorkflowStatus
        : "em_revisao";
      const dataNature: DataNature = validDataNature(requestedDataNature)
        ? requestedDataNature
        : "realizado";

      if (!['receita', 'despesa'].includes(entryType)) {
        return NextResponse.json(
          { error: "Selecione Receita ou Despesa." },
          { status: 400 },
        );
      }
      if (!validDate(entryDate)) {
        return NextResponse.json(
          { error: "Informe uma data de registro válida." },
          { status: 400 },
        );
      }
      if (!validDate(dueDate)) {
        return NextResponse.json(
          { error: "Informe uma data de vencimento válida." },
          { status: 400 },
        );
      }
      if (!validDate(financialDate)) {
        return NextResponse.json(
          { error: "Informe uma data financeira válida." },
          { status: 400 },
        );
      }
      if (!descriptionInternal) {
        return NextResponse.json(
          { error: "Informe a descrição do lançamento." },
          { status: 400 },
        );
      }
      if (amount <= 0) {
        return NextResponse.json(
          { error: "Informe um valor maior que zero." },
          { status: 400 },
        );
      }

      const competenceMonth = monthKey(
        asText(body.competenceMonth) || entryDate,
      );
      const financialMonth = monthKey(
        asText(body.financialMonth) || financialDate,
      );
      const periodId = await ensurePeriod({
        organizationId: auth.context.organizationId,
        competenceMonth: financialMonth,
        workflowStatus,
        dataNature,
      });

      let before: Record<string, unknown> | null = null;
      if (id) {
        const { data, error } = await supabaseAdmin
          .from("oh_financial_entries")
          .select("*")
          .eq("organization_id", auth.context.organizationId)
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;
        before = data;
      }

      const legacy = legacyStatus(workflowStatus, dataNature);
      const payload = {
        organization_id: auth.context.organizationId,
        period_id: periodId,
        category_id: asText(body.categoryId) || null,
        entry_type: entryType,
        entry_date: entryDate,
        due_date: dueDate,
        financial_date: financialDate,
        financial_month: financialMonth,
        competence_month: competenceMonth,
        description_internal: descriptionInternal,
        description_public:
          asText(body.descriptionPublic) || descriptionInternal,
        amount,
        payment_method: asText(body.paymentMethod) || null,
        financial_account: asText(body.financialAccount) || null,
        counterparty_name: asText(body.counterpartyName) || null,
        source_type: id ? before?.source_type || "manual" : "manual",
        status: legacy,
        workflow_status: workflowStatus,
        data_nature: dataNature,
        is_provisional: dataNature === "estimado",
        needs_update:
          asBoolean(body.needsUpdate, dataNature === "estimado"),
        public_visible: asBoolean(body.publicVisible, true),
        notes_internal: asText(body.notesInternal) || null,
        metadata:
          body.metadata &&
          typeof body.metadata === "object" &&
          !Array.isArray(body.metadata)
            ? body.metadata
            : {},
        updated_at: new Date().toISOString(),
      };

      const operation = id
        ? supabaseAdmin
            .from("oh_financial_entries")
            .update(payload)
            .eq("organization_id", auth.context.organizationId)
            .eq("id", id)
            .select("*")
            .single()
        : supabaseAdmin
            .from("oh_financial_entries")
            .insert({
              ...payload,
              created_by: auth.context.personId,
            })
            .select("*")
            .single();

      const { data: saved, error } = await operation;
      if (error) throw error;

      await writeFinancialAudit({
        organizationId: auth.context.organizationId,
        personId: auth.context.personId,
        action: id ? "lancamento_atualizado" : "lancamento_criado",
        entityType: "oh_financial_entries",
        entityId: saved.id,
        beforeData: before,
        afterData: saved,
        justification: asText(body.justification) || null,
      });

      return NextResponse.json({
        ok: true,
        entry: saved,
        message: id ? "Lançamento atualizado." : "Lançamento criado.",
      });
    }

    if (action === "approve") {
      const id = asText(body.id);
      if (!id) {
        return NextResponse.json(
          { error: "Informe o lançamento." },
          { status: 400 },
        );
      }

      const { data: before, error: beforeError } = await supabaseAdmin
        .from("oh_financial_entries")
        .select("*")
        .eq("organization_id", auth.context.organizationId)
        .eq("id", id)
        .maybeSingle();

      if (beforeError) throw beforeError;
      if (!before) {
        return NextResponse.json(
          { error: "Lançamento não localizado." },
          { status: 404 },
        );
      }

      const { data: updated, error } = await supabaseAdmin
        .from("oh_financial_entries")
        .update({
          status: "confirmado",
          workflow_status: "em_revisao",
          data_nature: "realizado",
          is_provisional: false,
          needs_update: false,
          approved_by: auth.context.personId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", auth.context.organizationId)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      await writeFinancialAudit({
        organizationId: auth.context.organizationId,
        personId: auth.context.personId,
        action: "lancamento_conferido",
        entityType: "oh_financial_entries",
        entityId: id,
        beforeData: before,
        afterData: updated,
      });

      return NextResponse.json({
        ok: true,
        message: "Lançamento conferido e mantido na competência em revisão.",
      });
    }

    if (action === "delete") {
      const id = asText(body.id);
      if (!id) {
        return NextResponse.json(
          { error: "Informe o lançamento." },
          { status: 400 },
        );
      }

      const { data: before, error: beforeError } = await supabaseAdmin
        .from("oh_financial_entries")
        .select("*")
        .eq("organization_id", auth.context.organizationId)
        .eq("id", id)
        .maybeSingle();

      if (beforeError) throw beforeError;
      if (!before) {
        return NextResponse.json(
          { error: "Lançamento não localizado." },
          { status: 404 },
        );
      }

      const { error } = await supabaseAdmin
        .from("oh_financial_entries")
        .update({
          status: "cancelado",
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", auth.context.organizationId)
        .eq("id", id);

      if (error) throw error;

      await writeFinancialAudit({
        organizationId: auth.context.organizationId,
        personId: auth.context.personId,
        action: "lancamento_cancelado",
        entityType: "oh_financial_entries",
        entityId: id,
        beforeData: before,
        justification: asText(body.justification) || null,
      });

      return NextResponse.json({
        ok: true,
        message:
          "Lançamento removido da visão ativa e preservado na auditoria.",
      });
    }

    throw new Error("Ação não reconhecida.");
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao salvar lançamento.",
      },
      { status: 500 },
    );
  }
}

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

function categorySlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "categoria";
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

function targetDate(sourceDate: string | null | undefined, targetMonth: string) {
  const year = Number(targetMonth.slice(0, 4));
  const month = Number(targetMonth.slice(5, 7));
  const sourceDay = Number(asText(sourceDate).slice(8, 10)) || 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${targetMonth.slice(0, 7)}-${String(Math.min(sourceDay, lastDay)).padStart(2, "0")}`;
}

async function loadPeriod(organizationId: string, competenceMonth: string) {
  const { data, error } = await supabaseAdmin
    .from("oh_financial_periods")
    .select("id, competence_month, status, workflow_status, data_nature, needs_update, source_label, finalized_at, updated_at")
    .eq("organization_id", organizationId)
    .eq("competence_month", competenceMonth)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

async function replicateMonth(input: {
  organizationId: string;
  personId: string;
  targetMonth: string;
  mode: "last" | "average";
}) {
  const existingPeriod = await loadPeriod(input.organizationId, input.targetMonth);
  if (existingPeriod?.workflow_status === "finalizado") {
    throw new Error(
      "Este mês já foi finalizado e não pode ser replicado sem reabertura administrativa.",
    );
  }

  const { data: periods, error: periodsError } = await supabaseAdmin
    .from("oh_financial_periods")
    .select("id, competence_month")
    .eq("organization_id", input.organizationId)
    .eq("workflow_status", "finalizado")
    .lt("competence_month", input.targetMonth)
    .order("competence_month", { ascending: false })
    .limit(input.mode === "average" ? 3 : 1);
  if (periodsError) throw periodsError;
  if (!periods || periods.length === 0) {
    throw new Error(
      "Não existe mês finalizado anterior para usar como referência.",
    );
  }

  const sourcePeriodIds = periods.map((period) => period.id);
  const { data: sourceEntries, error: sourceError } = await supabaseAdmin
    .from("oh_financial_entries")
    .select("*")
    .eq("organization_id", input.organizationId)
    .in("period_id", sourcePeriodIds)
    .neq("status", "cancelado");
  if (sourceError) throw sourceError;
  if (!sourceEntries || sourceEntries.length === 0) {
    throw new Error(
      "Os meses de referência não possuem receitas ou despesas para replicar.",
    );
  }

  type SourceEntry = Record<string, unknown>;
  let templates: Array<SourceEntry & { amount: number }> = [];

  if (input.mode === "last") {
    const latestId = periods[0].id;
    templates = sourceEntries
      .filter((entry) => entry.period_id === latestId)
      .map((entry) => ({
        ...entry,
        amount: Math.abs(asNumber(entry.amount)),
      }));
  } else {
    const groups = new Map<
      string,
      { sample: SourceEntry; total: number; months: Set<string> }
    >();

    for (const entry of sourceEntries) {
      const key = [
        asText(entry.entry_type),
        asText(entry.category_id),
        asText(entry.description_internal),
        asText(entry.description_public),
        asText(entry.payment_method),
        asText(entry.financial_account),
      ].join("|");

      const current = groups.get(key) ?? {
        sample: entry,
        total: 0,
        months: new Set<string>(),
      };
      current.total += Math.abs(asNumber(entry.amount));
      current.months.add(asText(entry.financial_month));
      groups.set(key, current);
    }

    templates = [...groups.values()].map(({ sample, total }) => ({
      ...sample,
      amount: Number((total / Math.max(1, periods.length)).toFixed(2)),
    }));
  }

  const periodId = await ensurePeriod({
    organizationId: input.organizationId,
    competenceMonth: input.targetMonth,
    workflowStatus: "rascunho",
    dataNature: "estimado",
  });

  const { data: currentEntries, error: currentError } = await supabaseAdmin
    .from("oh_financial_entries")
    .select("id, category_id, entry_type, description_internal")
    .eq("organization_id", input.organizationId)
    .eq("financial_month", input.targetMonth)
    .neq("status", "cancelado");

  if (currentError) throw currentError;

  const targetKey = (entry: {
    entry_type?: unknown;
    category_id?: unknown;
    description_internal?: unknown;
  }) =>
    [
      asText(entry.entry_type),
      asText(entry.category_id),
      asText(entry.description_internal),
    ].join("|");

  const currentByKey = new Map(
    (currentEntries ?? []).map((entry) => [targetKey(entry), entry]),
  );

  const now = new Date().toISOString();
  let affected = 0;

  for (const [index, entry] of templates.entries()) {
    const entryDate = targetDate(
      asText(entry.entry_date),
      input.targetMonth,
    );
    const dueDate = targetDate(
      asText(entry.due_date) || asText(entry.entry_date),
      input.targetMonth,
    );
    const financialDate = targetDate(
      asText(entry.financial_date) || asText(entry.entry_date),
      input.targetMonth,
    );

    const payload = {
      organization_id: input.organizationId,
      period_id: periodId,
      category_id: asText(entry.category_id) || null,
      entry_type: asText(entry.entry_type),
      entry_date: entryDate,
      due_date: dueDate,
      financial_date: financialDate,
      financial_month: input.targetMonth,
      competence_month: input.targetMonth,
      description_internal:
        asText(entry.description_internal) || "Lançamento replicado",
      description_public:
        asText(entry.description_public) ||
        asText(entry.description_internal) ||
        "Lançamento replicado",
      amount: Math.abs(asNumber(entry.amount)),
      payment_method: asText(entry.payment_method) || null,
      financial_account: asText(entry.financial_account) || null,
      counterparty_name: asText(entry.counterparty_name) || null,
      source_type:
        input.mode === "last"
          ? "replicacao_mes_anterior"
          : "replicacao_media",
      source_reference: null,
      status: "provisorio",
      workflow_status: "rascunho",
      data_nature: "estimado",
      is_provisional: true,
      needs_update: true,
      public_visible: asBoolean(entry.public_visible, true),
      notes_internal: asText(entry.notes_internal) || null,
      metadata: {
        replicatedAt: now,
        replicatedMode: input.mode,
        sourcePeriods: periods.map((period) => period.competence_month),
        sourceEntryId: asText(entry.id) || null,
        sequence: index + 1,
      },
      updated_at: now,
    };

    const existing = currentByKey.get(targetKey(payload));

    if (existing?.id) {
      const { error } = await supabaseAdmin
        .from("oh_financial_entries")
        .update(payload)
        .eq("organization_id", input.organizationId)
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("oh_financial_entries")
        .insert({
          ...payload,
          created_by: input.personId,
        });
      if (error) throw error;
    }

    affected += 1;
  }

  await writeFinancialAudit({
    organizationId: input.organizationId,
    personId: input.personId,
    action:
      input.mode === "last"
        ? "mes_replicado_ultimo"
        : "mes_replicado_media",
    entityType: "oh_financial_periods",
    entityId: periodId,
    afterData: {
      targetMonth: input.targetMonth,
      items: affected,
      mode: input.mode,
      updatedExisting: (currentEntries ?? []).length > 0,
    },
  });

  return affected;
}

async function finalizeMonth(input: {
  organizationId: string;
  personId: string;
  targetMonth: string;
}) {
  const period = await loadPeriod(input.organizationId, input.targetMonth);
  if (!period) throw new Error("O mês ainda não possui informações salvas.");
  if (period.workflow_status === "finalizado") return;

  const now = new Date().toISOString();
  const { error: entriesError } = await supabaseAdmin
    .from("oh_financial_entries")
    .update({
      status: "confirmado",
      workflow_status: "finalizado",
      data_nature: "realizado",
      is_provisional: false,
      needs_update: false,
      approved_by: input.personId,
      approved_at: now,
      updated_at: now,
    })
    .eq("organization_id", input.organizationId)
    .eq("financial_month", input.targetMonth)
    .neq("status", "cancelado");
  if (entriesError) throw entriesError;

  const { error: periodError } = await supabaseAdmin
    .from("oh_financial_periods")
    .update({
      status: "fechado",
      workflow_status: "finalizado",
      data_nature: "realizado",
      needs_update: false,
      approved_by: input.personId,
      approved_at: now,
      finalized_at: now,
      updated_at: now,
    })
    .eq("organization_id", input.organizationId)
    .eq("id", period.id);
  if (periodError) throw periodError;

  await writeFinancialAudit({
    organizationId: input.organizationId,
    personId: input.personId,
    action: "mes_financeiro_finalizado",
    entityType: "oh_financial_periods",
    entityId: period.id,
    beforeData: period,
    afterData: { ...period, workflow_status: "finalizado", finalized_at: now },
  });
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
      "id, entry_type, parent_id, name, public_name, group_name, public_visible, active, sort_order, metadata",
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

    const loaded = await loadEntries(request, auth.context.organizationId);
    const url = new URL(request.url);
    const requestedMonth = asText(url.searchParams.get("financialMonth")) || asText(url.searchParams.get("month"));
    const period = requestedMonth
      ? await loadPeriod(auth.context.organizationId, monthKey(requestedMonth))
      : null;

    return NextResponse.json({
      canManage: auth.context.canManage,
      ...loaded,
      period,
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

    const personId = auth.context.personId;
    if (!personId) {
      return NextResponse.json(
        { error: "Não foi possível identificar a pessoa responsável pela operação financeira." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const action = asText(body.action);

    if (action === "createCategory") {
      const entryType = asText(body.entryType);
      const name = asText(body.name).trim();
      const publicName = asText(body.publicName).trim() || name;
      const isGrouping = asBoolean(body.isGrouping, false);
      const groupName = isGrouping ? name : asText(body.groupName).trim();

      if (!["receita", "despesa"].includes(entryType)) {
        return NextResponse.json(
          { error: "Selecione Receita ou Despesa." },
          { status: 400 },
        );
      }

      if (!name) {
        return NextResponse.json(
          { error: "Informe o nome da nova linha ou agrupamento." },
          { status: 400 },
        );
      }

      if (!isGrouping && !groupName) {
        return NextResponse.json(
          { error: "Informe em qual grupo a nova linha será registrada." },
          { status: 400 },
        );
      }

      const { data: matches, error: matchError } = await supabaseAdmin
        .from("oh_financial_categories")
        .select(
          "id, entry_type, parent_id, name, public_name, slug, group_name, public_visible, active, sort_order, metadata",
        )
        .eq("organization_id", auth.context.organizationId)
        .eq("entry_type", entryType)
        .ilike("name", name)
        .limit(1);

      if (matchError) throw matchError;

      const existingCategory = matches?.[0];
      if (existingCategory) {
        return NextResponse.json({
          ok: true,
          category: existingCategory,
          message: "A linha financeira já estava cadastrada.",
        });
      }

      let parentId: string | null = null;

      if (!isGrouping) {
        const { data: groupCandidates, error: groupError } =
          await supabaseAdmin
            .from("oh_financial_categories")
            .select("id, metadata")
            .eq("organization_id", auth.context.organizationId)
            .eq("entry_type", entryType)
            .eq("group_name", groupName)
            .eq("active", true)
            .limit(20);

        if (groupError) throw groupError;

        parentId =
          groupCandidates?.find(
            (candidate) =>
              candidate.metadata &&
              typeof candidate.metadata === "object" &&
              !Array.isArray(candidate.metadata) &&
              (candidate.metadata as Record<string, unknown>).isGrouping ===
                true,
          )?.id ?? null;
      }

      const baseSlug = categorySlug(name);
      const { data: slugRows, error: slugError } = await supabaseAdmin
        .from("oh_financial_categories")
        .select("id")
        .eq("organization_id", auth.context.organizationId)
        .eq("entry_type", entryType)
        .eq("slug", baseSlug)
        .limit(1);

      if (slugError) throw slugError;

      const slug =
        slugRows && slugRows.length > 0
          ? `${baseSlug}-${Date.now().toString(36)}`
          : baseSlug;

      const { data: category, error: categoryError } = await supabaseAdmin
        .from("oh_financial_categories")
        .insert({
          organization_id: auth.context.organizationId,
          entry_type: entryType,
          parent_id: parentId,
          name,
          public_name: publicName,
          slug,
          group_name: groupName,
          public_visible: true,
          active: true,
          sort_order: 999,
          metadata: { isGrouping },
          updated_at: new Date().toISOString(),
        })
        .select(
          "id, entry_type, parent_id, name, public_name, slug, group_name, public_visible, active, sort_order, metadata",
        )
        .single();

      if (categoryError) throw categoryError;

      await writeFinancialAudit({
        organizationId: auth.context.organizationId,
        personId,
        action: isGrouping
          ? "agrupamento_financeiro_criado"
          : "categoria_financeira_criada",
        entityType: "oh_financial_categories",
        entityId: category.id,
        afterData: category,
      });

      return NextResponse.json({
        ok: true,
        category,
        message: isGrouping
          ? "Agrupamento criado."
          : "Linha financeira criada.",
      });
    }

    if (action === "replicateMonth") {
      const targetMonth = monthKey(asText(body.targetMonth));
      const mode = asText(body.mode);
      if (!/^\d{4}-\d{2}-01$/.test(targetMonth)) {
        return NextResponse.json({ error: "Informe o mês de destino." }, { status: 400 });
      }
      if (mode !== "last" && mode !== "average") {
        return NextResponse.json({ error: "Escolha replicar o último mês ou a média." }, { status: 400 });
      }
      const count = await replicateMonth({
        organizationId: auth.context.organizationId,
        personId: personId,
        targetMonth,
        mode,
      });
      return NextResponse.json({
        ok: true,
        message: `${count} lançamento(s) replicado(s). Revise os valores e salve antes de finalizar o mês.`,
      });
    }

    if (action === "finalizeMonth") {
      const targetMonth = monthKey(asText(body.targetMonth));
      if (!/^\d{4}-\d{2}-01$/.test(targetMonth)) {
        return NextResponse.json({ error: "Informe o mês a finalizar." }, { status: 400 });
      }
      await finalizeMonth({
        organizationId: auth.context.organizationId,
        personId: personId,
        targetMonth,
      });
      return NextResponse.json({ ok: true, message: "Mês finalizado com sucesso." });
    }

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
      if (amount < 0) {
        return NextResponse.json(
          { error: "Informe um valor igual ou maior que zero." },
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
              created_by: personId,
            })
            .select("*")
            .single();

      const { data: saved, error } = await operation;
      if (error) throw error;

      await writeFinancialAudit({
        organizationId: auth.context.organizationId,
        personId: personId,
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
          approved_by: personId,
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
        personId: personId,
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
        personId: personId,
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

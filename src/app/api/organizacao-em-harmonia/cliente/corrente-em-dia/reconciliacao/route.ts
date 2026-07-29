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

type BankTransaction = {
  id: string;
  transaction_date: string;
  description: string;
  amount: number | string;
  transaction_type: "credito" | "debito";
  account_label: string | null;
  fit_id: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
};

type FinancialEntry = {
  id: string;
  entry_date: string;
  entry_type: "receita" | "despesa";
  description_internal: string;
  amount: number | string;
  status: string;
  category:
    | { id: string; name: string; group_name: string }
    | Array<{ id: string; name: string; group_name: string }>
    | null;
};

function categoryFrom(value: FinancialEntry["category"]) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function dayDistance(left: string, right: string) {
  const first = new Date(`${left.slice(0, 10)}T12:00:00Z`).valueOf();
  const second = new Date(`${right.slice(0, 10)}T12:00:00Z`).valueOf();
  return Math.abs(first - second) / 86_400_000;
}

function normalizedWords(value: string) {
  return new Set(
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 4),
  );
}

function suggestionScore(transaction: BankTransaction, entry: FinancialEntry) {
  const expectedType =
    transaction.transaction_type === "credito" ? "receita" : "despesa";
  if (entry.entry_type !== expectedType) return 0;

  const transactionAmount = asNumber(transaction.amount);
  const entryAmount = asNumber(entry.amount);
  const difference = Math.abs(transactionAmount - entryAmount);
  if (difference > 0.01) return 0;

  const days = dayDistance(transaction.transaction_date, entry.entry_date);
  if (days > 15) return 0;

  let score = 60;
  if (difference <= 0.001) score += 15;
  if (days === 0) score += 20;
  else if (days <= 2) score += 14;
  else if (days <= 7) score += 8;
  else score += 3;

  const transactionWords = normalizedWords(transaction.description);
  const entryWords = normalizedWords(entry.description_internal);
  const sharedWords = Array.from(transactionWords).filter((word) =>
    entryWords.has(word),
  ).length;
  score += Math.min(10, sharedWords * 3);

  return Math.min(100, score);
}

async function ensurePeriod(
  organizationId: string,
  competenceMonth: string,
) {
  const { data, error } = await supabaseAdmin
    .from("oh_financial_periods")
    .upsert(
      {
        organization_id: organizationId,
        competence_month: competenceMonth,
        status: "em_revisao",
        needs_update: false,
        source_label: "Conciliação bancária",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,competence_month" },
    )
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

async function transactionFor(organizationId: string, id: string) {
  const { data, error } = await supabaseAdmin
    .from("oh_bank_transactions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Transação bancária não localizada.");
  return data as BankTransaction;
}

async function entryFor(organizationId: string, id: string) {
  const { data, error } = await supabaseAdmin
    .from("oh_financial_entries")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .neq("status", "cancelado")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Lançamento financeiro não localizado.");
  return data as Record<string, unknown>;
}

async function matchTransaction(input: {
  organizationId: string;
  personId: string | null;
  transaction: BankTransaction;
  entryId: string;
  matchType: string;
  confidence?: number;
}) {
  const entry = await entryFor(input.organizationId, input.entryId);
  const expectedType =
    input.transaction.transaction_type === "credito" ? "receita" : "despesa";

  if (asText(entry.entry_type) !== expectedType) {
    throw new Error("O tipo do lançamento não corresponde ao extrato.");
  }

  if (
    Math.abs(asNumber(entry.amount) - asNumber(input.transaction.amount)) > 0.01
  ) {
    throw new Error("O valor do lançamento não corresponde ao extrato.");
  }

  const { error: matchError } = await supabaseAdmin
    .from("oh_reconciliation_matches")
    .upsert(
      {
        organization_id: input.organizationId,
        bank_transaction_id: input.transaction.id,
        financial_entry_id: input.entryId,
        match_type: input.matchType,
        confidence: input.confidence ?? null,
        status: "confirmado",
        confirmed_by: input.personId,
        confirmed_at: new Date().toISOString(),
      },
      { onConflict: "bank_transaction_id,financial_entry_id" },
    );

  if (matchError) throw matchError;

  const [{ error: transactionError }, { error: entryError }] =
    await Promise.all([
      supabaseAdmin
        .from("oh_bank_transactions")
        .update({ status: "conciliado" })
        .eq("organization_id", input.organizationId)
        .eq("id", input.transaction.id),
      supabaseAdmin
        .from("oh_financial_entries")
        .update({
          status: "confirmado",
          is_provisional: false,
          needs_update: false,
          approved_by: input.personId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", input.organizationId)
        .eq("id", input.entryId),
    ]);

  if (transactionError) throw transactionError;
  if (entryError) throw entryError;

  await writeFinancialAudit({
    organizationId: input.organizationId,
    personId: input.personId,
    action: "transacao_conciliada",
    entityType: "oh_bank_transactions",
    entityId: input.transaction.id,
    afterData: {
      financialEntryId: input.entryId,
      matchType: input.matchType,
      confidence: input.confidence ?? null,
    },
  });
}

export async function GET(request: Request) {
  try {
    const auth = await getFinancialAuthContext(request, "manage");
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const view = asText(url.searchParams.get("view")) || "pendentes";
    const visibleStatuses =
      view === "todos"
        ? ["nao_conciliado", "sugerido", "conciliado", "ignorado"]
        : view === "concluidos"
          ? ["conciliado", "ignorado"]
          : ["nao_conciliado", "sugerido"];
    const allStatuses = [
      "nao_conciliado",
      "sugerido",
      "conciliado",
      "ignorado",
    ];

    const [transactionsResult, entriesResult, categoriesResult, matchesResult] =
      await Promise.all([
        supabaseAdmin
          .from("oh_bank_transactions")
          .select(
            "id, transaction_date, description, amount, transaction_type, account_label, fit_id, status, metadata, created_at",
          )
          .eq("organization_id", auth.context.organizationId)
          .in("status", allStatuses)
          .order("transaction_date", { ascending: false })
          .limit(300),
        supabaseAdmin
          .from("oh_financial_entries")
          .select(
            "id, entry_date, entry_type, description_internal, amount, status, category:oh_financial_categories(id, name, group_name)",
          )
          .eq("organization_id", auth.context.organizationId)
          .neq("status", "cancelado")
          .order("entry_date", { ascending: false })
          .limit(1500),
        supabaseAdmin
          .from("oh_financial_categories")
          .select("id, entry_type, name, group_name, active")
          .eq("organization_id", auth.context.organizationId)
          .eq("active", true)
          .order("entry_type")
          .order("sort_order"),
        supabaseAdmin
          .from("oh_reconciliation_matches")
          .select(
            "bank_transaction_id, financial_entry_id, match_type, confidence, status",
          )
          .eq("organization_id", auth.context.organizationId)
          .eq("status", "confirmado"),
      ]);

    const failure = [
      transactionsResult,
      entriesResult,
      categoriesResult,
      matchesResult,
    ].find((result) => result.error);
    if (failure?.error) throw failure.error;

    const transactions = (transactionsResult.data ?? []) as BankTransaction[];
    const entries = (entriesResult.data ?? []) as FinancialEntry[];
    const matches = matchesResult.data ?? [];

    const visibleTransactions = transactions.filter((transaction) =>
      visibleStatuses.includes(transaction.status),
    );

    const payload = visibleTransactions.map((transaction) => {
      const existingMatch = matches.find(
        (item) => item.bank_transaction_id === transaction.id,
      );
      const matchedEntry = existingMatch
        ? entries.find((item) => item.id === existingMatch.financial_entry_id)
        : null;

      const suggestions = transaction.status === "conciliado"
        ? []
        : entries
            .map((entry) => ({
              entry,
              score: suggestionScore(transaction, entry),
            }))
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map((item) => ({
              id: item.entry.id,
              entryDate: item.entry.entry_date,
              entryType: item.entry.entry_type,
              description: item.entry.description_internal,
              amount: asNumber(item.entry.amount),
              status: item.entry.status,
              category: categoryFrom(item.entry.category),
              score: item.score,
            }));

      return {
        ...transaction,
        amount: asNumber(transaction.amount),
        matchedEntry: matchedEntry
          ? {
              id: matchedEntry.id,
              entryDate: matchedEntry.entry_date,
              description: matchedEntry.description_internal,
              amount: asNumber(matchedEntry.amount),
              category: categoryFrom(matchedEntry.category),
            }
          : null,
        suggestions,
      };
    });

    return NextResponse.json({
      transactions: payload,
      categories: categoriesResult.data ?? [],
      summary: {
        pending: transactions.filter((item) =>
          ["nao_conciliado", "sugerido"].includes(item.status),
        ).length,
        reconciled: transactions.filter(
          (item) => item.status === "conciliado",
        ).length,
        ignored: transactions.filter((item) => item.status === "ignorado")
          .length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao carregar a conciliação.",
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
    const transactionId = asText(body.transactionId);

    if (!transactionId) {
      return NextResponse.json(
        { error: "Informe a transação bancária." },
        { status: 400 },
      );
    }

    const transaction = await transactionFor(
      auth.context.organizationId,
      transactionId,
    );

    if (action === "match") {
      const entryId = asText(body.entryId);
      if (!entryId) {
        return NextResponse.json(
          { error: "Selecione o lançamento correspondente." },
          { status: 400 },
        );
      }

      await matchTransaction({
        organizationId: auth.context.organizationId,
        personId: auth.context.personId,
        transaction,
        entryId,
        matchType: "manual",
        confidence: Math.max(0, Math.min(100, asNumber(body.confidence))),
      });

      return NextResponse.json({
        ok: true,
        message: "Transação conciliada com o lançamento existente.",
      });
    }

    if (action === "createEntry") {
      const entryType =
        transaction.transaction_type === "credito" ? "receita" : "despesa";
      const entryDate = transaction.transaction_date.slice(0, 10);
      const competenceMonth = monthKey(entryDate);
      const periodId = await ensurePeriod(
        auth.context.organizationId,
        competenceMonth,
      );
      const description =
        asText(body.descriptionInternal) || transaction.description;

      const { data: entry, error: entryError } = await supabaseAdmin
        .from("oh_financial_entries")
        .upsert(
          {
            organization_id: auth.context.organizationId,
            period_id: periodId,
            category_id: asText(body.categoryId) || null,
            entry_type: entryType,
            entry_date: entryDate,
            competence_month: competenceMonth,
            description_internal: description,
            description_public: asText(body.descriptionPublic) || description,
            amount: Math.abs(asNumber(transaction.amount)),
            payment_method: asText(body.paymentMethod) || null,
            financial_account: transaction.account_label,
            counterparty_name: asText(body.counterpartyName) || null,
            source_type: "extrato_bancario",
            source_reference: `bank:${transaction.id}`,
            status: "confirmado",
            is_provisional: false,
            needs_update: false,
            public_visible: asBoolean(body.publicVisible, true),
            notes_internal: asText(body.notesInternal) || null,
            metadata: {
              bankTransactionId: transaction.id,
              fitId: transaction.fit_id,
            },
            created_by: auth.context.personId,
            approved_by: auth.context.personId,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict:
              "organization_id,source_type,source_reference",
          },
        )
        .select("id")
        .single();

      if (entryError) throw entryError;

      await matchTransaction({
        organizationId: auth.context.organizationId,
        personId: auth.context.personId,
        transaction,
        entryId: entry.id,
        matchType: "criado_do_extrato",
        confidence: 100,
      });

      return NextResponse.json({
        ok: true,
        entryId: entry.id,
        message: "Lançamento criado e conciliado.",
      });
    }

    if (action === "ignore") {
      const { error } = await supabaseAdmin
        .from("oh_bank_transactions")
        .update({ status: "ignorado" })
        .eq("organization_id", auth.context.organizationId)
        .eq("id", transactionId);
      if (error) throw error;

      await writeFinancialAudit({
        organizationId: auth.context.organizationId,
        personId: auth.context.personId,
        action: "transacao_ignorada",
        entityType: "oh_bank_transactions",
        entityId: transactionId,
        afterData: { justification: asText(body.justification) || null },
      });

      return NextResponse.json({
        ok: true,
        message: "Transação removida da fila de conciliação.",
      });
    }

    if (action === "reopen") {
      const { error: deleteError } = await supabaseAdmin
        .from("oh_reconciliation_matches")
        .delete()
        .eq("organization_id", auth.context.organizationId)
        .eq("bank_transaction_id", transactionId);
      if (deleteError) throw deleteError;

      const { error: transactionError } = await supabaseAdmin
        .from("oh_bank_transactions")
        .update({ status: "nao_conciliado" })
        .eq("organization_id", auth.context.organizationId)
        .eq("id", transactionId);
      if (transactionError) throw transactionError;

      await writeFinancialAudit({
        organizationId: auth.context.organizationId,
        personId: auth.context.personId,
        action: "conciliacao_reaberta",
        entityType: "oh_bank_transactions",
        entityId: transactionId,
      });

      return NextResponse.json({
        ok: true,
        message: "Transação devolvida para a fila de conciliação.",
      });
    }

    throw new Error("Ação não reconhecida.");
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao atualizar a conciliação.",
      },
      { status: 500 },
    );
  }
}

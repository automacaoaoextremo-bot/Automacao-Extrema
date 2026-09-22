"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CaixaClaroHeader } from "@/components/caixa-claro/caixa-claro-header";
import { CaixaClaroModal } from "@/components/caixa-claro/caixa-claro-modal";
import { parseBtgStatement } from "@/lib/caixa-claro-btg-import";
import {
  CAIXA_CLARO_LOGIN,
  CaixaTransaction,
  FamilyAccount,
  FamilyMember,
  formatMoney,
  formatShortDate,
  IncomeEvent,
  monthKey,
  PlannedItem,
  ReconciliationAllocation,
  ReconciliationMethod,
  safeFileName,
  toCents,
  TransactionKind,
} from "@/lib/caixa-claro";
import { suggestIncomeReconciliations } from "@/lib/caixa-claro-reconciliation";
import { supabaseBrowser } from "@/lib/supabase-browser";

type ModalKey =
  | "movements"
  | "income"
  | "agenda"
  | "documents"
  | "family"
  | "analytics"
  | "reconciliation"
  | "help"
  | "access"
  | null;

type FamilyInfo = { id: string; name: string; slug: string };
type DocumentItem = {
  id: string;
  member_id: string | null;
  document_type: string;
  original_name: string;
  created_at: string;
};

type BalanceSnapshot = {
  id: string;
  account_id: string;
  snapshot_date: string;
  balance_cents: number;
};

const kindLabel: Record<TransactionKind, string> = {
  income: "Receita",
  expense: "Despesa",
  transfer: "Transferência",
  uncategorized: "Revisar",
};

const reconciliationLabel: Record<ReconciliationMethod, string> = {
  direct_credit: "Crédito direto do salário/benefício",
  pix_bridge: "PIX ponte para o BTG",
  source_bank_credit: "Crédito confirmado no banco de origem",
  manual: "Confirmação manual",
  split: "Uma renda em vários PIX",
  combined: "Um crédito reúne mais de uma renda",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function plusDays(days: number) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value;
}

function inputClass() {
  return "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#00A8CC] focus:ring-2 focus:ring-[#00A8CC]/15";
}

function buttonClass(secondary = false) {
  return secondary
    ? "rounded-xl border border-[#00334E]/20 bg-white px-4 py-2.5 text-sm font-black text-[#00334E] hover:bg-slate-50"
    : "rounded-xl bg-[#00334E] px-4 py-2.5 text-sm font-black text-white hover:bg-[#004c73]";
}

export function CaixaClaroDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeModal, setActiveModal] = useState<ModalKey>(null);
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [family, setFamily] = useState<FamilyInfo | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [accounts, setAccounts] = useState<FamilyAccount[]>([]);
  const [transactions, setTransactions] = useState<CaixaTransaction[]>([]);
  const [incomeEvents, setIncomeEvents] = useState<IncomeEvent[]>([]);
  const [plannedItems, setPlannedItems] = useState<PlannedItem[]>([]);
  const [reconciliations, setReconciliations] = useState<ReconciliationAllocation[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [balances, setBalances] = useState<BalanceSnapshot[]>([]);

  const loadData = useCallback(async () => {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    setLoading(true);
    setError("");
    const user = sessionData.session?.user;
    if (!user) {
      router.replace(CAIXA_CLARO_LOGIN);
      return;
    }

    const { data: currentMember, error: memberError } = await supabaseBrowser
      .from("cc_family_members")
      .select("id,family_id,auth_user_id,full_name,display_name,email,role,active")
      .eq("auth_user_id", user.id)
      .eq("active", true)
      .maybeSingle();

    if (memberError) {
      setError(`Não foi possível validar seu acesso: ${memberError.message}`);
      setLoading(false);
      return;
    }

    if (!currentMember) {
      setError(
        `Seu login (${user.email ?? "sem e-mail"}) existe no Supabase, mas ainda não está vinculado a um membro da família SilvaMattano. Faça o vínculo conforme o passo a passo de implantação.`,
      );
      setLoading(false);
      return;
    }

    const current = currentMember as FamilyMember;
    setMember(current);

    const [familyResult, membersResult, accountsResult, txResult, incomeResult, plannedResult, recResult, docsResult, balanceResult] =
      await Promise.all([
        supabaseBrowser.from("cc_families").select("id,name,slug").eq("id", current.family_id).single(),
        supabaseBrowser
          .from("cc_family_members")
          .select("id,family_id,auth_user_id,full_name,display_name,email,role,active")
          .eq("family_id", current.family_id)
          .eq("active", true)
          .order("full_name"),
        supabaseBrowser
          .from("cc_accounts")
          .select("id,family_id,owner_member_id,institution,nickname,kind,current_balance_cents,include_in_cash,active")
          .eq("family_id", current.family_id)
          .eq("active", true)
          .order("nickname"),
        supabaseBrowser
          .from("cc_transactions")
          .select("id,family_id,account_id,member_id,occurred_at,category_raw,transaction_raw,description,amount_cents,kind,external_hash,notes")
          .eq("family_id", current.family_id)
          .order("occurred_at", { ascending: false })
          .limit(600),
        supabaseBrowser
          .from("cc_income_events")
          .select("id,family_id,member_id,source_name,source_type,competence_date,expected_date,net_cents,received_cents,status,notes")
          .eq("family_id", current.family_id)
          .order("competence_date", { ascending: false })
          .limit(200),
        supabaseBrowser
          .from("cc_planned_items")
          .select("id,family_id,member_id,title,direction,amount_cents,due_date,status,notes")
          .eq("family_id", current.family_id)
          .order("due_date", { ascending: true })
          .limit(200),
        supabaseBrowser
          .from("cc_reconciliation_allocations")
          .select("id,family_id,income_event_id,transaction_id,amount_cents,method,note,created_at")
          .eq("family_id", current.family_id)
          .order("created_at", { ascending: false })
          .limit(500),
        supabaseBrowser
          .from("cc_documents")
          .select("id,member_id,document_type,original_name,created_at")
          .eq("family_id", current.family_id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabaseBrowser
          .from("cc_balance_snapshots")
          .select("id,account_id,snapshot_date,balance_cents")
          .eq("family_id", current.family_id)
          .order("snapshot_date", { ascending: false })
          .limit(300),
      ]);

    const firstError = [familyResult, membersResult, accountsResult, txResult, incomeResult, plannedResult, recResult, docsResult, balanceResult]
      .map((result) => result.error)
      .find(Boolean);

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setFamily(familyResult.data as FamilyInfo);
    setMembers((membersResult.data ?? []) as FamilyMember[]);
    setAccounts((accountsResult.data ?? []) as FamilyAccount[]);
    setTransactions((txResult.data ?? []) as CaixaTransaction[]);
    setIncomeEvents((incomeResult.data ?? []) as IncomeEvent[]);
    setPlannedItems((plannedResult.data ?? []) as PlannedItem[]);
    setReconciliations((recResult.data ?? []) as ReconciliationAllocation[]);
    setDocuments((docsResult.data ?? []) as DocumentItem[]);
    setBalances((balanceResult.data ?? []) as BalanceSnapshot[]);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve().then(() => {
      if (!cancelled) {
        void loadData();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadData]);

  const summary = useMemo(() => {
    const currentMonth = monthKey(new Date());
    const reconciledTransactionIds = new Set(reconciliations.map((item) => item.transaction_id));
    const cashBalance = accounts
      .filter((account) => account.include_in_cash)
      .reduce((sum, account) => sum + account.current_balance_cents, 0);

    const recognizedIncome = incomeEvents
      .filter((income) => monthKey(income.competence_date) === currentMonth && income.status !== "canceled")
      .reduce((sum, income) => sum + Math.max(0, income.received_cents), 0);

    const standaloneIncome = transactions
      .filter(
        (tx) =>
          tx.kind === "income" &&
          monthKey(tx.occurred_at) === currentMonth &&
          !reconciledTransactionIds.has(tx.id),
      )
      .reduce((sum, tx) => sum + Math.max(0, tx.amount_cents), 0);

    const monthExpenses = transactions
      .filter((tx) => tx.kind === "expense" && monthKey(tx.occurred_at) === currentMonth)
      .reduce((sum, tx) => sum + Math.abs(tx.amount_cents), 0);

    const limit = plusDays(30);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futurePlanned = plannedItems
      .filter((item) => {
        const due = new Date(`${item.due_date}T12:00:00`);
        return item.status !== "canceled" && item.status !== "paid" && due >= today && due <= limit;
      })
      .reduce((sum, item) => sum + (item.direction === "income" ? item.amount_cents : -item.amount_cents), 0);

    const expectedIncomes = incomeEvents
      .filter((income) => {
        if (income.status !== "expected" || !income.expected_date) return false;
        const expected = new Date(`${income.expected_date}T12:00:00`);
        return expected >= today && expected <= limit;
      })
      .reduce((sum, income) => sum + Math.max(0, income.net_cents - income.received_cents), 0);

    const upcoming = plannedItems.filter((item) => {
      const due = new Date(`${item.due_date}T12:00:00`);
      return item.status !== "canceled" && item.status !== "paid" && due <= plusDays(7);
    }).length;

    const pendingIncome = incomeEvents.filter((income) => income.status === "expected" || income.status === "partial").length;
    const reviewTransfers = transactions.filter((tx) => tx.kind === "transfer" && tx.amount_cents > 0).length;

    return {
      cashBalance,
      monthIncome: recognizedIncome + standaloneIncome,
      monthExpenses,
      projected30: cashBalance + futurePlanned + expectedIncomes,
      actionCount: upcoming + pendingIncome + reviewTransfers,
    };
  }, [accounts, incomeEvents, plannedItems, reconciliations, transactions]);

  async function signOut() {
    await supabaseBrowser.auth.signOut();
    router.replace(CAIXA_CLARO_LOGIN);
  }

  if (loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#00334E] px-4 text-white">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#31C16B]">Caixa Claro</p>
          <p className="mt-3 text-lg font-bold">Carregando o caixa da família…</p>
        </div>
      </main>
    );
  }

  if (error || !member || !family) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-slate-100 px-4">
        <section className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
          <h1 className="text-2xl font-black text-[#00334E]">Acesso ao Caixa Claro</h1>
          <p className="mt-4 leading-7 text-slate-700">{error || "Não foi possível identificar seu cadastro."}</p>
          <div className="mt-6 flex gap-3">
            <button type="button" className={buttonClass()} onClick={() => void loadData()}>
              Tentar novamente
            </button>
            <button type="button" className={buttonClass(true)} onClick={() => void signOut()}>
              Sair
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-slate-100">
      <CaixaClaroHeader
        familyName={family.name}
        memberName={member.display_name || member.full_name}
        onHome={() => setActiveModal(null)}
        onHelp={() => setActiveModal("help")}
        onAccess={() => setActiveModal("access")}
        onSignOut={() => void signOut()}
      />

      <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-2 overflow-hidden px-2 py-2 sm:gap-3 sm:px-4 sm:py-3">
        {(message || error) && (
          <div className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${error ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
            {error || message}
          </div>
        )}

        <section className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <MetricCard label="Saldo em caixa" value={formatMoney(summary.cashBalance)} tone="blue" />
          <MetricCard label="Receitas do mês" value={formatMoney(summary.monthIncome)} tone="green" />
          <MetricCard label="Despesas do mês" value={formatMoney(summary.monthExpenses)} tone="orange" />
          <MetricCard label="Projeção 30 dias" value={formatMoney(summary.projected30)} tone={summary.projected30 >= 0 ? "cyan" : "red"} />
        </section>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white p-3 shadow-sm sm:rounded-3xl sm:p-4">
          <div className="flex shrink-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#00A8CC] sm:text-xs">Esta semana</p>
              <h1 className="truncate text-lg font-black text-[#00334E] sm:text-2xl">Clareza antes da decisão</h1>
            </div>
            <button
              type="button"
              onClick={() => setActiveModal("agenda")}
              className="shrink-0 rounded-xl bg-[#31C16B]/15 px-3 py-2 text-xs font-black text-[#00334E] sm:text-sm"
            >
              {summary.actionCount} ações
            </button>
          </div>

          <div className="mt-3 grid min-h-0 flex-1 grid-cols-2 grid-rows-3 gap-2 sm:mt-4 sm:grid-cols-3 sm:grid-rows-2 sm:gap-3">
            <ModuleButton title="Movimentos" subtitle="Extrato, contas e classificação" onClick={() => setActiveModal("movements")} />
            <ModuleButton title="Rendas" subtitle="Holerites, INSS e recebido" onClick={() => setActiveModal("income")} />
            <ModuleButton title="Conciliação" subtitle="PIX ponte sem duplicar renda" onClick={() => setActiveModal("reconciliation")} accent />
            <ModuleButton title="Agenda" subtitle="Contas e compromissos futuros" onClick={() => setActiveModal("agenda")} />
            <ModuleButton title="Documentos" subtitle="Arquivos privados por membro" onClick={() => setActiveModal("documents")} />
            <ModuleButton title="Família / Análises" subtitle="Membros, contas e visão geral" onClick={() => setActiveModal("family")} onSecondary={() => setActiveModal("analytics")} />
          </div>
        </section>
      </main>

      <MovementsModal
        open={activeModal === "movements"}
        onClose={() => setActiveModal(null)}
        family={family}
        member={member}
        members={members}
        accounts={accounts}
        transactions={transactions}
        balances={balances}
        onChanged={loadData}
        setMessage={setMessage}
        setError={setError}
      />
      <IncomeModal
        open={activeModal === "income"}
        onClose={() => setActiveModal(null)}
        family={family}
        members={members}
        incomes={incomeEvents}
        onChanged={loadData}
        setMessage={setMessage}
        setError={setError}
      />
      <ReconciliationModal
        open={activeModal === "reconciliation"}
        onClose={() => setActiveModal(null)}
        family={family}
        incomes={incomeEvents}
        transactions={transactions}
        reconciliations={reconciliations}
        onChanged={loadData}
        setMessage={setMessage}
        setError={setError}
      />
      <AgendaModal
        open={activeModal === "agenda"}
        onClose={() => setActiveModal(null)}
        family={family}
        members={members}
        items={plannedItems}
        onChanged={loadData}
        setMessage={setMessage}
        setError={setError}
      />
      <DocumentsModal
        open={activeModal === "documents"}
        onClose={() => setActiveModal(null)}
        family={family}
        members={members}
        documents={documents}
        onChanged={loadData}
        setMessage={setMessage}
        setError={setError}
      />
      <FamilyModal open={activeModal === "family"} onClose={() => setActiveModal(null)} members={members} accounts={accounts} />
      <AnalyticsModal open={activeModal === "analytics"} onClose={() => setActiveModal(null)} transactions={transactions} incomes={incomeEvents} />
      <HelpModal open={activeModal === "help"} onClose={() => setActiveModal(null)} />
      <AccessModal open={activeModal === "access"} onClose={() => setActiveModal(null)} />
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: "blue" | "green" | "orange" | "cyan" | "red" }) {
  const tones = {
    blue: "border-[#00334E]/15 bg-white text-[#00334E]",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
    orange: "border-amber-200 bg-amber-50 text-amber-950",
    cyan: "border-cyan-200 bg-cyan-50 text-cyan-950",
    red: "border-rose-200 bg-rose-50 text-rose-950",
  };
  return (
    <article className={`rounded-2xl border p-2.5 shadow-sm sm:p-4 ${tones[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-wide opacity-70 sm:text-xs">{label}</p>
      <p className="mt-1 truncate text-base font-black sm:mt-2 sm:text-xl">{value}</p>
    </article>
  );
}

function ModuleButton({ title, subtitle, onClick, onSecondary, accent = false }: { title: string; subtitle: string; onClick: () => void; onSecondary?: () => void; accent?: boolean }) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2.5 sm:p-4">
      <button type="button" onClick={onClick} className="flex min-h-0 flex-1 flex-col text-left">
        <span className={`text-sm font-black sm:text-lg ${accent ? "text-[#00A8CC]" : "text-[#00334E]"}`}>{title}</span>
        <span className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-600 sm:text-xs sm:leading-5">{subtitle}</span>
      </button>
      {onSecondary ? (
        <button type="button" onClick={onSecondary} className="mt-1 shrink-0 text-left text-[10px] font-black text-[#00A8CC] underline sm:text-xs">
          Abrir análises
        </button>
      ) : null}
    </div>
  );
}

function MovementsModal({
  open,
  onClose,
  family,
  member,
  members,
  accounts,
  transactions,
  onChanged,
  setMessage,
  setError,
}: {
  open: boolean;
  onClose: () => void;
  family: FamilyInfo;
  member: FamilyMember;
  members: FamilyMember[];
  accounts: FamilyAccount[];
  transactions: CaixaTransaction[];
  balances: BalanceSnapshot[];
  onChanged: () => Promise<void>;
  setMessage: (value: string) => void;
  setError: (value: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [accountId, setAccountId] = useState("");
  const [importing, setImporting] = useState(false);
  const [institution, setInstitution] = useState("");
  const [nickname, setNickname] = useState("");
  const [accountKind, setAccountKind] = useState<FamilyAccount["kind"]>("checking");
  const [ownerMemberId, setOwnerMemberId] = useState(member.id);
  const [includeInCash, setIncludeInCash] = useState(true);
  const [openingBalance, setOpeningBalance] = useState("");

  const selectedAccountId = accounts.some((account) => account.id === accountId)
    ? accountId
    : (accounts[0]?.id ?? "");

  async function importBtg() {
    if (!file || !selectedAccountId) return;
    setImporting(true);
    setError("");
    setMessage("");
    try {
      const parsed = await parseBtgStatement(file);
      const { data: batch, error: batchError } = await supabaseBrowser
        .from("cc_import_batches")
        .insert({
          family_id: family.id,
          account_id: selectedAccountId,
          imported_by_member_id: member.id,
          source: "btg_xlsx",
          original_name: file.name,
          row_count: parsed.transactions.length,
          metadata: {
            holderName: parsed.holderName,
            statementPeriod: parsed.statementPeriod,
            ignoredRows: parsed.ignoredRows,
          },
        })
        .select("id")
        .single();
      if (batchError) throw batchError;

      for (let index = 0; index < parsed.transactions.length; index += 150) {
        const chunk = parsed.transactions.slice(index, index + 150).map((tx) => ({
          family_id: family.id,
          account_id: selectedAccountId,
          import_batch_id: batch.id,
          occurred_at: tx.occurredAt,
          category_raw: tx.categoryRaw,
          transaction_raw: tx.transactionRaw,
          description: tx.description,
          amount_cents: tx.amountCents,
          kind: tx.kind,
          external_hash: tx.externalHash,
        }));
        const { error: insertError } = await supabaseBrowser
          .from("cc_transactions")
          .upsert(chunk, { onConflict: "family_id,account_id,external_hash", ignoreDuplicates: true });
        if (insertError) throw insertError;
      }

      if (parsed.balances.length) {
        const rows = parsed.balances.map((snapshot) => ({
          family_id: family.id,
          account_id: selectedAccountId,
          import_batch_id: batch.id,
          snapshot_date: snapshot.snapshotDate,
          balance_cents: snapshot.balanceCents,
        }));
        const { error: balanceError } = await supabaseBrowser
          .from("cc_balance_snapshots")
          .upsert(rows, { onConflict: "family_id,account_id,snapshot_date" });
        if (balanceError) throw balanceError;

        const latest = [...parsed.balances].sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate))[0];
        const { error: updateError } = await supabaseBrowser
          .from("cc_accounts")
          .update({ current_balance_cents: latest.balanceCents })
          .eq("id", selectedAccountId);
        if (updateError) throw updateError;
      }

      setMessage(`Extrato importado: ${parsed.transactions.length} movimentos e ${parsed.balances.length} saldos diários. Linhas repetidas são ignoradas pelo hash do lançamento.`);
      setFile(null);
      await onChanged();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Falha ao importar o extrato BTG.");
    } finally {
      setImporting(false);
    }
  }

  async function addAccount(event: FormEvent) {
    event.preventDefault();
    setError("");
    const { error: insertError } = await supabaseBrowser.from("cc_accounts").insert({
      family_id: family.id,
      owner_member_id: ownerMemberId || null,
      institution: institution.trim(),
      nickname: nickname.trim(),
      kind: accountKind,
      current_balance_cents: toCents(openingBalance),
      include_in_cash: includeInCash && accountKind !== "credit_card",
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setInstitution("");
    setNickname("");
    setOpeningBalance("");
    setMessage("Conta adicionada. Ela já pode receber extratos e participar do saldo familiar.");
    await onChanged();
  }

  async function classifyTransaction(transactionId: string, kind: TransactionKind) {
    const { error: updateError } = await supabaseBrowser.from("cc_transactions").update({ kind }).eq("id", transactionId);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await onChanged();
  }

  return (
    <CaixaClaroModal open={open} title="Movimentos e contas" subtitle="Importe o extrato BTG, cadastre outros bancos e revise o que é renda, despesa ou transferência." onClose={onClose}>
      <div className="space-y-6">
        <section className="rounded-2xl bg-cyan-50 p-4">
          <h3 className="font-black text-[#00334E]">Importar extrato BTG em XLSX</h3>
          <p className="mt-1 text-sm leading-6 text-slate-700">O importador localiza as colunas “Data e hora”, “Categoria”, “Transação”, “Descrição” e “Valor”. Linhas “Saldo Diário” viram snapshots de saldo e não despesas/receitas.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <select className={inputClass()} value={selectedAccountId} onChange={(event) => setAccountId(event.target.value)}>
              <option value="">Escolha a conta</option>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.nickname} · {account.institution}</option>)}
            </select>
            <input className={inputClass()} type="file" accept=".xlsx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </div>
          <button type="button" disabled={!file || !selectedAccountId || importing} onClick={() => void importBtg()} className={`${buttonClass()} mt-3 disabled:cursor-not-allowed disabled:opacity-50`}>
            {importing ? "Importando…" : "Importar extrato"}
          </button>
        </section>

        <section>
          <h3 className="font-black text-[#00334E]">Adicionar outra conta</h3>
          <p className="mt-1 text-sm text-slate-600">Cadastre também o banco onde o salário é depositado. Isso permite conciliação direta quando um extrato desse banco estiver disponível.</p>
          <form onSubmit={addAccount} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input required className={inputClass()} value={institution} onChange={(event) => setInstitution(event.target.value)} placeholder="Banco / instituição" />
            <input required className={inputClass()} value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="Apelido da conta" />
            <select className={inputClass()} value={ownerMemberId} onChange={(event) => setOwnerMemberId(event.target.value)}>
              <option value="">Conta familiar compartilhada</option>
              {members.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}
            </select>
            <select className={inputClass()} value={accountKind} onChange={(event) => setAccountKind(event.target.value as FamilyAccount["kind"])}>
              <option value="checking">Conta corrente</option>
              <option value="savings">Poupança</option>
              <option value="credit_card">Cartão</option>
              <option value="investment">Investimentos</option>
              <option value="wallet">Carteira</option>
              <option value="other">Outra</option>
            </select>
            <input className={inputClass()} value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} placeholder="Saldo inicial (opcional)" inputMode="decimal" />
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={includeInCash && accountKind !== "credit_card"} disabled={accountKind === "credit_card"} onChange={(event) => setIncludeInCash(event.target.checked)} />
              Incluir no saldo em caixa
            </label>
            <button className={`${buttonClass()} sm:col-span-2`} type="submit">Adicionar conta</button>
          </form>
        </section>

        <section>
          <h3 className="font-black text-[#00334E]">Últimos movimentos</h3>
          <div className="mt-3 space-y-2">
            {transactions.slice(0, 18).map((tx) => (
              <article key={tx.id} className="rounded-2xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{tx.description}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatShortDate(tx.occurred_at)} · {tx.transaction_raw || tx.category_raw || "sem categoria"}</p>
                  </div>
                  <p className={`shrink-0 font-black ${tx.amount_cents < 0 ? "text-rose-700" : "text-emerald-700"}`}>{formatMoney(tx.amount_cents)}</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(["income", "expense", "transfer", "uncategorized"] as TransactionKind[]).map((kind) => (
                    <button key={kind} type="button" onClick={() => void classifyTransaction(tx.id, kind)} className={`rounded-full px-2.5 py-1 text-[10px] font-black ${tx.kind === kind ? "bg-[#00334E] text-white" : "bg-slate-100 text-slate-600"}`}>
                      {kindLabel[kind]}
                    </button>
                  ))}
                </div>
              </article>
            ))}
            {!transactions.length ? <p className="text-sm text-slate-500">Nenhum movimento importado ainda.</p> : null}
          </div>
        </section>
      </div>
    </CaixaClaroModal>
  );
}

function IncomeModal({ open, onClose, family, members, incomes, onChanged, setMessage, setError }: {
  open: boolean;
  onClose: () => void;
  family: FamilyInfo;
  members: FamilyMember[];
  incomes: IncomeEvent[];
  onChanged: () => Promise<void>;
  setMessage: (value: string) => void;
  setError: (value: string) => void;
}) {
  const [memberId, setMemberId] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceType, setSourceType] = useState<IncomeEvent["source_type"]>("salary");
  const [competence, setCompetence] = useState(firstDayOfMonth());
  const [expectedDate, setExpectedDate] = useState(todayIso());
  const [netValue, setNetValue] = useState("");
  const [status, setStatus] = useState<IncomeEvent["status"]>("expected");

  const selectedMemberId = members.some((item) => item.id === memberId)
    ? memberId
    : (members[0]?.id ?? "");

  async function addIncome(event: FormEvent) {
    event.preventDefault();
    const cents = toCents(netValue);
    if (!selectedMemberId || !sourceName.trim() || cents <= 0) return;
    const { error: insertError } = await supabaseBrowser.from("cc_income_events").insert({
      family_id: family.id,
      member_id: selectedMemberId,
      source_name: sourceName.trim(),
      source_type: sourceType,
      competence_date: competence,
      expected_date: expectedDate || null,
      net_cents: cents,
      received_cents: status === "received" ? cents : 0,
      status,
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSourceName("");
    setNetValue("");
    setStatus("expected");
    setMessage("Renda registrada. Se o valor entrou em outro banco e depois veio por PIX ao BTG, faça a conciliação pelo método “PIX ponte”.");
    await onChanged();
  }

  async function markIncomeReceived(income: IncomeEvent) {
    const { error: updateError } = await supabaseBrowser
      .from("cc_income_events")
      .update({ status: "received", received_cents: income.net_cents })
      .eq("id", income.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMessage("Renda confirmada como recebida. Um PIX posterior ao BTG deve ser conciliado como transferência interna, não como uma nova renda.");
    await onChanged();
  }

  return (
    <CaixaClaroModal open={open} title="Rendas da família" subtitle="Registre o valor líquido do holerite, INSS ou outra renda. O depósito pode ocorrer fora do BTG." onClose={onClose}>
      <form onSubmit={addIncome} className="grid gap-3 sm:grid-cols-2">
        <select required className={inputClass()} value={selectedMemberId} onChange={(event) => setMemberId(event.target.value)}>
          <option value="">Membro da família</option>
          {members.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}
        </select>
        <select className={inputClass()} value={sourceType} onChange={(event) => setSourceType(event.target.value as IncomeEvent["source_type"])}>
          <option value="salary">Salário / holerite</option>
          <option value="inss">INSS</option>
          <option value="benefit">Benefício</option>
          <option value="freelance">Autônomo / extra</option>
          <option value="other">Outra renda</option>
        </select>
        <input required className={inputClass()} value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="Origem: empresa, INSS, cliente…" />
        <input required className={inputClass()} value={netValue} onChange={(event) => setNetValue(event.target.value)} placeholder="Valor líquido (ex.: 5.000,00)" inputMode="decimal" />
        <label className="text-xs font-bold text-slate-600">Competência<input required className={`${inputClass()} mt-1`} type="date" value={competence} onChange={(event) => setCompetence(event.target.value)} /></label>
        <label className="text-xs font-bold text-slate-600">Data prevista/recebida<input className={`${inputClass()} mt-1`} type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} /></label>
        <select className={inputClass()} value={status} onChange={(event) => setStatus(event.target.value as IncomeEvent["status"])}>
          <option value="expected">Prevista</option>
          <option value="received">Recebida (confirmação manual)</option>
          <option value="partial">Parcial</option>
          <option value="canceled">Cancelada</option>
        </select>
        <button className={buttonClass()} type="submit">Salvar renda</button>
      </form>

      <div className="mt-6 space-y-2">
        <h3 className="font-black text-[#00334E]">Histórico</h3>
        {incomes.slice(0, 24).map((income) => {
          const person = members.find((item) => item.id === income.member_id);
          return (
            <article key={income.id} className="rounded-2xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{income.source_name}</p>
                  <p className="mt-1 text-xs text-slate-500">{person?.display_name || person?.full_name || "Membro"} · comp. {formatShortDate(income.competence_date)} · {income.status}</p>
                </div>
                <p className="shrink-0 font-black text-emerald-700">{formatMoney(income.net_cents)}</p>
              </div>
              {income.status !== "received" && income.status !== "canceled" ? (
                <button type="button" onClick={() => void markIncomeReceived(income)} className="mt-2 text-xs font-black text-[#00A8CC] underline underline-offset-2">
                  Confirmar renda recebida
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </CaixaClaroModal>
  );
}

function ReconciliationModal({ open, onClose, family, incomes, transactions, reconciliations, onChanged, setMessage, setError }: {
  open: boolean;
  onClose: () => void;
  family: FamilyInfo;
  incomes: IncomeEvent[];
  transactions: CaixaTransaction[];
  reconciliations: ReconciliationAllocation[];
  onChanged: () => Promise<void>;
  setMessage: (value: string) => void;
  setError: (value: string) => void;
}) {
  const [incomeId, setIncomeId] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [method, setMethod] = useState<ReconciliationMethod>("pix_bridge");
  const [amount, setAmount] = useState("");
  const allocatedPairs = useMemo(() => new Set(reconciliations.map((item) => `${item.income_event_id}:${item.transaction_id}`)), [reconciliations]);
  const suggestions = useMemo(
    () => suggestIncomeReconciliations(incomes, transactions).filter((item) => !allocatedPairs.has(`${item.incomeEventId}:${item.transactionId}`)).slice(0, 12),
    [allocatedPairs, incomes, transactions],
  );

  async function reconcile(selectedIncomeId = incomeId, selectedTransactionId = transactionId, selectedMethod = method, selectedCents?: number) {
    const income = incomes.find((item) => item.id === selectedIncomeId);
    const tx = transactions.find((item) => item.id === selectedTransactionId);
    if (!income || !tx) return;
    const cents = selectedCents ?? (toCents(amount) || Math.min(income.net_cents, Math.abs(tx.amount_cents)));
    if (cents <= 0) return;

    const { error: insertError } = await supabaseBrowser.from("cc_reconciliation_allocations").insert({
      family_id: family.id,
      income_event_id: income.id,
      transaction_id: tx.id,
      amount_cents: cents,
      method: selectedMethod,
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }

    const isReceiptEvidence = selectedMethod === "direct_credit" || selectedMethod === "source_bank_credit" || selectedMethod === "manual";
    if (isReceiptEvidence) {
      const evidenceMethods: ReconciliationMethod[] = ["direct_credit", "source_bank_credit", "manual"];
      const already = reconciliations
        .filter((item) => item.income_event_id === income.id && evidenceMethods.includes(item.method))
        .reduce((sum, item) => sum + item.amount_cents, 0);
      const received = Math.min(income.net_cents, already + cents);
      const { error: incomeError } = await supabaseBrowser
        .from("cc_income_events")
        .update({ received_cents: received, status: received >= income.net_cents ? "received" : "partial" })
        .eq("id", income.id);
      if (incomeError) {
        setError(incomeError.message);
        return;
      }
    }

    const txKind: TransactionKind = selectedMethod === "pix_bridge" || selectedMethod === "split" || selectedMethod === "combined" ? "transfer" : "income";
    await supabaseBrowser.from("cc_transactions").update({ kind: txKind }).eq("id", tx.id);

    setMessage(selectedMethod === "pix_bridge" || selectedMethod === "split" || selectedMethod === "combined"
      ? "Conciliação salva. O PIX continua como transferência interna e não altera sozinho o valor de renda recebida. Confirme a renda em Rendas ou pelo extrato do banco de origem."
      : "Conciliação salva. O crédito foi usado como evidência do recebimento da renda sem duplicar o total familiar.");
    setAmount("");
    await onChanged();
  }

  return (
    <CaixaClaroModal open={open} title="Conciliação de rendas" subtitle="O salário pode cair em outro banco e chegar ao BTG por PIX. O Caixa Claro separa “renda” de “movimentação entre suas próprias contas”." onClose={onClose}>
      <section className="rounded-2xl bg-[#00334E] p-4 text-white">
        <h3 className="font-black text-[#31C16B]">Regra para o caso SilvaMattano</h3>
        <p className="mt-2 text-sm leading-6 text-white/85">Holerite/INSS registra a origem e o valor da renda. Se o depósito ocorrer fora do BTG e depois for transferido por PIX, o PIX é marcado como transferência interna. Assim o valor entra uma única vez na renda familiar.</p>
      </section>

      <section className="mt-5">
        <h3 className="font-black text-[#00334E]">Sugestões automáticas</h3>
        <div className="mt-3 space-y-2">
          {suggestions.map((suggestion) => {
            const income = incomes.find((item) => item.id === suggestion.incomeEventId);
            const tx = transactions.find((item) => item.id === suggestion.transactionId);
            if (!income || !tx) return null;
            return (
              <article key={`${income.id}-${tx.id}`} className="rounded-2xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-[#00334E]">{income.source_name} ↔ {tx.description}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{suggestion.reason}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">Renda {formatMoney(income.net_cents)} · Crédito {formatMoney(tx.amount_cents)} · confiança {suggestion.score}%</p>
                  </div>
                  <button type="button" className={`${buttonClass()} shrink-0`} onClick={() => void reconcile(income.id, tx.id, suggestion.method, suggestion.suggestedCents)}>Conciliar</button>
                </div>
              </article>
            );
          })}
          {!suggestions.length ? <p className="text-sm text-slate-500">Nenhuma sugestão nova no momento. Use a conciliação manual abaixo para casos parciais ou combinados.</p> : null}
        </div>
      </section>

      <section className="mt-6 border-t border-slate-200 pt-5">
        <h3 className="font-black text-[#00334E]">Conciliação manual / parcial</h3>
        <p className="mt-1 text-sm text-slate-600">Permite uma renda dividida em vários PIX, um PIX parcial ou um crédito que reúna mais de uma renda. Repita a operação para criar várias alocações.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <select className={inputClass()} value={incomeId} onChange={(event) => setIncomeId(event.target.value)}>
            <option value="">Escolha a renda</option>
            {incomes.filter((item) => item.status !== "canceled").map((income) => <option key={income.id} value={income.id}>{income.source_name} · {formatMoney(income.net_cents)} · {formatShortDate(income.competence_date)}</option>)}
          </select>
          <select className={inputClass()} value={transactionId} onChange={(event) => setTransactionId(event.target.value)}>
            <option value="">Escolha o crédito</option>
            {transactions.filter((tx) => tx.amount_cents > 0).slice(0, 120).map((tx) => <option key={tx.id} value={tx.id}>{formatShortDate(tx.occurred_at)} · {formatMoney(tx.amount_cents)} · {tx.description}</option>)}
          </select>
          <select className={inputClass()} value={method} onChange={(event) => setMethod(event.target.value as ReconciliationMethod)}>
            {Object.entries(reconciliationLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <input className={inputClass()} value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Valor alocado (opcional)" inputMode="decimal" />
          <button type="button" className={`${buttonClass()} sm:col-span-2`} disabled={!incomeId || !transactionId} onClick={() => void reconcile()}>Salvar conciliação</button>
        </div>
      </section>
    </CaixaClaroModal>
  );
}

function AgendaModal({ open, onClose, family, members, items, onChanged, setMessage, setError }: {
  open: boolean;
  onClose: () => void;
  family: FamilyInfo;
  members: FamilyMember[];
  items: PlannedItem[];
  onChanged: () => Promise<void>;
  setMessage: (value: string) => void;
  setError: (value: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [direction, setDirection] = useState<PlannedItem["direction"]>("expense");
  const [value, setValue] = useState("");
  const [dueDate, setDueDate] = useState(todayIso());
  const [memberId, setMemberId] = useState("");

  async function addPlanned(event: FormEvent) {
    event.preventDefault();
    const cents = toCents(value);
    if (!title.trim() || cents <= 0) return;
    const { error: insertError } = await supabaseBrowser.from("cc_planned_items").insert({
      family_id: family.id,
      member_id: memberId || null,
      title: title.trim(),
      direction,
      amount_cents: cents,
      due_date: dueDate,
      status: "planned",
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setTitle("");
    setValue("");
    setMessage("Item incluído na Agenda Financeira e na projeção futura.");
    await onChanged();
  }

  async function markStatus(id: string, status: PlannedItem["status"]) {
    const { error: updateError } = await supabaseBrowser.from("cc_planned_items").update({ status }).eq("id", id);
    if (updateError) setError(updateError.message);
    else await onChanged();
  }

  return (
    <CaixaClaroModal open={open} title="Agenda Financeira" subtitle="Próximas entradas e saídas alimentam a projeção do caixa de 30 dias." onClose={onClose}>
      <form onSubmit={addPlanned} className="grid gap-3 sm:grid-cols-2">
        <input required className={inputClass()} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Conta ou compromisso" />
        <input required className={inputClass()} value={value} onChange={(event) => setValue(event.target.value)} placeholder="Valor" inputMode="decimal" />
        <select className={inputClass()} value={direction} onChange={(event) => setDirection(event.target.value as PlannedItem["direction"])}><option value="expense">Saída</option><option value="income">Entrada</option></select>
        <input required className={inputClass()} type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        <select className={inputClass()} value={memberId} onChange={(event) => setMemberId(event.target.value)}><option value="">Família / casa</option>{members.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select>
        <button className={buttonClass()} type="submit">Adicionar à agenda</button>
      </form>
      <div className="mt-6 space-y-2">
        {items.filter((item) => item.status !== "canceled").slice(0, 30).map((item) => (
          <article key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-3">
            <div><p className="text-sm font-bold">{item.title}</p><p className="mt-1 text-xs text-slate-500">{formatShortDate(item.due_date)} · {item.status}</p></div>
            <div className="text-right"><p className={`font-black ${item.direction === "expense" ? "text-rose-700" : "text-emerald-700"}`}>{formatMoney(item.amount_cents)}</p><div className="mt-1 flex gap-1"><button type="button" onClick={() => void markStatus(item.id, "confirmed")} className="text-[10px] font-bold text-[#00A8CC]">Confirmar</button><button type="button" onClick={() => void markStatus(item.id, "paid")} className="text-[10px] font-bold text-emerald-700">Baixar</button></div></div>
          </article>
        ))}
      </div>
    </CaixaClaroModal>
  );
}

function DocumentsModal({ open, onClose, family, members, documents, onChanged, setMessage, setError }: {
  open: boolean;
  onClose: () => void;
  family: FamilyInfo;
  members: FamilyMember[];
  documents: DocumentItem[];
  onChanged: () => Promise<void>;
  setMessage: (value: string) => void;
  setError: (value: string) => void;
}) {
  const [memberId, setMemberId] = useState("");
  const [documentType, setDocumentType] = useState("holerite");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const selectedMemberId = members.some((item) => item.id === memberId)
    ? memberId
    : (members[0]?.id ?? "");

  async function uploadDocument() {
    if (!file || !selectedMemberId) return;
    setUploading(true);
    setError("");
    try {
      const path = `${family.id}/${selectedMemberId}/${Date.now()}-${safeFileName(file.name)}`;
      const { error: storageError } = await supabaseBrowser.storage.from("caixa-claro-private").upload(path, file, { upsert: false });
      if (storageError) throw storageError;
      const { error: metadataError } = await supabaseBrowser.from("cc_documents").insert({
        family_id: family.id,
        member_id: selectedMemberId,
        document_type: documentType,
        original_name: file.name,
        storage_path: path,
        mime_type: file.type || null,
        size_bytes: file.size,
      });
      if (metadataError) throw metadataError;
      setMessage("Documento enviado para storage privado. Na V1, os valores financeiros continuam sendo confirmados pelo usuário antes de entrar no caixa.");
      setFile(null);
      await onChanged();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Falha no upload.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <CaixaClaroModal open={open} title="Documentos privados" subtitle="Holerites, INSS e extratos ficam em bucket privado; não são publicados nem enviados para o GitHub." onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <select className={inputClass()} value={selectedMemberId} onChange={(event) => setMemberId(event.target.value)}>{members.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select>
        <select className={inputClass()} value={documentType} onChange={(event) => setDocumentType(event.target.value)}><option value="holerite">Holerite</option><option value="inss">INSS</option><option value="bank_statement">Extrato bancário</option><option value="card_statement">Fatura de cartão</option><option value="receipt">Comprovante</option><option value="other">Outro</option></select>
        <input className={`${inputClass()} sm:col-span-2`} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <button type="button" className={`${buttonClass()} sm:col-span-2`} disabled={!file || uploading} onClick={() => void uploadDocument()}>{uploading ? "Enviando…" : "Enviar documento"}</button>
      </div>
      <div className="mt-6 space-y-2">
        {documents.map((document) => <article key={document.id} className="rounded-2xl border border-slate-200 p-3"><p className="truncate text-sm font-bold">{document.original_name}</p><p className="mt-1 text-xs text-slate-500">{document.document_type} · {formatShortDate(document.created_at)}</p></article>)}
      </div>
    </CaixaClaroModal>
  );
}

function FamilyModal({ open, onClose, members, accounts }: { open: boolean; onClose: () => void; members: FamilyMember[]; accounts: FamilyAccount[] }) {
  return (
    <CaixaClaroModal open={open} title="Família SilvaMattano" subtitle="Cada pessoa tem seu próprio login e senha do Supabase Auth, vinculado a um único cadastro familiar." onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        {members.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 p-4"><p className="font-black text-[#00334E]">{item.full_name}</p><p className="mt-1 text-xs text-slate-500">{item.role === "owner" ? "Responsável inicial" : "Membro"} · {item.auth_user_id ? "login vinculado" : "login pendente"}</p>{item.email ? <p className="mt-2 truncate text-xs text-slate-600">{item.email}</p> : null}</article>)}
      </div>
      <h3 className="mt-6 font-black text-[#00334E]">Contas no caixa</h3>
      <div className="mt-3 space-y-2">{accounts.map((account) => <article key={account.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3"><div><p className="text-sm font-bold">{account.nickname}</p><p className="text-xs text-slate-500">{account.institution} · {account.kind}</p></div><p className="font-black text-[#00334E]">{formatMoney(account.current_balance_cents)}</p></article>)}</div>
      <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>Importante:</strong> a senha nunca é armazenada nas tabelas do Caixa Claro. Cada membro autentica diretamente pelo Supabase Auth.</div>
    </CaixaClaroModal>
  );
}

function AnalyticsModal({ open, onClose, transactions, incomes }: { open: boolean; onClose: () => void; transactions: CaixaTransaction[]; incomes: IncomeEvent[] }) {
  const data = useMemo(() => {
    const expenses = new Map<string, number>();
    for (const tx of transactions.filter((item) => item.kind === "expense")) {
      const key = tx.category_raw || "Sem categoria";
      expenses.set(key, (expenses.get(key) ?? 0) + Math.abs(tx.amount_cents));
    }
    const top = [...expenses.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    const expected = incomes.filter((item) => item.status === "expected").reduce((sum, item) => sum + item.net_cents, 0);
    return { top, expected };
  }, [incomes, transactions]);

  return (
    <CaixaClaroModal open={open} title="Análises" subtitle="Uma visão objetiva para decidir; gráficos mais detalhados podem evoluir depois sem poluir a tela principal." onClose={onClose}>
      <div className="rounded-2xl bg-cyan-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-cyan-800">Rendas ainda previstas</p><p className="mt-2 text-2xl font-black text-[#00334E]">{formatMoney(data.expected)}</p></div>
      <h3 className="mt-6 font-black text-[#00334E]">Despesas por categoria importada</h3>
      <div className="mt-3 space-y-2">{data.top.map(([label, cents]: [string, number]) => <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm"><span className="truncate font-bold">{label}</span><span className="shrink-0 font-black text-rose-700">{formatMoney(cents)}</span></div>)}</div>
    </CaixaClaroModal>
  );
}

function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <CaixaClaroModal open={open} title="Como usar o Caixa Claro" subtitle="Fluxo curto para manter a família olhando para o futuro, não apenas para o passado." onClose={onClose}>
      <ol className="space-y-3 text-sm leading-6 text-slate-700">
        <li className="rounded-2xl bg-slate-50 p-4"><strong className="text-[#00334E]">1. Movimentos:</strong> importe o extrato BTG. PIX e transferências entram como transferências para evitar chamar automaticamente movimentação interna de “renda”.</li>
        <li className="rounded-2xl bg-slate-50 p-4"><strong className="text-[#00334E]">2. Rendas:</strong> registre o valor líquido do holerite/INSS e a data em que ele foi pago ou previsto.</li>
        <li className="rounded-2xl bg-slate-50 p-4"><strong className="text-[#00334E]">3. Conciliação:</strong> se o salário caiu em outro banco e você fez PIX ao BTG, use “PIX ponte”. O PIX apenas move o dinheiro e não confirma sozinho que todo o salário foi recebido; confirme a renda em Rendas ou pelo extrato do banco de origem.</li>
        <li className="rounded-2xl bg-slate-50 p-4"><strong className="text-[#00334E]">4. Casos parciais:</strong> uma renda pode ser ligada a vários PIX. Também é possível alocar parcialmente ou juntar mais de uma renda no mesmo crédito.</li>
        <li className="rounded-2xl bg-slate-50 p-4"><strong className="text-[#00334E]">5. Banco de origem:</strong> quando houver extrato do banco onde o pagamento caiu, cadastre essa conta e confirme o crédito diretamente nela. O PIX posterior continua transferência interna.</li>
        <li className="rounded-2xl bg-slate-50 p-4"><strong className="text-[#00334E]">6. Agenda:</strong> registre compromissos futuros para a projeção de 30 dias avisar antes do caixa apertar.</li>
      </ol>
    </CaixaClaroModal>
  );
}

function AccessModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("");

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setStatus("Use uma senha com pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setStatus("As senhas digitadas não coincidem.");
      return;
    }
    const { error } = await supabaseBrowser.auth.updateUser({ password });
    if (error) setStatus(error.message);
    else {
      setStatus("Senha atualizada com sucesso.");
      setPassword("");
      setConfirm("");
    }
  }

  return (
    <CaixaClaroModal open={open} title="Meu acesso" subtitle="A senha fica somente no Supabase Auth e não é gravada nas tabelas financeiras." onClose={onClose}>
      <form onSubmit={changePassword} className="space-y-3">
        <input className={inputClass()} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nova senha" />
        <input className={inputClass()} type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Confirmar nova senha" />
        <button className={buttonClass()} type="submit">Alterar senha</button>
        {status ? <p className="text-sm font-bold text-slate-700">{status}</p> : null}
      </form>
    </CaixaClaroModal>
  );
}

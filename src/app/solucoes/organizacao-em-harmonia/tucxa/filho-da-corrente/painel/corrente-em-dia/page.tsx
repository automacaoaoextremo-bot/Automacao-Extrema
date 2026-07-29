"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FilhoCorrentePanelHeader } from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Contribution = {
  id: string;
  amount: number;
  due_date: string;
  paid_at: string | null;
  status: string;
  payment_method: string | null;
  proof_url: string | null;
  notes: string | null;
};

type Upcoming = {
  dueDate: string;
  amount: number;
  status: string;
};

type Payload = {
  currentPerson?: { fullName?: string };
  settings?: {
    defaultAmount: number;
    familyAmount: number;
    defaultDueDays: number[];
    reminderBeforeDays: number;
    reminderAfterDays: number;
    pixKey: string;
    persuasiveText: string;
  };
  contributions?: Contribution[];
  upcoming?: Upcoming[];
  pixCopyPaste?: string;
  qrCodeDataUrl?: string;
  error?: string;
};

type PaymentMethod = "pix" | "credito" | "debito" | "dinheiro";

const paymentLabels: Record<string, string> = { pix: "PIX", credito: "Crédito", debito: "Débito", dinheiro: "Dinheiro" };
const statusLabels: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  comprovante_enviado: "Comprovante enviado",
  confirmado: "Confirmado",
  pago: "Pago",
  atrasado: "Em atraso",
};

function loginUrl() {
  if (typeof window === "undefined") return "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login";
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return `/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login?returnTo=${encodeURIComponent(returnTo)}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function CorrenteEmDiaFilhoDaCorrentePage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [proofUrl, setProofUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [wantsBeforeReminder, setWantsBeforeReminder] = useState(true);
  const [wantsLateReminder, setWantsLateReminder] = useState(true);

  const load = useCallback(async () => {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      window.location.replace(loginUrl());
      return;
    }
    const response = await fetch("/api/organizacao-em-harmonia/filhos-corrente/corrente-em-dia", { headers: { Authorization: `Bearer ${token}` } });
    const result = (await response.json()) as Payload;
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar Corrente em Dia.");
    setPayload(result);
    setAmount(String(result.settings?.defaultAmount ?? 50));
    setDueDate(result.upcoming?.[0]?.dueDate ?? "");
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      load()
        .catch((err) => active && setError(err instanceof Error ? err.message : "Erro ao carregar Corrente em Dia."))
        .finally(() => active && setLoading(false));
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [load]);

  const numericAmount = useMemo(() => {
    const parsed = Number(amount.replace(".", "").replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : payload?.settings?.defaultAmount ?? 50;
  }, [amount, payload?.settings?.defaultAmount]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        window.location.replace(loginUrl());
        return;
      }
      const response = await fetch("/api/organizacao-em-harmonia/filhos-corrente/corrente-em-dia", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createContribution", amount: numericAmount, dueDate, paymentMethod, proofUrl, notes }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível registrar a contribuição.");
      setMessage(result.message || "Contribuição registrada.");
      setProofUrl("");
      setNotes("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar contribuição.");
    } finally {
      setSaving(false);
    }
  }

  async function saveReminders() {
    setError("");
    setMessage("");
    try {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const response = await fetch("/api/organizacao-em-harmonia/filhos-corrente/corrente-em-dia", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveReminderPreferences", wantsBeforeReminder, wantsLateReminder }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar lembretes.");
      setMessage(result.message || "Preferências salvas.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar lembretes.");
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader navLabel="Corrente em Dia" />

      <section className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        {loading && <p className="rounded-3xl bg-white p-5 font-bold text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">Carregando Corrente em Dia...</p>}
        {error && <p className="rounded-3xl bg-red-50 p-5 font-bold text-red-700 shadow ring-1 ring-red-100">{error}</p>}
        {message && <p className="rounded-3xl bg-emerald-50 p-5 font-bold text-emerald-800 shadow ring-1 ring-emerald-100">{message}</p>}

        {!loading && payload && (
          <div className="grid gap-5">
            <section className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#CFE2C7]">Corrente em Dia</p>
              <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Sua contribuição mantém a casa pronta para servir.</h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#EEF7EA] sm:text-base sm:leading-7">
                {payload.settings?.persuasiveText}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <article className="rounded-3xl bg-white/10 p-4"><p className="text-2xl font-black">{formatCurrency(payload.settings?.defaultAmount ?? 50)}</p><p className="text-xs font-bold text-[#CFE2C7]">Valor padrão</p></article>
                <article className="rounded-3xl bg-white/10 p-4"><p className="text-2xl font-black">{formatCurrency(payload.settings?.familyAmount ?? 120)}</p><p className="text-xs font-bold text-[#CFE2C7]">Família</p></article>
                <article className="rounded-3xl bg-white/10 p-4"><p className="text-2xl font-black">Dia {(payload.settings?.defaultDueDays ?? [10]).join(", ")}</p><p className="text-xs font-bold text-[#CFE2C7]">Vencimento</p></article>
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
              <form onSubmit={submit} className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
                <h2 className="text-2xl font-black text-[#123D2C]">Registrar contribuição</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                    Valor
                    <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" className="rounded-2xl border border-[#123D2C]/15 bg-white p-3 font-semibold" />
                  </label>
                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                    Vencimento
                    <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="rounded-2xl border border-[#123D2C]/15 bg-white p-3 font-semibold" />
                  </label>
                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                    Forma de pagamento
                    <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} className="rounded-2xl border border-[#123D2C]/15 bg-white p-3 font-semibold">
                      <option value="pix">PIX</option>
                      <option value="credito">Crédito</option>
                      <option value="debito">Débito</option>
                      <option value="dinheiro">Dinheiro</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                    Link/código do comprovante
                    <input value={proofUrl} onChange={(event) => setProofUrl(event.target.value)} className="rounded-2xl border border-[#123D2C]/15 bg-white p-3 font-semibold" placeholder="Cole o link, nome do arquivo ou código" />
                  </label>
                  <label className="grid gap-1 text-sm font-black text-[#123D2C] sm:col-span-2">
                    Observação
                    <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-24 rounded-2xl border border-[#123D2C]/15 bg-white p-3 font-semibold" />
                  </label>
                </div>
                <button disabled={saving} className="mt-4 w-full rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white shadow disabled:opacity-60">{saving ? "Registrando..." : "Enviar para conferência"}</button>
              </form>

              <section className="grid gap-4">
                <article className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
                  <h2 className="text-2xl font-black text-[#123D2C]">Pix</h2>
                  {payload.qrCodeDataUrl && <Image src={payload.qrCodeDataUrl} alt="QR Code Pix" width={240} height={240} unoptimized className="mx-auto mt-4 rounded-3xl bg-white" />}
                  <p className="mt-3 break-all rounded-2xl bg-[#F7FAF2] p-3 text-xs font-bold text-slate-700 ring-1 ring-[#123D2C]/10">{payload.pixCopyPaste}</p>
                </article>
                <article className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
                  <h2 className="text-xl font-black text-[#123D2C]">Lembretes</h2>
                  <label className="mt-3 flex items-start gap-3 rounded-2xl bg-[#F7FAF2] p-3 font-bold text-[#123D2C] ring-1 ring-[#123D2C]/10"><input type="checkbox" checked={wantsBeforeReminder} onChange={(event) => setWantsBeforeReminder(event.target.checked)} className="mt-1 h-5 w-5 accent-[#123D2C]" /> Receber lembrete antes do vencimento</label>
                  <label className="mt-2 flex items-start gap-3 rounded-2xl bg-[#F7FAF2] p-3 font-bold text-[#123D2C] ring-1 ring-[#123D2C]/10"><input type="checkbox" checked={wantsLateReminder} onChange={(event) => setWantsLateReminder(event.target.checked)} className="mt-1 h-5 w-5 accent-[#123D2C]" /> Receber lembrete quando estiver em atraso</label>
                  <button type="button" onClick={saveReminders} className="mt-3 rounded-2xl bg-[#E9F2E7] px-4 py-3 font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">Salvar lembretes</button>
                </article>
              </section>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <article className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
                <h2 className="text-2xl font-black text-[#123D2C]">Próximas contribuições</h2>
                <div className="mt-4 grid gap-3">
                  {(payload.upcoming ?? []).map((item) => (
                    <div key={item.dueDate} className="flex items-center justify-between rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                      <span><span className="block font-black text-[#123D2C]">{item.dueDate}</span><span className="text-sm font-semibold text-slate-600">{item.status}</span></span>
                      <span className="font-black text-[#123D2C]">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </article>
              <article className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
                <h2 className="text-2xl font-black text-[#123D2C]">Histórico</h2>
                <div className="mt-4 grid gap-3">
                  {(payload.contributions ?? []).map((item) => (
                    <div key={item.id} className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                      <div className="flex items-center justify-between gap-3"><p className="font-black text-[#123D2C]">{formatCurrency(Number(item.amount))}</p><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">{statusLabels[item.status] ?? item.status}</span></div>
                      <p className="mt-1 text-sm font-semibold text-slate-600">{item.due_date} • {paymentLabels[item.payment_method ?? ""] ?? item.payment_method ?? "Forma não informada"}</p>
                    </div>
                  ))}
                  {(payload.contributions ?? []).length === 0 && <p className="rounded-2xl bg-[#F7FAF2] p-4 font-bold text-slate-500">Nenhum histórico registrado ainda.</p>}
                </div>
              </article>
            </section>

            <Link href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel" className="w-fit rounded-2xl bg-[#123D2C] px-5 py-3 font-black text-white">Voltar ao painel</Link>
          </div>
        )}
      </section>
    </main>
  );
}

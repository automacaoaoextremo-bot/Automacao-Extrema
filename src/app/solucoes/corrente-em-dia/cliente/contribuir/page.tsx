"use client";

import { FormEvent, useEffect, useState } from "react";
import { CorrenteClientHeader } from "@/components/corrente-client-header";
import { contributionStatusLabel, currencyBR } from "@/lib/corrente-em-dia";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Contribution = {
  id: string;
  reference_month: string;
  expected_amount: number | null;
  due_date: string | null;
  pix_key_expected: string | null;
  pix_receiver_expected: string | null;
  pix_payload: string | null;
  status: string;
};

type Payload = {
  contribution: Contribution;
  organization: { name: string; pix_key: string | null; pix_receiver_name: string | null } | null;
  history: { id: string; reference_month: string; expected_amount: number | null; due_date: string | null; status: string }[];
};

export default function CorrenteContribuirPage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    informed_amount: "",
    pix_key: "",
    file_name: "",
    recurring_pix_used: false,
    recurring_pix_until: "",
  });
  const [emailContributionInfo, setEmailContributionInfo] = useState(true);

  async function token() {
    const { data } = await supabaseBrowser.auth.getSession();
    return data.session?.access_token ?? "";
  }

  async function load() {
    const authToken = await token();
    if (!authToken) {
      window.location.href = "/solucoes/corrente-em-dia/login";
      return;
    }
    const response = await fetch("/api/corrente-em-dia/cliente/contribuir", { headers: { Authorization: `Bearer ${authToken}` } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar contribuição.");
    setPayload(result);
    setForm((prev) => ({
      ...prev,
      informed_amount: result.contribution?.expected_amount ? String(result.contribution.expected_amount).replace(".", ",") : "",
      pix_key: result.contribution?.pix_key_expected ?? "",
    }));
  }

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      load()
        .catch((err) => {
          if (active) setMessage(err instanceof Error ? err.message : "Erro ao carregar contribuição.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
    // A carga inicial precisa rodar apenas uma vez; recarregamentos após ações usam load() diretamente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payload?.contribution?.id) return;
    setMessage("");
    const authToken = await token();
    const response = await fetch("/api/corrente-em-dia/cliente/contribuir", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ ...form, contribution_id: payload.contribution.id }),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || "Não foi possível enviar comprovante.");
      return;
    }
    window.location.href = `/solucoes/corrente-em-dia/cliente/contribuir/obrigado?status=${encodeURIComponent(result.validationStatus ?? "pendente")}`;
  }

  return (
    <main className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <CorrenteClientHeader />
      <section className="mx-auto max-w-5xl px-4 py-6">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-[#2F6B43]">Contribuir</p>
        <h1 className="mt-2 text-4xl font-black text-[#00334E]">Minha contribuição</h1>
        <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">
          Acesse o Pix, faça o pagamento, envie o comprovante e acompanhe o histórico. Seus dados ficam protegidos e a organização visualiza apenas o necessário para gestão e aprovação.
        </p>

        {message && <p className="mt-5 rounded-2xl bg-white p-4 font-bold text-[#00334E] shadow-sm">{message}</p>}
        {loading && <p className="mt-5 rounded-2xl bg-white p-4 shadow-sm">Carregando...</p>}

        {!loading && payload && (
          <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-slate-100">
              <h2 className="text-2xl font-black text-[#00334E]">Pix da contribuição</h2>
              <div className="mt-4 rounded-3xl bg-emerald-50 p-5 text-center">
                <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-3xl bg-white text-sm font-black text-[#00334E] shadow-inner">
                  QR Code Pix
                </div>
                <p className="mt-4 text-3xl font-black text-[#00334E]">{currencyBR(payload.contribution.expected_amount)}</p>
                <p className="mt-1 text-sm text-slate-600">Vencimento: {payload.contribution.due_date ?? "qualquer dia do mês"}</p>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <p className="rounded-2xl bg-slate-50 p-4"><strong>Chave Pix:</strong> {payload.contribution.pix_key_expected ?? "não configurada"}</p>
                <p className="rounded-2xl bg-slate-50 p-4"><strong>Recebedor:</strong> {payload.contribution.pix_receiver_expected ?? payload.organization?.name ?? "organização"}</p>
                <textarea readOnly value={payload.contribution.pix_payload ?? ""} className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm" />
                <button type="button" onClick={() => navigator.clipboard.writeText(payload.contribution.pix_payload ?? "")} className="w-full rounded-2xl bg-[#31C16B] px-5 py-3 font-black text-[#00334E]">
                  Copiar Pix copia e cola
                </button>
              </div>
            </section>

            <section className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-slate-100">
              <h2 className="text-2xl font-black text-[#00334E]">Enviar comprovante</h2>
              <label className="mt-4 flex gap-2 rounded-2xl bg-slate-50 p-4 text-sm font-bold">
                <input type="checkbox" checked={emailContributionInfo} onChange={(e) => setEmailContributionInfo(e.target.checked)} /> Receber informações de contribuição por e-mail
              </label>
              <form onSubmit={sendReceipt} className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-sm font-bold">Valor pago</span>
                  <input value={form.informed_amount} onChange={(e) => setForm((prev) => ({ ...prev, informed_amount: e.target.value }))} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" />
                </label>
                <label className="block">
                  <span className="text-sm font-bold">Chave Pix que aparece no comprovante</span>
                  <input value={form.pix_key} onChange={(e) => setForm((prev) => ({ ...prev, pix_key: e.target.value }))} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" />
                </label>
                <label className="block">
                  <span className="text-sm font-bold">Arquivo do comprovante</span>
                  <input type="file" onChange={(e) => setForm((prev) => ({ ...prev, file_name: e.target.files?.[0]?.name ?? "" }))} className="mt-1 w-full rounded-2xl border border-slate-300 bg-white p-3" />
                  <span className="mt-1 block text-xs text-slate-500">Nesta etapa o sistema registra o nome e os dados para pré-validação. O upload real pode ser ligado ao Storage depois.</span>
                </label>
                <label className="flex gap-2 rounded-2xl bg-slate-50 p-4 text-sm font-bold">
                  <input type="checkbox" checked={form.recurring_pix_used} onChange={(e) => setForm((prev) => ({ ...prev, recurring_pix_used: e.target.checked }))} /> Pix recorrente utilizado
                </label>
                {form.recurring_pix_used && (
                  <label className="block">
                    <span className="text-sm font-bold">Data final do Pix recorrente</span>
                    <input type="date" value={form.recurring_pix_until} onChange={(e) => setForm((prev) => ({ ...prev, recurring_pix_until: e.target.value }))} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" />
                  </label>
                )}
                <button type="submit" className="w-full rounded-2xl bg-[#31C16B] px-5 py-4 font-black text-[#00334E] shadow-lg">
                  Enviar comprovante
                </button>
              </form>
            </section>

            <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 lg:col-span-2">
              <h2 className="text-2xl font-black text-[#00334E]">Histórico</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {payload.history.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-black text-[#00334E]">{new Date(item.reference_month).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })}</p>
                    <p className="text-sm text-slate-600">{currencyBR(item.expected_amount)} • {contributionStatusLabel(item.status)}</p>
                    <p className="text-xs text-slate-500">Vencimento: {item.due_date ?? "livre"}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

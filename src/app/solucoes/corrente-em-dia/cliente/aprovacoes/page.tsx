"use client";

import { useEffect, useMemo, useState } from "react";
import { CorrenteClientHeader } from "@/components/corrente-client-header";
import { CorrenteContextualHelp } from "@/components/corrente-contextual-help";
import { contributionStatusLabel, currencyBR } from "@/lib/corrente-em-dia";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Receipt = {
  id: string;
  file_name: string | null;
  informed_amount: number | null;
  ocr_pix_key: string | null;
  validation_status: string;
  validation_notes: string | null;
  created_at: string;
};

type Contribution = {
  id: string;
  reference_month: string;
  expected_amount: number | null;
  due_date: string | null;
  pix_key_expected: string | null;
  status: string;
  notes: string | null;
  person: { id: string; full_name: string; email: string | null; whatsapp: string | null } | null;
  receipts: Receipt[] | null;
};

type Payload = { contributions: Contribution[] };

function normalizeWhatsapp(value: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function reminderLink(item: Contribution) {
  const name = item.person?.full_name?.split(/\s+/)[0] ?? "tudo bem";
  const message = [
    `Olá, ${name}. Passando só para ajudar a manter a organização da casa em dia.`,
    "",
    "Sua contribuição deste mês ainda aparece como pendente no Corrente em Dia. Quando puder, você pode fazer o Pix e enviar o comprovante pelo painel.",
    "",
    "Essa organização ajuda a casa a manter previsibilidade, transparência e tranquilidade para todos.",
  ].join("\n");
  return `https://wa.me/${normalizeWhatsapp(item.person?.whatsapp ?? null)}?text=${encodeURIComponent(message)}`;
}

export default function CorrenteAprovacoesPage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [filter, setFilter] = useState("todos");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

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
    const response = await fetch("/api/corrente-em-dia/cliente/aprovacoes", { headers: { Authorization: `Bearer ${authToken}` } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar aprovações.");
    setPayload(result);
  }

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      load()
        .catch((err) => {
          if (active) setMessage(err instanceof Error ? err.message : "Erro ao carregar aprovações.");
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

  const items = useMemo(() => {
    const all = payload?.contributions ?? [];
    if (filter === "todos") return all;
    if (filter === "pendentes") return all.filter((item) => item.status !== "aprovado");
    if (filter === "revisao") return all.filter((item) => ["comprovante_enviado", "pre_validado", "divergente"].includes(item.status));
    return all.filter((item) => item.status === filter);
  }, [payload?.contributions, filter]);

  async function review(item: Contribution, decision: string) {
    const receipt = item.receipts?.[0];
    if (!receipt) {
      setMessage("Esta contribuição ainda não tem comprovante para revisar.");
      return;
    }
    const authToken = await token();
    const response = await fetch("/api/corrente-em-dia/cliente/aprovacoes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ contribution_id: item.id, receipt_id: receipt.id, decision }),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || "Não foi possível revisar.");
      return;
    }
    setMessage("Revisão registrada.");
    await load();
  }

  return (
    <main className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <CorrenteClientHeader />
      <section className="mx-auto max-w-6xl px-4 py-6">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-[#2F6B43]">Aprovações</p>
        <h1 className="mt-2 text-4xl font-black text-[#00334E]">Comprovantes e pendências</h1>
        <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">
          Acompanhe contribuições, aprove comprovantes e envie lembretes com uma abordagem cuidadosa, sem constranger quem está pendente.
        </p>

        <div className="mt-5">
          <CorrenteContextualHelp title="Lembrete sem constrangimento" href="/solucoes/corrente-em-dia/cliente/primeiros-passos">
            Use mensagens de cuidado coletivo: organização, transparência e previsibilidade. Evite tom de cobrança ou exposição pública de pendências.
          </CorrenteContextualHelp>
        </div>

        {message && <p className="mt-5 rounded-2xl bg-white p-4 font-bold text-[#00334E] shadow-sm">{message}</p>}
        {loading && <p className="mt-5 rounded-2xl bg-white p-4 shadow-sm">Carregando...</p>}

        {!loading && payload && (
          <>
            <div className="mt-6 flex flex-wrap gap-2 rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-slate-100">
              {["todos", "pendentes", "revisao", "aprovado", "divergente", "reprovado"].map((item) => (
                <button key={item} type="button" onClick={() => setFilter(item)} className={`rounded-full px-4 py-2 text-sm font-black ${filter === item ? "bg-[#00334E] text-white" : "bg-slate-100 text-slate-700"}`}>
                  {item === "todos" ? "Todos" : item === "revisao" ? "Em revisão" : contributionStatusLabel(item)}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-4">
              {items.length === 0 && <p className="rounded-2xl bg-white p-5 shadow-sm">Nenhum registro encontrado.</p>}
              {items.map((item) => {
                const receipt = item.receipts?.[0];
                return (
                  <div key={item.id} className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xl font-black text-[#00334E]">{item.person?.full_name ?? "Contribuinte"}</p>
                        <p className="text-sm text-slate-500">{item.person?.email ?? "sem e-mail"} • {item.person?.whatsapp ?? "sem WhatsApp"}</p>
                      </div>
                      <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{contributionStatusLabel(item.status)}</span>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-4">
                      <p className="rounded-xl bg-slate-50 p-3"><strong>Valor:</strong><br />{currencyBR(item.expected_amount)}</p>
                      <p className="rounded-xl bg-slate-50 p-3"><strong>Vencimento:</strong><br />{item.due_date ?? "livre"}</p>
                      <p className="rounded-xl bg-slate-50 p-3"><strong>Pix esperado:</strong><br />{item.pix_key_expected ?? "não informado"}</p>
                      <p className="rounded-xl bg-slate-50 p-3"><strong>Comprovante:</strong><br />{receipt?.validation_status ?? "não enviado"}</p>
                    </div>

                    {receipt && (
                      <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-950">
                        <p><strong>Arquivo:</strong> {receipt.file_name ?? "sem nome"}</p>
                        <p><strong>Valor informado:</strong> {currencyBR(receipt.informed_amount)}</p>
                        <p><strong>Chave Pix lida:</strong> {receipt.ocr_pix_key ?? "não informada"}</p>
                        <p><strong>Observação:</strong> {receipt.validation_notes ?? "sem observação"}</p>
                      </div>
                    )}

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <button type="button" onClick={() => review(item, "aprovado")} className="rounded-2xl bg-[#31C16B] px-4 py-3 text-sm font-black text-[#00334E]">Aprovar</button>
                      <button type="button" onClick={() => review(item, "reprovado")} className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-black text-red-700">Reprovar</button>
                      <button type="button" onClick={() => review(item, "pedir_correcao")} className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-black text-amber-700">Pedir correção</button>
                      {item.person?.whatsapp && (
                        <a href={reminderLink(item)} target="_blank" rel="noreferrer" className="rounded-2xl border border-[#00334E] bg-white px-4 py-3 text-sm font-black text-[#00334E]">Lembrete WhatsApp</a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

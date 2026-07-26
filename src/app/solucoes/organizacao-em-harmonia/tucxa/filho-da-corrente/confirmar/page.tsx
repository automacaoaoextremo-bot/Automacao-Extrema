"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

type DraftItem = { slug: string; label: string; description?: string };
type EntityItem = { id: string; name: string };
type FirstAccessDraft = {
  fullName: string;
  whatsapp: string;
  email: string;
  password: string;
  notes: string;
  functionSlugs: string[];
  agendaSlugs: string[];
  selectedFunctions: DraftItem[];
  selectedAgenda: DraftItem[];
  cavalinhoEntityIds: string[];
  selectedEntities: EntityItem[];
  createdAt: string;
};

type SubmitResponse = {
  ok?: boolean;
  message?: string;
  statusUrl?: string;
  whatsappUrl?: string;
  error?: string;
};

const DRAFT_KEY = "oh_tucxa_filho_corrente_primeiro_acesso";
const backPath = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente#primeiro-acesso";

export default function ConfirmarPrimeiroAcessoFilhoCorrentePage() {
  const [draft, setDraft] = useState<FirstAccessDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SubmitResponse | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.sessionStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as FirstAccessDraft;
        if (parsed?.fullName && parsed?.whatsapp) setDraft(parsed);
      } catch {
        setError("Não foi possível recuperar os dados do primeiro acesso. Volte e confira o cadastro.");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function submit() {
    if (!draft || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/organizacao-em-harmonia/filhos-corrente/acesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", ...draft }),
      });
      const payload = (await response.json().catch(() => ({}))) as SubmitResponse;
      if (!response.ok) throw new Error(payload.error || payload.message || "Não foi possível enviar o cadastro para validação.");
      window.sessionStorage.removeItem(DRAFT_KEY);
      setResult(payload);
      if (payload.whatsappUrl) window.open(payload.whatsappUrl, "_blank", "noopener,noreferrer");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível enviar o cadastro para validação.");
    } finally {
      setLoading(false);
    }
  }

  const actions = [
    { label: "Voltar", href: backPath, variant: "secondary" as const },
    { label: "Site Tucxa", href: "/solucoes/organizacao-em-harmonia/tucxa", variant: "secondary" as const },
    { label: "Entrar", href: "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login", variant: "primary" as const },
  ];

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader actions={actions} navLabel="Confirmação do primeiro acesso dos Filhos da Corrente" />
      <section className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7">
          {!result ? (
            <>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Primeiro acesso</p>
              <h1 className="mt-2 text-3xl font-black text-[#123D2C]">Confira antes de enviar para validação.</h1>
              {!draft ? (
                <div className="mt-5 rounded-2xl bg-amber-50 p-4 font-semibold text-amber-900 ring-1 ring-amber-200">
                  O cadastro não foi localizado neste navegador. <Link href={backPath} className="underline">Volte ao primeiro acesso</Link> e preencha novamente.
                </div>
              ) : (
                <>
                  <div className="mt-5 grid gap-3 rounded-[1.5rem] bg-[#EEF5EA] p-4 sm:grid-cols-2">
                    <p><strong>Nome:</strong><br />{draft.fullName}</p>
                    <p><strong>WhatsApp:</strong><br />{draft.whatsapp}</p>
                    <p><strong>E-mail:</strong><br />{draft.email || "Não informado"}</p>
                    <p><strong>Observação:</strong><br />{draft.notes || "Não informada"}</p>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[1.5rem] border border-[#123D2C]/10 p-4">
                      <h2 className="font-black text-[#123D2C]">Funções</h2>
                      <ul className="mt-2 space-y-2 text-sm font-semibold text-slate-700">
                        {draft.selectedFunctions.map((item) => <li key={item.slug}>• {item.label}</li>)}
                      </ul>
                    </div>
                    <div className="rounded-[1.5rem] border border-[#123D2C]/10 p-4">
                      <h2 className="font-black text-[#123D2C]">Agenda</h2>
                      <ul className="mt-2 space-y-2 text-sm font-semibold text-slate-700">
                        {draft.selectedAgenda.map((item) => <li key={item.slug}>• {item.label}</li>)}
                      </ul>
                    </div>
                  </div>
                  {draft.selectedEntities.length > 0 && (
                    <div className="mt-4 rounded-[1.5rem] border border-[#123D2C]/10 p-4">
                      <h2 className="font-black text-[#123D2C]">Entidades que recebe para atendimento de Consulentes/Filhos de Fora</h2>
                      <p className="mt-2 text-sm font-semibold text-slate-700">{draft.selectedEntities.map((item) => item.name).join(" • ")}</p>
                    </div>
                  )}
                  {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700 ring-1 ring-red-200">{error}</p>}
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <Link href={backPath} className="rounded-2xl border border-[#123D2C]/20 px-5 py-4 text-center font-black text-[#123D2C]">Voltar e ajustar</Link>
                    <button type="button" onClick={submit} disabled={loading} className="rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white disabled:opacity-50">
                      {loading ? "Enviando..." : "Enviar para validação"}
                    </button>
                  </div>
                  <p className="mt-3 text-center text-xs leading-5 text-slate-500">O WhatsApp será aberto em outra janela. Esta página continuará disponível para mostrar a confirmação e o link de acompanhamento.</p>
                </>
              )}
            </>
          ) : (
            <>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Cadastro enviado</p>
              <h1 className="mt-2 text-3xl font-black text-[#123D2C]">Obrigado. Sua solicitação foi encaminhada para validação.</h1>
              <p className="mt-3 leading-7 text-slate-700">O Tucxa irá conferir suas informações, funções, agendas e, quando aplicável, as entidades selecionadas.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {result.statusUrl && <a href={result.statusUrl} className="rounded-2xl bg-[#123D2C] px-5 py-4 text-center font-black text-white">Acompanhar solicitação</a>}
                {result.whatsappUrl && <a href={result.whatsappUrl} target="_blank" rel="noreferrer" className="rounded-2xl bg-[#E9F2E7] px-5 py-4 text-center font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">Abrir WhatsApp novamente</a>}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

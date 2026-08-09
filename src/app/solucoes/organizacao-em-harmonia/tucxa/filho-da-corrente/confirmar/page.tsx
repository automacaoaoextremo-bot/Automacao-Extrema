"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

type DraftItem = { slug: string; label: string; description?: string };
type EntityItem = { id: string; name: string };
type FamilyLinkItem = {
  personId: string;
  personName: string;
  relationshipTypeId: string;
  relationshipLabel: string;
};
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
  cavalinhoConsulenteEntityId: string;
  cavalinhoConsulenteDefinitionCompleted: boolean;
  familyLinks: FamilyLinkItem[];
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
const backPath = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/primeiro-acesso?ajuste=1";

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

  const hasCavalinho = Boolean(
    draft?.selectedFunctions?.some(
      (item) =>
        item.slug === "cavalinho" ||
        item.label
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .includes("cavalinho"),
    ),
  );

  const consulenteEntity = hasCavalinho
    ? draft?.selectedEntities.find(
        (entity) => entity.id === draft.cavalinhoConsulenteEntityId,
      ) ?? null
    : null;

  const actions = [
    { label: "Início", href: "#inicio", variant: "primary" as const },
    { label: "Voltar", href: backPath, variant: "secondary" as const },
    { label: "Funções", href: "#funcoes", variant: "secondary" as const },
    { label: "Agenda", href: "#agenda", variant: "secondary" as const },
    ...(hasCavalinho
      ? [{ label: "Entidades", href: "#entidades", variant: "secondary" as const }]
      : []),
    {
      label: "Ajuda",
      href: "#ajuda",
      variant: "secondary" as const,
      action: "supportWhatsapp" as const,
    },
  ];

  return (
    <main id="inicio" className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={actions}
        navLabel="Confirmação do primeiro acesso dos Filhos da Corrente"
        showSupport={false}
        mobileActionColumns={3}
      />
      <section className="mx-auto max-w-4xl px-3 py-2 sm:px-6 sm:py-4 lg:px-8">
        <div className="rounded-[1.5rem] bg-white p-3.5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:rounded-[2rem] sm:p-6">
          {!result ? (
            <>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Primeiro acesso</p>
              <h1 className="mt-1 text-2xl font-black leading-tight text-[#123D2C] sm:mt-2 sm:text-3xl">Confira antes de enviar para validação.</h1>
              {!draft ? (
                <div className="mt-5 rounded-2xl bg-amber-50 p-4 font-semibold text-amber-900 ring-1 ring-amber-200">
                  O cadastro não foi localizado neste navegador. <Link href={backPath} className="underline">Volte ao primeiro acesso</Link> e preencha novamente.
                </div>
              ) : (
                <>
                  <div className="mt-3 grid gap-2 rounded-[1.25rem] bg-[#EEF5EA] p-3 text-sm sm:mt-4 sm:grid-cols-2 sm:p-4">
                    <p><strong>Nome:</strong><br />{draft.fullName}</p>
                    <p><strong>WhatsApp:</strong><br />{draft.whatsapp}</p>
                    <p><strong>E-mail:</strong><br />{draft.email || "Não informado"}</p>
                    <p><strong>Observação:</strong><br />{draft.notes || "Não informada"}</p>
                  </div>
                  {draft.familyLinks?.length > 0 && (
                    <div className="mt-3 rounded-[1.25rem] border border-[#123D2C]/10 p-3 sm:p-4">
                      <h2 className="font-black text-[#123D2C]">Familiares vinculados</h2>
                      <ul className="mt-2 space-y-2 text-sm font-semibold text-slate-700">
                        {draft.familyLinks.map((item) => (
                          <li key={item.personId}>• {item.personName} — {item.relationshipLabel}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div id="funcoes" className="scroll-mt-40 rounded-[1.25rem] border border-[#123D2C]/10 p-3 sm:p-4">
                      <h2 className="font-black text-[#123D2C]">Funções</h2>
                      <ul className="mt-2 space-y-2 text-sm font-semibold text-slate-700">
                        {draft.selectedFunctions.map((item) => <li key={item.slug}>• {item.label}</li>)}
                      </ul>
                    </div>
                    <div id="agenda" className="scroll-mt-40 rounded-[1.25rem] border border-[#123D2C]/10 p-3 sm:p-4">
                      <h2 className="font-black text-[#123D2C]">Agenda</h2>
                      <ul className="mt-2 space-y-2 text-sm font-semibold text-slate-700">
                        {draft.selectedAgenda.map((item) => <li key={item.slug}>• {item.label}</li>)}
                      </ul>
                    </div>
                  </div>
                  {hasCavalinho && draft.selectedEntities.length > 0 && (
                    <div id="entidades" className="mt-3 grid scroll-mt-40 gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.25rem] border border-[#123D2C]/10 p-3 sm:p-4">
                        <h2 className="font-black text-[#123D2C]">Entidades que recebe</h2>
                        <ul className="mt-2 space-y-1 text-sm font-semibold text-slate-700">
                          {draft.selectedEntities.map((item) => <li key={item.id}>• {item.name}</li>)}
                        </ul>
                      </div>
                      <div className="rounded-[1.25rem] border border-[#123D2C]/10 p-3 sm:p-4">
                        <h2 className="font-black text-[#123D2C]">Entidade que atende Filhos de Fora/Consulentes</h2>
                        <p className="mt-2 text-sm font-semibold text-slate-700">
                          {consulenteEntity?.name || "Nenhuma das entidades selecionadas"}
                        </p>
                      </div>
                    </div>
                  )}
                  {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700 ring-1 ring-red-200">{error}</p>}
                  <div className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-2">
                    <Link href={backPath} className="rounded-2xl border border-[#123D2C]/20 px-5 py-4 text-center font-black text-[#123D2C]">Voltar e ajustar</Link>
                    <button type="button" onClick={submit} disabled={loading} className="rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white disabled:opacity-50">
                      {loading ? "Enviando..." : "Enviar para validação"}
                    </button>
                  </div>
                  <p className="mt-2 text-center text-[11px] leading-4 text-slate-500 sm:text-xs sm:leading-5">O WhatsApp será aberto em outra janela. Esta página continuará disponível para mostrar a confirmação e o link de acompanhamento.</p>
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

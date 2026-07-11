"use client";

import { useEffect, useMemo, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

type DraftItem = {
  slug: string;
  label: string;
  description?: string;
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
  createdAt: string;
};

type SubmitResponse = {
  ok?: boolean;
  message?: string;
  whatsappUrl?: string;
  error?: string;
};

const FIRST_ACCESS_DRAFT_KEY = "oh_tucxa_filho_corrente_primeiro_acesso";
const FORM_URL = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente?modo=primeiro-acesso&ajuste=1";

function asDraft(value: unknown): FirstAccessDraft | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<FirstAccessDraft>;
  if (!candidate.fullName || !candidate.whatsapp || !candidate.password) return null;
  return {
    fullName: String(candidate.fullName ?? ""),
    whatsapp: String(candidate.whatsapp ?? ""),
    email: String(candidate.email ?? ""),
    password: String(candidate.password ?? ""),
    notes: String(candidate.notes ?? ""),
    functionSlugs: Array.isArray(candidate.functionSlugs) ? candidate.functionSlugs.filter((item): item is string => typeof item === "string") : [],
    agendaSlugs: Array.isArray(candidate.agendaSlugs) ? candidate.agendaSlugs.filter((item): item is string => typeof item === "string") : [],
    selectedFunctions: Array.isArray(candidate.selectedFunctions) ? candidate.selectedFunctions.filter((item): item is DraftItem => Boolean(item && typeof item === "object" && "label" in item)) : [],
    selectedAgenda: Array.isArray(candidate.selectedAgenda) ? candidate.selectedAgenda.filter((item): item is DraftItem => Boolean(item && typeof item === "object" && "label" in item)) : [],
    createdAt: String(candidate.createdAt ?? new Date().toISOString()),
  };
}

function SectionCard({ title, emptyText, items }: { title: string; emptyText: string; items: DraftItem[] }) {
  return (
    <section className="rounded-3xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
      <h2 className="text-lg font-black text-[#123D2C]">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-2 rounded-2xl bg-white p-3 text-sm font-semibold text-slate-600 ring-1 ring-[#123D2C]/10">{emptyText}</p>
      ) : (
        <div className="mt-3 grid gap-2">
          {items.map((item) => (
            <article key={item.slug} className="rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10">
              <p className="font-black text-[#123D2C]">{item.label}</p>
              {item.description && <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{item.description}</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default function ConfirmarPrimeiroAcessoFilhoDaCorrentePage() {
  const [draft, setDraft] = useState<FirstAccessDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.sessionStorage.getItem(FIRST_ACCESS_DRAFT_KEY);
        setDraft(raw ? asDraft(JSON.parse(raw)) : null);
      } catch {
        window.sessionStorage.removeItem(FIRST_ACCESS_DRAFT_KEY);
        setDraft(null);
      } finally {
        setLoading(false);
      }
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const totalItems = useMemo(() => (draft?.selectedFunctions.length ?? 0) + (draft?.selectedAgenda.length ?? 0), [draft?.selectedAgenda.length, draft?.selectedFunctions.length]);

  async function confirmSubmit() {
    if (!draft) return;
    setSubmitting(true);
    setMessage("");
    setError("");
    setWhatsappUrl("");
    try {
      const response = await fetch("/api/organizacao-em-harmonia/filhos-corrente/acesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", ...draft }),
      });
      const result = (await response.json()) as SubmitResponse;
      if (!response.ok) throw new Error(result.error || "Não foi possível confirmar o envio.");
      window.sessionStorage.removeItem(FIRST_ACCESS_DRAFT_KEY);
      setMessage(result.message || "Cadastro enviado para validação do Tucxa.");
      setWhatsappUrl(result.whatsappUrl || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar para validação.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={[
          { label: "Voltar para ajustar", href: FORM_URL, variant: "secondary" },
          { label: "Site Tucxa", href: "/solucoes/organizacao-em-harmonia/tucxa", variant: "secondary" },
        ]}
        navLabel="Confirmação do Primeiro Acesso"
      />

      <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#2F6B43]">Primeiro acesso</p>
          <h1 className="mt-2 text-3xl font-black text-[#123D2C]">Confirme antes de enviar para validação</h1>
          <p className="mt-3 leading-7 text-slate-700">
            Confira seus dados, funções e agenda em uma visão organizada. Se precisar alterar algo, volte para ajustar: as seleções serão mantidas.
          </p>

          {loading && <p className="mt-5 rounded-3xl bg-[#E9F2E7] p-4 font-bold text-[#123D2C]">Carregando resumo...</p>}

          {!loading && !draft && (
            <div className="mt-5 rounded-3xl bg-amber-50 p-5 text-amber-900 ring-1 ring-amber-100">
              <p className="font-black">Não encontrei um resumo pendente neste navegador.</p>
              <p className="mt-2 text-sm leading-6">Volte ao Primeiro Acesso, revise seus dados e clique novamente em Enviar para validação do Tucxa.</p>
              <a href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente?modo=primeiro-acesso" className="mt-4 inline-flex rounded-2xl bg-[#123D2C] px-5 py-3 font-black text-white">
                Voltar ao Primeiro Acesso
              </a>
            </div>
          )}

          {draft && !message && (
            <div className="mt-6 grid gap-4">
              <section className="rounded-3xl bg-[#123D2C] p-4 text-white">
                <h2 className="text-lg font-black">Dados principais</h2>
                <div className="mt-3 grid gap-2 text-sm leading-6 sm:grid-cols-2">
                  <p><strong>Nome:</strong> {draft.fullName}</p>
                  <p><strong>WhatsApp:</strong> {draft.whatsapp}</p>
                  <p><strong>E-mail:</strong> {draft.email || "Não informado"}</p>
                  <p><strong>Itens selecionados:</strong> {totalItems}</p>
                </div>
                {draft.notes && <p className="mt-3 rounded-2xl bg-white/10 p-3 text-sm leading-6"><strong>Observação:</strong> {draft.notes}</p>}
              </section>

              <SectionCard title="Funções selecionadas" emptyText="Nenhuma função adicional marcada. O vínculo de Filho da Corrente será registrado automaticamente." items={draft.selectedFunctions} />
              <SectionCard title="Agenda selecionada" emptyText="Nenhum item de agenda selecionado." items={draft.selectedAgenda} />

              <section className="rounded-3xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 ring-1 ring-amber-100">
                <p className="font-black">Depois da confirmação</p>
                <p>O Tucxa receberá a solicitação para validação. Se você informou e-mail, também receberá uma cópia. A Automação Extrema ficará em cópia nos e-mails de acompanhamento.</p>
              </section>

              {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}

              <div className="grid gap-3 sm:grid-cols-2">
                <a href={FORM_URL} className="rounded-2xl bg-white px-5 py-4 text-center font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5">
                  Voltar para ajustar
                </a>
                <button type="button" onClick={confirmSubmit} disabled={submitting} className="rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white shadow-lg shadow-green-900/10 transition hover:-translate-y-0.5 disabled:opacity-60">
                  {submitting ? "Enviando..." : "Confirmar envio para validação"}
                </button>
              </div>
            </div>
          )}

          {message && (
            <div className="mt-6 rounded-3xl bg-emerald-50 p-5 text-emerald-900 ring-1 ring-emerald-100">
              <p className="text-xl font-black">{message}</p>
              <p className="mt-2 text-sm leading-6">Agora é só aguardar a validação do Tucxa. Você também pode enviar o resumo pelo WhatsApp da Automação Extrema para facilitar o acompanhamento.</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                {whatsappUrl && (
                  <a href={whatsappUrl} target="_blank" rel="noreferrer" className="rounded-2xl bg-[#31C16B] px-5 py-3 text-center font-black text-[#00334E]">
                    Enviar também pelo WhatsApp da AE
                  </a>
                )}
                <a href="/solucoes/organizacao-em-harmonia/tucxa" className="rounded-2xl bg-white px-5 py-3 text-center font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">
                  Voltar ao site do Tucxa
                </a>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

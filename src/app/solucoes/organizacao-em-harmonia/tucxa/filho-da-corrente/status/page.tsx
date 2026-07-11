"use client";

import { useEffect, useMemo, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

type DraftItem = {
  slug?: string;
  label?: string;
  description?: string;
};

type StatusRequest = {
  id: string;
  status: string;
  full_name: string | null;
  whatsapp: string | null;
  email: string | null;
  summary: {
    selectedFunctions?: DraftItem[];
    selectedAgenda?: DraftItem[];
    notes?: string;
  } | null;
  created_at: string;
  updated_at: string;
};

type StatusResponse = {
  ok?: boolean;
  request?: StatusRequest;
  error?: string;
};

const statusLabels: Record<string, string> = {
  pendente_validacao: "Aguardando validação do Tucxa",
  ativo: "Acesso aprovado",
  aprovado: "Acesso aprovado",
  ajuste_solicitado: "Ajuste solicitado",
  reprovado: "Cadastro reprovado",
  inativo: "Cadastro inativo",
};

function validItems(value: DraftItem[] | undefined) {
  return Array.isArray(value) ? value.filter((item) => item?.label) : [];
}

export default function StatusPrimeiroAcessoFilhoDaCorrentePage() {
  const [request, setRequest] = useState<StatusRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const token = new URLSearchParams(window.location.search).get("token") || "";
      if (!token) {
        setError("Link de acompanhamento inválido.");
        setLoading(false);
        return;
      }

      fetch("/api/organizacao-em-harmonia/filhos-corrente/acesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", token }),
      })
        .then(async (response) => {
          const result = (await response.json()) as StatusResponse;
          if (!response.ok || !result.request) throw new Error(result.error || "Não foi possível consultar o status.");
          setRequest(result.request);
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Erro ao consultar status."))
        .finally(() => setLoading(false));
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const functions = useMemo(() => validItems(request?.summary?.selectedFunctions), [request?.summary?.selectedFunctions]);
  const agenda = useMemo(() => validItems(request?.summary?.selectedAgenda), [request?.summary?.selectedAgenda]);

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={[
          { label: "Primeiro acesso", href: "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente?modo=primeiro-acesso", variant: "primary" },
          { label: "Site Tucxa", href: "/solucoes/organizacao-em-harmonia/tucxa", variant: "secondary" },
        ]}
        navLabel="Status do Primeiro Acesso"
      />

      <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#2F6B43]">Primeiro acesso</p>
          <h1 className="mt-2 text-3xl font-black text-[#123D2C]">Status da solicitação</h1>
          <p className="mt-3 leading-7 text-slate-700">Acompanhe aqui se o Tucxa já validou seus vínculos, funções e agenda.</p>

          {loading && <p className="mt-5 rounded-3xl bg-[#E9F2E7] p-4 font-bold text-[#123D2C]">Consultando status...</p>}
          {error && <p className="mt-5 rounded-3xl bg-red-50 p-4 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}

          {request && (
            <div className="mt-6 grid gap-4">
              <section className="rounded-3xl bg-[#123D2C] p-4 text-white">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7]">Situação atual</p>
                <h2 className="mt-2 text-2xl font-black">{statusLabels[request.status] ?? request.status}</h2>
                <div className="mt-4 grid gap-2 text-sm leading-6 sm:grid-cols-2">
                  <p><strong>Nome:</strong> {request.full_name || "Não informado"}</p>
                  <p><strong>WhatsApp:</strong> {request.whatsapp || "Não informado"}</p>
                  <p><strong>E-mail:</strong> {request.email || "Não informado"}</p>
                  <p><strong>Enviado em:</strong> {new Date(request.created_at).toLocaleString("pt-BR")}</p>
                </div>
              </section>

              <section className="rounded-3xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                <h2 className="text-lg font-black text-[#123D2C]">Funções</h2>
                <div className="mt-3 grid gap-2">
                  {functions.length ? functions.map((item) => <p key={item.slug || item.label} className="rounded-2xl bg-white p-3 font-semibold text-slate-700 ring-1 ring-[#123D2C]/10">{item.label}</p>) : <p className="rounded-2xl bg-white p-3 font-semibold text-slate-700 ring-1 ring-[#123D2C]/10">Somente Filho da Corrente</p>}
                </div>
              </section>

              <section className="rounded-3xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                <h2 className="text-lg font-black text-[#123D2C]">Agenda</h2>
                <div className="mt-3 grid gap-2">
                  {agenda.length ? agenda.map((item) => (
                    <article key={item.slug || item.label} className="rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10">
                      <p className="font-black text-[#123D2C]">{item.label}</p>
                      {item.description && <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{item.description}</p>}
                    </article>
                  )) : <p className="rounded-2xl bg-white p-3 font-semibold text-slate-700 ring-1 ring-[#123D2C]/10">Nenhum item de agenda selecionado.</p>}
                </div>
              </section>

              <p className="rounded-3xl bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900 ring-1 ring-amber-100">
                Se houver necessidade de ajuste, o Tucxa ou a Automação Extrema entrará em contato pelo WhatsApp informado.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

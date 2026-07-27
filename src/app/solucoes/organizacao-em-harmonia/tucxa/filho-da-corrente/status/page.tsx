"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

type DraftItem = { slug?: string; label?: string; description?: string };
type EntityItem = { id?: string; name?: string };
type RequestPayload = {
  id: string;
  status: string;
  full_name: string | null;
  whatsapp: string | null;
  email: string | null;
  summary: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

type ApiResponse = { ok?: boolean; request?: RequestPayload; error?: string };

const LOGIN_PATH = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login";

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asDraftItems(value: unknown): DraftItem[] {
  return Array.isArray(value)
    ? value.filter((item): item is DraftItem => Boolean(item) && typeof item === "object")
    : [];
}

function asEntities(value: unknown): EntityItem[] {
  return Array.isArray(value)
    ? value.filter((item): item is EntityItem => Boolean(item) && typeof item === "object")
    : [];
}

function statusPresentation(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (["ativo", "aprovado", "approved"].includes(normalized)) {
    return {
      label: "Acesso aprovado",
      description: "Seu cadastro foi aprovado. As informações validadas permanecem disponíveis abaixo.",
      className: "bg-emerald-50 text-emerald-900 ring-emerald-200",
      approved: true,
    };
  }
  if (["ajuste_solicitado", "ajustes_solicitados", "reprovado"].includes(normalized)) {
    return {
      label: "Ajustes solicitados",
      description: "O Tucxa solicitou ajustes. Confira as informações e entre em contato para orientar a atualização.",
      className: "bg-amber-50 text-amber-950 ring-amber-200",
      approved: false,
    };
  }
  return {
    label: "Aguardando aprovação",
    description: "Sua solicitação foi recebida e está em validação pelo Tucxa.",
    className: "bg-sky-50 text-sky-950 ring-sky-200",
    approved: false,
  };
}

export default function StatusPrimeiroAcessoFilhoCorrentePage() {
  const [request, setRequest] = useState<RequestPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      const token = new URLSearchParams(window.location.search).get("token")?.trim() || "";
      if (!token) {
        if (active) {
          setError("Link de acompanhamento inválido ou incompleto.");
          setLoading(false);
        }
        return;
      }

      void fetch("/api/organizacao-em-harmonia/filhos-corrente/acesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", token }),
      })
        .then(async (response) => {
          const payload = await response.json().catch(() => ({})) as ApiResponse;
          if (!response.ok || !payload.request) {
            throw new Error(payload.error || "Não foi possível consultar esta solicitação.");
          }
          if (active) setRequest(payload.request);
        })
        .catch((reason) => {
          if (active) setError(reason instanceof Error ? reason.message : "Não foi possível consultar esta solicitação.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const details = useMemo(() => {
    const summary = asRecord(request?.summary);
    const functions = asDraftItems(summary.selectedFunctions);
    const agenda = asDraftItems(summary.selectedAgenda);
    const entities = asEntities(summary.selectedEntities);
    const primaryId = asText(summary.cavalinhoConsulenteEntityId);
    const primaryEntity = entities.find((entity) => asText(entity.id) === primaryId) ?? null;
    return { functions, agenda, entities, primaryEntity };
  }, [request?.summary]);

  const presentation = statusPresentation(request?.status || "");
  const actions = [
    { label: "Início", href: "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente", variant: "secondary" as const },
    { label: "Entrar", href: LOGIN_PATH, variant: "primary" as const },
  ];

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader actions={actions} navLabel="Acompanhamento do primeiro acesso" />
      <section className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
        <article className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-[#123D2C]/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43]">Primeiro acesso</p>
          <h1 className="mt-2 break-words text-3xl font-black leading-tight text-[#123D2C]">Acompanhe a validação do seu cadastro.</h1>

          {loading && <p className="mt-5 rounded-2xl bg-slate-50 p-4 font-semibold text-slate-700">Consultando sua solicitação...</p>}
          {error && <p className="mt-5 rounded-2xl bg-red-50 p-4 font-bold text-red-700 ring-1 ring-red-200">{error}</p>}

          {request && (
            <>
              <section className={`mt-5 rounded-2xl p-4 ring-1 ${presentation.className}`}>
                <p className="text-lg font-black">{presentation.label}</p>
                <p className="mt-1 text-sm font-semibold leading-6">{presentation.description}</p>
              </section>

              <section className="mt-4 grid gap-3 rounded-[1.5rem] bg-[#EEF5EA] p-4 sm:grid-cols-2">
                <p><strong>Nome:</strong><br />{request.full_name || "Não informado"}</p>
                <p><strong>WhatsApp:</strong><br />{request.whatsapp || "Não informado"}</p>
                <p><strong>E-mail:</strong><br />{request.email || "Não informado"}</p>
                <p><strong>Situação:</strong><br />{presentation.label}</p>
              </section>

              <section className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-[#123D2C]/10 p-4">
                  <h2 className="font-black text-[#123D2C]">Funções</h2>
                  <ul className="mt-2 space-y-1 text-sm font-semibold text-slate-700">
                    {details.functions.length > 0
                      ? details.functions.map((item, index) => <li key={item.slug || `${item.label}-${index}`}>• {item.label || item.slug}</li>)
                      : <li>Não informadas</li>}
                  </ul>
                </div>
                <div className="rounded-[1.5rem] border border-[#123D2C]/10 p-4">
                  <h2 className="font-black text-[#123D2C]">Agenda</h2>
                  <ul className="mt-2 space-y-1 text-sm font-semibold text-slate-700">
                    {details.agenda.length > 0
                      ? details.agenda.map((item, index) => <li key={item.slug || `${item.label}-${index}`}>• {item.label || item.slug}</li>)
                      : <li>Não informada</li>}
                  </ul>
                </div>
              </section>

              {details.entities.length > 0 && (
                <section className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-[#123D2C]/10 p-4">
                    <h2 className="font-black text-[#123D2C]">Entidades que recebe</h2>
                    <ul className="mt-2 space-y-1 text-sm font-semibold text-slate-700">
                      {details.entities.map((entity, index) => <li key={entity.id || `${entity.name}-${index}`}>• {entity.name || "Entidade"}</li>)}
                    </ul>
                  </div>
                  <div className="rounded-[1.5rem] border border-[#123D2C]/10 p-4">
                    <h2 className="font-black text-[#123D2C]">Entidade que atende Filhos de Fora/Consulentes</h2>
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      {details.primaryEntity?.name || "Nenhuma das entidades selecionadas"}
                    </p>
                  </div>
                </section>
              )}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {presentation.approved && (
                  <Link href={LOGIN_PATH} className="rounded-2xl bg-[#123D2C] px-5 py-4 text-center font-black text-white">Entrar no painel</Link>
                )}
                <Link href="/solucoes/organizacao-em-harmonia/tucxa" className="rounded-2xl border border-[#123D2C]/20 px-5 py-4 text-center font-black text-[#123D2C]">Voltar ao site do Tucxa</Link>
              </div>
            </>
          )}
        </article>
      </section>
    </main>
  );
}

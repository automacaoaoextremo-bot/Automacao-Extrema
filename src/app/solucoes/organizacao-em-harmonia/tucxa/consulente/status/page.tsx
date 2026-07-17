"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

type StatusPayload = {
  ok?: boolean;
  error?: string;
  request?: {
    fullName?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    status?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    modules?: unknown;
  };
};

const statusLabels: Record<string, string> = {
  novo: "Cadastro recebido",
  pendente_validacao: "Acesso em organização",
  em_analise: "Em análise pela organização",
  aprovado: "Acesso liberado",
  ativo: "Acesso liberado",
  ajuste_solicitado: "Ajuste solicitado",
  reprovado: "Não liberado neste momento",
};

const headerActions = [
  {
    label: "Entrar",
    href: "/solucoes/organizacao-em-harmonia/tucxa/consulente/login",
    variant: "primary" as const,
  },
  {
    label: "Primeiro cadastro",
    href: "/solucoes/organizacao-em-harmonia/tucxa/consulente/cadastro",
    variant: "secondary" as const,
  },
  {
    label: "Site do Tucxa",
    href: "/solucoes/organizacao-em-harmonia/tucxa",
    variant: "secondary" as const,
  },
];

function formatDate(value?: string | null) {
  if (!value) return "não informado";

  return new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
}

function StatusFallback() {
  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader actions={headerActions} navLabel="Menu de status do cadastro" />
      <section className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Acompanhamento</p>
          <h1 className="mt-2 text-3xl font-black text-[#123D2C]">Status do cadastro</h1>
          <p className="mt-4 rounded-2xl bg-[#E9F2E7] p-4 text-sm font-bold text-[#123D2C]">Carregando acompanhamento...</p>
        </div>
      </section>
    </main>
  );
}

function StatusCadastroConsulenteTucxaContent() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [payload, setPayload] = useState<StatusPayload>({});
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) return;

    let isActive = true;

    fetch(`/api/organizacao-em-harmonia/site-tucxa/consulentes/status?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const result = (await response.json()) as StatusPayload;
        if (!response.ok) throw new Error(result.error || "Não foi possível consultar o acompanhamento.");
        if (isActive) setPayload(result);
      })
      .catch((error: unknown) => {
        if (!isActive) return;

        setPayload({
          error: error instanceof Error ? error.message : "Não foi possível consultar o acompanhamento.",
        });
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [token]);

  const effectivePayload = token ? payload : { error: "Link de acompanhamento não informado." };
  const effectiveLoading = Boolean(token) && loading;
  const status = effectivePayload.request?.status || "novo";
  const isApproved = ["aprovado", "ativo"].includes(status);

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader actions={headerActions} navLabel="Menu de status do cadastro" />

      <section className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Acompanhamento</p>
          <h1 className="mt-2 text-3xl font-black text-[#123D2C]">Status do cadastro</h1>

          {effectiveLoading && <p className="mt-4 rounded-2xl bg-[#E9F2E7] p-4 text-sm font-bold text-[#123D2C]">Consultando...</p>}
          {effectivePayload.error && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100">{effectivePayload.error}</p>}

          {effectivePayload.request && (
            <div className="mt-5 grid gap-4">
              <div className="rounded-3xl bg-[#E9F2E7] p-5 ring-1 ring-[#123D2C]/10">
                <p className="text-sm font-black text-[#123D2C]">{effectivePayload.request.fullName || "Cadastro recebido"}</p>
                <h2 className="mt-2 text-2xl font-black text-[#123D2C]">{statusLabels[status] || status}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Recebido em {formatDate(effectivePayload.request.createdAt)}. Última atualização em {formatDate(effectivePayload.request.updatedAt)}.
                </p>
              </div>

              <div className="rounded-3xl bg-white p-4 ring-1 ring-[#123D2C]/10">
                <p className="text-sm font-black text-[#123D2C]">Módulos disponíveis na área logada</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {["Atendimento em Harmonia", "Agenda Viva", "Corrente em Dia"].map((item) => (
                    <span key={item} className="rounded-2xl bg-[#F7FAF2] px-3 py-3 text-center text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {isApproved ? (
                <Link href="/solucoes/organizacao-em-harmonia/tucxa/consulente/login" className="rounded-2xl bg-[#123D2C] px-5 py-4 text-center font-black text-white shadow-lg shadow-green-900/10 transition hover:-translate-y-0.5">
                  Entrar na área do Consulente
                </Link>
              ) : (
                <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900 ring-1 ring-amber-100">
                  Seu cadastro foi recebido. Use o login do Consulente para acessar os módulos liberados. Se a organização precisar de ajuste, ela retornará pelo WhatsApp informado e por e-mail, quando preenchido.
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default function StatusCadastroConsulenteTucxaPage() {
  return (
    <Suspense fallback={<StatusFallback />}>
      <StatusCadastroConsulenteTucxaContent />
    </Suspense>
  );
}

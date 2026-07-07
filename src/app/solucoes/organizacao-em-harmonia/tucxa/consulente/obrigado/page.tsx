"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

const headerActions = [
  { label: "Acompanhar aprovação", href: "#acompanhamento", variant: "primary" as const },
  { label: "Entrar", href: "/solucoes/organizacao-em-harmonia/tucxa/consulente/login", variant: "secondary" as const },
  { label: "Site do Tucxa", href: "/solucoes/organizacao-em-harmonia/tucxa", variant: "secondary" as const },
];

function ObrigadoFallback() {
  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader actions={headerActions} navLabel="Menu de confirmação de cadastro do consulente" />
      <section className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Cadastro recebido</p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-[#123D2C] sm:text-4xl">Carregando confirmação...</h1>
        </div>
      </section>
    </main>
  );
}

function ObrigadoCadastroConsulenteTucxaContent() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const whatsapp = params.get("whatsapp") || "";
  const statusPath = `/solucoes/organizacao-em-harmonia/tucxa/consulente/status?token=${encodeURIComponent(token)}`;

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader actions={headerActions} navLabel="Menu de confirmação de cadastro do consulente" />

      <section className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Cadastro recebido</p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-[#123D2C] sm:text-4xl">Agora é só acompanhar a validação do Tucxa.</h1>
          <p className="mt-3 text-base leading-7 text-slate-700">
            Suas informações foram enviadas para conferência da organização. O retorno será feito pelo WhatsApp informado e também por e-mail, caso você tenha preenchido esse canal.
          </p>

          <div id="acompanhamento" className="mt-5 grid gap-3 rounded-3xl bg-[#E9F2E7] p-4 ring-1 ring-[#123D2C]/10">
            <p className="text-sm font-black text-[#123D2C]">Guarde este acompanhamento</p>
            <p className="text-sm leading-6 text-slate-700">
              Este link evita refazer cadastro e ajuda você a consultar se a aprovação ainda está em análise, se foi liberada ou se a organização pediu algum ajuste.
            </p>
            {token ? (
              <Link href={statusPath} className="rounded-2xl bg-[#123D2C] px-5 py-4 text-center text-sm font-black text-white shadow-lg shadow-green-900/10 transition hover:-translate-y-0.5">
                Ver acompanhamento da aprovação
              </Link>
            ) : (
              <p className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-900 ring-1 ring-amber-100">Link de acompanhamento não localizado. Entre em contato pelo WhatsApp do Tucxa.</p>
            )}
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noreferrer" className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5">
                Salvar no WhatsApp
              </a>
            )}
          </div>

          <div className="mt-5 rounded-3xl bg-[#123D2C] p-5 text-white">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#CFE2C7]">Depois da aprovação</p>
            <h2 className="mt-2 text-2xl font-black">Você terá acesso aos três módulos.</h2>
            <p className="mt-2 text-sm leading-6 text-[#EEF7EA]">
              Atendimento em Harmonia para agendamentos e orientações, Agenda Viva para acompanhar atividades e Corrente em Dia para contribuições identificadas.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function ObrigadoCadastroConsulenteTucxaPage() {
  return (
    <Suspense fallback={<ObrigadoFallback />}>
      <ObrigadoCadastroConsulenteTucxaContent />
    </Suspense>
  );
}

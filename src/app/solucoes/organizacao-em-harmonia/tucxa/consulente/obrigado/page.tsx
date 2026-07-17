"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

const loginPath = "/solucoes/organizacao-em-harmonia/tucxa/consulente/login";

const headerActions = [
  { label: "Entrar", href: loginPath, variant: "primary" as const },
  { label: "Primeiro cadastro", href: "/solucoes/organizacao-em-harmonia/tucxa/consulente/cadastro", variant: "secondary" as const },
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
  const whatsapp = params.get("whatsapp") || "";
  const loginHref = params.get("login") || loginPath;

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader actions={headerActions} navLabel="Menu de confirmação de cadastro do consulente" />

      <section className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Acesso liberado</p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-[#123D2C] sm:text-4xl">Seu cadastro foi recebido e seu acesso já está liberado.</h1>
          <p className="mt-3 text-base leading-7 text-slate-700">
            Entre com o WhatsApp ou e-mail cadastrado e a senha que você acabou de criar. Dentro da área logada ficam a Agenda Viva, o Atendimento em Harmonia, seus agendamentos e as contribuições identificadas quando aplicável.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link href={loginHref} className="rounded-2xl bg-[#123D2C] px-5 py-4 text-center font-black text-white shadow-lg shadow-green-900/10 transition hover:-translate-y-0.5">
              Entrar na área do Consulente
            </Link>
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noreferrer" className="rounded-2xl bg-[#E9F2E7] px-5 py-4 text-center font-black text-[#123D2C] ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5">
                Confirmar pelo WhatsApp
              </a>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#CFE2C7]">Próximos passos</p>
          <h2 className="mt-2 text-2xl font-black">Use a área logada para acompanhar o que é seu.</h2>
          <div className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-[#EEF7EA] sm:grid-cols-3">
            <p className="rounded-2xl bg-white/10 p-4">Agenda Viva com os eventos disponíveis para Consulentes / Filhos de Fora.</p>
            <p className="rounded-2xl bg-white/10 p-4">Atendimento em Harmonia para solicitar e acompanhar seus agendamentos.</p>
            <p className="rounded-2xl bg-white/10 p-4">Corrente em Dia para contribuições identificadas, quando desejar.</p>
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

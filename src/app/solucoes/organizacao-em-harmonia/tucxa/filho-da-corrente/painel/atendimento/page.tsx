import type { ReactNode } from "react";
import Link from "next/link";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

function PanelPageShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={[
          { label: "Painel", href: "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel", variant: "primary" },
          { label: "Site Tucxa", href: "/solucoes/organizacao-em-harmonia/tucxa", variant: "secondary" },
        ]}
        navLabel="Painel do Filho da Corrente"
      />
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Área exclusiva</p>
          <h1 className="mt-2 text-3xl font-black text-[#123D2C]">{title}</h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-700">{description}</p>
          <div className="mt-6 grid gap-4">{children}</div>
          <Link href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel" className="mt-6 inline-flex rounded-2xl bg-[#123D2C] px-5 py-3 font-black text-white">Voltar ao painel</Link>
        </div>
      </section>
    </main>
  );
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-3xl bg-[#F7FAF2] p-5 ring-1 ring-[#123D2C]/10">
      <h2 className="text-xl font-black text-[#123D2C]">{title}</h2>
      <div className="mt-3 text-sm font-semibold leading-7 text-slate-600">{children}</div>
    </article>
  );
}

export default function Page() {
  return (
    <PanelPageShell title="Atendimento em Harmonia" description="Orientações para atendimentos, retornos e responsabilidades durante os trabalhos.">
      <InfoCard title="Retorno com a mesma entidade">
        <p>Quando houver orientação de retorno, o ideal é manter o acompanhamento com a mesma entidade, para preservar continuidade, contexto e responsabilidade no atendimento.</p>
      </InfoCard>
      <InfoCard title="Cambonos e cavalinhos">
        <p>O Cambono apoia a entidade, cuida de anotações, ajuda na comunicação com o consulente e deve manter sigilo. O Cavalinho pode estar vinculado a uma ou mais entidades, e uma delas pode ser marcada como entidade de atendimento aos consulentes.</p>
      </InfoCard>
      <InfoCard title="Coordenação">
        <p>Dúvidas, situações fora do procedimento ou pedidos de retorno obrigatório devem ser comunicados à coordenação de forma discreta e responsável.</p>
      </InfoCard>
    </PanelPageShell>
  );
}

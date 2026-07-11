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
    <PanelPageShell title="Documentos do Tucxa" description="Consulta rápida aos principais documentos e orientações internas.">
      <InfoCard title="Regulamento do Tucxa">
        <p>Reúne horários de trabalhos, regras de participação, conduta, presença, comunicação e organização da casa.</p>
      </InfoCard>
      <InfoCard title="Procedimentos e orientações básicas">
        <p>Resume preparo material, alimentação, vestuário, banho de defesa, entrada no terreiro, silêncio, estudos e responsabilidade mediúnica.</p>
      </InfoCard>
      <InfoCard title="Manual para Cambonos">
        <p>Explica o papel do Cambono como apoio da entidade, sustentação energética, sigilo, anotações, orientação ao consulente e comunicação com a coordenação.</p>
      </InfoCard>
      <InfoCard title="Como usar esta área">
        <p>Os documentos devem ficar disponíveis para consulta constante, com busca e leitura por tópicos nas próximas evoluções.</p>
      </InfoCard>
    </PanelPageShell>
  );
}

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
    <PanelPageShell title="Agenda Viva" description="Organização dos eventos, grupos e atividades vinculados ao Filho da Corrente.">
      <InfoCard title="O que consultar aqui">
        <p>A Agenda Viva deve mostrar os eventos associados ao seu vínculo aprovado, priorizando datas futuras, localidade, recorrência e orientações úteis para participação.</p>
        <ul className="grid gap-2">
          <li>• Grupos de desenvolvimento e estudos</li>
          <li>• Atendimentos e transformações em que você está envolvido</li>
          <li>• Eventos sociais, Sementinha e atividades de apoio</li>
          <li>• Avisos de local, horário e recorrência</li>
        </ul>
      </InfoCard>
      <InfoCard title="Boa prática">
        <p>Use a Agenda Viva para reduzir dúvidas soltas em grupos e evitar retrabalho. Sempre confira se o evento é de Umbanda, estudo, social/comunidade ou Sementinha antes de se organizar.</p>
      </InfoCard>
    </PanelPageShell>
  );
}

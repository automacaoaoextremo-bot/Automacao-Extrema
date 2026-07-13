import type { ReactNode } from "react";
import Link from "next/link";
import { FilhoCorrentePanelHeader } from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";

function PanelPageShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader navLabel="Painel do Filho da Corrente" />
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
    <PanelPageShell title="Entidades e vínculos" description="Estrutura para consulta de entidades, linhas, dias e vínculos com Cavalinhos.">
      <InfoCard title="Dados recomendados por entidade">
        <ul className="grid gap-2">
          <li>• Nome da entidade</li>
          <li>• Linha ou corrente espiritual</li>
          <li>• Dias usuais de atendimento</li>
          <li>• Capacidade de atendimento por dia</li>
          <li>• Materiais ou orientações habituais</li>
          <li>• Cavalinho(s) vinculado(s)</li>
          <li>• Se atende consulentes ou apenas orientação interna</li>
        </ul>
      </InfoCard>
      <InfoCard title="Vínculo com Cavalinho">
        <p>Quem possui a função de Cavalinho pode estar associado a uma ou mais entidades. Uma delas pode ser indicada como entidade que atende consulentes, facilitando agendamentos, retornos e validação pela coordenação.</p>
      </InfoCard>
      <InfoCard title="Uso na Agenda Viva">
        <p>A disponibilidade das entidades deve ser cruzada com o calendário, capacidade diária e regras de encaminhamento, especialmente nas quartas-feiras de transformação.</p>
      </InfoCard>
    </PanelPageShell>
  );
}

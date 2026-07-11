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
    <PanelPageShell title="Corrente em Dia" description="Comunicação, compromissos e organização da vida administrativa da corrente.">
      <InfoCard title="Comunicação oficial">
        <p>O grupo de WhatsApp Recados TUCXA é o canal oficial de comunicados. Mantenha seus dados atualizados para não perder avisos importantes.</p>
      </InfoCard>
      <InfoCard title="Compromissos">
        <p>A manutenção da casa depende de organização, presença, comunicação de faltas, contribuições e participação consciente nas atividades.</p>
      </InfoCard>
      <InfoCard title="Opções de contribuição">
        <p>O Corrente em Dia deve permitir contribuições identificadas e, quando a organização habilitar, contribuições anônimas ou pontuais, com conferência segura pela tesouraria.</p>
        <ul className="grid gap-2">
          <li>• Contribuição mensal ou recorrente do Filho da Corrente</li>
          <li>• Contribuição pontual para campanhas, reformas ou eventos</li>
          <li>• Pix copia e cola, QR Code e instruções de pagamento</li>
          <li>• Envio de comprovante quando necessário</li>
          <li>• Status: aguardando, em conferência, aprovado ou pendente de ajuste</li>
          <li>• Histórico individual e lembretes respeitosos</li>
        </ul>
      </InfoCard>
      <InfoCard title="Próximas evoluções">
        <p>Este módulo pode concentrar contribuições, comprovantes, comunicados, pendências e orientações individuais de forma segura, sempre mostrando apenas o que faz sentido para cada Filho da Corrente.</p>
      </InfoCard>
    </PanelPageShell>
  );
}

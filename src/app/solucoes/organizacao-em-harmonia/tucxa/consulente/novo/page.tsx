import Link from "next/link";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { getTucxaPublicContent } from "@/lib/organizacao-em-harmonia/tucxa-public-content";

export const dynamic = "force-dynamic";

export default async function NovoConsulenteTucxaPage() {
  const content = await getTucxaPublicContent();
  const headerActions = [
    { label: "Cadastrar meus dados", href: "/solucoes/organizacao-em-harmonia/tucxa/consulente/cadastro", variant: "primary" as const },
    { label: content.atendimentoEmHarmonia.shortLabel, href: "/solucoes/organizacao-em-harmonia/tucxa/consulente/login?destino=atendimento", variant: "secondary" as const },
    { label: content.agendaViva.shortLabel, href: "/solucoes/organizacao-em-harmonia/tucxa/consulente/login?destino=agenda", variant: "secondary" as const },
    { label: content.correnteEmDia.shortLabel, href: "/solucoes/organizacao-em-harmonia/tucxa/consulente/contribuicao", variant: "secondary" as const },
    { label: "Site do Tucxa", href: "/solucoes/organizacao-em-harmonia/tucxa", variant: "secondary" as const },
  ];

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader actions={headerActions} navLabel="Orientações para quem é novo no Tucxa" />

      <section className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="rounded-[1.75rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7">
          <p className="text-xs font-black tracking-[0.22em] text-[#2F6B43] sm:text-sm">É novo por aqui?</p>
          <h1 className="mt-2 max-w-4xl text-3xl font-black leading-tight text-[#123D2C] sm:text-4xl lg:text-[2.8rem]">
            Entenda como o Tucxa acolhe, orienta e organiza os atendimentos.
          </h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-slate-700 sm:text-[1.05rem] sm:leading-8">
            {content.newHereIntro}
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {content.consulenteGuidelines.map((item) => (
            <article key={item.title} className="rounded-[1.75rem] bg-white p-5 shadow-lg shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6">
              <h2 className="text-xl font-black text-[#123D2C]">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">{item.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-5 rounded-[1.75rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-7">
          <p className="text-xs font-black tracking-[0.22em] text-[#CFE2C7] sm:text-sm">Próximo passo</p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">Quer agendar, alterar atendimento ou contribuir de forma identificada?</h2>
          <p className="mt-3 max-w-4xl text-base leading-7 text-[#EEF7EA]">
            Primeiro, faça um cadastro simples com nome completo, WhatsApp, e-mail opcional e senha. O acesso de Consulente / Filho de Fora fica liberado logo após o envio, e as orientações aparecem na área logada.
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/solucoes/organizacao-em-harmonia/tucxa/consulente/cadastro" className="rounded-2xl bg-white px-5 py-3.5 text-center text-sm font-black text-[#123D2C] transition hover:-translate-y-0.5 sm:text-base">
              Fazer cadastro de consulente
            </Link>
            <Link href="/solucoes/organizacao-em-harmonia/tucxa/consulente/login?destino=atendimento" className="rounded-2xl bg-[#E9F2E7] px-4 py-3 text-center text-sm font-black text-[#123D2C] transition hover:-translate-y-0.5 sm:text-base">
              {content.atendimentoEmHarmonia.shortLabel}
            </Link>
            <Link href="/solucoes/organizacao-em-harmonia/tucxa/consulente/login?destino=agenda" className="rounded-2xl bg-[#E9F2E7] px-4 py-3 text-center text-sm font-black text-[#123D2C] transition hover:-translate-y-0.5 sm:text-base">
              {content.agendaViva.shortLabel}
            </Link>
            <Link href="/solucoes/organizacao-em-harmonia/tucxa/consulente/contribuicao?tipo=anonima" className="rounded-2xl bg-[#E9F2E7] px-4 py-3 text-center text-sm font-black text-[#123D2C] transition hover:-translate-y-0.5 sm:text-base">
              Contribuir anonimamente
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { consulenteServices } from "../tucxa-content";

const guidance = [
  "Chegue com antecedência e siga as orientações da recepção e organização.",
  "O atendimento é individual e respeitoso. Evite retirar senha ou ficha para outra pessoa.",
  "Quando houver encaminhamento, a coordenação orientará o preparo e a data adequada.",
  "A contribuição é uma forma de ajudar a manutenção da casa e pode ser feita de forma identificada ou anônima.",
];

const headerActions = [
  {
    label: "Orientação / cadastro",
    href: "/solucoes/organizacao-em-harmonia/tucxa/consulente/cadastro",
    variant: "primary" as const,
  },
  {
    label: "Contribuição",
    href: "/solucoes/organizacao-em-harmonia/tucxa/consulente/cadastro?tipo=contribuicao",
    variant: "secondary" as const,
  },
  {
    label: "Voltar ao site",
    href: "/solucoes/organizacao-em-harmonia/tucxa",
    variant: "secondary" as const,
  },
];

const sectionLinks = [
  { label: "Acolhimento", href: "#acolhimento" },
  { label: "Orientações", href: "#orientacoes" },
];

export default function ConsulenteTucxaPage() {
  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader actions={headerActions} sectionLinks={sectionLinks} navLabel="Menu de consulentes do Tucxa" />

      <section id="acolhimento" className="scroll-mt-48 mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="rounded-[1.75rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7] sm:text-sm">Filhos de Fora</p>
          <h1 className="mt-2 max-w-4xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
            Um espaço de acolhimento para quem busca auxílio espiritual.
          </h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-[#EEF7EA] sm:text-lg sm:leading-8">
            O Tucxa recebe pessoas que procuram orientação, fortalecimento e crescimento espiritual. A organização do atendimento existe para que cada consulente seja recebido com respeito, clareza e segurança.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link href="/solucoes/organizacao-em-harmonia/tucxa/consulente/cadastro" className="rounded-2xl bg-white px-5 py-3.5 text-center text-sm font-black text-[#123D2C] transition hover:-translate-y-0.5 sm:text-base">
              Quero orientação / cadastro
            </Link>
            <Link href="/solucoes/organizacao-em-harmonia/tucxa/consulente/cadastro?tipo=contribuicao" className="rounded-2xl bg-[#E9F2E7] px-5 py-3.5 text-center text-sm font-black text-[#123D2C] transition hover:-translate-y-0.5 sm:text-base">
              Fazer contribuição
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {consulenteServices.map((service) => (
            <article key={service.title} className="rounded-[1.75rem] bg-white p-5 shadow-lg shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6">
              <h2 className="text-lg font-black text-[#123D2C] sm:text-xl">{service.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">{service.description}</p>
            </article>
          ))}
        </div>

        <div id="orientacoes" className="mt-5 rounded-[1.75rem] bg-white p-5 shadow-lg shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43] sm:text-sm">Como se preparar</p>
          <h2 className="mt-2 text-2xl font-black text-[#123D2C] sm:text-3xl">Orientações simples para uma experiência mais tranquila.</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {guidance.map((item) => (
              <div key={item} className="rounded-2xl bg-[#F7FAF2] p-4 text-sm font-bold leading-6 text-[#123D2C] ring-1 ring-[#123D2C]/10 sm:text-base sm:leading-7">
                {item}
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-2xl bg-[#E9F2E7] p-4 text-sm font-semibold leading-6 text-[#123D2C]">
            As informações detalhadas de horário, fichas, senhas e encaminhamentos podem ser ajustadas pela organização do Tucxa conforme calendário, orientação da Diretoria e necessidade da casa.
          </p>
        </div>
      </section>
    </main>
  );
}

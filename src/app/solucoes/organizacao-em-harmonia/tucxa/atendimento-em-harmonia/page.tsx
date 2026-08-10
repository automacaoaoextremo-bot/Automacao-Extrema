import Link from "next/link";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

const base = "/solucoes/organizacao-em-harmonia/tucxa";

const actions = [
  { label: "Início", href: "#inicio", variant: "primary" as const },
  { label: "Filhos de Fora", href: "#consulentes", variant: "secondary" as const },
  { label: "Filhos da Corrente", href: "#corrente", variant: "secondary" as const },
  { label: "Voltar", href: `${base}#modulos`, variant: "secondary" as const },
  {
    label: "Dúvidas?",
    href: "#duvidas",
    variant: "secondary" as const,
    action: "supportWhatsapp" as const,
  },
];

const audienceCards = [
  {
    id: "consulentes",
    eyebrow: "Filhos de Fora / Consulentes",
    title: "Cuidar bem começa antes do atendimento.",
    description:
      "Este módulo organiza as informações que o Filho de Fora ou Consulente precisa conhecer para chegar, aguardar, receber seu atendimento e seguir corretamente uma orientação de retorno ou Transformação.",
    alreadyRegisteredHref: `${base}/consulente/login`,
    notRegisteredHref: `${base}/consulente/cadastro`,
  },
  {
    id: "corrente",
    eyebrow: "Filhos da Corrente",
    title: "Clareza para servir sem perder o cuidado humano.",
    description:
      "Este módulo organiza o que precisa ser lembrado, registrado e encaminhado para que a recepção, os cambonos e a corrente trabalhem com mais clareza, sem perder o cuidado humano do Tucxa.",
    alreadyRegisteredHref: `${base}/filho-da-corrente/login`,
    notRegisteredHref: `${base}/filho-da-corrente/primeiro-acesso`,
  },
];

const stages = [
  {
    title: "Antes",
    text: "Orientações, horários e preparo reunidos em um único lugar para reduzir dúvidas e mensagens perdidas.",
  },
  {
    title: "Durante",
    text: "Recepção e corrente visualizam somente o necessário para acolher, encaminhar e registrar com responsabilidade.",
  },
  {
    title: "Depois",
    text: "Retornos e orientações de Transformação ficam mais claros para que o cuidado continue além do atendimento.",
  },
];

export default function AtendimentoEmHarmoniaPublicPage() {
  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={actions}
        navLabel="Menu do Atendimento em Harmonia"
        showSupport={false}
      />

      <section
        id="inicio"
        className="mx-auto grid max-w-6xl scroll-mt-48 gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-8"
      >
        <div className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7]">
            Atendimento em Harmonia
          </p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
            Informação certa antes, durante e depois do atendimento.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#EEF7EA] sm:text-lg sm:leading-8">
            Quando cada pessoa sabe como chegar, quem precisa acolher e o que deve ser encaminhado, o atendimento fica mais organizado sem se tornar frio. A tecnologia entra para proteger o cuidado, não para substituir o contato humano.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {stages.map((stage) => (
            <article
              key={stage.title}
              className="rounded-[1.75rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10"
            >
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
                {stage.title}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-700 sm:text-base">
                {stage.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-2">
          {audienceCards.map((card) => (
            <article
              key={card.id}
              id={card.id}
              className="scroll-mt-48 rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7"
            >
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43]">
                {card.eyebrow}
              </p>
              <h2 className="mt-2 text-2xl font-black leading-tight text-[#123D2C] sm:text-3xl">
                {card.title}
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-700">
                {card.description}
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Link
                  href={card.alreadyRegisteredHref}
                  className="rounded-2xl bg-[#123D2C] px-5 py-4 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#2F6B43] sm:text-base"
                >
                  Já tenho cadastro
                </Link>
                <Link
                  href={card.notRegisteredHref}
                  className="rounded-2xl bg-[#E9F2E7] px-5 py-4 text-center text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 sm:text-base"
                >
                  Ainda não tenho cadastro
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

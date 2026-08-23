import Link from "next/link";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

const BASE = "/solucoes/organizacao-em-harmonia/tucxa/sementinha";

const headerActions = [
  { label: "Início", href: `${BASE}#inicio`, variant: "primary" as const },
  {
    label: "Voltar",
    href: "/solucoes/organizacao-em-harmonia/tucxa?semPopup=1#modulos",
    variant: "secondary" as const,
  },
  { label: "Visão", href: `${BASE}#visao`, variant: "secondary" as const },
  { label: "Acessos", href: `${BASE}#modulos`, variant: "secondary" as const },
  {
    label: "Prestação de Contas",
    href: `${BASE}/transparencia`,
    variant: "secondary" as const,
  },
  {
    label: "Ajuda",
    href: "#ajuda",
    variant: "secondary" as const,
    action: "supportWhatsapp" as const,
  },
];

const visionCards = [
  {
    eyebrow: "Segurança",
    title: "Saber que cada doação pode ser cuidada até chegar a quem precisa.",
    text: "Organização de estoque, validade, entregas e recursos reduz perdas e dá mais segurança para decidir o próximo passo.",
  },
  {
    eyebrow: "Tempo",
    title: "Encontrar a informação sem depender de uma planilha ou de estar na sede.",
    text: "Quem está autorizado consulta o que precisa pelo celular e usa o tempo para organizar a ação, não para procurar dados.",
  },
  {
    eyebrow: "Realização",
    title: "Enxergar o cuidado acontecendo, da entrada até a entrega.",
    text: "A visão integrada conecta doações, bazar, ações, estoque e prestação de contas para mostrar o impacto do trabalho coletivo.",
  },
];

const modules = [
  {
    title: "Despensa Viva",
    text: "Controle alimentos por lote e validade, orienta o PVPS, calcula a capacidade de cestas e registra entregas.",
    href: `${BASE}/despensa-viva`,
    cta: "Abrir Despensa Viva",
    active: true,
  },
  {
    title: "Bazar Beneficente",
    text: "O Bazar online e beneficente transforma doações em recursos revertidos em benefícios às famílias carentes e conecta essa arrecadação às ações do Sementinha.",
    href: "https://www.instagram.com/bazardosementinha/",
    cta: "Conhecer o Bazar",
    active: true,
    external: true,
  },
  {
    title: "Ações em Comunidades",
    text: "Visão planejada para organizar comunidades atendidas, necessidades, responsáveis, itens separados e entregas realizadas.",
    href: "#prestacao-de-contas",
    cta: "Ver visão integrada",
    active: false,
  },
  {
    title: "Bingo Beneficente",
    text: "Visão planejada para conectar as ações de arrecadação aos resultados e à prestação de contas do Sementinha.",
    href: "#prestacao-de-contas",
    cta: "Ver prestação de contas",
    active: false,
  },
];

export default function SementinhaEmHarmoniaPage() {
  return (
    <main id="inicio" className="min-h-screen bg-[#F6FAF2] text-[#173323]">
      <TucxaPublicHeader
        actions={headerActions}
        showSupport={false}
        mobileActionColumns={3}
        compactMobileActions
      />

      <section className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-7 lg:px-8">
        <article className="overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-green-900/10 ring-1 ring-[#123D2C]/10">
          <div className="bg-gradient-to-br from-[#123D2C] via-[#2F6B43] to-[#5B8C55] p-5 text-white sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#DDF0D4]">
              Sementinha em Harmonia
            </p>
            <h1 className="mt-2 max-w-4xl text-3xl font-black leading-tight sm:text-5xl">
              Caridade que chega mais longe quando cuidado, informação e transparência caminham juntos.
            </h1>
            <p className="mt-3 max-w-4xl text-base font-semibold leading-7 text-[#F0F8EC] sm:text-lg sm:leading-8">
              O Sementinha reúne ações solidárias que mobilizam pessoas, doações e recursos. Esta página transforma esse movimento em uma visão simples: o que fazemos, quais módulos apoiam a rotina e como acompanhar a prestação de contas.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link
                href="#visao"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#123D2C] shadow-lg transition hover:-translate-y-0.5 sm:text-base"
              >
                Entender a visão
              </Link>
              <Link
                href={`${BASE}/transparencia`}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/20 sm:text-base"
              >
                Acompanhar prestação de contas
              </Link>
            </div>
          </div>
        </article>
      </section>

      <section id="visao" className="scroll-mt-44 mx-auto max-w-6xl px-3 pb-6 sm:px-6 lg:px-8">
        <div className="mb-3">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">Visão</p>
          <h2 className="mt-1 max-w-4xl text-2xl font-black leading-tight sm:text-3xl">
            Mais do que controlar itens: ajudar quem cuida a decidir melhor e mostrar a quem ajuda o caminho do cuidado.
          </h2>
          <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600 sm:text-base">
            A proposta parte daquilo que as pessoas realmente buscam quando participam de uma ação solidária: segurança, tempo bem utilizado e a realização de ver a ajuda virar benefício concreto.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {visionCards.map((card) => (
            <article key={card.eyebrow} className="rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10 sm:p-5">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#2F6B43]">{card.eyebrow}</p>
              <h3 className="mt-1 text-lg font-black leading-6 text-[#173323]">{card.title}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{card.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="modulos" className="scroll-mt-44 mx-auto max-w-6xl px-3 pb-6 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-[#EEF6E9] p-4 ring-1 ring-[#123D2C]/10 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">Acessos</p>
          <h2 className="mt-1 text-2xl font-black sm:text-3xl">Um ecossistema que pode crescer sem perder a simplicidade.</h2>
          <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600 sm:text-base">
            Cada módulo existe para resolver uma parte concreta da rotina e, juntos, formar uma visão única do Sementinha.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {modules.map((module) => (
              <article key={module.title} className="rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-black text-[#173323]">{module.title}</h3>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${module.active ? "bg-[#E8F6ED] text-[#2F6B43]" : "bg-amber-50 text-amber-800"}`}>
                    {module.active ? "Disponível" : "Evolução"}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{module.text}</p>
                {module.external ? (
                  <a
                    href={module.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex rounded-xl bg-[#123D2C] px-4 py-2.5 text-sm font-black text-white"
                  >
                    {module.cta}
                  </a>
                ) : (
                  <Link href={module.href} className="mt-3 inline-flex rounded-xl bg-[#123D2C] px-4 py-2.5 text-sm font-black text-white">
                    {module.cta}
                  </Link>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="prestacao-de-contas" className="scroll-mt-44 mx-auto max-w-6xl px-3 pb-8 sm:px-6 lg:px-8">
        <article className="overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-green-900/10 ring-1 ring-[#123D2C]/10">
          <div className="bg-gradient-to-br from-[#123D2C] to-[#2F6B43] p-5 text-white sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7]">Prestação de Contas</p>
            <h2 className="mt-2 max-w-4xl text-2xl font-black leading-tight sm:text-3xl">
              Transparência para ligar arrecadação, despesas e continuidade das ações.
            </h2>
            <p className="mt-3 max-w-4xl text-base leading-7 text-[#EEF7EA] sm:text-lg sm:leading-8">
              Os balancetes de janeiro a junho de 2026 ficam reunidos em uma leitura mensal com receitas, despesas, resultado e saldo, preservando os lançamentos informados nos documentos do Sementinha.
            </p>
            <Link
              href={`${BASE}/transparencia`}
              className="mt-5 inline-flex w-full justify-center rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-[#123D2C] shadow-lg transition hover:-translate-y-0.5 sm:w-auto sm:text-base"
            >
              Acompanhar prestação de contas
            </Link>
            <p className="mt-1.5 text-center text-[10px] font-black uppercase tracking-[0.18em] text-[#CFE2C7] sm:w-fit sm:px-4 sm:text-xs">
              TOQUE PARA ABRIR
            </p>
          </div>
        </article>
      </section>
    </main>
  );
}

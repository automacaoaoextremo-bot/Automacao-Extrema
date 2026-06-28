import Image from "next/image";
import Link from "next/link";
import { AeSolutionHeader, type SolutionSectionLink } from "@/components/ae-solution-header";
import { moduleInfo, ORGANIZACAO_MODULOS, type OrganizacaoModulo } from "@/lib/organizacao-em-harmonia";

const solutionLinks: SolutionSectionLink[] = [
  { label: "Visão", href: "#visao" },
  { label: "Módulos", href: "#modulos" },
  { label: "Base Única", href: "#base-unica" },
  { label: "Como Funciona", href: "#como-funciona" },
  { label: "Cliente Fundador", href: "#cliente-fundador" },
];

const headerActions = [
  { label: "Quero Conhecer", href: "/solucoes/organizacao-em-harmonia/quero-conhecer", variant: "primary" as const },
  { label: "Já sou Cliente", href: "/solucoes/corrente-em-dia/login", variant: "secondary" as const },
];

function whatsappUrl(message: string) {
  const phone = (process.env.NEXT_PUBLIC_AE_WHATSAPP_NUMBER || "5519989848246").replace(/\D/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

const baseItems = [
  "Uma pessoa cadastrada uma vez pode ser contribuinte, cambono, responsável por evento ou aprovador.",
  "Funções e permissões configuráveis por organização, sem amarrar todos os clientes ao mesmo processo.",
  "Aprovações por perfil: quem cria, quem aprova, quem edita, quem cancela e quem visualiza relatórios.",
  "Histórico e auditoria para reduzir ruído, sem expor dados sensíveis desnecessários.",
];

const deepDiveBenefits = [
  "Menos tempo perdido procurando comprovante, escala, agenda ou decisão em conversas antigas.",
  "Menos tensão na hora de atender, cobrar, remanejar, encaixar ou explicar uma mudança.",
  "Mais segurança para diretoria e coordenação, porque regras e permissões ficam claras.",
  "Mais reconhecimento para quem cuida da organização, com rotina mais previsível e menos retrabalho.",
];

export function OrganizacaoEmHarmoniaLanding({ module = "organizacao-em-harmonia" }: { module?: OrganizacaoModulo }) {
  const current = moduleInfo(module);
  const isUmbrella = module === "organizacao-em-harmonia";
  const headline = isUmbrella
    ? "Organização, atendimento, calendário e contribuições trabalhando na mesma base."
    : current.headline;
  const subheadline = isUmbrella
    ? "Uma suíte modular para organizações que precisam reduzir desencontros, retrabalho e decisões soltas no WhatsApp, com processos configuráveis e mobile-first."
    : current.description;
  const query = module === "organizacao-em-harmonia" ? "" : `?modulo=${module}`;
  const waMessage = `Olá! Quero conhecer a ${current.name} e entender como validar essa solução como Cliente Fundador.`;

  return (
    <main className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <AeSolutionHeader
        solutionName={current.name}
        logoSrc={current.logoSrc}
        logoAlt={`Logo ${current.name}`}
        actions={headerActions.map((action) => ({ ...action, href: action.href + (action.label === "Quero Conhecer" ? query : "") }))}
        sectionLinks={solutionLinks}
        homeHref={current.href}
      />

      <section id="visao" className="scroll-mt-56 border-b border-[#dfe8df] bg-[#f6fbf8]">
        <div className="mx-auto grid max-w-6xl gap-7 px-4 py-7 lg:grid-cols-[1.05fr_0.95fr] lg:py-12">
          <div className="space-y-4">
            <p className="text-sm font-black uppercase tracking-[0.35em] text-[#2F6B43]">
              Suíte modular Automação Extrema
            </p>
            <h1 className="text-4xl font-black leading-[1.08] text-[#00334E] sm:text-5xl">{headline}</h1>
            <p className="max-w-3xl text-lg leading-8 text-slate-700">{subheadline}</p>
            <div className="rounded-3xl bg-white p-4 text-sm font-semibold leading-6 text-slate-700 shadow-sm ring-1 ring-slate-100 sm:text-base sm:leading-7">
              A proposta não é colocar mais um sistema na rotina. É começar pelas dores reais, organizar critérios, preservar o jeito humano da organização e criar uma base simples para melhorar com segurança.
            </div>
            <div className="grid gap-3 sm:max-w-xl sm:grid-cols-2">
              <Link
                href={`/solucoes/organizacao-em-harmonia/quero-conhecer${query}`}
                className="rounded-2xl bg-[#31C16B] px-5 py-4 text-center text-base font-black text-[#00334E] shadow-lg shadow-emerald-200 ring-2 ring-[#31C16B]/20 transition hover:-translate-y-0.5 hover:bg-[#43db7c] hover:shadow-xl"
              >
                Quero Conhecer
              </Link>
              <a
                href={whatsappUrl(waMessage)}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border-2 border-[#00334E] bg-white px-5 py-4 text-center text-base font-black text-[#00334E] shadow-md transition hover:-translate-y-0.5 hover:bg-[#00334E] hover:text-white"
              >
                Falar no WhatsApp
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-4 shadow-xl sm:p-5">
            <div className="rounded-[1.5rem] bg-[#00334E] p-5 text-white">
              <p className="text-sm font-bold text-emerald-300">Painel integrado</p>
              <h2 className="mt-2 text-2xl font-black">Uma memória operacional para a organização.</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ["Pessoas", "Base única"],
                  ["Funções", "Permissões"],
                  ["Atividades", "Aprovação"],
                  ["Atendimento", "Fila e retorno"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/60">{label}</p>
                    <p className="mt-1 text-xl font-black">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-slate-200 p-4">
              <p className="font-black text-[#00334E]">Fluxo configurável</p>
              <ol className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-700">
                <li>1. Cadastra pessoas, funções e permissões.</li>
                <li>2. Ativa os módulos contratados.</li>
                <li>3. Define quem aprova, edita e visualiza.</li>
                <li>4. Opera pelo celular ou computador.</li>
              </ol>
              <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
                <strong>Mobile-first:</strong> pensado para diretoria, coordenação, recepção, voluntários e responsáveis usarem com clareza, mesmo em rotinas corridas.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="modulos" className="scroll-mt-56 mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#2F6B43]">Módulos</p>
          <h2 className="mt-2 text-3xl font-black leading-tight text-[#00334E] sm:text-4xl">
            Assine separado ou combine tudo em uma operação mais integrada.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {ORGANIZACAO_MODULOS.map((item) => (
            <Link key={item.slug} href={item.href} className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-xl">
              <Image src={item.logoSrc} alt={`Logo ${item.name}`} width={56} height={56} className="h-14 w-14 rounded-2xl object-cover" />
              <p className="mt-4 text-lg font-black text-[#00334E]">{item.name}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section id="base-unica" className="scroll-mt-56 mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-[2rem] bg-white p-6 shadow sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-[#2F6B43]">Base única</p>
          <h2 className="mt-2 text-3xl font-black text-[#00334E]">Pessoas, funções e permissões compartilhadas.</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {baseItems.map((item) => (
              <div key={item} className="rounded-2xl bg-slate-50 p-4 font-semibold leading-7 text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="scroll-mt-56 mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] bg-[#00334E] p-6 text-white shadow sm:p-8">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-300">Oceano Azul</p>
            <h2 className="mt-2 text-3xl font-black">Não é só calendário, fila ou cobrança.</h2>
            <p className="mt-3 leading-7 text-white/80">
              É uma forma de transformar o que hoje fica espalhado em conversas, folhas e memória em uma rotina clara, segura e configurável para cada organização.
            </p>
          </div>
          <div className="grid gap-3">
            {deepDiveBenefits.map((benefit) => (
              <div key={benefit} className="rounded-2xl bg-white p-4 text-sm font-semibold leading-6 text-slate-700 shadow-sm ring-1 ring-slate-100">
                {benefit}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cliente-fundador" className="scroll-mt-56 mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-[2rem] bg-white p-6 shadow sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-[#2F6B43]">Cliente Fundador</p>
          <h2 className="mt-2 text-3xl font-black text-[#00334E]">Validação com a diretoria, antes de virar produto comercial.</h2>
          <p className="mt-3 max-w-4xl leading-7 text-slate-700">
            A recomendação é validar os três módulos com uma organização real, começando por regras, permissões, responsáveis e indicadores. Depois, transformar o aprendizado em pacotes comerciais mensais, semestrais e anuais.
          </p>
          <Link
            href={`/solucoes/organizacao-em-harmonia/quero-conhecer${query}`}
            className="mt-6 inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#31C16B] px-6 py-4 text-base font-black text-[#00334E] shadow-lg shadow-emerald-200 transition hover:-translate-y-0.5 hover:bg-[#43db7c]"
          >
            Quero validar como Cliente Fundador
          </Link>
        </div>
      </section>
    </main>
  );
}

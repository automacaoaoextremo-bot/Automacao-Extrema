import Image from "next/image";
import Link from "next/link";
import { AeSolutionHeader, type SolutionSectionLink } from "@/components/ae-solution-header";
import {
  interesseQuery,
  moduleInfo,
  ORGANIZACAO_MODULOS_COMERCIAIS,
  type OrganizacaoModulo,
} from "@/lib/organizacao-em-harmonia";

const solutionLinks: SolutionSectionLink[] = [
  { label: "Visão", href: "#visao" },
  { label: "Módulos", href: "#modulos" },
  { label: "Base Única", href: "#base-unica" },
  { label: "Benefícios", href: "#beneficios" },
  { label: "Como Funciona", href: "#como-funciona" },
  { label: "Cliente Fundador", href: "#cliente-fundador" },
];

const headerActions = [
  { label: "Quero Conhecer", href: "/solucoes/organizacao-em-harmonia/quero-conhecer", variant: "primary" as const },
  { label: "Já sou Cliente", href: "/solucoes/organizacao-em-harmonia/cliente", variant: "secondary" as const },
];

const suiteBenefits = [
  "Uma base única para pessoas, funções e permissões compartilhada entre todos os módulos.",
  "Menos tempo perdido procurando comprovante, escala, agenda ou decisão em conversas antigas.",
  "Regras configuráveis por organização: quem cria, quem aprova, quem edita e quem acompanha.",
  "Módulos independentes ou combinados, permitindo começar pequeno e evoluir sem recadastrar tudo.",
  "Fluxos mobile-first para diretoria, coordenação, recepção, voluntários e responsáveis.",
  "Mais clareza para decisões, menos retrabalho operacional e mais segurança na rotina.",
];

const benefitsByModule: Record<OrganizacaoModulo, string[]> = {
  "organizacao-em-harmonia": suiteBenefits,
  "pacote-completo": suiteBenefits,
  "corrente-em-dia": [
    "Contribuições, Pix, comprovantes e aprovações conectados à mesma base de pessoas.",
    "Lembretes respeitosos, sem exposição e sem cobrança agressiva.",
    "Relatórios de pagos, pendentes, em revisão e divergentes para a gestão acompanhar com clareza.",
    "Permissões por função para separar contribuinte, tesouraria, aprovador e administrador.",
    "Histórico de comprovantes e decisões para reduzir conferência manual.",
    "Preparado para evoluir junto com Agenda Viva e Atendimento em Harmonia.",
  ],
  "atendimento-em-harmonia": [
    "Recepção, fila, check-in, retornos e encaixes com critérios únicos entre presencial e WhatsApp.",
    "Capacidade de atendimento organizada por dia, equipe, entidade, sala ou regra definida pela casa.",
    "Apoio aos cambonos e responsáveis, sem levar eletrônicos para o momento do atendimento espiritual.",
    "Status simples: aguardando, chamado, em atendimento, concluído, faltou ou encaminhado.",
    "Relatórios de atendidos, faltas, retornos, encaixes e gargalos da operação.",
    "Permissões para recepção, coordenação, responsáveis e diretoria sem expor dados desnecessários.",
  ],
  "agenda-viva": [
    "Calendário único para atividades, grupos, mutirões, férias, estudos, reuniões e eventos.",
    "Aprovação configurável para inclusão, alteração, cancelamento e publicação de atividades.",
    "Recorrências, responsáveis, locais, público envolvido e checklist em um só lugar.",
    "Alertas de conflito por data, responsável, local, equipe ou período de férias.",
    "Visão mensal, anual e por tipo de atividade para reduzir desencontros.",
    "Integração natural com pessoas, funções e permissões da Base Única.",
  ],
};

const baseItems = [
  "Uma pessoa cadastrada uma vez pode ser contribuinte, cambono, responsável por evento, recepcionista ou aprovador.",
  "Funções e permissões ficam no núcleo interno da Organização em Harmonia, sem repetição em cada módulo.",
  "Cada cliente define quais módulos usa e quais funções podem ver, criar, aprovar, editar, cancelar ou acompanhar informações.",
  "A mesma base sustenta Corrente em Dia, Atendimento em Harmonia e Agenda Viva, reduzindo retrabalho e inconsistência.",
];

const founderBenefits = [
  "participar da construção da solução com prioridade nas melhorias mais importantes para a organização.",
  "receber acompanhamento inicial para configurar Base Única, módulos, responsáveis e permissões.",
  "validar Corrente em Dia, Atendimento em Harmonia e Agenda Viva separadamente ou como solução completa.",
  "manter condição especial de lançamento durante o período combinado.",
  "ganhar destaque como Cliente Fundador somente se houver autorização expressa da organização.",
  "trocar feedback prático por benefícios futuros, como acesso preferencial a evoluções da Automação Extrema.",
];

const steps = [
  "O contato informa nome, WhatsApp, e-mail e módulo de interesse no Quero Conhecer único.",
  "A Automação Extrema entende a dor prioritária: contribuições, atendimento, agenda ou solução completa.",
  "A organização configura a Base Única com pessoas, funções, permissões e módulos habilitados.",
  "Cada módulo passa a usar a mesma base, evitando cadastros duplicados e regras desencontradas.",
  "A validação acompanha indicadores, dúvidas e ajustes antes de transformar em pacote comercial definitivo.",
];

function whatsappUrl(message: string) {
  const phone = (process.env.NEXT_PUBLIC_AE_WHATSAPP_NUMBER || "5519989848246").replace(/\D/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function actionHref(module: OrganizacaoModulo) {
  return `/solucoes/organizacao-em-harmonia/quero-conhecer${interesseQuery(module)}`;
}

export function OrganizacaoEmHarmoniaLanding({ module = "organizacao-em-harmonia" }: { module?: OrganizacaoModulo }) {
  const current = moduleInfo(module);
  const isUmbrella = current.slug === "organizacao-em-harmonia";
  const query = interesseQuery(current.slug);
  const headline = isUmbrella
    ? "Organização, atendimento, agenda e contribuições trabalhando na mesma base."
    : current.headline;
  const subheadline = isUmbrella
    ? "Uma suíte modular para organizações que precisam reduzir desencontros, retrabalho e decisões soltas no WhatsApp, com processos configuráveis, permissões por função e uso simples pelo celular."
    : `${current.description} Este módulo faz parte da Organização em Harmonia e usa a mesma Base Única de pessoas, funções e permissões.`;
  const waMessage = `Olá! Quero conhecer a ${current.name} e entender como validar essa solução como Cliente Fundador.`;
  const benefits = benefitsByModule[current.slug] ?? suiteBenefits;

  return (
    <main className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <AeSolutionHeader
        solutionName={current.name}
        logoSrc={current.logoSrc}
        logoAlt={`Logo ${current.name}`}
        actions={headerActions.map((action) => ({
          ...action,
          href: action.label === "Quero Conhecer" ? `${action.href}${query}` : action.href,
        }))}
        sectionLinks={solutionLinks}
        homeHref={current.href}
      />

      <section id="visao" className="scroll-mt-56 border-b border-[#dfe8df] bg-[#f6fbf8]">
        <div className="mx-auto grid max-w-6xl gap-7 px-4 py-7 lg:grid-cols-[1.05fr_0.95fr] lg:py-12">
          <div className="space-y-4">
            <p className="text-sm font-black uppercase tracking-[0.35em] text-[#2F6B43]">
              {isUmbrella ? "Suíte modular Automação Extrema" : "Módulo da Organização em Harmonia"}
            </p>
            <h1 className="text-4xl font-black leading-[1.08] text-[#00334E] sm:text-5xl">{headline}</h1>
            <p className="max-w-3xl text-lg leading-8 text-slate-700">{subheadline}</p>
            <div className="rounded-3xl bg-white p-4 text-sm font-semibold leading-6 text-slate-700 shadow-sm ring-1 ring-slate-100 sm:text-base sm:leading-7">
              A proposta não é colocar mais um sistema na rotina. É começar pelas dores reais, organizar critérios, preservar o jeito humano da organização e criar uma base simples para melhorar com segurança.
            </div>
            <div className="grid gap-3 sm:max-w-xl sm:grid-cols-2">
              <Link
                href={actionHref(current.slug)}
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
            {!isUmbrella && (
              <Link
                href="/solucoes/organizacao-em-harmonia#modulos"
                className="inline-flex rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#00334E] shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Ver a solução completa Organização em Harmonia
              </Link>
            )}
          </div>

          <div className="rounded-[2rem] bg-white p-4 shadow-xl sm:p-5">
            <div className="rounded-[1.5rem] bg-[#00334E] p-5 text-white">
              <p className="text-sm font-bold text-emerald-300">Painel integrado</p>
              <h2 className="mt-2 text-2xl font-black">Uma memória operacional para a organização.</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ["Pessoas", "Base Única"],
                  ["Funções", "Permissões"],
                  ["Módulos", "Habilitados"],
                  ["Aprovações", "Por perfil"],
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
                <li>1. Cadastra pessoas, funções e permissões na Base Única.</li>
                <li>2. Ativa os módulos contratados para aquele cliente.</li>
                <li>3. Define quem aprova, edita, cancela e visualiza.</li>
                <li>4. Opera pelo celular ou computador, conforme o papel da pessoa.</li>
              </ol>
              <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
                <strong>Mobile-first:</strong> no celular, o menu fica no cabeçalho como pílulas; no desktop, a gestão pode usar menu lateral para ganhar espaço e clareza.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="beneficios" className="scroll-mt-56 mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#2F6B43]">Benefícios</p>
          <h2 className="mt-2 text-3xl font-black leading-tight text-[#00334E] sm:text-4xl">
            Mais clareza para a organização, menos esforço para quem cuida da rotina.
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-700">
            O valor está em reduzir procura, retrabalho, tensão e decisões soltas, mantendo cada módulo configurável para a realidade do cliente.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {benefits.map((benefit) => (
            <div key={benefit} className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-100">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-lg font-black text-emerald-700">✓</span>
              <p className="mt-3 font-bold leading-7 text-slate-800">{benefit}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="modulos" className="scroll-mt-56 mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#2F6B43]">Módulos</p>
          <h2 className="mt-2 text-3xl font-black leading-tight text-[#00334E] sm:text-4xl">
            Comece pelo módulo prioritário ou valide a solução completa.
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-700">
            Organização em Harmonia é a suíte completa. Corrente em Dia, Atendimento em Harmonia e Agenda Viva são módulos que podem ser usados separadamente ou juntos, sempre sobre a mesma Base Única.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {ORGANIZACAO_MODULOS_COMERCIAIS.map((item) => (
            <article key={item.slug} className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-100">
              <Link href={item.href} className="block transition hover:-translate-y-1 hover:opacity-95">
                <Image src={item.logoSrc} alt={`Logo ${item.name}`} width={56} height={56} className="h-14 w-14 rounded-2xl object-cover" />
                <p className="mt-4 text-lg font-black text-[#00334E]">{item.name}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              </Link>
              <Link
                href={actionHref(item.slug)}
                className="mt-4 inline-flex w-full justify-center rounded-2xl bg-[#31C16B] px-4 py-3 text-center text-sm font-black text-[#00334E] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#43db7c]"
              >
                Quero conhecer este módulo
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section id="base-unica" className="scroll-mt-56 mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-[2rem] bg-white p-6 shadow sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-[#2F6B43]">Base Única</p>
          <h2 className="mt-2 text-3xl font-black text-[#00334E]">Pessoas, funções e permissões compartilhadas.</h2>
          <p className="mt-3 max-w-4xl leading-7 text-slate-700">
            A Base Única é um módulo interno da suíte. Ela não precisa ser vendida como produto separado: ela sustenta os módulos contratados e evita cadastro repetido de pessoas, funções, permissões e responsáveis.
          </p>
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
        <div className="rounded-[2rem] bg-white p-6 shadow sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-[#2F6B43]">Como funciona</p>
          <h2 className="mt-2 text-3xl font-black text-[#00334E]">Um caminho simples para começar sem travar a operação.</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-2">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-3 rounded-2xl bg-slate-50 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00334E] text-sm font-black text-white">{index + 1}</span>
                <span className="font-medium leading-7 text-slate-700">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="cliente-fundador" className="scroll-mt-56 mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-6 rounded-[2rem] bg-[#00334E] p-6 text-white shadow sm:p-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-300">Cliente Fundador</p>
            <h2 className="mt-2 text-3xl font-black">Ajude a construir uma solução feita para a realidade da sua organização.</h2>
            <p className="mt-3 leading-7 text-white/80">
              Como Cliente Fundador, sua organização participa da fase inicial com acompanhamento mais próximo, prioridade nas melhorias e validação prática dos módulos que realmente fazem diferença na rotina.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href={actionHref(current.slug)}
                className="rounded-2xl bg-[#31C16B] px-5 py-4 text-center font-black text-[#00334E] shadow-lg shadow-emerald-950/30 transition hover:-translate-y-0.5 hover:bg-[#43db7c]"
              >
                Quero ser Cliente Fundador
              </Link>
              <a
                href={whatsappUrl(waMessage)}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-white/40 bg-white/10 px-5 py-4 text-center font-black text-white transition hover:-translate-y-0.5 hover:bg-white hover:text-[#00334E]"
              >
                Tirar dúvidas no WhatsApp
              </a>
            </div>
          </div>
          <div className="grid gap-3">
            {founderBenefits.map((benefit) => (
              <div key={benefit} className="rounded-2xl bg-white/10 p-4 text-sm font-semibold leading-6 text-white/90">
                {benefit}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-4 py-8">
        <div className="mx-auto grid max-w-6xl gap-5 rounded-[2rem] bg-[#f6fbf8] p-5 shadow-sm ring-1 ring-slate-100 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
          <div>
            <p className="text-xl font-black text-[#00334E] sm:text-2xl">
              {current.name} — uma solução Automação Extrema.
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Organização, clareza e cuidado para manter a rotina mais previsível, sem perder o jeito humano de funcionar.
            </p>
            <a
              href={whatsappUrl(waMessage)}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex rounded-2xl bg-[#31C16B] px-5 py-3 text-sm font-black text-[#00334E] shadow-md transition hover:-translate-y-0.5 hover:bg-[#43db7c]"
            >
              Falar no WhatsApp
            </a>
          </div>
          <Link href="/" aria-label="Conhecer a Automação Extrema" className="inline-flex justify-start sm:justify-end">
            <Image
              src="/ae-logo-horizontal.png"
              alt="Automação Extrema"
              width={200}
              height={60}
              className="h-auto w-52 rounded-2xl bg-[#00334E] object-contain p-2 shadow"
            />
          </Link>
        </div>
      </footer>
    </main>
  );
}

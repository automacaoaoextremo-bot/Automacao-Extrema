import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { AE_DIAGNOSTIC_URL, AE_INSTAGRAM_URL, AE_SITE_URL } from "@/lib/ae-public-links";

const quickNavItems = [
  { label: "Diagnóstico", href: "#diagnostico" },
  { label: "Soluções", href: "#solucoes" },
  { label: "Transformação", href: "#transformacao" },
  { label: "Valor", href: "#valor" },
  { label: "Para quem", href: "#para-quem" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Networking e parcerias", href: "#networking" },
  { label: "QR Codes", href: "#qr-codes" },
];

const diagnosticCards = [
  {
    title: "Dor real",
    text: "Entender onde a operação trava antes de falar em sistema, site ou automação.",
  },
  {
    title: "Valor percebido",
    text: "Traduzir a perda em tempo, dinheiro, controle, tranquilidade e indicação.",
  },
  {
    title: "Próximo passo",
    text: "Priorizar uma solução simples, mobile e viável para começar pelo que mais importa.",
  },
];

const transformationCards = [
  {
    title: "De WhatsApp perdido para clareza operacional",
    before: "Pedidos, comprovantes, responsáveis, voluntários e próximos passos espalhados em conversas.",
    after: "Um fluxo simples para registrar, acompanhar, conferir e decidir com menos retrabalho.",
  },
  {
    title: "De ideia solta para oferta com valor percebido",
    before: "Experiência, histórico e diferenciais difíceis de explicar em uma conversa rápida.",
    after: "Uma mensagem mais clara para o público entender, lembrar e indicar a solução certa.",
  },
  {
    title: "De improviso para decisão prática",
    before: "Vontade de criar uma ferramenta grande antes de saber qual dor realmente precisa ser resolvida.",
    after: "Um primeiro passo menor, mobile e sob medida para validar valor antes de escalar.",
  },
];

const examples = [
  {
    name: "Bingo Sementinha",
    url: "https://bingo-sementinha.vercel.app/",
    label: "Bingo no Controle",
    description:
      "Módulo do Festa no Controle para atender bingos e sorteios beneficentes com cartelas/números, participantes, pagamentos, conferência e transparência.",
    transformation: "Transforma sorteios e bingos beneficentes em uma operação mais clara e conferível.",
  },
  {
    name: "Tucxa Festa Junina",
    url: "https://tucxa-festa-junina.vercel.app/festa-junina",
    label: "Festa no Controle",
    description:
      "Site cliente da solução Festa no Controle para a Festa Junina Tucxa 2026: gestão de ingressos, pedidos, cardápio, combos, compras, caixa, voluntários e prestação de contas.",
    transformation: "Transforma evento com muitas frentes em uma gestão mais organizada, mobile e rastreável.",
  },
  {
    name: "Impacto no Controle",
    url: "https://impacto-no-controle.vercel.app/acao/sao-francisco-em-racao",
    label: "Campanha e ação solidária",
    description:
      "Solução disponível para campanhas com reserva, Pix, comprovantes, acompanhamento público e prestação de contas.",
    transformation: "Transforma campanha solidária em uma jornada mais simples, transparente e confiável.",
  },
];

const valueCards = [
  {
    title: "Tempo",
    text: "Reduzir retrabalho, procura por informação, mensagens repetidas e controle manual.",
  },
  {
    title: "Dinheiro",
    text: "Diminuir perdas por esquecimento, cobrança confusa, Pix manual, pedidos sem controle e oportunidades não acompanhadas.",
  },
  {
    title: "Controle",
    text: "Dar visão clara de pessoas, etapas, comprovantes, pedidos, tarefas e próximos passos.",
  },
  {
    title: "Clareza de valor",
    text: "Transformar experiência, histórico e diferenciais em uma oferta mais fácil de entender e indicar.",
  },
];

const audienceCards = [
  "Pequenos negócios que ainda dependem de WhatsApp, planilha, papel ou memória.",
  "Profissionais que entregam valor, mas ainda comunicam sua oferta de forma genérica.",
  "Comunidades, escolas, igrejas, ONGs e associações que organizam eventos e campanhas.",
  "Empresas que precisam priorizar uma dor antes de investir em sistema, site ou automação.",
];

const processSteps = [
  {
    step: "1",
    title: "Entender a dor real",
    text: "Antes de falar em sistema, mapeamos onde existe perda de tempo, dinheiro, controle ou tranquilidade.",
  },
  {
    step: "2",
    title: "Priorizar o que gera valor",
    text: "Nem toda ideia precisa virar aplicativo. A primeira solução precisa atacar a dor mais cara e mais urgente.",
  },
  {
    step: "3",
    title: "Criar uma solução simples",
    text: "O foco é mobile, prático, com o mínimo necessário para gerar clareza e reduzir improviso.",
  },
  {
    step: "4",
    title: "Evoluir com base no uso",
    text: "Depois do primeiro ganho, os próximos módulos nascem do que realmente foi validado no dia a dia.",
  },
];

const referralItems = [
  "Empresário que controla clientes, pedidos ou financeiro em planilhas.",
  "Profissional que depende demais do WhatsApp para atendimento e follow-up.",
  "Organizador de evento, campanha, festa, ação social, escola, igreja ou ONG.",
  "Pessoa com uma boa ideia ou solução, mas sem clareza de prioridade e comunicação.",
];

const whatsappHref = "/api/whatsapp?origem=site";
const diagnosticHref = AE_DIAGNOSTIC_URL.replace(AE_SITE_URL, "");

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-[#00334E] text-white">
        <QuickNav />

        <section
          id="diagnostico"
          className="scroll-mt-44 border-b border-white/10 bg-[#00334E] px-4 pb-10 pt-2 md:pb-14 md:pt-6"
        >
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-[1.08fr_0.92fr] md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#31C16B] sm:text-sm">
                Diagnóstico de valor e dor operacional
              </p>

              <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">
                Não começa pela ferramenta. Começa pela dor certa.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85">
                Eu ajudo pequenos negócios, profissionais e organizações a descobrir onde estão perdendo tempo,
                dinheiro e controle por dependerem de WhatsApp, planilha e processos manuais. A partir de um
                diagnóstico, transformo a dor principal em uma solução simples, mobile e sob medida.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={diagnosticHref}
                  className="rounded-xl bg-[#31C16B] px-6 py-4 text-center font-bold text-[#00334E] shadow-lg hover:bg-[#4ce184]"
                >
                  Fazer diagnóstico gratuito
                </Link>
                <a
                  href={whatsappHref}
                  className="rounded-xl border border-white/25 px-6 py-4 text-center font-bold text-white hover:bg-white/10"
                >
                  Falar no WhatsApp
                </a>
              </div>
            </div>

            <aside className="rounded-3xl bg-white/10 p-5 shadow-2xl ring-1 ring-white/10 sm:p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#31C16B]">Deep Dive aplicado</p>
              <h2 className="mt-3 text-2xl font-bold">O diagnóstico evita começar pelo “sistema”.</h2>
              <div className="mt-5 space-y-3">
                {diagnosticCards.map((card) => (
                  <div key={card.title} className="rounded-2xl bg-[#00263A] p-4 ring-1 ring-white/10">
                    <h3 className="font-bold text-white">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/75">{card.text}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section id="solucoes" className="scroll-mt-44 bg-white px-4 py-14 text-slate-950">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#00A8CC]">Exemplos reais</p>
                <h2 className="mt-3 text-3xl font-bold text-[#00334E] md:text-4xl">
                  Soluções que nasceram de dores reais.
                </h2>
                <p className="mt-4 max-w-3xl leading-7 text-slate-700">
                  Estes exemplos ajudam a tangibilizar a transformação: menos improviso, mais clareza, melhor controle e
                  uma experiência mais simples para quem organiza e para quem participa.
                </p>
              </div>
              <Link
                href="/diagnostico?origem=exemplos_site"
                className="rounded-xl bg-[#31C16B] px-5 py-3 text-center font-bold text-[#00334E]"
              >
                Fazer meu diagnóstico
              </Link>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {examples.map((example) => (
                <article
                  key={example.name}
                  className="flex flex-col rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
                >
                  <p className="text-sm font-bold uppercase tracking-wide text-[#00A8CC]">{example.label}</p>
                  <h3 className="mt-3 text-2xl font-bold text-[#00334E]">{example.name}</h3>
                  <p className="mt-3 leading-7 text-slate-700">{example.description}</p>
                  <p className="mt-4 rounded-2xl bg-white p-4 text-sm font-semibold leading-6 text-[#00334E] shadow-sm">
                    {example.transformation}
                  </p>
                  <a
                    href={example.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex justify-center rounded-xl border border-[#00334E]/20 px-4 py-3 font-bold text-[#00334E] hover:bg-[#00334E] hover:text-white"
                  >
                    Abrir exemplo
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="transformacao" className="scroll-mt-44 border-y border-white/10 bg-[#00263A] px-4 py-14">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#31C16B]">Exemplos de transformação</p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">O que muda quando a dor fica clara?</h2>
            <p className="mt-4 max-w-3xl leading-7 text-white/80">
              A Automação Extrema procura tornar a mudança fácil de visualizar: antes e depois, perda e ganho, problema
              e próximo passo.
            </p>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {transformationCards.map((card) => (
                <article key={card.title} className="rounded-3xl bg-white p-5 text-[#00334E] shadow-lg">
                  <h3 className="text-xl font-black">{card.title}</h3>
                  <div className="mt-5 space-y-3 text-sm leading-6">
                    <p className="rounded-2xl bg-slate-100 p-4 text-slate-700">
                      <span className="font-black text-[#00334E]">Antes: </span>
                      {card.before}
                    </p>
                    <p className="rounded-2xl bg-[#31C16B]/15 p-4 text-slate-700">
                      <span className="font-black text-[#00334E]">Depois: </span>
                      {card.after}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="valor" className="scroll-mt-44 bg-[#00334E] px-4 py-14">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#31C16B]">Valor antes da solução</p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">O diagnóstico procura quatro tipos de perda.</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-4">
              {valueCards.map((card) => (
                <article key={card.title} className="rounded-3xl bg-white p-5 text-[#00334E] shadow-lg">
                  <h3 className="text-xl font-bold">{card.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{card.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="para-quem" className="scroll-mt-44 mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#31C16B]">Para quem faz sentido</p>
              <h2 className="mt-3 text-3xl font-bold md:text-4xl">Indicações boas para a Automação Extrema.</h2>
              <p className="mt-4 leading-7 text-white/80">
                A melhor indicação não é quem pede um sistema. É quem tem uma dor operacional, comercial ou de
                comunicação que ainda não está clara o suficiente para virar uma solução simples.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {audienceCards.map((item) => (
                <div key={item} className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/10">
                  <p className="leading-7 text-white/90">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="scroll-mt-44 mx-auto max-w-6xl px-4 py-14">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#31C16B]">Como funciona</p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">Uma abordagem simples para evitar solução genérica.</h2>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {processSteps.map((item) => (
              <article key={item.step} className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/10">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#31C16B] text-lg font-black text-[#00334E]">
                  {item.step}
                </div>
                <h3 className="mt-4 text-xl font-bold">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/80">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="networking" className="scroll-mt-44 border-t border-white/10 bg-[#00263A] px-4 py-14">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#31C16B]">Networking e parcerias</p>
              <h2 className="mt-3 text-3xl font-bold md:text-4xl">Quem você pode me indicar?</h2>
              <p className="mt-4 leading-7 text-white/80">
                Pessoas que trabalham bem, mas ainda perdem energia com improviso, controles manuais ou uma mensagem de
                valor difícil de explicar.
              </p>
            </div>

            <div className="space-y-3">
              {referralItems.map((item) => (
                <div key={item} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="font-semibold text-white/90">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="qr-codes" className="scroll-mt-44 px-4 py-14">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#31C16B]">QR Codes</p>
              <h2 className="mt-3 text-3xl font-bold md:text-4xl">Compartilhe rapidamente pelo celular.</h2>
              <p className="mx-auto mt-4 max-w-3xl leading-7 text-white/80">
                Use estes QR Codes em conversas, reuniões e eventos de networking para abrir a página da Automação
                Extrema ou iniciar uma conversa no WhatsApp.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <QrCard
                title="Abrir esta página"
                description="QR para compartilhar a página principal da Automação Extrema."
                src="/qr-automacao-extrema-home.svg"
                alt="QR Code para abrir o site da Automação Extrema"
              />
              <QrCard
                title="WhatsApp rápido"
                description="QR para iniciar uma conversa com uma mensagem genérica de diagnóstico."
                src="/qr-automacao-extrema-whatsapp.svg"
                alt="QR Code para abrir o WhatsApp da Automação Extrema"
              />
            </div>

            <div className="mx-auto mt-8 max-w-4xl rounded-3xl bg-[#31C16B] p-6 text-center text-[#00334E] shadow-2xl sm:p-10">
              <p className="text-sm font-black uppercase tracking-[0.2em]">Próximo passo</p>
              <h2 className="mt-3 text-3xl font-black md:text-4xl">
                Descubra onde está a maior perda antes de criar qualquer solução.
              </h2>
              <p className="mt-4 text-lg leading-8 text-[#00334E]/80">
                O diagnóstico é gratuito e ajuda a transformar uma dor confusa em um caminho mais claro de ação.
              </p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/diagnostico?origem=cta_final_site"
                  className="rounded-xl bg-[#00334E] px-6 py-4 font-bold text-white hover:bg-[#004c73]"
                >
                  Fazer diagnóstico gratuito
                </Link>
                <a href={whatsappHref} className="rounded-xl border border-[#00334E]/30 px-6 py-4 font-bold hover:bg-white/30">
                  Chamar no WhatsApp
                </a>
              </div>
              <a
                href={AE_INSTAGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex font-bold underline decoration-[#00334E]/40 underline-offset-4"
              >
                Ver Instagram da Automação Extrema
              </a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function QuickNav() {
  return (
    <nav
      className="sticky top-[57px] z-40 border-b border-white/10 bg-[#00263A]/95 backdrop-blur sm:top-[73px]"
      aria-label="Acesso rápido às seções da página"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white sm:gap-2 sm:px-4 sm:text-xs md:justify-start md:text-sm">
        {quickNavItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-full bg-white/10 px-2.5 py-1.5 leading-none hover:bg-[#31C16B] hover:text-[#00334E] sm:px-3 sm:py-2"
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function QrCard({ title, description, src, alt }: { title: string; description: string; src: string; alt: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 text-[#00334E] shadow-lg">
      <Image src={src} alt={alt} width={320} height={320} className="mx-auto h-auto w-full max-w-56 rounded-xl" />
      <h2 className="mt-4 text-center text-xl font-black">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

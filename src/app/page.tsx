import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { AE_BNI_DIAGNOSTIC_URL, AE_INSTAGRAM_URL, AE_SITE_URL } from "@/lib/ae-public-links";

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

const examples = [
  {
    name: "Bingo Sementinha",
    url: "https://bingo-sementinha.vercel.app/",
    label: "Bingo no controle",
    description:
      "Exemplo já usado para apoiar organização de bingo, cartelas e operação de evento beneficente.",
  },
  {
    name: "Tucxa Festa Junina",
    url: "https://tucxa-festa-junina.vercel.app/festa-junina",
    label: "Origem do Festa no Controle",
    description:
      "Solução que será usada novamente na Festa Junina do Tucxa em 14/06/2026 e deu origem ao conceito Festa no Controle.",
  },
  {
    name: "Impacto no Controle",
    url: "https://impacto-no-controle.vercel.app/acao/sao-francisco-em-racao",
    label: "Ação solidária com Pix e comprovantes",
    description:
      "Exemplo disponível para ação solidária, reserva, Pix, comprovantes, acompanhamento e prestação de contas.",
  },
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

const whatsappHref = "/api/whatsapp?origem=bni";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-[#00334E] text-white">
        <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-14 pt-8 md:grid-cols-[1.05fr_0.95fr] md:items-center md:pb-20 md:pt-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#31C16B]">
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
                href={AE_BNI_DIAGNOSTIC_URL.replace(AE_SITE_URL, "")}
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

            <p className="mt-5 text-sm leading-6 text-white/70">
              Não solicita senha, cartão, pagamento ou instalação. O diagnóstico serve para entender a dor e sugerir
              um próximo passo prático.
            </p>
          </div>

          <div className="rounded-3xl bg-white/10 p-5 shadow-2xl ring-1 ring-white/10 sm:p-6">
            <div className="rounded-3xl bg-[#00263A] p-5 ring-1 ring-white/10">
              <Image
                src="/ae-logo-azul.png"
                alt="Automação Extrema"
                width={420}
                height={420}
                className="mx-auto h-auto w-full max-w-xs rounded-2xl object-contain"
                priority
              />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <QrCard
                title="Abrir esta página"
                description="Use este QR no celular para compartilhar a Automação Extrema no café ou em reuniões."
                src="/qr-automacao-extrema-home.svg"
                alt="QR Code para abrir o site da Automação Extrema"
              />
              <QrCard
                title="WhatsApp rápido"
                description="QR para iniciar conversa com a Automação Extrema, usando a mensagem do BNI."
                src="/qr-automacao-extrema-whatsapp.svg"
                alt="QR Code para abrir o WhatsApp da Automação Extrema"
              />
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-[#00263A] px-4 py-12">
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

        <section className="mx-auto max-w-6xl px-4 py-14">
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

        <section id="exemplos" className="bg-white px-4 py-14 text-slate-950">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#00A8CC]">Exemplos reais</p>
                <h2 className="mt-3 text-3xl font-bold text-[#00334E] md:text-4xl">Soluções que nasceram de dores reais.</h2>
              </div>
              <Link href="/diagnostico?origem=exemplos_site" className="rounded-xl bg-[#31C16B] px-5 py-3 text-center font-bold text-[#00334E]">
                Fazer meu diagnóstico
              </Link>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {examples.map((example) => (
                <article key={example.name} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                  <p className="text-sm font-bold uppercase tracking-wide text-[#00A8CC]">{example.label}</p>
                  <h3 className="mt-3 text-2xl font-bold text-[#00334E]">{example.name}</h3>
                  <p className="mt-3 min-h-24 leading-7 text-slate-700">{example.description}</p>
                  <a
                    href={example.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex rounded-xl border border-[#00334E]/20 px-4 py-3 font-bold text-[#00334E] hover:bg-[#00334E] hover:text-white"
                  >
                    Abrir exemplo
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
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

        <section className="border-t border-white/10 bg-[#00263A] px-4 py-14">
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

        <section id="contato" className="px-4 py-14">
          <div className="mx-auto max-w-4xl rounded-3xl bg-[#31C16B] p-6 text-center text-[#00334E] shadow-2xl sm:p-10">
            <p className="text-sm font-black uppercase tracking-[0.2em]">Próximo passo</p>
            <h2 className="mt-3 text-3xl font-black md:text-4xl">Descubra onde está a maior perda antes de criar qualquer solução.</h2>
            <p className="mt-4 text-lg leading-8 text-[#00334E]/80">
              O diagnóstico é gratuito e ajuda a transformar uma dor confusa em um caminho mais claro de ação.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/diagnostico?origem=cta_final_site" className="rounded-xl bg-[#00334E] px-6 py-4 font-bold text-white hover:bg-[#004c73]">
                Fazer diagnóstico gratuito
              </Link>
              <a href={whatsappHref} className="rounded-xl border border-[#00334E]/30 px-6 py-4 font-bold hover:bg-white/30">
                Chamar no WhatsApp
              </a>
            </div>
            <a href={AE_INSTAGRAM_URL} target="_blank" rel="noreferrer" className="mt-5 inline-flex font-bold underline decoration-[#00334E]/40 underline-offset-4">
              Ver Instagram da Automação Extrema
            </a>
          </div>
        </section>
      </main>
    </>
  );
}

function QrCard({ title, description, src, alt }: { title: string; description: string; src: string; alt: string }) {
  return (
    <div className="rounded-3xl bg-white p-4 text-[#00334E] shadow-lg">
      <Image src={src} alt={alt} width={220} height={220} className="mx-auto h-auto w-full max-w-36 rounded-xl" />
      <h2 className="mt-3 text-center text-lg font-black">{title}</h2>
      <p className="mt-2 text-center text-xs leading-5 text-slate-600">{description}</p>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Roteiro Café BNI | Automação Extrema",
  description: "Checklist pessoal de networking da Automação Extrema para café BNI.",
  robots: {
    index: false,
    follow: false,
  },
};

const participantApproaches = [
  {
    type: "Dono de pequeno negócio",
    question: "Hoje o que mais depende de WhatsApp, planilha ou memória no seu negócio?",
    angle: "tempo, retrabalho, controle e previsibilidade",
  },
  {
    type: "Prestador de serviço ou profissional liberal",
    question: "Você sente que entrega mais valor do que consegue comunicar?",
    angle: "clareza de oferta, diferenciação e indicação",
  },
  {
    type: "Eventos, buffet, escola, igreja ou ONG",
    question: "Como vocês controlam pedidos, pagamentos, convidados, comprovantes ou prestação de contas?",
    angle: "Festa no Controle, Impacto no Controle e Presença Querida",
  },
  {
    type: "Consultor, marketing ou vendas",
    question: "Seus clientes têm clareza do valor que entregam ou ainda vendem muito por preço?",
    angle: "Diagnóstico de Valor, DNA de Valor e parcerias",
  },
  {
    type: "Financeiro, contábil ou administrativo",
    question: "Você vê clientes que só percebem o problema financeiro depois que já ficou tarde?",
    angle: "clareza de caixa, rotina, cobrança e acompanhamento",
  },
  {
    type: "Associação, comunidade ou ação social",
    question: "Como vocês controlam doações, Pix, comprovantes, reservas e prestação de contas?",
    angle: "Impacto no Controle e soluções para campanhas",
  },
];

const quickChecklist = [
  "Não apresentar todas as soluções de uma vez.",
  "Começar perguntando pela dor, não pela ferramenta.",
  "Usar os exemplos reais apenas como prova, não como cardápio completo.",
  "Anotar nome, segmento, dor principal, indicação possível e próximo passo.",
  "Pedir uma indicação específica: alguém que depende de WhatsApp, planilha ou improviso.",
  "Direcionar para o site principal ou WhatsApp quando houver interesse real.",
];

const deepDiveQuestions = [
  "O que hoje mais toma tempo ou gera retrabalho?",
  "Onde você sente que perde dinheiro, oportunidade ou controle?",
  "O que ainda depende de WhatsApp, papel, planilha ou memória?",
  "Qual parte do processo você evita olhar porque dá confusão?",
  "Se isso fosse resolvido, o que melhoraria na prática: tempo, dinheiro, segurança, tranquilidade ou vendas?",
  "Quem mais sente essa dor: você, equipe, cliente, voluntários, família ou fornecedores?",
];

const caseCards = [
  {
    title: "Bingo Sementinha",
    text: "Exemplo de organização de bingo e operação beneficente. Use quando a pessoa falar de eventos, voluntários, cartelas, reservas ou controle manual.",
  },
  {
    title: "Tucxa Festa Junina / Festa no Controle",
    text: "Exemplo para festas, pedidos, caixa, filas, comprovantes, cardápio e organização de equipe. Use com escolas, igrejas, associações, clubes e eventos comunitários.",
  },
  {
    title: "Impacto no Controle",
    text: "Exemplo para ações solidárias, reserva de números, Pix, comprovantes, acompanhamento e prestação de contas. Use com ONGs, campanhas e iniciativas sociais.",
  },
  {
    title: "Diagnóstico / DNA de Valor",
    text: "Porta de entrada para profissionais e empresas que têm valor, mas ainda comunicam de forma genérica ou não sabem qual solução priorizar.",
  },
];

const followUpTemplates = [
  {
    title: "Após conversa com empresário",
    text: "Foi ótimo te conhecer hoje no café. Pelo que conversamos, percebi que sua principal dor parece estar em [dor]. Posso te mandar o diagnóstico gratuito da Automação Extrema para mapearmos se faz sentido resolver isso de forma simples?",
  },
  {
    title: "Pedido de indicação",
    text: "Lembrei do nosso papo no café. Você conhece alguém que trabalha bem, mas ainda perde tempo, dinheiro ou controle por depender de WhatsApp, planilha ou improviso? Esse é exatamente o perfil que a Automação Extrema consegue ajudar no diagnóstico inicial.",
  },
  {
    title: "Mensagem para o Adriano",
    text: "Adriano, seu vídeo me ajudou a perceber que eu estava falando demais das soluções e pouco do valor. Estou pensando em posicionar a Automação Extrema como um Diagnóstico de Valor e Dor Operacional, usando as soluções como cases reais. A frase principal seria: 'Eu ajudo pequenos negócios, profissionais e organizações a descobrir onde estão perdendo tempo, dinheiro e controle por dependerem de WhatsApp, planilha e processos manuais. A partir de um diagnóstico, transformo a dor principal em uma solução simples, mobile e sob medida.' Na quarta, se fizer sentido, queria te pedir uma opinião rápida: essa frase comunica valor ou ainda parece ferramenta?",
  },
];

export default function RoteiroCafePage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:py-8">
        <section className="mx-auto max-w-5xl space-y-6">
          <div className="rounded-3xl bg-[#00334E] p-5 text-white shadow-xl sm:p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#31C16B]">Uso pessoal · Café BNI</p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">Roteiro prático de networking da Automação Extrema</h1>
            <p className="mt-4 max-w-3xl leading-7 text-white/85">
              Objetivo do café: não vender sistema. Identificar dores, criar conexão, pedir indicações específicas e
              posicionar a Automação Extrema como diagnóstico de valor e dor operacional.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/" className="rounded-xl bg-[#31C16B] px-5 py-3 text-center font-bold text-[#00334E]">
                Abrir página pública
              </Link>
              <a href="/api/whatsapp?origem=bni" className="rounded-xl border border-white/25 px-5 py-3 text-center font-bold text-white">
                Abrir WhatsApp AE
              </a>
            </div>
          </div>

          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Card title="Frase principal" eyebrow="Memorizar">
              <p className="text-xl font-bold leading-8 text-[#00334E]">
                Eu ajudo pequenos negócios, profissionais e organizações a descobrir onde estão perdendo tempo,
                dinheiro e controle por dependerem de WhatsApp, planilha e processos manuais. A partir de um
                diagnóstico, transformo a dor principal em uma solução simples, mobile e sob medida.
              </p>
            </Card>

            <Card title="Checklist durante o café" eyebrow="Não esquecer">
              <ul className="space-y-3">
                {quickChecklist.map((item) => (
                  <li key={item} className="flex gap-3 rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#31C16B] text-xs font-black text-[#00334E]">
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card title="Roteiro de 15 segundos" eyebrow="Apresentação curta">
              <p className="leading-7 text-slate-700">
                Sou Gabriel, da Automação Extrema. Eu ajudo negócios e profissionais a descobrir onde estão perdendo
                tempo, dinheiro e controle por depender de WhatsApp, planilha e improviso. Depois transformo a dor
                principal em uma solução simples e mobile.
              </p>
            </Card>

            <Card title="Roteiro de 60 segundos" eyebrow="Quando houver abertura">
              <p className="leading-7 text-slate-700">
                A Automação Extrema nasceu de dores reais: eventos com fila, ações sociais com Pix manual, negócios que
                dependem de planilha e profissionais com valor, mas sem clareza de oferta. Em vez de vender sistema
                pronto, eu faço um diagnóstico para entender onde está a maior dor operacional ou comercial. Depois
                priorizo uma solução simples, prática e mobile. Hoje procuro indicações de empresários que trabalham bem,
                mas ainda estão travados por processos manuais, comunicação confusa ou falta de controle.
              </p>
            </Card>
          </section>

          <Card title="Abordagens por tipo de participante" eyebrow="Pergunta antes da apresentação">
            <div className="grid gap-4 md:grid-cols-2">
              {participantApproaches.map((item) => (
                <article key={item.type} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="font-black text-[#00334E]">{item.type}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-800">“{item.question}”</p>
                  <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">Gancho: {item.angle}</p>
                </article>
              ))}
            </div>
          </Card>

          <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <Card title="Perguntas Deep Dive" eyebrow="Para descobrir valor real">
              <ul className="space-y-3">
                {deepDiveQuestions.map((item) => (
                  <li key={item} className="rounded-2xl bg-[#00334E]/5 p-3 text-sm leading-6 text-slate-700">
                    {item}
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Cases para puxar conforme a dor" eyebrow="Não mostrar como cardápio completo">
              <div className="space-y-4">
                {caseCards.map((item) => (
                  <article key={item.title} className="rounded-2xl border border-slate-200 p-4">
                    <h3 className="font-black text-[#00334E]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{item.text}</p>
                  </article>
                ))}
              </div>
            </Card>
          </section>

          <Card title="Modelos rápidos de follow-up" eyebrow="Enviar depois do café">
            <div className="space-y-4">
              {followUpTemplates.map((template) => (
                <article key={template.title} className="rounded-2xl bg-slate-50 p-4">
                  <h3 className="font-black text-[#00334E]">{template.title}</h3>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{template.text}</p>
                </article>
              ))}
            </div>
          </Card>

          <div className="rounded-3xl bg-[#31C16B] p-5 text-[#00334E] shadow-xl sm:p-7">
            <h2 className="text-2xl font-black">Frase para fechar qualquer conversa</h2>
            <p className="mt-3 text-lg font-semibold leading-8">
              Você conhece alguém que trabalha bem, mas está travado porque o processo ainda está manual, confuso ou
              difícil de explicar?
            </p>
          </div>
        </section>
      </main>
    </>
  );
}

function Card({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#00A8CC]">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black text-[#00334E]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

import Link from "next/link";
import { AeSolutionHeader } from "@/components/ae-solution-header";
import { buildAeWhatsAppUrl } from "@/lib/ae-public-links";

const benefits = [
  "Implantação assistida para os primeiros eventos Cliente Fundador",
  "Página afetiva do evento com convite, orientações e confirmação mobile",
  "Link individual por convidado para reduzir respostas perdidas no WhatsApp",
  "Painel com confirmados, pendentes, talvez, acompanhantes, adultos e crianças",
  "Mensagens por fase: Save the Date, convite oficial, lembrete, orientação final e agradecimento",
  "Exportações úteis para buffet, recepção, lembrancinhas, etiquetas e mesas",
];

const founderBenefits = [
  "participar da construção da solução com prioridade nas melhorias do seu evento real",
  "receber acompanhamento inicial para configurar evento, convite, grupos e convidados",
  "validar o fluxo completo com página pública, links individuais, confirmação e painel",
  "manter condição especial de lançamento durante o período combinado",
  "autorizar ou não o uso de prints, depoimento e dados agregados como case comercial",
  "trocar feedback prático por benefícios futuros em novas soluções da Automação Extrema",
];

const journey = [
  "A família ou organizador cadastra o evento e define o tom da comunicação.",
  "A lista de convidados é cadastrada ou importada com grupos, acompanhantes e observações.",
  "Cada convidado recebe um link individual para confirmar presença sem complicação.",
  "O painel mostra confirmados, pendentes, talvez, adultos, crianças e acompanhantes.",
  "Mensagens carinhosas ajudam a lembrar pendentes sem parecer cobrança.",
  "Depois do evento, o fluxo pode virar agradecimento, fotos, recados e memória afetiva.",
];

const whatsappUrl = buildAeWhatsAppUrl(
  "Olá! Quero conhecer o Presença Querida para organizar convites, confirmações e convidados de um evento afetivo.",
);

const headerActions = [
  { label: "Quero Conhecer", href: "/solucoes/presenca-querida/quero-conhecer", variant: "primary" as const },
  { label: "Já sou Cliente", href: "/solucoes/presenca-querida/login", variant: "secondary" as const },
];

const sectionLinks = [
  { label: "Solução", href: "#solucao" },
  { label: "Painel", href: "#painel" },
  { label: "Convite", href: "#convite" },
  { label: "Benefícios", href: "#beneficios" },
  { label: "Como Funciona", href: "#como-funciona" },
  { label: "Cliente Fundador", href: "#cliente-fundador" },
];

export default function PresencaQueridaLandingPage() {
  return (
    <main className="min-h-screen bg-[#fffaf8] text-slate-800">
      <AeSolutionHeader
        solutionName="Presença Querida"
        logoSrc="/presenca-querida-logo.svg"
        logoAlt="Logo Presença Querida"
        homeHref="/solucoes/presenca-querida"
        navLabel="Menu do Presença Querida"
        actions={headerActions}
        sectionLinks={sectionLinks}
      />

      <section id="solucao" className="scroll-mt-56 border-b border-rose-100 bg-[#fffaf8]">
        <div className="mx-auto grid max-w-6xl gap-7 px-4 py-7 lg:grid-cols-[1.05fr_0.95fr] lg:py-12">
          <div className="space-y-4">
            <p className="text-sm font-black uppercase tracking-[0.35em] text-[#E85D75]">Gestão afetiva de presença</p>
            <h1 className="text-4xl font-black leading-[1.08] text-[#00334E] sm:text-5xl">
              Convites, confirmações e cuidado com cada convidado.
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-slate-700">
              O Presença Querida ajuda famílias, casais, filhos, pequenos organizadores e profissionais de eventos a convidar, lembrar e confirmar presenças importantes sem transformar o WhatsApp em bagunça ou a confirmação em cobrança constrangedora.
            </p>
            <div className="grid gap-3 sm:max-w-xl sm:grid-cols-2">
              <Link
                href="/solucoes/presenca-querida/quero-conhecer"
                className="rounded-2xl bg-[#E85D75] px-5 py-4 text-center text-base font-black text-white shadow-lg shadow-rose-200 ring-2 ring-[#E85D75]/20 transition hover:-translate-y-0.5 hover:bg-[#f06c84] hover:shadow-xl"
              >
                Quero Conhecer
              </Link>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border-2 border-[#00334E] bg-white px-5 py-4 text-center text-base font-black text-[#00334E] shadow-md transition hover:-translate-y-0.5 hover:bg-[#00334E] hover:text-white"
              >
                Falar no WhatsApp
              </a>
            </div>
          </div>

          <div id="painel" className="scroll-mt-56 rounded-[2rem] bg-white p-4 shadow-xl sm:p-5">
            <div className="rounded-[1.5rem] bg-[#00334E] p-5 text-white">
              <p className="text-sm font-bold text-rose-200">Painel simples do evento</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ["Confirmados", "84"],
                  ["Pendentes", "31"],
                  ["Talvez", "9"],
                  ["Acompanhantes", "18"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/60">{label}</p>
                    <p className="mt-1 text-2xl font-black">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div id="convite" className="scroll-mt-56 mt-4 rounded-3xl border border-rose-100 p-4">
              <p className="font-black text-[#00334E]">Convite individual</p>
              <p className="mt-1 text-sm text-slate-600">Daniela 50 anos • link personalizado para cada convidado</p>
              <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm leading-6 text-slate-700">
                <p className="font-black text-[#E85D75]">Olá, Ana!</p>
                <p className="mt-2">Sua presença é muito importante para celebrar esse momento. Confirme se você poderá estar conosco e informe acompanhantes, crianças ou observações.</p>
              </div>
              <button className="mt-4 w-full rounded-2xl bg-[#E85D75] py-3 font-black text-white shadow-lg shadow-rose-100 transition hover:bg-[#f06c84]">
                Confirmar presença
              </button>
              <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
                <strong>Privacidade simples:</strong> os dados dos convidados são usados apenas para organizar o evento, confirmações e orientações combinadas com o responsável.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="beneficios" className="scroll-mt-56 mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E85D75]">Benefícios</p>
          <h2 className="mt-2 text-3xl font-black leading-tight text-[#00334E] sm:text-4xl">
            Menos ansiedade para quem organiza, mais carinho para quem é convidado.
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-700">
            A proposta é começar simples e validar com eventos reais: lista centralizada, link individual, mensagens por fase e indicadores para tomar decisões sobre buffet, mesas, lembrancinhas e recepção.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {benefits.map((benefit) => (
            <div key={benefit} className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-lg font-black text-[#E85D75]">✓</span>
              <p className="mt-3 font-bold leading-7 text-slate-800">{benefit}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="scroll-mt-56 mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-[2rem] bg-white p-6 shadow sm:p-8">
          <h2 className="text-3xl font-black text-[#00334E]">Como funciona</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-2">
            {journey.map((step, index) => (
              <li key={step} className="flex gap-3 rounded-2xl bg-[#fff7f4] p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00334E] text-sm font-black text-white">{index + 1}</span>
                <span className="font-medium text-slate-700">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="cliente-fundador" className="scroll-mt-56 mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-6 rounded-[2rem] bg-[#00334E] p-6 text-white shadow sm:p-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-rose-200">Cliente Fundador</p>
            <h2 className="mt-2 text-3xl font-black">Ajude a construir uma solução feita para eventos afetivos reais.</h2>
            <p className="mt-3 leading-7 text-white/80">
              Como Cliente Fundador, seu evento participa da fase inicial com implantação assistida, acompanhamento mais próximo e prioridade nas melhorias que realmente fazem diferença na organização de convidados.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href="/solucoes/presenca-querida/quero-conhecer"
                className="rounded-2xl bg-[#E85D75] px-5 py-4 text-center font-black text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-[#f06c84]"
              >
                Quero ser Cliente Fundador
              </Link>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-white/25 bg-white/10 px-5 py-4 text-center font-black text-white transition hover:-translate-y-0.5 hover:bg-white hover:text-[#00334E]"
              >
                Conversar antes
              </a>
            </div>
          </div>
          <div className="grid gap-3">
            {founderBenefits.map((benefit) => (
              <div key={benefit} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                <p className="font-semibold leading-7 text-white/90">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

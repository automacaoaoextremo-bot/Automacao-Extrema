import Image from "next/image";
import Link from "next/link";
import { AeBrandStrip, AeSolutionHeader } from "@/components/ae-solution-header";
import { buildAeWhatsAppUrl } from "@/lib/ae-public-links";

const benefits = [
  "Implantação R$ 0,00 e mensalidade R$ 0,00 no período de Cliente Fundador",
  "QR Code Pix e Pix copia e cola para facilitar a contribuição",
  "Upload, pré-validação e aprovação humana de comprovantes",
  "Painel simples para celular e página clara para computador",
  "Relatórios de pagos, pendentes, em revisão e divergentes",
  "Lembretes respeitosos, sem exposição e sem cobrança agressiva",
];

const founderBenefits = [
  "participar da construção da solução com prioridade nas melhorias mais importantes para a sua casa",
  "receber acompanhamento inicial para cadastrar a organização, responsáveis e contribuintes",
  "ter acesso antecipado a evoluções como festas, campanhas de pizza, ações de arrecadação e relatórios ampliados",
  "manter condição especial de lançamento durante o período combinado",
  "ganhar destaque como Cliente Fundador somente se houver autorização expressa da organização",
  "trocar feedback prático por benefícios futuros, como acesso preferencial a novas soluções da Automação Extrema",
];

const whatsappUrl = buildAeWhatsAppUrl(
  "Olá! Quero conhecer o Corrente em Dia para organizar contribuições, Pix e comprovantes da minha associação, federação ou terreiro.",
);

export default function CorrenteEmDiaLandingPage() {
  return (
    <main className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <AeSolutionHeader
        solutionName="Corrente em Dia"
        logoSrc="/corrente-em-dia-logo.svg"
        logoAlt="Logo Corrente em Dia"
        actions={[
          { label: "Quero Conhecer", href: "/solucoes/corrente-em-dia/quero-conhecer", variant: "secondary" },
          { label: "Já sou Cliente", href: "/login", variant: "secondary" },
        ]}
      />
      <AeBrandStrip />

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1.08fr_0.92fr] lg:py-16">
        <div className="space-y-6">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#2F6B43]">Automação Extrema</p>
          <h1 className="text-4xl font-black leading-tight text-[#00334E] sm:text-5xl">
            A contribuição da casa organizada com respeito, clareza e custo fixo zero.
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-slate-700">
            O Corrente em Dia ajuda federações, associações e terreiros a organizar contribuições, Pix, comprovantes e pendências sem transformar cuidado coletivo em cobrança fria. A casa ganha previsibilidade, o gestor ganha clareza e o contribuinte resolve tudo pelo celular.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/solucoes/corrente-em-dia/quero-conhecer"
              className="rounded-2xl bg-[#31C16B] px-5 py-4 text-center font-black text-[#00334E] shadow transition hover:bg-[#4ada82]"
            >
              Quero Conhecer
            </Link>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-slate-300 bg-white px-5 py-4 text-center font-black text-slate-700 transition hover:bg-slate-50"
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-5 shadow-xl">
          <div className="rounded-[1.5rem] bg-[#00334E] p-5 text-white">
            <p className="text-sm font-bold text-emerald-300">Painel simples da organização</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["Arrecadado", "R$ 1.840"],
                ["Pendentes", "12"],
                ["Em revisão", "8"],
                ["Divergentes", "2"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">{label}</p>
                  <p className="mt-1 text-2xl font-black">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-3xl border border-slate-200 p-4">
            <p className="font-black text-[#00334E]">Minha contribuição</p>
            <p className="mt-1 text-sm text-slate-600">Valor: R$ 50,00 • Até dia 10</p>
            <div className="mt-4 flex h-32 items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-500">QR Code Pix</div>
            <button className="mt-4 w-full rounded-2xl bg-[#31C16B] py-3 font-black text-[#00334E]">Enviar comprovante</button>
            <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
              <strong>Privacidade:</strong> os valores e comprovantes são individuais e acessíveis somente ao contribuinte e à organização responsável, conforme consentimento. A solução deve respeitar a LGPD, protegendo dados pessoais, WhatsApp, e-mail, histórico de contribuição e comprovantes.
            </div>
          </div>
        </div>
      </section>

      <section id="beneficios" className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 md:grid-cols-3">
          {benefits.map((benefit) => (
            <div key={benefit} className="rounded-3xl bg-white p-5 shadow">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-700">✓</span>
              <p className="mt-3 font-bold text-slate-800">{benefit}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-[2rem] bg-white p-6 shadow sm:p-8">
          <h2 className="text-3xl font-black text-[#00334E]">Como funciona</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              "A organização cadastra sua chave Pix oficial e seus contribuintes.",
              "O sistema gera a contribuição do mês com QR Code e Pix copia e cola.",
              "O contribuinte paga pelo banco e envia o comprovante pelo celular.",
              "O sistema faz uma pré-validação do valor, chave, data e status quando possível.",
              "Um responsável aprova, reprova ou pede correção.",
              "O painel mostra arrecadado, pendente, em revisão, divergente e relatórios.",
            ].map((step, index) => (
              <li key={step} className="flex gap-3 rounded-2xl bg-slate-50 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00334E] text-sm font-black text-white">{index + 1}</span>
                <span className="font-medium text-slate-700">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="cliente-fundador" className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-6 rounded-[2rem] bg-[#00334E] p-6 text-white shadow sm:p-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-300">Cliente Fundador</p>
            <h2 className="mt-2 text-3xl font-black">Ajude a construir uma solução feita para a realidade da sua casa.</h2>
            <p className="mt-3 leading-7 text-white/80">
              A primeira versão será validada com organizações que querem organizar as contribuições sem custo fixo e sem complicação. Em troca de feedback prático e, se autorizado, um depoimento sobre a experiência, o Cliente Fundador recebe prioridade, acompanhamento e acesso preferencial às próximas evoluções.
            </p>
            <Link
              href="/solucoes/corrente-em-dia/quero-conhecer"
              className="mt-5 inline-flex rounded-2xl bg-[#31C16B] px-5 py-4 font-black text-[#00334E] transition hover:bg-[#4ada82]"
            >
              Quero ser Cliente Fundador
            </Link>
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

      <footer className="border-t border-slate-200 bg-white px-4 py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>Corrente em Dia — uma solução Automação Extrema.</p>
          <Image src="/ae-logo-azul.png" alt="Automação Extrema" width={120} height={40} className="h-auto w-28 rounded-xl" />
        </div>
      </footer>
    </main>
  );
}

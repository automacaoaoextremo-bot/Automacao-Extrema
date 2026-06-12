import Image from "next/image";
import Link from "next/link";
import { AeSolutionHeader } from "@/components/ae-solution-header";
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

const headerActions = [
  { label: "Quero Conhecer", href: "/solucoes/corrente-em-dia/quero-conhecer", variant: "primary" as const },
  { label: "Já sou Cliente", href: "/solucoes/corrente-em-dia/login", variant: "secondary" as const },
];

export default function CorrenteEmDiaLandingPage() {
  return (
    <main className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <AeSolutionHeader
        solutionName="Corrente em Dia"
        logoSrc="/corrente-em-dia-logo.svg"
        logoAlt="Logo Corrente em Dia"
        actions={headerActions}
      />

      <section id="solucao" className="scroll-mt-56 border-b border-[#dfe8df] bg-[#f6fbf8]">
        <div className="mx-auto grid max-w-6xl gap-7 px-4 py-7 lg:grid-cols-[1.05fr_0.95fr] lg:py-12">
          <div className="space-y-4">
            <p className="text-sm font-black uppercase tracking-[0.35em] text-[#2F6B43]">Solução para arrecadações</p>
            <h1 className="text-4xl font-black leading-[1.08] text-[#00334E] sm:text-5xl">
              A contribuição da casa organizada com respeito, clareza e custo fixo zero.
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-slate-700">
              O Corrente em Dia ajuda federações, associações e terreiros a organizar contribuições, Pix, comprovantes e pendências sem transformar cuidado coletivo em cobrança fria. A casa ganha previsibilidade, o gestor ganha clareza e o contribuinte resolve tudo pelo celular.
            </p>
            <div className="grid gap-3 sm:max-w-xl sm:grid-cols-2">
              <Link
                href="/solucoes/corrente-em-dia/quero-conhecer"
                className="rounded-2xl bg-[#31C16B] px-5 py-4 text-center text-base font-black text-[#00334E] shadow-lg shadow-emerald-200 ring-2 ring-[#31C16B]/20 transition hover:-translate-y-0.5 hover:bg-[#43db7c] hover:shadow-xl"
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

            <div id="contribuicao" className="scroll-mt-56 mt-4 rounded-3xl border border-slate-200 p-4">
              <p className="font-black text-[#00334E]">Minha contribuição</p>
              <p className="mt-1 text-sm text-slate-600">Valor: R$ 50,00 • Até dia 10</p>
              <div className="mt-4 flex h-32 items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-500">QR Code Pix</div>
              <button className="mt-4 w-full rounded-2xl bg-[#31C16B] py-3 font-black text-[#00334E] shadow-lg shadow-emerald-100 transition hover:bg-[#43db7c]">
                Enviar comprovante
              </button>
              <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
                <strong>Privacidade e LGPD:</strong> os valores e comprovantes são individuais e acessíveis somente ao contribuinte e à organização responsável, conforme consentimento. A solução deve proteger dados pessoais, WhatsApp, e-mail, histórico de contribuição e comprovantes.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="beneficios" className="scroll-mt-56 mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#2F6B43]">Benefícios</p>
          <h2 className="mt-2 text-3xl font-black leading-tight text-[#00334E] sm:text-4xl">
            Mais clareza para a organização, menos esforço para quem contribui.
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-700">
            A proposta é começar simples: organizar arrecadações, reduzir conferência manual, facilitar o Pix e dar ao gestor uma visão clara do mês sem expor ninguém.
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

      <section id="como-funciona" className="scroll-mt-56 mx-auto max-w-6xl px-4 py-10">
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

      <section id="cliente-fundador" className="scroll-mt-56 mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-6 rounded-[2rem] bg-[#00334E] p-6 text-white shadow sm:p-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-300">Cliente Fundador</p>
            <h2 className="mt-2 text-3xl font-black">Ajude a construir uma solução feita para a realidade da sua casa.</h2>
            <p className="mt-3 leading-7 text-white/80">
              Como Cliente Fundador, sua organização participa da fase inicial com implantação sem custo, acompanhamento mais próximo e prioridade nas melhorias que realmente fazem diferença para a rotina da casa.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href="/solucoes/corrente-em-dia/quero-conhecer"
                className="rounded-2xl bg-[#31C16B] px-5 py-4 text-center font-black text-[#00334E] shadow-lg shadow-emerald-950/30 transition hover:-translate-y-0.5 hover:bg-[#43db7c]"
              >
                Quero ser Cliente Fundador
              </Link>
              <a
                href={whatsappUrl}
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
            <p className="text-xl font-black text-[#00334E] sm:text-2xl">Corrente em Dia — uma solução Automação Extrema.</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Organização, clareza e cuidado para manter a corrente firme, sem transformar contribuição em cobrança fria.
            </p>
            <a
              href={whatsappUrl}
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

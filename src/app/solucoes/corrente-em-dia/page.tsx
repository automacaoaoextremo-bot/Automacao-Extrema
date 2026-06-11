import Image from "next/image";
import Link from "next/link";

const benefits = [
  "Implantação R$ 0,00 e mensalidade R$ 0,00 no piloto",
  "QR Code Pix e Pix copia e cola por contribuição",
  "Upload, pré-validação e aprovação humana de comprovantes",
  "Painel simples para celular e computador",
  "Relatórios de pagos, pendentes, em revisão e divergentes",
  "Mensagens respeitosas para lembrar sem constranger",
];

export default function CorrenteEmDiaLandingPage() {
  return (
    <main className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <header className="sticky top-0 z-20 border-b border-emerald-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-700">Automação Extrema</p>
            <h1 className="text-xl font-black text-[#00334E] sm:text-2xl">Corrente em Dia</h1>
          </div>
          <nav className="hidden items-center gap-4 text-sm font-bold text-slate-600 sm:flex">
            <a href="#beneficios">Benefícios</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#piloto">Piloto</a>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
        <div className="space-y-6">
          <div className="inline-flex rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-800">
            V1 focada em arrecadações, Pix, comprovantes e relatórios simples
          </div>
          <h2 className="text-4xl font-black leading-tight text-[#00334E] sm:text-5xl">
            A contribuição da casa organizada com respeito, clareza e custo fixo zero.
          </h2>
          <p className="max-w-3xl text-lg leading-8 text-slate-700">
            O Corrente em Dia ajuda federações, associações e terreiros a organizar contribuições, Pix, comprovantes e pendências sem transformar cuidado coletivo em cobrança fria. A casa ganha previsibilidade e o contribuinte resolve tudo pelo celular.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href="#piloto" className="rounded-2xl bg-[#31C16B] px-5 py-4 text-center font-black text-[#00334E] shadow">
              Quero conhecer o piloto
            </a>
            <Link href="/c/casa-pai-benedito-das-matas" className="rounded-2xl border border-slate-300 bg-white px-5 py-4 text-center font-black text-slate-700">
              Ver página exemplo
            </Link>
          </div>
        </div>
        <div className="rounded-[2rem] bg-white p-5 shadow-xl">
          <div className="rounded-[1.5rem] bg-[#00334E] p-5 text-white">
            <p className="text-sm font-bold text-emerald-300">Painel do mês</p>
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
          <h2 className="text-3xl font-black text-[#00334E]">Como funciona na V1</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              "A casa cadastra sua chave Pix oficial e seus contribuintes.",
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

      <section id="piloto" className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-[2rem] bg-[#00334E] p-6 text-white shadow sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-300">Piloto recomendado</p>
          <h2 className="mt-2 text-3xl font-black">Começar pequeno, medir e evoluir com segurança.</h2>
          <p className="mt-3 max-w-4xl leading-7 text-white/80">
            A recomendação é iniciar com 1 federação ou associação e 2 ou 3 terreiros, rodando 30 dias de contribuições reais para medir volume, esforço de aprovação, dúvidas, inadimplência e viabilidade da taxa operacional.
          </p>
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

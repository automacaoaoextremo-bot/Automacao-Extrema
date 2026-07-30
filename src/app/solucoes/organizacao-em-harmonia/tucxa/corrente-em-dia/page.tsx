import Link from "next/link";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

const base = "/solucoes/organizacao-em-harmonia/tucxa";

const actions = [
  { label: "Início", href: "#inicio", variant: "primary" as const },
  { label: "Transparência", href: "#transparencia", variant: "secondary" as const },
  { label: "Filhos de Fora", href: "#consulentes", variant: "secondary" as const },
  { label: "Filhos da Corrente", href: "#corrente", variant: "secondary" as const },
  { label: "Voltar", href: `${base}#modulos`, variant: "secondary" as const },
  {
    label: "Dúvidas?",
    href: "#duvidas",
    variant: "secondary" as const,
    action: "supportWhatsapp" as const,
  },
];

const transparencyFeatures = [
  "Visão resumida, por grupos ou por grupos e itens.",
  "Histórico dos últimos 12 meses, receitas, despesas e resultado.",
  "Saldo acumulado, comparação mensal e destaques positivos ou negativos.",
  "Drilldown, maiores despesas, melhores receitas e dados provisórios sinalizados.",
  "Última atualização, popup de transparência e frequência configurável.",
];

const expenseExamples = [
  "energia, água, telefone e manutenção do espaço",
  "segurança, limpeza e conservação",
  "materiais usados nos trabalhos espirituais",
  "despesas bancárias, institucionais e administrativas",
  "ações assistenciais, eventos e apoio ao Sementinha",
];

export default function CorrenteEmDiaPublicPage() {
  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={actions}
        navLabel="Menu do Corrente em Dia"
        showSupport={false}
      />

      <section
        id="inicio"
        className="mx-auto max-w-6xl scroll-mt-48 px-4 py-5 sm:px-6 lg:px-8 lg:py-8"
      >
        <div className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7]">
            Corrente em Dia
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
            Contribuir não é pagar por um atendimento. É ajudar a Casa a continuar cuidando.
          </h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-[#EEF7EA] sm:text-lg sm:leading-8">
            O acolhimento é percebido no dia do trabalho, mas a estrutura que torna esse cuidado possível precisa ser mantida todos os dias. O Corrente em Dia transforma números dispersos em informação clara, sigilosa e útil para quem administra e para quem deseja contribuir com consciência.
          </p>
        </div>
      </section>

      <section
        id="transparencia"
        className="mx-auto max-w-6xl scroll-mt-48 px-4 pb-5 sm:px-6 lg:px-8"
      >
        <article className="rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43]">
                Transparência em Harmonia
              </p>
              <h2 className="mt-2 text-2xl font-black leading-tight text-[#123D2C] sm:text-3xl">
                Ninguém deveria precisar confiar no escuro.
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-700">
                O painel público existe para mostrar, de forma agregada e sem expor nomes ou valores individuais, como os recursos ajudam a manter a Casa funcionando. A transparência não serve apenas para apresentar números: ela permite que cada pessoa compreenda por que sua participação importa.
              </p>
              <Link
                href={`${base}/transparencia`}
                className="mt-5 inline-flex w-full justify-center rounded-2xl bg-[#123D2C] px-6 py-4 text-center font-black text-white transition hover:-translate-y-0.5 hover:bg-[#2F6B43] sm:w-auto"
              >
                Acessar painel público
              </Link>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                  O que precisa ser mantido
                </p>
                <ul className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-slate-700">
                  {expenseExamples.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span aria-hidden="true" className="font-black text-[#2F6B43]">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-[#E9F2E7] p-4 ring-1 ring-[#123D2C]/10">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                  Como o painel apresenta
                </p>
                <ul className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-slate-700">
                  {transparencyFeatures.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span aria-hidden="true" className="font-black text-[#2F6B43]">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
              Da característica ao significado
            </p>
            <h2 className="mt-2 text-xl font-black text-[#123D2C]">
              Dados organizados
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              Receitas, despesas, documentos e competências ficam reunidos em uma única base, com revisão da Tesouraria/Financeiro.
            </p>
          </article>
          <article className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
              Por que isso existe
            </p>
            <h2 className="mt-2 text-xl font-black text-[#123D2C]">
              Para decidir com clareza
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              A Diretoria acompanha pendências, compara meses e identifica onde a Casa precisa de atenção antes que um problema se torne maior.
            </p>
          </article>
          <article className="rounded-[2rem] bg-[#E9F2E7] p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
              Por que isso importa
            </p>
            <h2 className="mt-2 text-xl font-black text-[#123D2C]">
              Segurança para contribuir
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              Quem contribui entende o impacto coletivo de sua participação e pode ajudar com confiança, sem exposição e sem transformar a espiritualidade em uma relação comercial.
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-5 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-2">
          <article id="consulentes" className="scroll-mt-48 rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43]">
              Filhos de Fora / Consulentes
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#123D2C]">
              Contribua de forma identificada ou não identificada.
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-700">
              Escolha um valor, registre uma contribuição pontual ou organize um Pix agendado. O atendimento não depende da contribuição, e os dados individuais permanecem sigilosos.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Link href={`${base}/consulente/contribuicao`} className="rounded-2xl bg-[#123D2C] px-5 py-4 text-center font-black text-white">
                Quero contribuir
              </Link>
              <Link href={`${base}/consulente/login`} className="rounded-2xl bg-[#E9F2E7] px-5 py-4 text-center font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">
                Já tenho cadastro
              </Link>
            </div>
          </article>

          <article id="corrente" className="scroll-mt-48 rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43]">
              Filhos da Corrente
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#123D2C]">
              Organize a contribuição mensal sem perder o sigilo.
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-700">
              Consulte sua situação, escolha o melhor dia, configure lembretes e, quando autorizado, organize uma contribuição familiar. Somente a Tesouraria/Financeiro e a Diretoria autorizada acessam valores individuais.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Link href={`${base}/filho-da-corrente/login`} className="rounded-2xl bg-[#123D2C] px-5 py-4 text-center font-black text-white">
                Já tenho cadastro
              </Link>
              <Link href={`${base}/filho-da-corrente/primeiro-acesso`} className="rounded-2xl bg-[#E9F2E7] px-5 py-4 text-center font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">
                Ainda não tenho cadastro
              </Link>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}

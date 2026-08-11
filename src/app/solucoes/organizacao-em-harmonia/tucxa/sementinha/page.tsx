import Link from "next/link";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

const headerActions = [
  {
    label: "Início",
    href: "/solucoes/organizacao-em-harmonia/tucxa/sementinha",
    variant: "primary" as const,
  },
  {
    label: "Despensa Viva",
    href: "/solucoes/organizacao-em-harmonia/tucxa/sementinha/despensa-viva",
    variant: "secondary" as const,
  },
  {
    label: "Tucxa",
    href: "/solucoes/organizacao-em-harmonia/tucxa",
    variant: "secondary" as const,
  },
  {
    label: "Ajuda",
    href: "#ajuda",
    variant: "secondary" as const,
    action: "supportWhatsapp" as const,
  },
];

const futureModules = [
  {
    title: "Doações",
    text: "Organizar entradas de doações, origem, destino e prestação do que foi recebido.",
  },
  {
    title: "Ações em Comunidades",
    text: "Planejar ações, comunidades atendidas, necessidades e entregas realizadas.",
  },
  {
    title: "Bazar Beneficente",
    text: "Conectar as soluções já existentes do Bazar ao mesmo ecossistema do Sementinha.",
  },
  {
    title: "Bingo Beneficente",
    text: "Conectar o Bingo às ações beneficentes e à visão consolidada do Sementinha.",
  },
];

export default function SementinhaEmHarmoniaPage() {
  return (
    <main className="min-h-screen bg-[#F6FAF2] text-[#173323]">
      <TucxaPublicHeader
        actions={headerActions}
        showSupport={false}
        mobileActionColumns={4}
        compactMobileActions
      />

      <section className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-7 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-green-900/10 ring-1 ring-[#123D2C]/10">
          <div className="bg-gradient-to-br from-[#123D2C] via-[#2F6B43] to-[#5B8C55] p-5 text-white sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#DDF0D4]">
              Sementinha em Harmonia
            </p>
            <h1 className="mt-2 max-w-4xl text-3xl font-black leading-tight sm:text-5xl">
              Cuidar melhor do que chega para fazer chegar melhor a quem precisa.
            </h1>
            <p className="mt-3 max-w-4xl text-base font-semibold leading-7 text-[#F0F8EC] sm:text-lg sm:leading-8">
              O primeiro passo é a Despensa Viva: estoque de alimentos por lote e validade,
              composição da cesta básica, entregas e histórico — simples para usar no celular
              e sem depender de uma planilha presa a um computador.
            </p>

            <Link
              href="/solucoes/organizacao-em-harmonia/tucxa/sementinha/despensa-viva"
              className="mt-5 inline-flex w-full justify-center rounded-2xl bg-white px-5 py-4 text-sm font-black text-[#123D2C] shadow-lg transition hover:-translate-y-0.5 sm:w-auto sm:text-base"
            >
              Abrir Despensa Viva
            </Link>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-6">
            <article className="rounded-2xl bg-[#F6FAF2] p-4 ring-1 ring-[#123D2C]/10">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
                Dor
              </p>
              <h2 className="mt-1 text-lg font-black">Precisar ir à sede para saber o estoque.</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                A informação fica disponível para as pessoas autorizadas de qualquer lugar.
              </p>
            </article>

            <article className="rounded-2xl bg-[#F6FAF2] p-4 ring-1 ring-[#123D2C]/10">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
                Risco
              </p>
              <h2 className="mt-1 text-lg font-black">Saber o total, mas não o que vence primeiro.</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                Cada entrada vira um lote. A saída segue o PVPS — Primeiro que Vence é o Primeiro que Sai.
              </p>
            </article>

            <article className="rounded-2xl bg-[#F6FAF2] p-4 ring-1 ring-[#123D2C]/10">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
                Decisão
              </p>
              <h2 className="mt-1 text-lg font-black">Quantas cestas conseguimos montar hoje?</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                A capacidade é calculada pela composição real da cesta e mostra qual item limita novas entregas.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-3 pb-5 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-[#FFFDF7] p-4 shadow ring-1 ring-amber-900/10 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
            Por que lote e validade mudam a decisão
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#173323]">
            “Arroz = 50 kg” ainda é pouca informação.
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-4 ring-1 ring-amber-900/10">
              <p className="font-black text-[#173323]">Lote A · 10 kg</p>
              <p className="mt-1 text-sm font-semibold text-amber-700">
                Validade mais próxima → deve sair primeiro
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-amber-900/10">
              <p className="font-black text-[#173323]">Lote B · 40 kg</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                Validade posterior → permanece protegido no estoque
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold leading-6 text-slate-700 sm:text-base">
            A Despensa Viva usa PVPS — <strong>Primeiro que Vence é o Primeiro que Sai</strong> — para sugerir
            e executar a baixa dos lotes que vencem primeiro. Isso ajuda a reduzir perdas sem
            transformar a rotina do Sementinha em um processo complicado.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-3 pb-8 sm:px-6 lg:px-8">
        <div className="mb-3">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
            Caminho de evolução
          </p>
          <h2 className="mt-1 text-2xl font-black">
            Um módulo do Tucxa que pode crescer sem refazer o que já funciona.
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {futureModules.map((module) => (
            <article
              key={module.title}
              className="rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10"
            >
              <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#2F6B43]">
                Próxima etapa
              </p>
              <h3 className="mt-1 text-lg font-black">{module.title}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                {module.text}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

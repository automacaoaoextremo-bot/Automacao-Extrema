import Image from "next/image";
import Link from "next/link";
import { consulenteServices, tucxaTheme } from "../tucxa-content";

const guidance = [
  "Chegue com antecedência e siga as orientações da recepção e organização.",
  "O atendimento é individual e respeitoso. Evite retirar senha ou ficha para outra pessoa.",
  "Quando houver encaminhamento, a coordenação orientará o preparo e a data adequada.",
  "A contribuição é uma forma de ajudar a manutenção da casa e pode ser feita de forma identificada ou anônima.",
];

export default function ConsulenteTucxaPage() {
  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <header className="border-b border-[#123D2C]/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Link href="/solucoes/organizacao-em-harmonia/tucxa" className="flex items-center gap-3">
            <span className="relative flex h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-white p-1 ring-1 ring-[#123D2C]/10">
              <Image src={tucxaTheme.logoSrc} alt="Logo do Tucxa" width={52} height={52} className="h-full w-full object-contain" priority />
            </span>
            <span>
              <span className="block text-lg font-black text-[#123D2C]">Consulente / Filho de Fora</span>
              <span className="block text-xs font-bold uppercase tracking-[0.16em] text-[#2F6B43]">Tucxa • Atendimento e orientação</span>
            </span>
          </Link>
          <Link href="/solucoes/organizacao-em-harmonia/tucxa" className="rounded-full bg-[#E9F2E7] px-4 py-3 text-center text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">
            ← Voltar ao site do Tucxa
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="rounded-[2rem] bg-[#123D2C] p-6 text-white shadow-xl shadow-green-900/10 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#CFE2C7]">Filhos de Fora</p>
          <h1 className="mt-2 max-w-4xl text-4xl font-black leading-tight sm:text-5xl">Um espaço de acolhimento para quem busca auxílio espiritual.</h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-[#EEF7EA]">
            O Tucxa recebe pessoas que procuram orientação, fortalecimento e crescimento espiritual. A organização do atendimento existe para que cada consulente seja recebido com respeito, clareza e segurança.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link href="/solucoes/organizacao-em-harmonia/tucxa/consulente/cadastro" className="rounded-2xl bg-white px-5 py-4 text-center font-black text-[#123D2C] transition hover:-translate-y-0.5">
              Quero orientação / cadastro
            </Link>
            <Link href="/solucoes/organizacao-em-harmonia/tucxa/consulente/cadastro?tipo=contribuicao" className="rounded-2xl bg-[#E9F2E7] px-5 py-4 text-center font-black text-[#123D2C] transition hover:-translate-y-0.5">
              Fazer contribuição
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {consulenteServices.map((service) => (
            <article key={service.title} className="rounded-[2rem] bg-white p-6 shadow-lg shadow-green-900/5 ring-1 ring-[#123D2C]/10">
              <h2 className="text-xl font-black text-[#123D2C]">{service.title}</h2>
              <p className="mt-3 leading-7 text-slate-700">{service.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-[2rem] bg-white p-6 shadow-lg shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2F6B43]">Como se preparar</p>
          <h2 className="mt-2 text-3xl font-black text-[#123D2C]">Orientações simples para uma experiência mais tranquila.</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {guidance.map((item) => (
              <div key={item} className="rounded-2xl bg-[#F7FAF2] p-4 font-bold leading-7 text-[#123D2C] ring-1 ring-[#123D2C]/10">
                {item}
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-2xl bg-[#E9F2E7] p-4 text-sm font-semibold leading-6 text-[#123D2C]">
            As informações detalhadas de horário, fichas, senhas e encaminhamentos podem ser ajustadas pela organização do Tucxa conforme calendário, orientação da Diretoria e necessidade da casa.
          </p>
        </div>
      </section>
    </main>
  );
}

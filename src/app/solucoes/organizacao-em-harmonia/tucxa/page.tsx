import Image from "next/image";
import Link from "next/link";
import { consulenteServices, tucxaNavigation, tucxaTheme } from "./tucxa-content";

const modules = [
  {
    title: "Agenda Viva",
    text: "Organiza atividades, grupos, escalas, estudos e eventos em um calendário simples para consulta pelo celular.",
  },
  {
    title: "Atendimento em Harmonia",
    text: "Ajuda a estruturar acolhimentos, orientações e encaminhamentos sem perder o cuidado humano de cada atendimento.",
  },
  {
    title: "Corrente em Dia",
    text: "Facilita contribuições e conferências, com mais clareza para a casa e menos retrabalho para a tesouraria.",
  },
];

const benefits = [
  "Menos mensagens perdidas nos grupos de WhatsApp.",
  "Dados atualizados uma única vez e usados nos três módulos.",
  "Mais segurança para liberar acesso apenas após validação do responsável.",
  "Uso simples no celular, pensando também nos filhos com pouca familiaridade tecnológica.",
];

export default function TucxaSitePage() {
  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <header className="sticky top-0 z-30 border-b border-[#123D2C]/10 bg-[#F7FAF2]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/solucoes/organizacao-em-harmonia/tucxa" className="flex items-center gap-3">
              <span className="relative flex h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-white p-1 shadow-sm ring-1 ring-[#123D2C]/10">
                <Image src={tucxaTheme.logoSrc} alt="Logo do Tucxa" width={52} height={52} className="h-full w-full object-contain" priority />
              </span>
              <span>
                <span className="block text-xl font-black tracking-tight text-[#123D2C]">{tucxaTheme.organizationName}</span>
                <span className="block text-xs font-bold uppercase tracking-[0.18em] text-[#2F6B43]">{tucxaTheme.fullName}</span>
              </span>
            </Link>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <Link href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente" className="rounded-full bg-[#123D2C] px-4 py-3 text-center text-sm font-black text-white shadow-lg shadow-green-900/10 transition hover:-translate-y-0.5">
                Filho da Corrente
              </Link>
              <Link href="#consulentes" className="rounded-full border border-[#123D2C]/20 bg-white px-4 py-3 text-center text-sm font-black text-[#123D2C] transition hover:-translate-y-0.5 hover:bg-[#E9F2E7]">
                Consulente
              </Link>
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto pb-1 text-sm font-black text-[#123D2C]">
            {tucxaNavigation.map((item) => (
              <a key={item.href} href={item.href} className="shrink-0 rounded-full bg-white px-4 py-2 ring-1 ring-[#123D2C]/10 transition hover:bg-[#E9F2E7]">
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-16">
        <div className="space-y-6">
          <p className="inline-flex rounded-full bg-[#E9F2E7] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43] ring-1 ring-[#123D2C]/10">
            Organização em Harmonia no Tucxa
          </p>
          <h1 className="text-4xl font-black leading-tight tracking-tight text-[#123D2C] sm:text-5xl lg:text-6xl">
            Um ponto simples para orientar, organizar e cuidar melhor da nossa corrente.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-700">
            O Tucxa passa a ter um espaço próprio para que Filhos da Corrente e Filhos de Fora encontrem informações, atualizem seus dados e recebam orientações com mais clareza, sem depender de mensagens soltas ou cadastros duplicados.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente" className="rounded-3xl bg-[#123D2C] px-6 py-5 text-center text-base font-black text-white shadow-xl shadow-green-900/10 transition hover:-translate-y-1">
              Sou Filho da Corrente
            </Link>
            <Link href="#consulentes" className="rounded-3xl bg-white px-6 py-5 text-center text-base font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 transition hover:-translate-y-1 hover:bg-[#E9F2E7]">
              Sou Consulente / Filho de Fora
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-5 shadow-2xl shadow-green-900/10 ring-1 ring-[#123D2C]/10 sm:p-7">
          <div className="rounded-[1.5rem] bg-[#E9F2E7] p-5 ring-1 ring-[#123D2C]/10">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#2F6B43]">Por que atualizar os dados?</p>
            <h2 className="mt-2 text-2xl font-black text-[#123D2C]">Para receber a orientação certa, no canal certo, sem retrabalho.</h2>
            <p className="mt-3 leading-7 text-slate-700">
              Nome completo e WhatsApp ajudam a casa a reconhecer cada filho. O e-mail é opcional, mas recomendado para reforçar comunicados importantes e evitar que uma orientação se perca no volume de mensagens.
            </p>
          </div>
          <div className="mt-5 grid gap-3">
            {benefits.map((benefit) => (
              <div key={benefit} className="rounded-2xl border border-[#123D2C]/10 bg-[#F7FAF2] p-4 font-bold text-[#123D2C]">
                {benefit}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="visao" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-[#123D2C] p-6 text-white shadow-xl shadow-green-900/10 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#CFE2C7]">Visão</p>
          <h2 className="mt-2 text-3xl font-black">Tecnologia para servir à organização, não para complicar a rotina.</h2>
          <p className="mt-4 max-w-4xl text-lg leading-8 text-[#EEF7EA]">
            A proposta é preservar o jeito do Tucxa trabalhar, oferecendo uma base mais clara para cadastros, agenda, orientações, estudos, eventos e contribuições. Tudo deve ser simples, acessível pelo celular e validado por responsáveis da casa.
          </p>
        </div>
      </section>

      <section id="modulos" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2F6B43]">Módulos do Tucxa</p>
          <h2 className="mt-2 text-3xl font-black text-[#123D2C]">Três frentes conectadas pela mesma Base de Harmonia.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {modules.map((module) => (
            <article key={module.title} className="rounded-[2rem] bg-white p-6 shadow-lg shadow-green-900/5 ring-1 ring-[#123D2C]/10">
              <h3 className="text-xl font-black text-[#123D2C]">{module.title}</h3>
              <p className="mt-3 leading-7 text-slate-700">{module.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="corrente" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] bg-white p-6 shadow-lg shadow-green-900/5 ring-1 ring-[#123D2C]/10">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2F6B43]">Filhos da Corrente</p>
            <h2 className="mt-2 text-3xl font-black text-[#123D2C]">Atualize todos os vínculos que você possui com a casa.</h2>
            <p className="mt-4 leading-8 text-slate-700">
              Quem atua em mais de uma frente deve marcar todas elas: cambono, cavalinho, coordenação, recepção, Sementinha, estudos, clube do livro, organização de eventos e grupos de quinta. Assim o Tucxa consegue orientar cada pessoa com mais cuidado.
            </p>
          </div>
          <div className="rounded-[2rem] bg-[#E9F2E7] p-6 ring-1 ring-[#123D2C]/10">
            <h3 className="text-2xl font-black text-[#123D2C]">Primeiro acesso</h3>
            <p className="mt-3 leading-7 text-slate-700">
              Ao preencher os dados, o cadastro fica aguardando validação. Depois da conferência, o responsável libera o acesso e envia as orientações por e-mail, quando informado, e por WhatsApp.
            </p>
            <Link href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente" className="mt-5 inline-flex rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white transition hover:-translate-y-0.5">
              Ir para Filho da Corrente
            </Link>
          </div>
        </div>
      </section>

      <section id="consulentes" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-white p-6 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2F6B43]">Consulentes / Filhos de Fora</p>
              <h2 className="mt-2 text-3xl font-black text-[#123D2C]">Acolhimento para quem busca auxílio e crescimento espiritual.</h2>
              <p className="mt-4 max-w-3xl leading-8 text-slate-700">
                O Tucxa é aberto a pessoas que buscam auxílio espiritual. Aqui o consulente encontra uma explicação simples do atendimento e pode deixar seus dados para orientação, agendamento e contribuição.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:min-w-80 lg:grid-cols-1">
              <Link href="/solucoes/organizacao-em-harmonia/tucxa/consulente" className="rounded-2xl bg-[#123D2C] px-5 py-4 text-center font-black text-white transition hover:-translate-y-0.5">
                Entender os atendimentos
              </Link>
              <Link href="/solucoes/organizacao-em-harmonia/tucxa/consulente/cadastro" className="rounded-2xl bg-[#E9F2E7] px-5 py-4 text-center font-black text-[#123D2C] ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5">
                Cadastro / contribuição
              </Link>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {consulenteServices.map((service) => (
              <article key={service.title} className="rounded-3xl bg-[#F7FAF2] p-5 ring-1 ring-[#123D2C]/10">
                <h3 className="font-black text-[#123D2C]">{service.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{service.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="mx-auto max-w-7xl px-4 py-8 pb-14 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["1", "A pessoa informa WhatsApp ou e-mail", "Se já houver cadastro, os dados aparecem para conferência. Se não houver, a pessoa preenche de forma guiada."],
            ["2", "O responsável valida", "A Base Única não libera automaticamente. O Tucxa confere as informações antes de conceder acesso."],
            ["3", "A orientação chega pelo canal certo", "Após liberar ou solicitar ajuste, o responsável pode responder por WhatsApp e por e-mail com cópia interna."],
          ].map(([step, title, text]) => (
            <article key={step} className="rounded-[2rem] bg-white p-6 shadow-lg shadow-green-900/5 ring-1 ring-[#123D2C]/10">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#123D2C] text-lg font-black text-white">{step}</span>
              <h3 className="mt-4 text-xl font-black text-[#123D2C]">{title}</h3>
              <p className="mt-3 leading-7 text-slate-700">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

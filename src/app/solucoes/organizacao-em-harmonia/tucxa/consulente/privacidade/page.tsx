import type { ReactNode } from "react";
import Link from "next/link";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

const headerActions = [
  { label: "Voltar ao cadastro", href: "/solucoes/organizacao-em-harmonia/tucxa/consulente/cadastro", variant: "primary" as const },
  { label: "Início", href: "/solucoes/organizacao-em-harmonia/tucxa/consulente", variant: "secondary" as const },
];

export default function AvisoPrivacidadeConsulentePage() {
  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader actions={headerActions} navLabel="Aviso de Privacidade do Consulente do TUCXA" />

      <article className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="rounded-[1.75rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43]">Aviso de Privacidade</p>
          <h1 className="mt-2 text-2xl font-black text-[#123D2C] sm:text-3xl">Cadastro e agendamento de Consulentes / Filhos de Fora</h1>
          <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base">
            Este aviso explica, em linguagem simples, como os dados informados no cadastro e nos agendamentos são utilizados pelo TUCXA dentro da Organização em Harmonia.
          </p>

          <div className="mt-5 grid gap-4 text-sm leading-6 text-slate-700 sm:text-base">
            <Section title="Dados utilizados">
              Nome, celular/WhatsApp, e-mail quando informado, credenciais de acesso, dados dos agendamentos e observações que você decidir encaminhar à recepção.
            </Section>
            <Section title="Para que os dados são utilizados">
              Criar e proteger seu acesso, organizar atendimentos, confirmar agendamentos, evitar duplicidades, entrar em contato sobre o próprio atendimento e manter o histórico necessário à organização.
            </Section>
            <Section title="Comunicações futuras">
              O recebimento de outras informações por e-mail é opcional. A confirmação do seu próprio cadastro ou agendamento pode ser enviada independentemente dessa escolha.
            </Section>
            <Section title="Acesso e segurança">
              O acesso aos dados deve ficar restrito às pessoas autorizadas para operar o cadastro e o atendimento. Não inclua em observações informações que não sejam necessárias.
            </Section>
            <Section title="Seus pedidos">
              Você pode solicitar correção dos dados, atualização do e-mail, esclarecimentos sobre o tratamento ou revogação da autorização de comunicações futuras pelos canais oficiais do TUCXA.
            </Section>
            <Section title="Versão deste aviso">
              Versão 2026-07-19. Alterações relevantes deverão ser apresentadas novamente quando necessário.
            </Section>
          </div>

          <Link
            href="/solucoes/organizacao-em-harmonia/tucxa/consulente/cadastro"
            className="mt-6 flex min-h-13 items-center justify-center rounded-2xl bg-[#123D2C] px-5 py-4 text-center font-black text-white"
          >
            Voltar ao cadastro
          </Link>
        </div>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
      <h2 className="font-black text-[#123D2C]">{title}</h2>
      <p className="mt-1">{children}</p>
    </section>
  );
}

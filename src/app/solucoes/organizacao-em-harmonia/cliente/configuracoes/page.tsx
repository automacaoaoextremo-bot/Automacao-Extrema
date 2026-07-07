import Link from "next/link";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";

const configs = [
  "Quem pode aprovar inclusão ou alteração de atividades na Agenda Viva.",
  "Quem pode visualizar, criar e concluir atendimentos no Atendimento em Harmonia.",
  "Quem pode aprovar comprovantes e consultar relatórios no Corrente em Dia.",
  "Quais dados exigem consentimento, confirmação de LGPD e registro de auditoria.",
];

export default function OrganizacaoConfiguracoesPage() {
  return (
    <OrganizacaoClientShell
      title="Configurações"
      description="Ajuste regras por cliente, evitando processos engessados e respeitando o jeito de cada organização funcionar."
    >
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2F6B43]">Site público do cliente</p>
          <h2 className="mt-2 text-2xl font-black text-[#00334E]">Configurar site específico do Tucxa</h2>
          <p className="mt-2 leading-7 text-slate-600">
            Defina logo, cores, chamadas e seções para que Filhos da Corrente e Consulentes acessem um endereço próprio do Tucxa.
          </p>
          <Link href="/solucoes/organizacao-em-harmonia/cliente/configuracoes/site" className="mt-5 inline-flex rounded-2xl bg-[#31C16B] px-5 py-4 text-center font-black text-[#00334E] shadow-lg shadow-emerald-100 transition hover:-translate-y-0.5">
            Configurar site
          </Link>
        </div>



        <div className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2F6B43]">Aprovações por fluxo</p>
          <h2 className="mt-2 text-2xl font-black text-[#00334E]">Definir responsáveis por validação</h2>
          <p className="mt-2 leading-7 text-slate-600">
            Direcione cadastros de Consulentes, Filhos da Corrente, eventos, atendimentos e contribuições para responsáveis diferentes, mantendo a Automação Extrema em cópia.
          </p>
          <Link href="/solucoes/organizacao-em-harmonia/cliente/configuracoes/aprovacoes" className="mt-5 inline-flex rounded-2xl bg-[#FFF2A8] px-5 py-4 text-center font-black text-[#00334E] shadow-lg shadow-yellow-100 transition hover:-translate-y-0.5">
            Configurar aprovações
          </Link>
        </div>

        <div className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2F6B43]">Regulamento e horários</p>
          <h2 className="mt-2 text-2xl font-black text-[#00334E]">Editar orientações públicas</h2>
          <p className="mt-2 leading-7 text-slate-600">
            Cadastre horários de atendimento, regras de porta, orientações para Filhos de Fora e textos dos módulos Atendimento em Harmonia e Corrente em Dia.
          </p>
          <Link href="/solucoes/organizacao-em-harmonia/cliente/configuracoes/regulamento" className="mt-5 inline-flex rounded-2xl bg-[#00334E] px-5 py-4 text-center font-black text-white shadow-lg shadow-slate-100 transition hover:-translate-y-0.5">
            Configurar regulamento
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {configs.map((item) => (
          <div key={item} className="rounded-3xl bg-white p-5 font-semibold leading-7 text-slate-700 shadow ring-1 ring-slate-100">
            {item}
          </div>
        ))}
      </section>
    </OrganizacaoClientShell>
  );
}

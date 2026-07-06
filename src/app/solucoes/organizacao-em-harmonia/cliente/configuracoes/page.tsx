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
      <section className="mb-5 rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2F6B43]">Site público do cliente</p>
            <h2 className="mt-2 text-2xl font-black text-[#00334E]">Configurar site específico do Tucxa</h2>
            <p className="mt-2 leading-7 text-slate-600">
              Defina logo, cores, chamadas e seções para que Filhos da Corrente e Consulentes acessem um endereço próprio do Tucxa.
            </p>
          </div>
          <Link href="/solucoes/organizacao-em-harmonia/cliente/configuracoes/site" className="rounded-2xl bg-[#31C16B] px-5 py-4 text-center font-black text-[#00334E] shadow-lg shadow-emerald-100 transition hover:-translate-y-0.5">
            Configurar site
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

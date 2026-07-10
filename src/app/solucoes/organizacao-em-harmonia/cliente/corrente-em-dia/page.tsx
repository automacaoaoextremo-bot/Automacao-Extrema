import Link from "next/link";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";

const settings = [
  {
    title: "Contribuição identificada",
    description: "Consulente ou Filho de Fora entra com cadastro validado, escolhe valor, forma de pagamento e envia comprovante quando necessário.",
  },
  {
    title: "Contribuição anônima",
    description: "Pessoa contribui sem login, escolhendo valor e forma. O sistema mantém a conferência financeira sem expor identidade no painel público.",
  },
  {
    title: "Formas de pagamento",
    description: "Pix copia e cola, QR Code, comprovante, dinheiro, débito/crédito e solicitação de link online quando disponível.",
  },
  {
    title: "Conferência e aprovações",
    description: "Organização pode validar comprovantes, registrar recebimento em dinheiro e acompanhar pendências por responsável.",
  },
];

export default function CorrenteEmDiaClientePage() {
  return (
    <OrganizacaoClientShell
      title="Corrente em Dia"
      description="Configure as regras financeiras e operacionais das contribuições do Tucxa, sem misturar com Base Única ou Agenda Viva."
    >
      <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#2F6B43]">Módulo financeiro-operacional</p>
        <h2 className="mt-2 text-2xl font-black text-[#00334E]">Menos comprovante espalhado, mais clareza para a tesouraria.</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
          Esta primeira versão organiza as regras do Corrente em Dia e prepara o fluxo para contribuições identificadas e anônimas. A etapa seguinte pode conectar Pix, QR Code, links de pagamento e relatórios.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {settings.map((item) => (
          <article key={item.title} className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6">
            <h3 className="text-xl font-black text-[#00334E]">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow sm:p-7">
        <h2 className="text-2xl font-black">Configurações relacionadas</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link href="/solucoes/organizacao-em-harmonia/cliente/configuracoes/aprovacoes" className="rounded-2xl bg-white px-5 py-3 text-center font-black text-[#123D2C]">
            Responsáveis por aprovação
          </Link>
          <Link href="/solucoes/organizacao-em-harmonia/cliente/relatorios" className="rounded-2xl bg-[#E9F2E7] px-5 py-3 text-center font-black text-[#123D2C]">
            Relatórios e conferência
          </Link>
        </div>
      </section>
    </OrganizacaoClientShell>
  );
}

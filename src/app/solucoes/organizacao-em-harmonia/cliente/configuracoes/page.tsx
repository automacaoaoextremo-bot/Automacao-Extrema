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

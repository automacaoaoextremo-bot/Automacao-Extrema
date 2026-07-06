import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";

const metrics = [
  "Configuração inicial concluída.",
  "Pessoas cadastradas e ativas.",
  "Funções com permissões revisadas.",
  "Módulos habilitados por cliente.",
  "Pendências de aprovação por área.",
  "Próximos passos da validação como Cliente Fundador.",
];

export default function OrganizacaoRelatoriosPage() {
  return (
    <OrganizacaoClientShell
      title="Relatórios"
      description="Acompanhe indicadores simples para validar a solução com a diretoria e orientar os próximos ajustes."
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((item) => (
          <div key={item} className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2F6B43]">Indicador</p>
            <p className="mt-2 font-semibold leading-7 text-slate-700">{item}</p>
          </div>
        ))}
      </section>
    </OrganizacaoClientShell>
  );
}

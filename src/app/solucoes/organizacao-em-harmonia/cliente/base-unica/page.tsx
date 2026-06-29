import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";

const items = [
  "Pessoas: nome, WhatsApp, e-mail, status, vínculo e consentimentos.",
  "Funções: presidente, coordenador, cambono, recepção, tesouraria, voluntário, consulente e funções personalizadas.",
  "Permissões: ver, criar, aprovar, editar, cancelar, exportar e configurar por módulo.",
  "Módulos habilitados: Corrente em Dia, Atendimento em Harmonia e Agenda Viva.",
];

export default function OrganizacaoBaseUnicaPage() {
  return (
    <OrganizacaoClientShell
      title="Base Única"
      description="Cadastre pessoas, funções e permissões uma vez para usar em todos os módulos contratados."
    >
      <section className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <div key={item} className="rounded-3xl bg-white p-5 font-semibold leading-7 text-slate-700 shadow ring-1 ring-slate-100">
            {item}
          </div>
        ))}
      </section>
    </OrganizacaoClientShell>
  );
}

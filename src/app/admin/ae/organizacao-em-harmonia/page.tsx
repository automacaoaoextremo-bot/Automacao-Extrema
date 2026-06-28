import Link from "next/link";
import { AdminPageShell } from "@/components/admin-page-shell";

const modules = [
  {
    name: "Corrente em Dia",
    href: "/solucoes/corrente-em-dia",
    description: "Contribuições, Pix, comprovantes, aprovações e lembretes respeitosos.",
  },
  {
    name: "Atendimento em Harmonia",
    href: "/solucoes/atendimento-em-harmonia",
    description: "Recepção, agenda, fila, retornos, check-in, capacidade e cambonos.",
  },
  {
    name: "Agenda Viva",
    href: "/solucoes/agenda-viva",
    description: "Calendário único com atividades, responsáveis, recorrências, aprovações e conflitos.",
  },
];

export default function AdminOrganizacaoEmHarmoniaPage() {
  return (
    <AdminPageShell
      title="Organização em Harmonia"
      description="Suíte modular com base compartilhada de organizações, pessoas, funções, permissões, atendimento, agenda e contribuições."
      actions={
        <Link href="/solucoes/organizacao-em-harmonia/quero-conhecer" className="rounded-xl bg-[#31C16B] px-4 py-3 text-sm font-bold text-[#00334E] shadow">
          Quero Conhecer
        </Link>
      }
    >
      <section className="grid gap-4 md:grid-cols-3">
        {modules.map((module) => (
          <Link key={module.name} href={module.href} className="rounded-2xl bg-white p-5 shadow hover:ring-2 hover:ring-[#31C16B]">
            <p className="text-lg font-bold text-[#00334E]">{module.name}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{module.description}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow">
        <h2 className="text-xl font-bold text-[#00334E]">Base compartilhada recomendada</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            "Organizações, pessoas e contatos cadastrados uma única vez.",
            "Funções configuráveis por cliente: presidente, coordenação, recepção, cambono, tesouraria, voluntário e outras.",
            "Permissões por tela/opção: criar, aprovar, editar, cancelar, visualizar relatórios e operar recepção.",
            "Módulos independentes, mas integrados quando o cliente assina mais de uma solução.",
          ].map((item) => (
            <div key={item} className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-[#00334E] p-5 text-white shadow">
        <h2 className="text-xl font-bold">Próxima validação com a diretoria</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-white/80">
          Validar regras de atendimento, aprovações de calendário, permissões por função e modelo comercial modular: módulos avulsos ou pacote completo com mensal, semestral e anual.
        </p>
      </section>
    </AdminPageShell>
  );
}

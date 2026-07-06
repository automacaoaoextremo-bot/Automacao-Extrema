"use client";

import Link from "next/link";
import { OrganizacaoBaseUnicaSubnav } from "@/components/organizacao-base-unica-subnav";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";

const groups = [
  { title: "Segunda — Filhos de fora", description: "Atendimento a consulentes. Participam cavalinhos, cambonos e equipe da organização.", href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/vinculos" },
  { title: "Terça — Filhos de fora", description: "Atendimento a consulentes. Deve seguir os mesmos critérios de participação da segunda-feira.", href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/vinculos" },
  { title: "Quarta — Transformação", description: "Apenas pessoas encaminhadas e agendadas pela coordenação, conforme orientação da casa.", href: "/solucoes/organizacao-em-harmonia/cliente/agenda-viva" },
  { title: "Quinta — Grupo 1", description: "1ª e 3ª quinta-feira de cada mês. Gira de desenvolvimento dos filhos da corrente.", href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/vinculos" },
  { title: "Quinta — Grupo 2", description: "2ª e 4ª quinta-feira de cada mês. Gira de desenvolvimento dos filhos da corrente.", href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/vinculos" },
  { title: "Recepção e Organização", description: "Pessoas autorizadas a apoiar entrada, acolhimento, check-in, fichas, senhas e orientação de circulação.", href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/vinculos" },
  { title: "Coordenação", description: "Responsáveis por dúvidas, exceções, aprovações operacionais, problemas durante trabalhos e encaminhamentos.", href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/funcoes" },
  { title: "Aprovação de eventos", description: "Presidência, Diretoria ou pessoas autorizadas para aprovar atividades, eventos e alterações relevantes no calendário.", href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/vinculos" },
];

export default function GruposPage() {
  return (
    <OrganizacaoClientShell title="Grupos e responsabilidades" description="Use esta visão para alinhar a estrutura da casa antes de aplicar vínculos em lote aos envolvidos.">
      <OrganizacaoBaseUnicaSubnav />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <Link key={group.title} href={group.href} className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-lg">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">Grupo</p>
            <h2 className="mt-2 text-xl font-black text-[#00334E]">{group.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{group.description}</p>
            <span className="mt-4 inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-[#00334E] ring-1 ring-emerald-100">Configurar vínculos</span>
          </Link>
        ))}
      </section>
    </OrganizacaoClientShell>
  );
}

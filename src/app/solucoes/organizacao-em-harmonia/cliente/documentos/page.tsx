import Link from "next/link";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";

const documentCards = [
  {
    title: "Regulamento do Tucxa",
    description: "Horários, grupos, conduta, presença, comunicação oficial, eventos, biblioteca e regras gerais.",
    fields: ["Título", "Versão", "Público", "Seções", "Resumo", "Status", "Arquivo ou link"],
  },
  {
    title: "Procedimentos e orientações básicas",
    description: "Preparo material, alimentação, vestuário, banho de defesa, entrada no terreiro, silêncio e estudos.",
    fields: ["Tópico", "Descrição", "Função relacionada", "Módulo relacionado", "Obrigatório?", "Checklist"],
  },
  {
    title: "Manual para Cambonos",
    description: "Sigilo, anotações, apoio ao consulente, comunicação com coordenação e retorno obrigatório.",
    fields: ["Responsabilidade", "Quando aplicar", "Quem deve ver", "Entidade relacionada", "Orientação operacional"],
  },
];

const editableAreas = [
  {
    title: "Funções",
    href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/funcoes",
    description: "Descrição, responsabilidades, permissões, módulos visíveis, documentos obrigatórios e checklist por função.",
  },
  {
    title: "Entidades",
    href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/entidades",
    description: "Linha, dias de atendimento, capacidade, materiais, observações, Cavalinhos vinculados e se atende consulentes.",
  },
  {
    title: "Orientações",
    href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/orientacoes",
    description: "Conteúdo dos documentos transformado em regras e orientações contextuais para a operação.",
  },
];

export default function DocumentosClientePage() {
  return (
    <OrganizacaoClientShell
      title="Documentos e cadastros vivos"
      description="Transforme Regulamento, Procedimentos e Manual de Cambonos em informações editáveis, consultáveis e conectadas à Agenda Viva, Atendimento em Harmonia e Corrente em Dia."
    >
      <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Estratégia</p>
        <h2 className="mt-2 text-2xl font-black text-[#00334E]">Menos PDF parado, mais orientação no fluxo certo.</h2>
        <p className="mt-2 max-w-4xl leading-7 text-slate-600">
          Os documentos continuam existindo como fonte oficial, mas cada regra importante deve virar cadastro editável: seção, orientação, responsabilidade, função relacionada, entidade relacionada, módulo e público que precisa visualizar.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {documentCards.map((card) => (
          <article key={card.title} className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6">
            <h2 className="text-xl font-black text-[#00334E]">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
            <div className="mt-4 grid gap-2">
              {card.fields.map((field) => (
                <p key={field} className="rounded-2xl bg-[#F7FAF2] px-4 py-3 text-sm font-bold text-[#123D2C] ring-1 ring-[#123D2C]/10">
                  {field}
                </p>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow sm:p-7">
        <h2 className="text-2xl font-black">Onde editar na prática</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {editableAreas.map((area) => (
            <Link key={area.href} href={area.href} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 transition hover:-translate-y-1 hover:bg-white/15">
              <h3 className="font-black">{area.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#EEF7EA]">{area.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </OrganizacaoClientShell>
  );
}

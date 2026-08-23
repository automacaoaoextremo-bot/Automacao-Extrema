import Link from "next/link";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { TucxaInfoPopupGrid, type TucxaInfoPopupItem } from "@/components/organizacao-em-harmonia/tucxa-info-popup-grid";
import { getTucxaPublicContent } from "@/lib/organizacao-em-harmonia/tucxa-public-content";

export const dynamic = "force-dynamic";

const guidance = [
  "Chegue com antecedência e siga as orientações da recepção e organização.",
  "O atendimento é individual e respeitoso. Evite retirar senha ou ficha para outra pessoa.",
  "Quando houver encaminhamento, a coordenação orientará o preparo e a data adequada.",
  "A contribuição ajuda na manutenção da casa e pode ser feita de forma identificada ou anônima.",
];


export default async function ConsulenteTucxaPage() {
  const content = await getTucxaPublicContent();

  const headerActions = [
    {
      label: "Início",
      href: "#inicio",
      variant: "primary" as const,
    },
    {
      label: "Voltar",
      href: "/solucoes/organizacao-em-harmonia/tucxa?semPopup=1#consulentes",
      variant: "secondary" as const,
    },
    {
      label: "Acessos",
      href: "#modulos",
      variant: "secondary" as const,
    },
    {
      label: "Acolhimento",
      href: "#acolhimento",
      variant: "secondary" as const,
    },
    {
      label: "Transformação",
      href: "#transformacao",
      variant: "secondary" as const,
    },
    {
      label: "Biblioteca",
      href: "#biblioteca",
      variant: "secondary" as const,
    },
    {
      label: "Preparação",
      href: "#preparacao",
      variant: "secondary" as const,
    },
  ];

  const accesses: TucxaInfoPopupItem[] = [
    {
      id: "agenda-viva",
      title: "Agenda Viva",
      eyebrow: "Agenda e atividades",
      summary: "Consulte atividades, grupos, escalas, estudos e eventos em um calendário simples pelo celular.",
      description: "A Agenda Viva reúne atividades do Tucxa em um calendário único, com visualizações e detalhes que ajudam cada pessoa a entender o que acontece e quando.",
      href: "/solucoes/organizacao-em-harmonia/tucxa/agenda-viva",
      ctaLabel: "Abrir Agenda Viva",
      highlights: [
        "Atividades e eventos em um só calendário.",
        "Consulta simples pelo celular.",
        "Integração com cursos, estudos e ações do Tucxa.",
      ],
    },
    {
      id: "atendimento-em-harmonia",
      title: "Atendimento em Harmonia",
      eyebrow: "Acolhimento, orientação e formação",
      summary: "Orientações, agendamentos, Escuta em Harmonia, Cursos em Harmonia e Acervo Vivo conectados no mesmo fluxo.",
      description: "O Atendimento em Harmonia reúne o que ajuda Filhos de Fora/Consulentes e Filhos da Corrente antes, durante e depois do atendimento.",
      href: "/solucoes/organizacao-em-harmonia/tucxa/atendimento-em-harmonia",
      ctaLabel: "Conhecer Atendimento em Harmonia",
      highlights: [
        "Orientações práticas e acolhimento.",
        "Agendamentos e consultas autorizadas.",
        "Escuta em Harmonia.",
        "Cursos em Harmonia e presença nas aulas.",
        "Acervo Vivo — livros, trilhas e conteúdos.",
      ],
    },
    {
      id: "corrente-em-dia",
      title: content.correnteEmDia.title,
      eyebrow: "Contribuições e transparência",
      summary: content.correnteEmDia.description,
      description: content.correnteEmDia.description,
      href: "/solucoes/organizacao-em-harmonia/tucxa/corrente-em-dia",
      ctaLabel: "Conhecer Corrente em Dia",
    },
    {
      id: "sementinha-em-harmonia",
      title: "Sementinha em Harmonia",
      eyebrow: "Ações assistenciais",
      summary: "Ações assistenciais conectadas ao Tucxa, começando pela Despensa Viva e sua organização de alimentos e entregas.",
      description: "O Sementinha em Harmonia reúne ações assistenciais do Tucxa. A Despensa Viva organiza estoque por lote e validade, composição das cestas, entregas e histórico, preservando também a transparência das ações.",
      href: "/solucoes/organizacao-em-harmonia/tucxa/sementinha",
      ctaLabel: "Conhecer Sementinha em Harmonia",
      highlights: [
        "Despensa Viva.",
        "Organização de cestas e entregas.",
        "Transparência das ações assistenciais.",
      ],
    },
  ];

  return (
    <main id="inicio" className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={headerActions}
        navLabel="Menu de consulentes do Tucxa"
      />

      <section className="scroll-mt-48 mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="rounded-[1.75rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-7">
          <p className="text-xs font-black tracking-[0.22em] text-[#CFE2C7] sm:text-sm">
            Filhos de fora
          </p>
          <h1 className="mt-2 max-w-4xl text-3xl font-black leading-tight sm:text-4xl lg:text-[2.8rem]">
            Um espaço de acolhimento para quem busca auxílio espiritual.
          </h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-[#EEF7EA] sm:text-[1.05rem] sm:leading-8">
            O Tucxa recebe pessoas que procuram orientação, fortalecimento e crescimento espiritual. A organização do atendimento existe para que cada consulente seja recebido com respeito, clareza e segurança.
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/solucoes/organizacao-em-harmonia/tucxa/consulente/novo"
              className="rounded-2xl bg-white px-5 py-3.5 text-center text-sm font-black text-[#123D2C] transition hover:-translate-y-0.5 sm:text-base"
            >
              É novo por aqui
            </Link>
          </div>
        </div>

        <div id="modulos" className="scroll-mt-48 mt-5 rounded-[1.75rem] bg-[#E9F2E7] p-4 ring-1 ring-[#123D2C]/10 sm:p-5">
          <div className="mb-3 sm:mb-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43] sm:text-sm">
              O que você pode acessar
            </p>
            <h2 className="mt-1.5 text-xl font-black leading-tight text-[#123D2C] sm:text-2xl">
              Escolha o que você precisa. Os detalhes aparecem sem alongar a página.
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 sm:text-base">
              No celular, os quatro acessos ficam juntos. Toque em uma opção para entender o que ela oferece e abrir a página correspondente.
            </p>
          </div>
          <TucxaInfoPopupGrid items={accesses} ariaLabel="Acessos do Consulente" columns={4} />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {content.consulenteServices.map((service, index) => {
            const serviceIds = ["acolhimento", "transformacao", "biblioteca"];
            return (
              <article
                key={service.title}
                id={serviceIds[index] ?? undefined}
                className="scroll-mt-48 rounded-[1.75rem] bg-white p-5 shadow-lg shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6"
              >
                <h2 className="text-lg font-black text-[#123D2C] sm:text-xl">
                  {service.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
                  {service.description}
                </p>
                {serviceIds[index] === "biblioteca" && (
                  <Link
                    href="/solucoes/organizacao-em-harmonia/tucxa/acervo-vivo"
                    className="mt-4 flex min-h-12 flex-col items-center justify-center rounded-2xl bg-[#123D2C] px-4 py-2.5 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#2F6B43]"
                  >
                    <span>Acervo Vivo</span>
                    <span className="mt-1 text-[8px] font-black uppercase tracking-[0.14em] text-white/75">TOQUE PARA ABRIR</span>
                  </Link>
                )}
              </article>
            );
          })}
        </div>

        <div
          id="preparacao"
          className="scroll-mt-48 mt-3 rounded-[1.45rem] bg-white p-3 shadow-lg shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:mt-5 sm:rounded-[1.75rem] sm:p-7"
        >
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#2F6B43] sm:text-sm sm:tracking-[0.22em]">
            Como se preparar
          </p>
          <h2 className="mt-1 text-lg font-black leading-tight text-[#123D2C] sm:mt-2 sm:text-3xl">
            Orientações simples para uma experiência mais tranquila.
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3">
            {guidance.map((item) => (
              <div
                key={item}
                className="rounded-xl bg-[#F7FAF2] p-2 text-[10px] font-bold leading-4 text-[#123D2C] ring-1 ring-[#123D2C]/10 sm:rounded-2xl sm:p-4 sm:text-base sm:leading-7"
              >
                {item}
              </div>
            ))}
          </div>
          <p className="mt-2 rounded-xl bg-[#E9F2E7] p-2 text-[10px] font-semibold leading-4 text-[#123D2C] sm:mt-5 sm:rounded-2xl sm:p-4 sm:text-sm sm:leading-6">
            As informações detalhadas de horário, fichas, senhas e encaminhamentos podem ser ajustadas pela organização do Tucxa conforme calendário, orientação da Diretoria e necessidade da casa.
          </p>
        </div>
      </section>
    </main>
  );
}

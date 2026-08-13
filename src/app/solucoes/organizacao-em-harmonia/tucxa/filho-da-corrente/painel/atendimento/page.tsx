"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FilhoCorrentePanelHeader } from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const filhoPanelBase = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel";
const pageHref = `${filhoPanelBase}/atendimento`;
const consultationHref = `${pageHref}/consultar-agendamentos`;

const filhoSupportAction = {
  label: "Dúvidas?",
  href: "#duvidas",
  variant: "secondary" as const,
  action: "supportWhatsapp" as const,
};

const filhoSignOutAction = {
  label: "Sair",
  href: "#sair",
  variant: "secondary" as const,
  action: "signOutFilhoCorrente" as const,
};

type ModalKind = "orientacoes" | "agendamentos" | "recepcao" | null;

type HeaderAction = {
  label: string;
  href: string;
  variant: "primary" | "secondary";
  action?: "signOutFilhoCorrente" | "supportWhatsapp";
};

type ProfileResponse = {
  canReception?: boolean;
  canCambono?: boolean;
  canCavalinho?: boolean;
  consultationScope?: "manage" | "read_all" | "linked_entities" | "none";
  functionSlugs?: string[];
  selectedFunctions?: Array<{ slug?: string; label?: string; name?: string }>;
};

function canonicalFunction(value: unknown) {
  return typeof value === "string"
    ? value
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    : "";
}

function profileFunctionTokens(payload: ProfileResponse) {
  const slugs = Array.isArray(payload.functionSlugs)
    ? payload.functionSlugs.map(canonicalFunction).filter(Boolean)
    : [];
  const selected = Array.isArray(payload.selectedFunctions)
    ? payload.selectedFunctions.flatMap((item) =>
        [item.slug, item.label, item.name].map(canonicalFunction).filter(Boolean),
      )
    : [];

  return Array.from(new Set([...slugs, ...selected]));
}

const modalContent = {
  orientacoes: {
    eyebrow: "Orientações práticas do Tucxa",
    title: "Chegue preparado e participe com segurança.",
    paragraphs: [
      "Consulte as orientações sobre chegada, silêncio, preparo, presença, atuação dos cambonos e cuidado com o ambiente antes dos trabalhos.",
      "As informações completas permanecem disponíveis na página de Orientações para consulta sempre que precisar.",
    ],
    href: `${pageHref}/orientacoes`,
    cta: "Abrir orientações completas",
  },
  agendamentos: {
    eyebrow: "Acolhimento e agendamentos",
    title: "Acompanhe presença, acolhimento e atendimento.",
    paragraphs: [
      "Consulte as quintas do seu grupo, confirme presença e solicite atendimento com uma entidade somente quando desejar.",
      "Pessoas com função de Recepção também podem agendar Consulentes/Filhos de Fora pelos períodos permitidos.",
    ],
    href: `${pageHref}/agendamentos`,
    cta: "Abrir acolhimento e agendamentos",
  },
  recepcao: {
    eyebrow: "Consulta de Agendamentos",
    title: "Localize e acompanhe os atendimentos previstos.",
    paragraphs: [
      "Pesquise por nome, entidade ou WhatsApp, filtre por entidade ou situação e consulte atendimentos futuros ou anteriores.",
      "As ações disponíveis respeitam sua função: Recepção pode gerir; Cambono consulta em modo somente leitura; Cavalinho vê somente os atendimentos da entidade vinculada ao seu cadastro que faz atendimentos aos Consulentes e os seus agendamentos.",
    ],
    href: `${consultationHref}?from=atendimento`,
    cta: "Abrir consulta de agendamentos",
  },
} as const;

export default function AtendimentoEmHarmoniaPage() {
  const [canReception, setCanReception] = useState(false);
  const [canCambono, setCanCambono] = useState(false);
  const [canCavalinho, setCanCavalinho] = useState(false);
  const [functionTokens, setFunctionTokens] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalKind>(null);

  useEffect(() => {
    let active = true;
    const timeoutId = window.setTimeout(() => {
      void supabaseBrowser.auth.getSession().then(async ({ data }) => {
        const token = data.session?.access_token;
        if (!token) return;
        const response = await fetch("/api/organizacao-em-harmonia/filhos-corrente/perfil", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = (await response.json().catch(() => ({}))) as ProfileResponse;
        if (active && response.ok) {
          setCanReception(payload.canReception === true);
          setCanCambono(payload.canCambono === true);
          setCanCavalinho(payload.canCavalinho === true);
          setFunctionTokens(profileFunctionTokens(payload));
        }
      });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("consulta") === "agendamentos") setModal("recepcao");
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!modal) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modal]);

  const isProfessor = functionTokens.some((token) =>
    ["professor", "docente"].includes(token),
  );
  const canManageCourses = functionTokens.some((token) =>
    [
      "coordenacao",
      "coordenador",
      "coordenacao-de-cursos",
      "coordenador-de-cursos",
    ].includes(token),
  );
  const canManageListening = functionTokens.some((token) =>
    [
      "presidente",
      "vice-presidente",
      "diretoria",
      "diretor",
      "secretario",
      "secretaria",
      "coordenacao",
      "coordenador",
    ].includes(token),
  );
  const canOpenCourses = isProfessor || canManageCourses;

  const actions = useMemo<HeaderAction[]>(() => {
    const current: HeaderAction[] = [
      { label: "Início", href: pageHref, variant: "primary" as const },
      { label: "Orientações", href: `${pageHref}/orientacoes`, variant: "secondary" as const },
      { label: "Agendamentos", href: `${pageHref}/agendamentos`, variant: "secondary" as const },
    ];
    if (canReception || canCambono || canCavalinho) {
      current.push({ label: "Consultas", href: consultationHref, variant: "secondary" as const });
    }
    current.push(
      { label: "Voltar", href: `${pageHref}/orientacoes`, variant: "secondary" as const },
      filhoSupportAction,
      filhoSignOutAction,
    );
    return current;
  }, [canCambono, canCavalinho, canReception]);

  const selected = modal ? modalContent[modal] : null;

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader navLabel="Atendimento em Harmonia" showSupport={false} actions={actions} />

      <section className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#CFE2C7]">Atendimento em Harmonia</p>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Cuidar bem começa antes do atendimento.</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#EEF7EA] sm:text-base sm:leading-7">
            Este módulo reúne orientações, acolhimento, consultas e os submódulos Escuta em Harmonia e Cursos em Harmonia para que a corrente trabalhe com mais clareza, sem perder o cuidado humano do Tucxa.
          </p>
        </section>

        <section className="mt-4 grid gap-3">
          <button
            type="button"
            onClick={() => setModal("orientacoes")}
            className="min-h-16 rounded-[1.5rem] bg-[#E9F4E6] px-5 py-4 text-left text-lg font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            Orientações práticas do Tucxa
          </button>
          <button
            type="button"
            onClick={() => setModal("agendamentos")}
            className="min-h-16 rounded-[1.5rem] bg-[#D6EBD5] px-5 py-4 text-left text-lg font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            Acolhimento e agendamentos
          </button>
          {(canReception || canCambono || canCavalinho) && (
            <button
              type="button"
              onClick={() => setModal("recepcao")}
              className="min-h-16 rounded-[1.5rem] bg-[#BDDDBF] px-5 py-4 text-left text-lg font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              Consulta de Agendamentos
            </button>
          )}
        </section>

        <section className="mt-5">
          <div className="mb-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">
              Submódulos do Atendimento em Harmonia
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
              Acesse aqui as soluções que complementam o acolhimento, a escuta e o acompanhamento de cursos.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-[1.5rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10">
              <h2 className="text-xl font-black text-[#123D2C]">Escuta em Harmonia</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                Envie uma dúvida, sugestão ou preocupação à Diretoria e acompanhe seus registros.
              </p>
              <div className="mt-4 grid gap-2">
                <Link
                  href={`${filhoPanelBase}/escuta-em-harmonia`}
                  className="rounded-xl bg-[#123D2C] px-4 py-3 text-center font-black text-white"
                >
                  Abrir minha Escuta
                </Link>
                {canManageListening && (
                  <Link
                    href="/solucoes/organizacao-em-harmonia/cliente/escuta-em-harmonia"
                    className="rounded-xl bg-[#E9F2E7] px-4 py-3 text-center text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10"
                  >
                    Acompanhamento da Diretoria
                  </Link>
                )}
              </div>
            </article>

            <article className="rounded-[1.5rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10">
              <h2 className="text-xl font-black text-[#123D2C]">Cursos em Harmonia</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                Cursos, aulas, professores, alunos, convites, Agenda Viva e presença em um fluxo integrado.
              </p>

              {canOpenCourses ? (
                <div className="mt-4 grid gap-2">
                  {isProfessor && (
                    <Link
                      href={`${filhoPanelBase}/cursos`}
                      className="rounded-xl bg-[#123D2C] px-4 py-3 text-center font-black text-white"
                    >
                      Minhas aulas
                    </Link>
                  )}
                  {canManageCourses && (
                    <Link
                      href="/solucoes/organizacao-em-harmonia/cliente/cursos"
                      className="rounded-xl bg-[#E9F2E7] px-4 py-3 text-center text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10"
                    >
                      Gestão dos cursos
                    </Link>
                  )}
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-[#F7FAF2] p-3 text-sm font-bold leading-5 text-slate-600 ring-1 ring-[#123D2C]/10">
                  A gestão fica disponível para Coordenação de Cursos e a sala de aula para pessoas com função Professor.
                </p>
              )}
            </article>
          </div>
        </section>
      </section>

      {selected && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#10251C]/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={selected.eyebrow}>
          <section className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <p className="min-w-0 break-words text-sm font-black uppercase leading-5 tracking-[0.12em] text-[#123D2C]">{selected.eyebrow}</p>
              <button type="button" onClick={() => setModal(null)} className="shrink-0 rounded-2xl bg-[#123D2C] px-4 py-2 font-black text-white">
                Fechar
              </button>
            </header>
            <div className="min-h-0 overflow-y-auto p-5">
              <h2 className="text-2xl font-black leading-tight text-[#123D2C]">{selected.title}</h2>
              <div className="mt-4 grid gap-3">
                {selected.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="rounded-2xl bg-[#F7FAF2] p-4 text-sm font-semibold leading-6 text-slate-700 ring-1 ring-[#123D2C]/10">
                    {paragraph}
                  </p>
                ))}
              </div>
              <Link href={selected.href} className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-[#123D2C] px-5 py-3 text-center font-black text-white">
                {selected.cta}
              </Link>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

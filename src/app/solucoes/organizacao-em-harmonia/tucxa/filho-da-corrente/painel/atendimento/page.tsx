"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FilhoCorrentePanelHeader } from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const filhoPanelBase = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel";
const pageHref = `${filhoPanelBase}/atendimento`;
const consultationHref = `${pageHref}/consultar-agendamentos`;

const filhoSupportAction = {
  label: "Ajuda",
  href: "#ajuda",
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
type SubmoduleKind = "escuta" | "cursos" | null;

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

function TouchHint() {
  return (
    <span className="mt-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[#2F6B43]">
      TOQUE PARA ABRIR
    </span>
  );
}

export default function AtendimentoEmHarmoniaPage() {
  const [canReception, setCanReception] = useState(false);
  const [canCambono, setCanCambono] = useState(false);
  const [canCavalinho, setCanCavalinho] = useState(false);
  const [functionTokens, setFunctionTokens] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalKind>(null);
  const [submodule, setSubmodule] = useState<SubmoduleKind>(null);

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
      if (params.get("abrir") === "cursos") setSubmodule("cursos");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!modal && !submodule) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modal, submodule]);

  const canManageCourses = functionTokens.some((token) =>
    [
      "coordenacao-de-cursos",
      "coordenador-de-cursos",
      "coordenacao-cursos",
      "coordenador-cursos",
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

  const actions = useMemo<HeaderAction[]>(
    () => [
      { label: "Início", href: pageHref, variant: "primary" as const },
      { label: "Voltar", href: filhoPanelBase, variant: "secondary" as const },
      filhoSupportAction,
      filhoSignOutAction,
    ],
    [],
  );

  const selected = modal ? modalContent[modal] : null;

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader
        navLabel="Atendimento em Harmonia"
        showSupport={false}
        actions={actions}
        mobileActionColumns={4}
      />

      <section className="mx-auto max-w-4xl px-3 py-3 sm:px-6 sm:py-5 lg:px-8">
        <section className="rounded-[1.75rem] bg-[#123D2C] p-4 text-white shadow-xl shadow-green-900/10 sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#CFE2C7] sm:text-xs">
            Atendimento em Harmonia
          </p>
          <h1 className="mt-1.5 text-2xl font-black leading-tight sm:mt-2 sm:text-4xl">
            Cuidar bem começa antes do atendimento.
          </h1>
          <p className="mt-2 text-sm font-semibold leading-5 text-[#EEF7EA] sm:mt-3 sm:text-base sm:leading-7">
            Este módulo reúne orientações, acolhimento, agendamentos, escuta e gestão de cursos para que a corrente trabalhe com mais clareza, sem perder o cuidado humano do Tucxa.
          </p>
        </section>

        <section className="mt-3 grid gap-2 sm:mt-4 sm:gap-3">
          <button type="button" onClick={() => setModal("orientacoes")} className="min-h-14 rounded-[1.35rem] bg-[#E9F4E6] px-4 py-3 text-left text-base font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:shadow-lg sm:min-h-16 sm:px-5 sm:py-4 sm:text-lg">
            Orientações práticas do Tucxa
            <TouchHint />
          </button>
          <button type="button" onClick={() => setModal("agendamentos")} className="min-h-14 rounded-[1.35rem] bg-[#D6EBD5] px-4 py-3 text-left text-base font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:shadow-lg sm:min-h-16 sm:px-5 sm:py-4 sm:text-lg">
            Acolhimento e agendamentos
            <TouchHint />
          </button>
          {(canReception || canCambono || canCavalinho) && (
            <button type="button" onClick={() => setModal("recepcao")} className="min-h-14 rounded-[1.35rem] bg-[#BDDDBF] px-4 py-3 text-left text-base font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:shadow-lg sm:min-h-16 sm:px-5 sm:py-4 sm:text-lg">
              Consulta de Agendamentos
              <TouchHint />
            </button>
          )}
        </section>

        <section className={`mt-3 grid gap-2 sm:mt-4 sm:gap-3 ${canManageCourses ? "sm:grid-cols-2" : ""}`}>
          <button type="button" onClick={() => setSubmodule("escuta")} className="min-h-20 rounded-[1.5rem] bg-[#DDEAD8] px-4 py-4 text-left shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#CFE2C7] hover:shadow-lg sm:px-5">
            <span className="block text-base font-black text-[#123D2C] sm:text-lg">Escuta dos filhos da Corrente</span>
            <TouchHint />
          </button>

          {canManageCourses && (
            <button type="button" onClick={() => setSubmodule("cursos")} className="min-h-20 rounded-[1.5rem] bg-[#DDEAD8] px-4 py-4 text-left shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#CFE2C7] hover:shadow-lg sm:px-5">
              <span className="block text-base font-black text-[#123D2C] sm:text-lg">Gestão de Cursos</span>
              <TouchHint />
            </button>
          )}
        </section>
      </section>

      {submodule === "escuta" && (
        <div className="fixed inset-0 z-[125] flex items-center justify-center bg-[#10251C]/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Escuta dos filhos da Corrente" onMouseDown={(event) => { if (event.target === event.currentTarget) setSubmodule(null); }}>
          <section className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] bg-[#F7FAF2] shadow-2xl">
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#123D2C]/10 bg-white px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">Escuta em Harmonia</p>
                <h2 className="mt-1 text-xl font-black leading-tight text-[#123D2C] sm:text-2xl">Escuta dos filhos da Corrente</h2>
              </div>
              <button type="button" onClick={() => setSubmodule(null)} className="shrink-0 rounded-2xl bg-[#123D2C] px-4 py-2 font-black text-white">Fechar</button>
            </header>
            <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
              <p className="text-sm font-semibold leading-6 text-slate-600">
                Envie uma dúvida, sugestão ou preocupação à Diretoria e acompanhe seus registros.
              </p>
              <div className="mt-4 grid gap-2">
                <Link href={`${filhoPanelBase}/escuta-em-harmonia`} className="rounded-xl bg-[#123D2C] px-4 py-3 text-center font-black text-white">
                  Abrir minha Escuta
                </Link>
                {canManageListening && (
                  <Link href="/solucoes/organizacao-em-harmonia/cliente/escuta-em-harmonia" className="rounded-xl bg-[#E9F2E7] px-4 py-3 text-center text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">
                    Acompanhamento da Diretoria
                  </Link>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {submodule === "cursos" && canManageCourses && (
        <div className="fixed inset-0 z-[125] flex items-center justify-center bg-[#10251C]/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Gestão de Cursos" onMouseDown={(event) => { if (event.target === event.currentTarget) setSubmodule(null); }}>
          <section className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] bg-[#F7FAF2] shadow-2xl">
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#123D2C]/10 bg-white px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">Cursos em Harmonia</p>
                <h2 className="mt-1 text-xl font-black leading-tight text-[#123D2C] sm:text-2xl">Gestão de Cursos</h2>
              </div>
              <button type="button" onClick={() => setSubmodule(null)} className="shrink-0 rounded-2xl bg-[#123D2C] px-4 py-2 font-black text-white">Fechar</button>
            </header>
            <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
              <p className="text-sm font-semibold leading-6 text-slate-600">
                Cursos, aulas, professores, alunos, convites, Agenda Viva e presença em um fluxo integrado.
              </p>
              <Link href="/solucoes/organizacao-em-harmonia/cliente/cursos" className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#123D2C] px-4 py-3 text-center font-black text-white">
                Abrir Gestão de Cursos
              </Link>
            </div>
          </section>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#10251C]/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={selected.eyebrow}>
          <section className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <p className="min-w-0 break-words text-sm font-black uppercase leading-5 tracking-[0.12em] text-[#123D2C]">{selected.eyebrow}</p>
              <button type="button" onClick={() => setModal(null)} className="shrink-0 rounded-2xl bg-[#123D2C] px-4 py-2 font-black text-white">Fechar</button>
            </header>
            <div className="min-h-0 overflow-y-auto p-5">
              <h2 className="text-2xl font-black leading-tight text-[#123D2C]">{selected.title}</h2>
              <div className="mt-4 grid gap-3">
                {selected.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="rounded-2xl bg-[#F7FAF2] p-4 text-sm font-semibold leading-6 text-slate-700 ring-1 ring-[#123D2C]/10">{paragraph}</p>
                ))}
              </div>
              <Link href={selected.href} className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-[#123D2C] px-5 py-3 text-center font-black text-white">{selected.cta}</Link>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

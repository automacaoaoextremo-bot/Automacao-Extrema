"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FilhoCorrentePanelHeader,
  filhoSignOutAction,
  filhoSupportAction,
  type PanelHeaderAction,
} from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { hasDespensaVivaManagement } from "@/lib/organizacao-em-harmonia/sementinha-functions";
import { UpcomingAppointmentsLoginModal } from "@/components/organizacao-em-harmonia/upcoming-appointments-login-modal";
import { UpcomingEntityAppointmentsLoginModal } from "@/components/organizacao-em-harmonia/upcoming-entity-appointments-login-modal";
import { MemberPendingProofLoginModal } from "@/components/organizacao-em-harmonia/member-pending-proof-login-modal";
import { MemberContributionAlertsLoginModal } from "@/components/organizacao-em-harmonia/member-contribution-alerts-login-modal";

type UserInfo = {
  fullName: string;
  profileUpdateStatus: string;
  functionSlugs: string[];
  functionLabels: string[];
};

type PanelPreferences = {
  upcomingAppointmentsPopup: boolean;
  pendingProofsPopup: boolean;
  dueContributionPopup: boolean;
  dueContributionDaysBefore: number;
  overdueContributionPopup: boolean;
};

type UpcomingContribution = {
  dueDate: string;
  amount: number;
  status: string;
  scheduled?: boolean;
};

type Contribution = {
  id: string;
  amount: number | string;
  due_date: string;
  status: string;
  payment_method: string | null;
};

type CorrentePayload = {
  panelPreferences?: PanelPreferences;
  upcoming?: UpcomingContribution[];
  contributions?: Contribution[];
};

type Shortcut = "modules" | "registration" | "settings" | null;

const PANEL_BASE =
  "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel";
const SETTINGS_HREF = `${PANEL_BASE}/configuracoes`;

const baseModuleCards = [
  {
    title: "Agenda Viva",
    description:
      "Calendário completo e próximos compromissos, com eventos do Tucxa organizados para consulta.",
    href: `${PANEL_BASE}/agenda-viva`,
  },
  {
    title: "Atendimento em Harmonia",
    description:
      "Orientações, agendamentos, Escuta em Harmonia, Cursos em Harmonia e Acervo Vivo reunidos em um único espaço.",
    href: `${PANEL_BASE}/atendimento`,
  },
  {
    title: "Corrente em Dia",
    description:
      "Contribuições, comprovantes, histórico, próximas datas e acesso financeiro autorizado.",
    href: `${PANEL_BASE}/corrente-em-dia`,
  },
];

const headerActions: PanelHeaderAction[] = [
  { label: "Início", href: PANEL_BASE, variant: "primary" },
  filhoSignOutAction,
  filhoSupportAction,
];

const defaultPreferences: PanelPreferences = {
  upcomingAppointmentsPopup: true,
  pendingProofsPopup: true,
  dueContributionPopup: true,
  dueContributionDaysBefore: 7,
  overdueContributionPopup: true,
};

function ShortcutModal({
  shortcut,
  onClose,
  canAccessDespensa,
}: {
  shortcut: Exclude<Shortcut, null>;
  onClose: () => void;
  canAccessDespensa: boolean;
}) {
  const title =
    shortcut === "modules"
      ? "Acessos"
      : shortcut === "registration"
        ? "Cadastro"
        : "Configurações";

  const moduleCards = [
    ...baseModuleCards,
    ...(canAccessDespensa
      ? [
          {
            title: "Despensa Viva",
            description:
              "Estoque por lote e validade, composição das cestas, entregas e histórico do Sementinha.",
            href: "/solucoes/organizacao-em-harmonia/tucxa/sementinha/despensa-viva",
          },
        ]
      : []),
  ];

  return (
    <div
      className="fixed inset-0 z-[180] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-shortcut-title"
        className="max-h-[calc(100dvh-1rem)] w-full max-w-lg overflow-y-auto rounded-[1.5rem] bg-white p-4 shadow-2xl sm:rounded-[2rem] sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43] sm:text-xs">
              Área do Filho da Corrente
            </p>
            <h2
              id="panel-shortcut-title"
              className="mt-1 text-2xl font-black text-[#123D2C]"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl bg-[#123D2C] px-3 py-2 text-sm font-black text-white"
          >
            Fechar
          </button>
        </div>

        {shortcut === "modules" && (
          <div className="mt-4 grid gap-3">
            {moduleCards.map((card) => (
              <article
                key={card.href}
                className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10"
              >
                <h3 className="text-lg font-black text-[#123D2C]">
                  {card.title}
                </h3>
                <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">
                  {card.description}
                </p>
                <Link
                  href={card.href}
                  className="mt-3 block rounded-xl bg-[#123D2C] px-4 py-3 text-center text-sm font-black text-white"
                >
                  Abrir
                </Link>
              </article>
            ))}
          </div>
        )}

        {shortcut === "registration" && (
          <article className="mt-4 rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
            <h3 className="text-lg font-black text-[#123D2C]">
              Atualizar meus dados
            </h3>
            <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">
              Revise seus dados, familiares, funções, entidades e agenda. Quando
              houver alteração, envie a atualização para validação do Tucxa.
            </p>
            <Link
              href={`${PANEL_BASE}/atualizar-dados`}
              className="mt-3 block rounded-xl bg-[#123D2C] px-4 py-3 text-center text-sm font-black text-white"
            >
              Abrir
            </Link>
          </article>
        )}

        {shortcut === "settings" && (
          <article className="mt-4 rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
            <h3 className="text-lg font-black text-[#123D2C]">
              Preferências dos avisos
            </h3>
            <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">
              Escolha quais pop-ups deseja receber sobre agendamentos,
              comprovantes e contribuições, além da antecedência para avisos de
              vencimento.
            </p>
            <Link
              href={SETTINGS_HREF}
              className="mt-3 block rounded-xl bg-[#123D2C] px-4 py-3 text-center text-sm font-black text-white"
            >
              Abrir
            </Link>
          </article>
        )}
      </section>
    </div>
  );
}

export default function PainelFilhoDaCorrentePage() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [shortcut, setShortcut] = useState<Shortcut>(null);
  const [panelPreferences, setPanelPreferences] =
    useState<PanelPreferences>(defaultPreferences);
  const [upcoming, setUpcoming] = useState<UpcomingContribution[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const url = new URL(window.location.href);
      if (url.searchParams.get("abrir") !== "modulos") return;

      setShortcut("modules");
      url.searchParams.delete("abrir");
      window.history.replaceState(
        window.history.state,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const loadPanelData = useCallback(async (accessToken: string) => {
    const response = await fetch(
      "/api/organizacao-em-harmonia/filhos-corrente/corrente-em-dia",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      },
    );
    const payload = (await response.json().catch(() => ({}))) as CorrentePayload;
    if (!response.ok) return;

    setPanelPreferences({
      ...defaultPreferences,
      ...(payload.panelPreferences ?? {}),
    });
    setUpcoming(payload.upcoming ?? []);
    setContributions(payload.contributions ?? []);
  }, []);

  useEffect(() => {
    let active = true;

    const timer = window.setTimeout(() => {
      void supabaseBrowser.auth.getSession().then(async ({ data }) => {
        const session = data.session;
        const user = session?.user;
        if (!user) {
          window.location.replace(
            "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login",
          );
          return;
        }

        const metadata = user.user_metadata ?? {};
        const profile =
          typeof metadata.oh_profile === "string" ? metadata.oh_profile : "";
        if (profile && profile !== "filho-da-corrente") {
          window.location.replace(
            "/solucoes/organizacao-em-harmonia/cliente",
          );
          return;
        }

        let profileUpdateStatus =
          typeof metadata.profile_update_status === "string"
            ? metadata.profile_update_status
            : "";
        let functionSlugs: string[] = [];
        let functionLabels: string[] = [];

        if (session.access_token) {
          const [profileResponse] = await Promise.all([
            fetch("/api/organizacao-em-harmonia/filhos-corrente/perfil", {
              headers: { Authorization: `Bearer ${session.access_token}` },
            }),
            loadPanelData(session.access_token),
          ]);
          const profilePayload = (await profileResponse
            .json()
            .catch(() => ({}))) as {
            profileUpdateStatus?: string;
            functionSlugs?: string[];
            selectedFunctions?: Array<{ slug?: string; label?: string; name?: string }>;
          };
          if (profileResponse.ok) {
            profileUpdateStatus =
              profilePayload.profileUpdateStatus || profileUpdateStatus;
            functionSlugs = Array.isArray(profilePayload.functionSlugs)
              ? profilePayload.functionSlugs
              : [];
            functionLabels = Array.isArray(profilePayload.selectedFunctions)
              ? profilePayload.selectedFunctions
                  .map((item) => item.label || item.name || item.slug || "")
                  .map((item) => item.trim())
                  .filter(Boolean)
              : [];
          }
        }

        if (!active) return;

        setUserInfo({
          fullName:
            typeof metadata.full_name === "string"
              ? metadata.full_name
              : user.email || "Filho da Corrente",
          profileUpdateStatus,
          functionSlugs,
          functionLabels,
        });
        setLoading(false);
      });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadPanelData]);

  const firstName = useMemo(
    () => userInfo?.fullName.trim().split(/\s+/)[0] || "Filho da Corrente",
    [userInfo?.fullName],
  );

  const canAccessDespensa = useMemo(
    () => hasDespensaVivaManagement(userInfo?.functionSlugs ?? []),
    [userInfo?.functionSlugs],
  );

  const functionSummary = useMemo(() => {
    if (!userInfo) return "Somente Filho da Corrente";
    if (userInfo.functionLabels.length > 0) return userInfo.functionLabels.join(", ");
    if (userInfo.functionSlugs.length > 0) {
      return userInfo.functionSlugs
        .map((slug) =>
          slug
            .split("-")
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" "),
        )
        .join(", ");
    }
    return "Somente Filho da Corrente";
  }, [userInfo]);


  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader
        actions={headerActions}
        mobileActionColumns={3}
      />

      <section className="mx-auto max-w-6xl px-3 py-3 sm:px-6 sm:py-5 lg:px-8">
        {loading && (
          <p className="rounded-3xl bg-white p-5 font-bold text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">
            Carregando seu acesso...
          </p>
        )}

        {userInfo && (
          <div className="grid gap-3 sm:gap-4">
            <section className="rounded-[1.75rem] bg-[#123D2C] p-4 text-white shadow-xl shadow-green-900/10 sm:rounded-[2rem] sm:p-7">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#CFE2C7] sm:text-xs sm:tracking-[0.24em]">
                Área exclusiva do Filho da Corrente
              </p>
              <h1 className="mt-1.5 text-3xl font-black sm:mt-2 sm:text-4xl">
                Olá, {firstName}.
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#EEF7EA] sm:mt-3 sm:text-base sm:leading-7">
                Este é o seu espaço de consulta e orientação. Use os atalhos
                abaixo para abrir seus acessos, atualizar seu cadastro (atualmente
                suas funções são {functionSummary}) e escolher quais avisos
                deseja receber.
              </p>
            </section>

            <section className="grid grid-cols-3 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setShortcut("modules")}
                className="rounded-2xl border-2 border-[#123D2C] bg-[#E9F2E7] px-2 py-3 text-center text-xs font-black text-[#123D2C] shadow-lg shadow-green-900/10 ring-2 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-4 focus:ring-[#123D2C]/20 sm:px-4 sm:py-4 sm:text-sm"
              >
                <span className="block">Acessos</span>
                <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.12em] text-[#2F6B43] sm:text-[10px]">Toque para abrir</span>
              </button>
              <button
                type="button"
                onClick={() => setShortcut("registration")}
                className="rounded-2xl border-2 border-[#123D2C] bg-[#E9F2E7] px-2 py-3 text-center text-xs font-black text-[#123D2C] shadow-lg shadow-green-900/10 ring-2 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-4 focus:ring-[#123D2C]/20 sm:px-4 sm:py-4 sm:text-sm"
              >
                <span className="block">Cadastro</span>
                <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.12em] text-[#2F6B43] sm:text-[10px]">Toque para abrir</span>
              </button>
              <button
                type="button"
                onClick={() => setShortcut("settings")}
                className="rounded-2xl border-2 border-[#123D2C] bg-[#E9F2E7] px-2 py-3 text-center text-xs font-black text-[#123D2C] shadow-lg shadow-green-900/10 ring-2 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-4 focus:ring-[#123D2C]/20 sm:px-4 sm:py-4 sm:text-sm"
              >
                <span className="block">Configurações</span>
                <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.12em] text-[#2F6B43] sm:text-[10px]">Toque para abrir</span>
              </button>
            </section>
          </div>
        )}
      </section>

      {shortcut && (
        <ShortcutModal
          shortcut={shortcut}
          onClose={() => setShortcut(null)}
          canAccessDespensa={canAccessDespensa}
        />
      )}

      {!loading && panelPreferences.upcomingAppointmentsPopup && (
        <>
          <UpcomingAppointmentsLoginModal
            appointmentsHref={`${PANEL_BASE}/atendimento/consultar-agendamentos`}
          />
          <UpcomingEntityAppointmentsLoginModal />
        </>
      )}

      {!loading && (
        <MemberPendingProofLoginModal
          enabled={panelPreferences.pendingProofsPopup}
        />
      )}

      {!loading && (
        <MemberContributionAlertsLoginModal
          upcoming={upcoming}
          contributions={contributions}
          showDue={panelPreferences.dueContributionPopup}
          dueDaysBefore={panelPreferences.dueContributionDaysBefore}
          showOverdue={panelPreferences.overdueContributionPopup}
        />
      )}
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const PANEL_BASE = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel";
const FILHO_LOGIN = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login";
const TUCXA_SITE = "/solucoes/organizacao-em-harmonia/tucxa";

export type PanelHeaderAction = {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
  action?: "signOutFilhoCorrente" | "supportWhatsapp";
};

type FilhoCorrentePanelHeaderProps = {
  navLabel?: string;
  actions?: PanelHeaderAction[];
  showSupport?: boolean;
  mobileActionColumns?: 2 | 3 | 4;
  compactMobileActions?: boolean;
  autoHighlightCurrent?: boolean;
};

function redirectToFilhoLogin() {
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(`${FILHO_LOGIN}?returnTo=${encodeURIComponent(returnTo)}`);
}

function sessionName(user: { user_metadata?: Record<string, unknown> } | null | undefined) {
  const metadata = user?.user_metadata ?? {};
  const candidates = [metadata.full_name, metadata.fullName, metadata.name];
  return candidates.find(
    (value): value is string =>
      typeof value === "string" && Boolean(value.trim()),
  )?.trim() ?? "";
}

function useFilhoCorrenteName() {
  const [name, setName] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!active) return;

      const token = data.session?.access_token;
      if (!token) {
        redirectToFilhoLogin();
        return;
      }

      const fromSession = sessionName(data.session?.user);
      if (fromSession) setName(fromSession);

      const response = await fetch(
        "/api/organizacao-em-harmonia/filhos-corrente/perfil",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.status === 401 || response.status === 403) {
        redirectToFilhoLogin();
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as {
        person?: { fullName?: string };
      };
      if (active && response.ok && payload.person?.fullName) {
        setName(payload.person.fullName);
      }
    }

    void load();
    const { data: listener } = supabaseBrowser.auth.onAuthStateChange(
      (_event, session) => {
        if (active) setName(sessionName(session?.user));
      },
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return name;
}

export const filhoPanelBase = PANEL_BASE;
export const tucxaSiteHref = TUCXA_SITE;

export const filhoSignOutAction: PanelHeaderAction = {
  label: "Sair",
  href: "#sair",
  variant: "secondary",
  action: "signOutFilhoCorrente",
};

export const filhoSupportAction: PanelHeaderAction = {
  label: "Ajuda",
  href: "#ajuda",
  variant: "secondary",
  action: "supportWhatsapp",
};

export function FilhoCorrentePanelHeader({
  navLabel = "Painel do Filho da Corrente",
  actions,
  showSupport = true,
  mobileActionColumns = 4,
  compactMobileActions = true,
  autoHighlightCurrent = true,
}: FilhoCorrentePanelHeaderProps) {
  const authenticatedName = useFilhoCorrenteName();

  const defaultActions = useMemo<PanelHeaderAction[]>(
    () => [
      { label: "Início", href: PANEL_BASE, variant: "primary" },
      {
        label: "Agenda Viva",
        href: `${PANEL_BASE}/agenda-viva`,
        variant: "secondary",
      },
      {
        label: "Atendimento em Harmonia",
        href: `${PANEL_BASE}/atendimento`,
        variant: "secondary",
      },
      {
        label: "Corrente em Dia",
        href: `${PANEL_BASE}/corrente-em-dia`,
        variant: "secondary",
      },
      {
        label: "Cadastro",
        href: `${PANEL_BASE}/atualizar-dados`,
        variant: "secondary",
      },
      filhoSignOutAction,
    ],
    [],
  );

  const effectiveActions = useMemo(() => {
    const selected = [...(actions ?? defaultActions)];
    const alreadyHasSupport = selected.some(
      (item) => item.action === "supportWhatsapp",
    );

    if (showSupport && !alreadyHasSupport) selected.push(filhoSupportAction);
    return selected;
  }, [actions, defaultActions, showSupport]);

  return (
    <TucxaPublicHeader
      actions={effectiveActions}
      authenticatedName={authenticatedName}
      showSessionName
      navLabel={navLabel}
      showSupport={false}
      mobileActionColumns={mobileActionColumns}
      compactMobileActions={compactMobileActions}
      autoHighlightCurrent={autoHighlightCurrent}
    />
  );
}

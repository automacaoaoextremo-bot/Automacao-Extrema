"use client";

import { useEffect, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const PANEL_BASE = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel";
const TUCXA_SITE = "/solucoes/organizacao-em-harmonia/tucxa";

type PanelHeaderAction = {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
  action?: "signOutFilhoCorrente" | "supportWhatsapp";
};

type FilhoCorrentePanelHeaderProps = {
  navLabel?: string;
  actions?: PanelHeaderAction[];
  showSupport?: boolean;
};

function sessionName(user: { user_metadata?: Record<string, unknown> } | null | undefined) {
  const metadata = user?.user_metadata ?? {};
  const candidates = [metadata.full_name, metadata.fullName, metadata.name];
  return candidates.find((value): value is string => typeof value === "string" && Boolean(value.trim()))?.trim() ?? "";
}

function useFilhoCorrenteName() {
  const [name, setName] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!active) return;
      const fromSession = sessionName(data.session?.user);
      if (fromSession) {
        setName(fromSession);
        return;
      }

      const token = data.session?.access_token;
      if (!token) return;
      const response = await fetch("/api/organizacao-em-harmonia/filhos-corrente/perfil", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json().catch(() => ({}))) as { person?: { fullName?: string } };
      if (active && response.ok && payload.person?.fullName) setName(payload.person.fullName);
    }

    void load();
    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (active) setName(sessionName(session?.user));
    });

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
  label: "Dúvidas?",
  href: "#duvidas",
  variant: "secondary",
  action: "supportWhatsapp",
};

export function FilhoCorrentePanelHeader({ navLabel = "Painel do Filho da Corrente", actions, showSupport = true }: FilhoCorrentePanelHeaderProps) {
  const authenticatedName = useFilhoCorrenteName();
  const defaultActions: PanelHeaderAction[] = [
    { label: "Início", href: PANEL_BASE, variant: "primary" },
    { label: "Agenda Viva", href: `${PANEL_BASE}/agenda-viva`, variant: "secondary" },
    { label: "Atendimento em Harmonia", href: `${PANEL_BASE}/atendimento`, variant: "secondary" },
    { label: "Corrente em Dia", href: `${PANEL_BASE}/corrente-em-dia`, variant: "secondary" },
    { label: "Cadastro", href: `${PANEL_BASE}/atualizar-dados`, variant: "secondary" },
    filhoSignOutAction,
  ];

  return (
    <TucxaPublicHeader
      actions={actions ?? defaultActions}
      authenticatedName={authenticatedName}
      showSessionName
      navLabel={navLabel}
      showSupport={showSupport}
    />
  );
}

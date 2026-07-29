"use client";

import { useEffect, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const PANEL_BASE = "/solucoes/organizacao-em-harmonia/tucxa/consulente/painel";
const CONTRIBUTION_HREF = "/solucoes/organizacao-em-harmonia/tucxa/consulente/contribuicao?tipo=identificada";

type PanelHeaderAction = {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
  action?: "signOutConsulente" | "supportWhatsapp";
};

type ConsulentePanelHeaderProps = {
  navLabel?: string;
  actions?: PanelHeaderAction[];
  showSupport?: boolean;
};

function sessionName(user: { user_metadata?: Record<string, unknown> } | null | undefined) {
  const metadata = user?.user_metadata ?? {};
  const candidates = [metadata.full_name, metadata.fullName, metadata.name];
  return candidates.find((value): value is string => typeof value === "string" && Boolean(value.trim()))?.trim() ?? "";
}

function useConsulenteName() {
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
      const response = await fetch("/api/organizacao-em-harmonia/site-tucxa/agendamentos?view=mine", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json().catch(() => ({}))) as { profile?: { fullName?: string } };
      if (active && response.ok && payload.profile?.fullName) setName(payload.profile.fullName);
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

export const consulentePanelBase = PANEL_BASE;

export const consulenteSignOutAction: PanelHeaderAction = {
  label: "Sair",
  href: "#sair",
  variant: "secondary",
  action: "signOutConsulente",
};

export const consulenteSupportAction: PanelHeaderAction = {
  label: "Dúvidas?",
  href: "#duvidas",
  variant: "secondary",
  action: "supportWhatsapp",
};

export function ConsulentePanelHeader({
  navLabel = "Painel do Filho de Fora/Consulente",
  actions,
  showSupport = true,
}: ConsulentePanelHeaderProps) {
  const authenticatedName = useConsulenteName();
  const defaultActions: PanelHeaderAction[] = [
    { label: "Início", href: PANEL_BASE, variant: "primary" },
    { label: "Agenda Viva", href: `${PANEL_BASE}/agenda-viva`, variant: "secondary" },
    { label: "Atendimento em Harmonia", href: `${PANEL_BASE}/atendimento`, variant: "secondary" },
    { label: "Corrente em Dia", href: CONTRIBUTION_HREF, variant: "secondary" },
    consulenteSignOutAction,
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

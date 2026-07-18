"use client";

import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

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
  const defaultActions: PanelHeaderAction[] = [
    { label: "Início", href: PANEL_BASE, variant: "primary" },
    { label: "Agenda Viva", href: `${PANEL_BASE}/agenda-viva`, variant: "secondary" },
    { label: "Atendimento em Harmonia", href: `${PANEL_BASE}/atendimento`, variant: "secondary" },
    { label: "Corrente em Dia", href: CONTRIBUTION_HREF, variant: "secondary" },
    consulenteSignOutAction,
  ];

  return <TucxaPublicHeader actions={actions ?? defaultActions} navLabel={navLabel} showSupport={showSupport} />;
}

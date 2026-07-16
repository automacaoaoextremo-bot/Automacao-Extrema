"use client";

import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

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
  const defaultActions: PanelHeaderAction[] = [
    { label: "Início", href: PANEL_BASE, variant: "primary" },
    { label: "Agenda Viva", href: `${PANEL_BASE}/agenda-viva`, variant: "secondary" },
    { label: "Atendimento em Harmonia", href: `${PANEL_BASE}/atendimento`, variant: "secondary" },
    { label: "Corrente em Dia", href: `${PANEL_BASE}/corrente-em-dia`, variant: "secondary" },
    { label: "Cadastro", href: `${PANEL_BASE}/atualizar-dados`, variant: "secondary" },
    filhoSignOutAction,
  ];

  return <TucxaPublicHeader actions={actions ?? defaultActions} navLabel={navLabel} showSupport={showSupport} />;
}

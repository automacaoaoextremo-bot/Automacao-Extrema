"use client";

import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

const PANEL_BASE = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel";

export function FilhoCorrentePanelHeader({ navLabel = "Painel do Filho da Corrente" }: { navLabel?: string }) {
  return (
    <TucxaPublicHeader
      actions={[
        { label: "Início", href: PANEL_BASE, variant: "primary" },
        { label: "Agenda Viva", href: `${PANEL_BASE}/agenda-viva`, variant: "secondary" },
        { label: "Atendimento em Harmonia", href: `${PANEL_BASE}/atendimento`, variant: "secondary" },
        { label: "Corrente em Dia", href: `${PANEL_BASE}/corrente-em-dia`, variant: "secondary" },
        { label: "Cadastro", href: `${PANEL_BASE}/atualizar-dados`, variant: "secondary" },
        { label: "Sair", href: "#sair", variant: "secondary", action: "signOutFilhoCorrente" },
      ]}
      navLabel={navLabel}
      showSupport
    />
  );
}

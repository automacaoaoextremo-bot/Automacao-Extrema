"use client";

import { AcervoVivoReader } from "@/components/organizacao-em-harmonia/acervo-vivo-reader";
import { FilhoCorrentePanelHeader } from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";

const panelBase = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel";
const atendimentoHref = `${panelBase}/atendimento`;

export default function AcervoVivoFilhoDaCorrentePage() {
  return (
    <AcervoVivoReader
      api="/api/organizacao-em-harmonia/filhos-corrente/acervo-vivo"
      audienceLabel="Filho da Corrente"
      header={
        <FilhoCorrentePanelHeader
          navLabel="Acervo Vivo"
          showSupport={false}
          actions={[
            { label: "Início", href: panelBase, variant: "primary" },
            { label: "Voltar", href: atendimentoHref, variant: "secondary" },
            { label: "Ajuda", href: "#ajuda", variant: "secondary", action: "supportWhatsapp" },
            { label: "Sair", href: "#sair", variant: "secondary", action: "signOutFilhoCorrente" },
          ]}
          mobileActionColumns={4}
        />
      }
    />
  );
}

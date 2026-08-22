"use client";

import { AcervoVivoReader } from "@/components/organizacao-em-harmonia/acervo-vivo-reader";
import {
  ConsulentePanelHeader,
  consulenteSignOutAction,
} from "@/components/organizacao-em-harmonia/consulente-panel-header";

const panelBase = "/solucoes/organizacao-em-harmonia/tucxa/consulente/painel";
const atendimentoHref = `${panelBase}/atendimento`;

export default function AcervoVivoConsulentePage() {
  return (
    <AcervoVivoReader
      api="/api/organizacao-em-harmonia/consulentes/acervo-vivo"
      audienceLabel="Filho de Fora / Consulente"
      header={
        <ConsulentePanelHeader
          navLabel="Acervo Vivo"
          showSupport={false}
          actions={[
            { label: "Início", href: panelBase, variant: "primary" },
            { label: "Voltar", href: atendimentoHref, variant: "secondary" },
            { label: "Ajuda", href: "#ajuda", variant: "secondary", action: "supportWhatsapp" },
            consulenteSignOutAction,
          ]}
        />
      }
    />
  );
}

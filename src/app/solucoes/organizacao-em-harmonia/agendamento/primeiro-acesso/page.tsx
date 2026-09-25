"use client";

import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { TucxaFirstAccessModal } from "@/components/organizacao-em-harmonia/tucxa-first-access-modal";

const LANDING = "/solucoes/organizacao-em-harmonia/agendamento";

function safeReturnTo() {
  if (typeof window === "undefined") return LANDING;
  const value = new URLSearchParams(window.location.search).get("returnTo") || "";
  return value.startsWith("/solucoes/organizacao-em-harmonia/") && !value.startsWith("//") ? value : LANDING;
}

export default function AgendamentoPrimeiroAcessoPage() {
  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        navLabel="Primeiro acesso ao Agendamento"
        showSupport={false}
        actions={[
          { label: "Início", href: LANDING, variant: "primary" },
          { label: "Voltar", href: `${LANDING}/login`, variant: "secondary" },
          { label: "Ajuda", href: "#ajuda", variant: "secondary", action: "supportWhatsapp" },
        ]}
        mobileActionColumns={3}
        compactMobileActions={false}
        autoHighlightCurrent={false}
        showSessionName
      />
      <section className="flex min-h-0 flex-1 items-center justify-center px-3 text-center">
        <p className="text-sm font-bold text-[#2F6B43]">Conclua seu primeiro acesso na janela aberta.</p>
      </section>
      <TucxaFirstAccessModal destination={safeReturnTo()} />
    </main>
  );
}

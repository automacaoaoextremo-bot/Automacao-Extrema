import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Campanha | Impacto no Controle | Automação Extrema",
  description:
    "Participe de uma campanha do Impacto no Controle com reserva, pagamento, comprovante e acompanhamento da participação.",
};

export default function CampaignLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

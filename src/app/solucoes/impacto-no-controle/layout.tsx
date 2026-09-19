import type { Metadata } from "next";
import "./impacto.css";

export const metadata: Metadata = {
  title: "Impacto no Controle | Automação Extrema",
  description: "Campanhas, rifas e ações solidárias com participação, Pix, comprovantes, acompanhamento e prestação de contas.",
};

export default function ImpactoNoControleLayout({ children }: { children: React.ReactNode }) {
  return <div className="impacto-no-controle">{children}</div>;
}

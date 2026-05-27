import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Automação Extrema | Diagnóstico de Dores e Oportunidades",
  description:
    "Diagnóstico para identificar dores reais, oportunidades de automação, melhoria de processos e soluções digitais.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-950">{children}</body>
    </html>
  );
}

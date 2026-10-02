"use client";

import Link from "next/link";
import { TucxaPilotReports } from "@/components/organizacao-em-harmonia/tucxa-pilot-reports";

export default function GestaoPage() {
  return (
    <main className="min-h-screen bg-[#F7FAF2] p-4 text-[#10251C]">
      <section className="mx-auto max-w-6xl">
        <Link
          href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento/agendamento-piloto?abrir=acolhimento"
          className="inline-flex rounded-xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white"
        >
          ← Fechar e voltar ao Acolhimento
        </Link>
        <h1 className="mt-4 text-3xl font-black">Gestão · Relatórios</h1>
        <div className="mt-4">
          <TucxaPilotReports />
        </div>
      </section>
    </main>
  );
}

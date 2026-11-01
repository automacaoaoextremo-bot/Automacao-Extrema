"use client";

import Link from "next/link";
import { TucxaDiagnosticoEnviosContent } from "@/components/organizacao-em-harmonia/tucxa-diagnostico-envios";

const BASE = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento/agendamento-piloto";

/** Rota de compatibilidade para favoritos; a abertura principal usa pop-up. */
export default function TucxaDiagnosticoEnviosPage() {
  return <main className="min-h-screen bg-[#F3F7F0] px-3 py-6 text-[#123D2C]">
    <section className="mx-auto max-w-3xl rounded-2xl bg-white p-4 shadow-sm sm:p-6">
      <Link href={BASE} className="text-sm font-bold text-[#2F6B43]">← Voltar aos Agendamentos</Link>
      <h1 className="my-4 text-xl font-black sm:text-2xl">Diagnóstico dos Envios Automáticos</h1>
      <TucxaDiagnosticoEnviosContent />
    </section>
  </main>;
}

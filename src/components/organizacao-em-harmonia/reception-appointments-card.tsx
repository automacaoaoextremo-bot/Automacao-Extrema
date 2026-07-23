"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";

const CONSULT_PATH = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento/consultar-agendamentos";

type ProfileResponse = {
  canReception?: boolean;
  error?: string;
};

export function ReceptionAppointmentsCard() {
  const [canReception, setCanReception] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;

      const response = await fetch("/api/organizacao-em-harmonia/filhos-corrente/perfil", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json().catch(() => ({}))) as ProfileResponse;
      if (active && response.ok) setCanReception(payload.canReception === true);
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  if (!canReception) return null;

  return (
    <article id="consultar-agendamentos" className="scroll-mt-44 rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-1 hover:shadow-xl">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">Consulta da Recepção</p>
      <h2 className="mt-2 text-xl font-black leading-tight text-[#123D2C]">Próximos atendimentos em uma única visão.</h2>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
        Pesquise por nome ou WhatsApp, acompanhe os atendimentos a partir de hoje e abra o histórico quando precisar consultar datas anteriores.
      </p>
      <Link href={CONSULT_PATH} className="mt-4 inline-flex rounded-2xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white">
        Consultar agendamentos
      </Link>
    </article>
  );
}

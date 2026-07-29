"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ConsulentePanelHeader } from "@/components/organizacao-em-harmonia/consulente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { UpcomingAppointmentsLoginModal } from "@/components/organizacao-em-harmonia/upcoming-appointments-login-modal";

type UserInfo = {
  fullName: string;
};

const panelBase = "/solucoes/organizacao-em-harmonia/tucxa/consulente/painel";

const moduleCards = [
  {
    title: "Agenda Viva",
    description: "Calendário completo e próximos compromissos disponíveis para Filhos de Fora/Consulentes, com visualizações, filtros e janelas de detalhes.",
    href: `${panelBase}/agenda-viva`,
  },
  {
    title: "Atendimento em Harmonia",
    description: "Orientações do Tucxa para Filhos de Fora/Consulentes: horários, chegada, senha, atendimento, retorno, transformação e acolhimento.",
    href: `${panelBase}/atendimento`,
  },
  {
    title: "Corrente em Dia",
    description: "Acompanhe formas de contribuição, orientações de Pix, comprovante e apoio à manutenção da casa.",
    href: "/solucoes/organizacao-em-harmonia/tucxa/consulente/contribuicao?tipo=identificada",
  },
];

export default function PainelConsulenteTucxaPage() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      supabaseBrowser.auth.getUser().then(async ({ data }) => {
        const user = data.user;
        if (!user) {
          window.location.replace("/solucoes/organizacao-em-harmonia/tucxa/consulente/login");
          return;
        }

        const metadata = user.user_metadata ?? {};
        const profile = typeof metadata.oh_profile === "string" ? metadata.oh_profile : "";
        if (profile && profile !== "consulente") {
          window.location.replace("/solucoes/organizacao-em-harmonia/cliente");
          return;
        }

        setUserInfo({
          fullName: typeof metadata.full_name === "string" ? metadata.full_name : user.email || "Filho de Fora/Consulente",
        });
        setLoading(false);
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <ConsulentePanelHeader />

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {loading && <p className="rounded-3xl bg-white p-5 font-bold text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">Carregando seu acesso...</p>}

        {userInfo && (
          <div className="grid gap-5">
            <section className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#CFE2C7]">Área exclusiva do Filho de Fora/Consulente</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">Olá, {userInfo.fullName.split(/\s+/)[0]}.</h1>
              <p className="mt-3 max-w-3xl leading-7 text-[#EEF7EA]">
                Este é o seu espaço de consulta e orientação. Acesse os módulos do Organização em Harmonia do Tucxa, acompanhe a Agenda Viva e encontre as informações necessárias para seu atendimento.
              </p>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {moduleCards.map((card) => (
                <Link key={card.href} href={card.href} className="rounded-[1.75rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-1 hover:shadow-xl">
                  <h2 className="text-xl font-black text-[#123D2C]">{card.title}</h2>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{card.description}</p>
                  <span className="mt-5 inline-flex rounded-2xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white">Abrir módulo</span>
                </Link>
              ))}
            </section>
          </div>
        )}
      </section>

      <UpcomingAppointmentsLoginModal appointmentsHref="/solucoes/organizacao-em-harmonia/tucxa/consulente/agendamentos" />
    </main>
  );
}

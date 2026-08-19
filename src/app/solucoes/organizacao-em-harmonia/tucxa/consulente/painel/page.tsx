"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ConsulentePanelHeader,
  consulenteSignOutAction,
} from "@/components/organizacao-em-harmonia/consulente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { UpcomingAppointmentsLoginModal } from "@/components/organizacao-em-harmonia/upcoming-appointments-login-modal";

type UserInfo = {
  fullName: string;
};

const panelBase = "/solucoes/organizacao-em-harmonia/tucxa/consulente/painel";

const moduleCards = [
  {
    title: "Agenda Viva",
    description:
      "Calendário completo e próximos compromissos disponíveis para Filhos de Fora/Consulentes, com visualizações, filtros e janelas de detalhes.",
    href: `${panelBase}/agenda-viva`,
  },
  {
    title: "Atendimento em Harmonia",
    description:
      "Orientações do Tucxa para Filhos de Fora/Consulentes: horários, chegada, senha, atendimento, retorno, transformação e acolhimento.",
    href: `${panelBase}/atendimento`,
  },
  {
    title: "Corrente em Dia",
    description:
      "Acompanhe formas de contribuição, orientações de Pix, comprovante e apoio à manutenção da casa.",
    href: "/solucoes/organizacao-em-harmonia/tucxa/consulente/contribuicao?tipo=identificada",
  },
];

function TouchHint() {
  return (
    <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.18em] text-[#2F6B43]">
      TOQUE PARA ABRIR
    </span>
  );
}

export default function PainelConsulenteTucxaPage() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [modulesOpen, setModulesOpen] = useState(false);

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
          fullName:
            typeof metadata.full_name === "string"
              ? metadata.full_name
              : user.email || "Filho de Fora/Consulente",
        });
        setLoading(false);
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const url = new URL(window.location.href);
      if (url.searchParams.get("abrir") !== "modulos") return;
      setModulesOpen(true);
      url.searchParams.delete("abrir");
      window.history.replaceState(
        window.history.state,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!modulesOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modulesOpen]);

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <ConsulentePanelHeader
        actions={[
          { label: "Início", href: panelBase, variant: "primary" },
          consulenteSignOutAction,
        ]}
      />

      <section className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        {loading && (
          <p className="rounded-3xl bg-white p-5 font-bold text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">
            Carregando seu acesso...
          </p>
        )}

        {userInfo && (
          <div className="grid gap-3 sm:gap-4">
            <section className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#CFE2C7]">
                Área exclusiva do Filho de Fora/Consulente
              </p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                Olá, {userInfo.fullName.split(/\s+/)[0]}.
              </h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#EEF7EA] sm:text-base sm:leading-7">
                Este é o seu espaço de consulta e orientação. Abra os módulos quando precisar acompanhar a Agenda Viva, consultar informações de atendimento ou acessar o Corrente em Dia.
              </p>
            </section>

            <button
              type="button"
              onClick={() => setModulesOpen(true)}
              className="w-full rounded-[1.5rem] bg-[#E9F2E7] px-5 py-4 text-left shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#DDEAD8] hover:shadow-lg sm:max-w-sm"
            >
              <span className="block text-lg font-black text-[#123D2C]">Módulos</span>
              <TouchHint />
            </button>
          </div>
        )}
      </section>

      {modulesOpen && (
        <div
          className="fixed inset-0 z-[180] flex items-center justify-center bg-[#10251C]/75 p-3 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Módulos do Filho de Fora/Consulente"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setModulesOpen(false);
          }}
        >
          <section className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] bg-[#F7FAF2] shadow-2xl">
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#123D2C]/10 bg-white px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
                  Área do Filho de Fora/Consulente
                </p>
                <h2 className="mt-1 text-2xl font-black text-[#123D2C]">Módulos</h2>
              </div>
              <button
                type="button"
                onClick={() => setModulesOpen(false)}
                className="shrink-0 rounded-xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white"
              >
                Fechar
              </button>
            </header>

            <div className="min-h-0 overflow-y-auto p-4">
              <div className="grid gap-3">
                {moduleCards.map((card) => (
                  <article
                    key={card.href}
                    className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#123D2C]/10"
                  >
                    <h3 className="text-lg font-black text-[#123D2C]">{card.title}</h3>
                    <p className="mt-1.5 text-sm font-semibold leading-5 text-slate-600">
                      {card.description}
                    </p>
                    <Link
                      href={card.href}
                      className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-[#123D2C] px-4 py-3 text-sm font-black text-white"
                    >
                      Abrir
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      <UpcomingAppointmentsLoginModal appointmentsHref="/solucoes/organizacao-em-harmonia/tucxa/consulente/agendamentos" />
    </main>
  );
}

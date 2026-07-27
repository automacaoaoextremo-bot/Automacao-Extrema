"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FilhoCorrentePanelHeader } from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { UpcomingAppointmentsLoginModal } from "@/components/organizacao-em-harmonia/upcoming-appointments-login-modal";
import { UpcomingEntityAppointmentsLoginModal } from "@/components/organizacao-em-harmonia/upcoming-entity-appointments-login-modal";

type UserInfo = {
  fullName: string;
  profileUpdateStatus: string;
};

const moduleCards = [
  {
    title: "Agenda Viva",
    description: "Calendário completo e próximos compromissos, com filtros por tipo de evento, Umbanda/outros, público, responsável e período.",
    href: "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/agenda-viva",
  },
  {
    title: "Atendimento em Harmonia",
    description: "Orientações do Tucxa organizadas por tema: regulamento, preparo, silêncio, cambonos, presença, retorno e acolhimento.",
    href: "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento",
  },
  {
    title: "Corrente em Dia",
    description: "Acompanhe formas de contribuição, orientações de Pix, comprovante e apoio à manutenção da casa.",
    href: "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/corrente-em-dia",
  },
  {
    title: "Atualizar meus dados",
    description: "Revise cadastro, funções e agendas já selecionadas, veja novas opções e envie atualização para validação do Tucxa.",
    href: "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atualizar-dados",
  },
];

export default function PainelFilhoDaCorrentePage() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      supabaseBrowser.auth.getSession().then(async ({ data }) => {
        const session = data.session;
        const user = session?.user;
        if (!user) {
          window.location.replace("/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login");
          return;
        }

        const metadata = user.user_metadata ?? {};
        const profile = typeof metadata.oh_profile === "string" ? metadata.oh_profile : "";
        if (profile && profile !== "filho-da-corrente") {
          window.location.replace("/solucoes/organizacao-em-harmonia/cliente");
          return;
        }

        let profileUpdateStatus = typeof metadata.profile_update_status === "string" ? metadata.profile_update_status : "";
        if (session.access_token) {
          const response = await fetch("/api/organizacao-em-harmonia/filhos-corrente/perfil", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          const payload = (await response.json().catch(() => ({}))) as { profileUpdateStatus?: string };
          if (response.ok) profileUpdateStatus = payload.profileUpdateStatus || profileUpdateStatus;
        }

        setUserInfo({
          fullName: typeof metadata.full_name === "string" ? metadata.full_name : user.email || "Filho da Corrente",
          profileUpdateStatus,
        });
        setLoading(false);
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader />

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {loading && <p className="rounded-3xl bg-white p-5 font-bold text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">Carregando seu acesso...</p>}

        {userInfo && (
          <div className="grid gap-5">
            <section className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#CFE2C7]">Área exclusiva do Filho da Corrente</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">Olá, {userInfo.fullName.split(/\s+/)[0]}.</h1>
              <p className="mt-3 max-w-3xl leading-7 text-[#EEF7EA]">
                Este é o seu espaço de consulta e orientação. Acesse os módulos do Organização em Harmonia do Tucxa, acompanhe e mantenha seus dados, funções e agendas sempre atualizados.
              </p>
            </section>

            {userInfo.profileUpdateStatus === "pendente_validacao" && (
              <section className="rounded-[1.75rem] bg-blue-50 p-4 text-blue-950 ring-1 ring-blue-100">
                <p className="font-black">Atualização cadastral aguardando validação.</p>
                <p className="mt-1 text-sm font-semibold leading-6">Seu perfil aprovado continua disponível. As novas funções e agendas serão liberadas somente depois da aprovação do TUCXA.</p>
              </section>
            )}

            {userInfo.profileUpdateStatus === "ajuste_solicitado" && (
              <section className="rounded-[1.75rem] bg-amber-50 p-4 text-amber-950 ring-1 ring-amber-100">
                <p className="font-black">Sua atualização cadastral precisa de ajustes.</p>
                <p className="mt-1 text-sm font-semibold leading-6">O perfil anteriormente aprovado continua ativo. Abra Cadastro para revisar e enviar novamente.</p>
              </section>
            )}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      <UpcomingAppointmentsLoginModal appointmentsHref="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento/consultar-agendamentos" />
      <UpcomingEntityAppointmentsLoginModal />
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

type UserInfo = {
  fullName: string;
  whatsapp: string;
  email: string;
  status: string;
};

const statusLabels: Record<string, string> = {
  ativo: "Acesso liberado",
  pendente_validacao: "Aguardando validação",
  ajuste_solicitado: "Ajuste solicitado",
};

const moduleCards = [
  {
    title: "Agenda Viva",
    description: "Veja atividades, grupos, estudos e eventos associados ao seu vínculo, com foco no que realmente importa para a sua participação.",
    href: "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/agenda-viva",
  },
  {
    title: "Atendimento em Harmonia",
    description: "Consulte orientações de atendimento, retorno, responsabilidades de cambonos, cavalinhos e comunicação com a coordenação.",
    href: "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento",
  },
  {
    title: "Corrente em Dia",
    description: "Acompanhe comunicados, contribuições, compromissos e orientações administrativas que apoiam a manutenção da casa.",
    href: "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/corrente-em-dia",
  },
  {
    title: "Documentos do Tucxa",
    description: "Regulamento, procedimentos básicos e manual para cambonos em um lugar simples para consulta rápida.",
    href: "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/documentos",
  },
  {
    title: "Funções e responsabilidades",
    description: "Entenda o que significa ser Filho da Corrente, Cambono, Cavalinho, voluntário ou integrante da organização.",
    href: "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/funcoes",
  },
  {
    title: "Entidades e vínculos",
    description: "Consulte a estrutura de entidades, linhas, dias de atendimento e vínculos com cavalinhos quando cadastrados.",
    href: "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/entidades",
  },
];

export default function PainelFilhoDaCorrentePage() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      supabaseBrowser.auth.getUser().then(async ({ data }) => {
        const user = data.user;
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

        setUserInfo({
          fullName: typeof metadata.full_name === "string" ? metadata.full_name : user.email || "Filho da Corrente",
          whatsapp: typeof metadata.whatsapp === "string" ? metadata.whatsapp : "",
          email: user.email || "",
          status: typeof metadata.oh_access_status === "string" ? metadata.oh_access_status : "ativo",
        });
        setLoading(false);
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function signOut() {
    await supabaseBrowser.auth.signOut();
    window.location.replace("/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login");
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={[
          { label: "Início", href: "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel", variant: "primary" },
          { label: "Site Tucxa", href: "/solucoes/organizacao-em-harmonia/tucxa", variant: "secondary" },
        ]}
        navLabel="Painel do Filho da Corrente"
      />

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {loading && <p className="rounded-3xl bg-white p-5 font-bold text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">Carregando seu acesso...</p>}

        {userInfo && (
          <div className="grid gap-5">
            <section className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#CFE2C7]">Área exclusiva do Filho da Corrente</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">Olá, {userInfo.fullName.split(/\s+/)[0]}.</h1>
              <p className="mt-3 max-w-3xl leading-7 text-[#EEF7EA]">
                Este é o seu espaço de consulta e orientação. Ele mostra apenas informações úteis ao Filho da Corrente e não libera a área de gestão da Organização em Harmonia.
              </p>
              <div className="mt-4 grid gap-3 text-sm font-bold sm:grid-cols-3">
                <p className="rounded-2xl bg-white/10 p-3">Status: {statusLabels[userInfo.status] ?? userInfo.status}</p>
                <p className="rounded-2xl bg-white/10 p-3">WhatsApp: {userInfo.whatsapp || "não informado"}</p>
                <p className="rounded-2xl bg-white/10 p-3">E-mail: {userInfo.email.includes("organizacao-em-harmonia.local") ? "não informado" : userInfo.email}</p>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              {moduleCards.map((card) => (
                <Link key={card.href} href={card.href} className="rounded-[1.75rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-1 hover:shadow-xl">
                  <h2 className="text-xl font-black text-[#123D2C]">{card.title}</h2>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{card.description}</p>
                </Link>
              ))}
            </section>

            <section className="rounded-[1.75rem] bg-[#E9F2E7] p-5 ring-1 ring-[#123D2C]/10">
              <h2 className="text-xl font-black text-[#123D2C]">Atalhos rápidos</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente#primeiro-acesso" className="rounded-2xl bg-white px-5 py-3 font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">Atualizar meus dados</Link>
                <Link href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/status" className="rounded-2xl bg-white px-5 py-3 font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">Acompanhar validação</Link>
                <button type="button" onClick={signOut} className="rounded-2xl bg-[#123D2C] px-5 py-3 font-black text-white shadow">Sair do acesso</button>
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

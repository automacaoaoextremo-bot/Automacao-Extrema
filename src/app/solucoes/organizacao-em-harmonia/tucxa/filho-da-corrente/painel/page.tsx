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

export default function PainelFilhoDaCorrentePage() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      supabaseBrowser.auth.getUser().then(async ({ data }) => {
        const user = data.user;
        if (!user) {
          window.location.replace("/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente");
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
    window.location.replace("/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente");
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

      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7">
          {loading && <p className="rounded-3xl bg-[#E9F2E7] p-4 font-bold text-[#123D2C]">Carregando seu acesso...</p>}

          {userInfo && (
            <div className="grid gap-5">
              <section className="rounded-3xl bg-[#123D2C] p-5 text-white">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#CFE2C7]">Filho da Corrente</p>
                <h1 className="mt-2 text-3xl font-black">Olá, {userInfo.fullName.split(/\s+/)[0]}.</h1>
                <p className="mt-3 leading-7 text-[#EEF7EA]">
                  Este é o acesso limitado do Filho da Corrente. Ele não libera a área de gestão da Organização em Harmonia.
                </p>
                <p className="mt-3 rounded-2xl bg-white/10 p-3 text-sm font-bold">Status: {statusLabels[userInfo.status] ?? userInfo.status}</p>
              </section>

              <section className="grid gap-4 md:grid-cols-3">
                <Link href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente#primeiro-acesso" className="rounded-3xl bg-[#F7FAF2] p-5 font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">
                  Conferir meus dados
                </Link>
                <Link href="/solucoes/organizacao-em-harmonia/tucxa" className="rounded-3xl bg-[#F7FAF2] p-5 font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">
                  Site público do Tucxa
                </Link>
                <button type="button" onClick={signOut} className="rounded-3xl bg-white p-5 text-left font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">
                  Sair do acesso
                </button>
              </section>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

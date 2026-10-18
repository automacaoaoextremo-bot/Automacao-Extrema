"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const ACCESS_API = "/api/organizacao-em-harmonia/agendamento/acesso";
const LOGIN = "/solucoes/organizacao-em-harmonia/agendamento/login";
const CHANGE_PASSWORD = "/solucoes/organizacao-em-harmonia/agendamento/trocar-senha";

type RecoveryResponse = {
  ok?: boolean;
  authEmail?: string;
  error?: string;
};

export default function UnifiedPasswordRecoveryPage() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch(ACCESS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve-recovery", identifier }),
      });
      const result = (await response.json().catch(() => ({}))) as RecoveryResponse;
      if (!response.ok || !result.authEmail) {
        throw new Error(result.error || "Não foi possível preparar a recuperação da senha.");
      }

      const redirectTo = `${window.location.origin}${CHANGE_PASSWORD}`;
      const { error: resetError } = await supabaseBrowser.auth.resetPasswordForEmail(result.authEmail, { redirectTo });
      if (resetError) throw resetError;

      setMessage("Enviamos um link seguro para o e-mail real vinculado ao seu acesso. Abra o link recebido para definir uma nova senha.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível solicitar a troca de senha agora.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={[
          { label: "Voltar ao login", href: LOGIN, variant: "primary" },
          { label: "Ajuda", href: "#ajuda", variant: "secondary", action: "supportWhatsapp" },
        ]}
        navLabel="Recuperação de senha · acesso único"
        showSupport={false}
        mobileActionColumns={2}
        compactMobileActions
      />

      <section className="mx-auto max-w-3xl px-4 py-5 sm:px-6 lg:px-8">
        <article className="rounded-[1.75rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43]">Acesso único do Tucxa</p>
          <h1 className="mt-2 text-2xl font-black text-[#123D2C] sm:text-3xl">Recupere sua senha com segurança.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
            Informe o mesmo WhatsApp/celular ou e-mail usado para entrar. Se houver um e-mail real vinculado à sua credencial, enviaremos um link seguro de troca de senha.
          </p>

          <form onSubmit={submit} className="mt-5 grid gap-4">
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">WhatsApp/celular ou e-mail</span>
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="rounded-2xl border border-[#123D2C]/15 bg-white p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]"
                placeholder="(19) 99999-9999 ou seu@email.com"
                required
              />
            </label>

            {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
            {message && <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}

            <button disabled={loading} className="rounded-2xl bg-[#123D2C] px-5 py-4 text-base font-black text-white shadow-lg shadow-green-900/10 transition hover:-translate-y-0.5 disabled:opacity-60">
              {loading ? "Enviando..." : "Enviar link seguro de troca"}
            </button>

            <Link href={LOGIN} className="text-center text-sm font-black text-[#123D2C] underline underline-offset-4">
              Voltar para o login único
            </Link>
          </form>
        </article>
      </section>
    </main>
  );
}

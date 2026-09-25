"use client";

import { FormEvent, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { TucxaFirstAccessModal } from "@/components/organizacao-em-harmonia/tucxa-first-access-modal";
import { supabaseBrowser } from "@/lib/supabase-browser";

const ACCESS_API = "/api/organizacao-em-harmonia/agendamento/acesso";
const LANDING = "/solucoes/organizacao-em-harmonia/agendamento";

type LoginResponse = {
  ok?: boolean;
  session?: { accessToken?: string; refreshToken?: string };
  profile?: { onboardingRequired?: boolean; destination?: string };
  error?: string;
};

export default function AgendamentoLoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [firstAccessDestination, setFirstAccessDestination] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(ACCESS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", identifier, password }),
      });
      const result = (await response.json().catch(() => ({}))) as LoginResponse;
      const accessToken = result.session?.accessToken || "";
      const refreshToken = result.session?.refreshToken || "";
      if (!response.ok || !accessToken || !refreshToken || !result.profile) {
        throw new Error(result.error || "Não foi possível entrar. Confira WhatsApp/e-mail e senha.");
      }

      const { error: sessionError } = await supabaseBrowser.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) throw new Error("Não foi possível iniciar sua sessão. Tente novamente.");

      const destination = result.profile.destination || LANDING;
      if (result.profile.onboardingRequired) {
        setFirstAccessDestination(destination);
        setLoading(false);
        return;
      }

      window.location.replace(destination);
    } catch (submitError) {
      await supabaseBrowser.auth.signOut().catch(() => undefined);
      setError(submitError instanceof Error ? submitError.message : "Não foi possível entrar agora.");
      setLoading(false);
    }
  }

  async function cancelFirstAccess() {
    setFirstAccessDestination("");
    setPassword("");
    await supabaseBrowser.auth.signOut().catch(() => undefined);
  }

  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden bg-[#F7FAF2] text-[#10251C] sm:min-h-screen sm:h-auto sm:overflow-visible">
      <TucxaPublicHeader
        navLabel="Login único do Agendamento"
        showSupport={false}
        actions={[
          { label: "Início", href: LANDING, variant: "primary" },
          { label: "Voltar", href: LANDING, variant: "secondary" },
          { label: "Ajuda", href: "#ajuda", variant: "secondary", action: "supportWhatsapp" },
        ]}
        mobileActionColumns={3}
        compactMobileActions={false}
        autoHighlightCurrent={false}
      />

      <section className="mx-auto flex min-h-0 w-full max-w-xl flex-1 items-center px-3 py-2 sm:block sm:px-6 sm:py-7">
        <article className="w-full rounded-[1.6rem] bg-[#123D2C] p-4 text-white shadow-xl sm:rounded-[2rem] sm:p-7">
          <p className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-[#CFE2C7] sm:text-xs">Agendamento · acesso único</p>
          <h1 className="mt-1 text-2xl font-black leading-tight sm:mt-2 sm:text-4xl">Entre com seu WhatsApp ou e-mail.</h1>
          <p className="mt-2 text-xs font-semibold leading-5 text-[#EEF7EA] sm:mt-3 sm:text-sm sm:leading-6">
            Nesta primeira fase do piloto, o uso do sistema está sendo validado com a Recepção. Consulentes recebem o link de confirmação por SMS.
          </p>

          <form onSubmit={submit} className="mt-3 grid gap-2 rounded-[1.4rem] bg-white p-3 text-[#10251C] sm:mt-5 sm:gap-3 sm:p-5">
            <label className="grid gap-1 text-xs font-black text-[#123D2C] sm:text-sm">WhatsApp ou e-mail
              <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" className="h-10 rounded-xl border border-slate-200 px-3 font-semibold sm:h-12 sm:rounded-2xl" required />
            </label>
            <label className="grid gap-1 text-xs font-black text-[#123D2C] sm:text-sm">Senha
              <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} autoComplete="current-password" className="h-10 rounded-xl border border-slate-200 px-3 font-semibold sm:h-12 sm:rounded-2xl" required />
            </label>
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <button type="button" onClick={() => setShowPassword((current) => !current)} className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-black text-[#123D2C] sm:h-12">
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
              <button disabled={loading} className="h-10 rounded-xl bg-[#123D2C] px-4 text-sm font-black text-white disabled:opacity-60 sm:h-12 sm:rounded-2xl">
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </div>
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold leading-4 text-red-700">{error}</p>}
          </form>
        </article>
      </section>

      {firstAccessDestination && (
        <TucxaFirstAccessModal destination={firstAccessDestination} onCancel={() => void cancelFirstAccess()} />
      )}
    </main>
  );
}

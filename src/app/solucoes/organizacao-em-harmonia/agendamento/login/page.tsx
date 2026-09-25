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
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={[
          { label: "Voltar", href: LANDING, variant: "primary" },
          { label: "Ajuda", href: "#ajuda", variant: "secondary", action: "supportWhatsapp" },
        ]}
        navLabel="Login único do Agendamento"
        showSupport={false}
        mobileActionColumns={2}
        compactMobileActions
      />

      <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <article className="overflow-hidden rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.26em] text-[#CFE2C7]">Agendamento · acesso único</p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">Entre com o seu WhatsApp ou e-mail</h1>

          <form onSubmit={submit} className="mt-7 grid gap-4 rounded-[1.75rem] bg-white p-4 text-[#10251C] shadow-2xl shadow-green-950/20 ring-1 ring-[#123D2C]/10 sm:p-5">
            <label className="grid min-w-0 gap-2">
              <span className="text-sm font-black text-[#123D2C]">WhatsApp ou e-mail</span>
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="block w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base text-[#123D2C] outline-none transition placeholder:text-slate-400 focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-100"
                placeholder="(19) 99999-9999 ou seu@email.com"
                autoComplete="username"
                required
              />
            </label>

            <label className="grid min-w-0 gap-2">
              <span className="text-sm font-black text-[#123D2C]">Senha</span>
              <div className="flex w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white focus-within:border-[#31C16B] focus-within:ring-4 focus-within:ring-emerald-100">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  className="block min-w-0 flex-1 bg-transparent px-4 py-4 text-base text-[#123D2C] outline-none placeholder:text-slate-400"
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  required
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="shrink-0 px-4 text-sm font-black text-[#123D2C]">
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </label>

            {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">{error}</p>}

            <button type="submit" disabled={loading} className="w-full rounded-2xl bg-[#123D2C] px-5 py-4 text-base font-black text-white shadow-lg shadow-green-950/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </article>
      </section>

      {firstAccessDestination && (
        <TucxaFirstAccessModal destination={firstAccessDestination} onCancel={() => void cancelFirstAccess()} />
      )}
    </main>
  );
}

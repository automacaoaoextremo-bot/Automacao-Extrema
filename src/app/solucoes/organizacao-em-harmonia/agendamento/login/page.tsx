"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const ACCESS_API = "/api/organizacao-em-harmonia/agendamento/acesso";
const FIRST_ACCESS = "/solucoes/organizacao-em-harmonia/agendamento/primeiro-acesso";

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

      const destination = result.profile.destination || "/solucoes/organizacao-em-harmonia/agendamento";
      window.location.replace(
        result.profile.onboardingRequired
          ? `${FIRST_ACCESS}?returnTo=${encodeURIComponent(destination)}`
          : destination,
      );
    } catch (submitError) {
      await supabaseBrowser.auth.signOut().catch(() => undefined);
      setError(submitError instanceof Error ? submitError.message : "Não foi possível entrar agora.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        navLabel="Login único do Agendamento"
        showSupport={false}
        actions={[
          { label: "Voltar", href: "/solucoes/organizacao-em-harmonia/agendamento", variant: "primary" },
          { label: "Ajuda", href: "#ajuda", variant: "secondary", action: "supportWhatsapp" },
        ]}
        mobileActionColumns={2}
        compactMobileActions
      />

      <section className="mx-auto max-w-2xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <article className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.23em] text-[#CFE2C7]">Um único acesso</p>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Entre e o sistema leva você para o lugar certo.</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#EEF7EA]">
            Este login atende Filhos de Fora/Consulentes e Filhos da Corrente. Use o WhatsApp ou e-mail cadastrado e sua senha.
          </p>

          <form onSubmit={submit} className="mt-5 grid gap-3 rounded-[1.6rem] bg-white p-4 text-[#10251C] sm:p-5">
            <label className="grid gap-2">
              <span className="text-sm font-black text-[#123D2C]">WhatsApp ou e-mail</span>
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="min-w-0 rounded-2xl border border-slate-200 px-4 py-4 outline-none focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-100"
                placeholder="(19) 99999-9999 ou seu@email.com"
                autoComplete="username"
                required
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-black text-[#123D2C]">Senha</span>
              <div className="flex overflow-hidden rounded-2xl border border-slate-200 focus-within:border-[#31C16B] focus-within:ring-4 focus-within:ring-emerald-100">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  className="min-w-0 flex-1 px-4 py-4 outline-none"
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  required
                />
                <button type="button" onClick={() => setShowPassword((current) => !current)} className="px-4 text-sm font-black text-[#123D2C]">
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </label>
            {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
            <button type="submit" disabled={loading} className="min-h-12 rounded-2xl bg-[#123D2C] px-5 font-black text-white disabled:opacity-60">
              {loading ? "Entrando..." : "Entrar no Agendamento"}
            </button>
            <p className="text-center text-xs font-semibold leading-5 text-slate-500">
              Primeiro acesso com senha temporária? Depois do login você confirmará seus dados, a ciência do Aviso de Privacidade e criará uma senha definitiva.
            </p>
          </form>
        </article>

        <p className="mt-4 text-center text-sm font-semibold text-slate-600">
          Ainda não tem cadastro como Consulente? A Recepção pode cadastrar você durante o piloto ou você pode usar o cadastro atual do Tucxa.
        </p>
        <Link href="/solucoes/organizacao-em-harmonia/tucxa/consulente/cadastro" className="mt-2 block text-center text-sm font-black text-[#123D2C] underline">
          Abrir cadastro de Consulente / Filho de Fora
        </Link>
      </section>
    </main>
  );
}

"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

type AccessResponse = {
  ok?: boolean;
  authEmail?: string;
  error?: string;
};

function targetAfterLogin() {
  if (typeof window === "undefined") return "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel";
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get("returnTo") || "";

  if (
    returnTo.startsWith("/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente") &&
    !returnTo.startsWith("//") &&
    !returnTo.includes("http://") &&
    !returnTo.includes("https://")
  ) {
    return returnTo;
  }

  return "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel";
}

export default function LoginFilhoDaCorrentePage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function resolveLoginEmail() {
    const value = identifier.trim();
    if (!value) throw new Error("Informe seu WhatsApp ou e-mail.");

    const response = await fetch("/api/organizacao-em-harmonia/filhos-corrente/acesso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve-login", identifier: value }),
    });
    const result = (await response.json()) as AccessResponse;

    if (!response.ok || !result.authEmail) {
      throw new Error(result.error || "Não foi possível localizar seu cadastro liberado pelo Tucxa.");
    }

    return result.authEmail;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const authEmail = await resolveLoginEmail();
      const { error: authError } = await supabaseBrowser.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (authError) {
        setError("Não foi possível entrar. Confira WhatsApp/e-mail e senha. Se seu acesso ainda não foi aprovado, acompanhe o status da validação.");
        return;
      }

      const { data: userData } = await supabaseBrowser.auth.getUser();
      const metadata = userData.user?.user_metadata ?? {};
      const profile = typeof metadata.oh_profile === "string" ? metadata.oh_profile : "";
      const status = typeof metadata.oh_access_status === "string" ? metadata.oh_access_status : "ativo";

      if (profile && profile !== "filho-da-corrente") {
        await supabaseBrowser.auth.signOut();
        setError("Este login é exclusivo para Filhos da Corrente. Gestores devem usar a área de cliente da Organização em Harmonia.");
        return;
      }

      if (status !== "ativo") {
        await supabaseBrowser.auth.signOut();
        setError("Seu acesso ainda não foi liberado pelo Tucxa. Aguarde a validação ou acompanhe o status da solicitação.");
        return;
      }

      window.location.href = targetAfterLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar agora.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={[
          { label: "Primeiro acesso", href: "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente#primeiro-acesso", variant: "secondary" },
          { label: "Acompanhar status", href: "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/status", variant: "secondary" },
          { label: "Site Tucxa", href: "/solucoes/organizacao-em-harmonia/tucxa", variant: "primary" },
        ]}
        navLabel="Acesso dos Filhos da Corrente do Tucxa"
      />

      <section className="mx-auto grid max-w-5xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <article className="rounded-[2rem] bg-[#123D2C] p-6 text-white shadow-xl shadow-green-900/10 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.26em] text-[#CFE2C7]">Área exclusiva</p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">Entrar como Filho da Corrente</h1>
          <p className="mt-4 leading-7 text-[#EEF7EA]">
            Este acesso mostra somente sua visão: Agenda Viva, orientações, documentos, funções, entidades e Corrente em Dia. Ele não libera a área de gestão do cliente.
          </p>
          <div className="mt-6 grid gap-3 text-sm font-bold">
            <p className="rounded-2xl bg-white/10 p-3">Use o WhatsApp ou e-mail validado pelo Tucxa.</p>
            <p className="rounded-2xl bg-white/10 p-3">A senha é a mesma criada no Primeiro Acesso.</p>
            <p className="rounded-2xl bg-white/10 p-3">Se ainda estiver aguardando aprovação, acompanhe o status da solicitação.</p>
          </div>
        </article>

        <article className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-[#123D2C]/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.26em] text-[#2F6B43]">Login seguro</p>
          <h2 className="mt-2 text-2xl font-black text-[#123D2C]">Acessar meu painel</h2>
          <form onSubmit={onSubmit} className="mt-5 grid gap-4">
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#00334E]">WhatsApp ou e-mail</span>
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="rounded-2xl border border-slate-200 p-4 text-base outline-none transition focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-100"
                placeholder="(19) 99999-9999 ou seu@email.com"
                autoComplete="username"
                required
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-black text-[#00334E]">Senha</span>
              <div className="flex rounded-2xl border border-slate-200 bg-white focus-within:border-[#31C16B] focus-within:ring-4 focus-within:ring-emerald-100">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  className="min-w-0 flex-1 rounded-2xl bg-transparent p-4 text-base outline-none"
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

            <button type="submit" disabled={loading} className="rounded-2xl bg-[#123D2C] px-5 py-4 text-base font-black text-white shadow-lg shadow-green-900/10 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Entrando..." : "Entrar no painel do Filho"}
            </button>
          </form>

          <div className="mt-5 grid gap-3 rounded-3xl bg-[#F7FAF2] p-4 text-sm font-semibold leading-6 text-slate-600 ring-1 ring-[#123D2C]/10">
            <p>Ainda não fez o primeiro acesso ou precisa atualizar dados?</p>
            <Link href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente#primeiro-acesso" className="inline-flex justify-center rounded-2xl bg-white px-5 py-3 font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">
              Confirmar meus dados
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}

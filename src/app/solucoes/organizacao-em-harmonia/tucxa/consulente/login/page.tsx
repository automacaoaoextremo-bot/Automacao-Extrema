"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

type LoginResponse = { ok?: boolean; authEmail?: string; error?: string };

type Destination = "atendimento" | "agenda" | "contribuicao";

function initialDestination(): Destination {
  if (typeof window === "undefined") return "atendimento";
  const destino = new URLSearchParams(window.location.search).get("destino");
  if (destino === "contribuicao") return "contribuicao";
  if (destino === "agenda") return "agenda";
  return "atendimento";
}

function safeReturnTo() {
  if (typeof window === "undefined") return "";
  const value = new URLSearchParams(window.location.search).get("returnTo") || "";
  const allowedBase = "/solucoes/organizacao-em-harmonia/tucxa/consulente/";
  return value.startsWith(allowedBase) && !value.startsWith("//") ? value : "";
}

const headerActions = [
  { label: "Voltar", href: "/solucoes/organizacao-em-harmonia/tucxa?semPopup=1#consulentes", variant: "secondary" as const },
];

export default function LoginConsulenteTucxaPage() {
  const [destination] = useState<Destination>(initialDestination);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function resolveAuthEmail() {
    const value = identifier.trim();
    if (!value) throw new Error("Informe seu WhatsApp ou e-mail.");

    const response = await fetch("/api/organizacao-em-harmonia/site-tucxa/consulentes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve-login", identifier: value }),
    });
    const result = (await response.json()) as LoginResponse;
    if (!response.ok || !result.authEmail) throw new Error(result.error || "Não foi possível localizar seu cadastro.");
    return result.authEmail;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!identifier.trim()) {
      setError("Informe o WhatsApp ou e-mail cadastrado.");
      return;
    }
    if (!password) {
      setError("Informe sua senha.");
      return;
    }

    setLoading(true);
    try {
      const authEmail = await resolveAuthEmail();
      const { data: authData, error: authError } = await supabaseBrowser.auth.signInWithPassword({ email: authEmail, password });
      if (authError || !authData.user) {
        throw new Error("Não foi possível entrar. Confira WhatsApp/e-mail e senha, ou use 'Esqueci minha senha'.");
      }

      const requestedReturn = safeReturnTo();
      const target = requestedReturn || (destination === "contribuicao"
        ? "/solucoes/organizacao-em-harmonia/tucxa/consulente/contribuicao?tipo=identificada"
        : destination === "agenda"
          ? "/solucoes/organizacao-em-harmonia/tucxa/consulente/painel/agenda-viva"
          : "/solucoes/organizacao-em-harmonia/tucxa/consulente/painel");
      const mustChangePassword = authData.user.user_metadata?.must_change_password === true;
      window.location.href = mustChangePassword
        ? `/solucoes/organizacao-em-harmonia/tucxa/consulente/trocar-senha?returnTo=${encodeURIComponent(target)}`
        : target;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar agora.");
      setLoading(false);
      setMessage("Caso seja seu primeiro acesso, faça o cadastro para liberar sua entrada automaticamente.");
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader actions={headerActions} navLabel="Login dos Filhos de Fora e Consulentes do Tucxa" />

      <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <article className="overflow-hidden rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.26em] text-[#CFE2C7]">Área exclusiva - Login seguro</p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">Entrar como Filho de Fora/Consulente</h1>

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
            {message && <p className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-800 ring-1 ring-amber-100">{message}</p>}

            <button type="submit" disabled={loading} className="w-full rounded-2xl bg-[#123D2C] px-5 py-4 text-base font-black text-white shadow-lg shadow-green-950/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Entrando..." : "Entrar no painel"}
            </button>

            <Link
              href="/solucoes/organizacao-em-harmonia/tucxa/consulente/esqueci-senha"
              className="block w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center text-base font-black text-[#123D2C] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#F7FAF2]"
            >
              Esqueci minha senha
            </Link>
          </form>
        </article>
      </section>
    </main>
  );
}

"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

type LoginResponse = { ok?: boolean; authEmail?: string; error?: string };

type Destination = "agenda" | "contribuicao";

function initialDestination(): Destination {
  if (typeof window === "undefined") return "agenda";
  return new URLSearchParams(window.location.search).get("destino") === "contribuicao" ? "contribuicao" : "agenda";
}

const headerActions = [
  { label: "É novo por aqui", href: "/solucoes/organizacao-em-harmonia/tucxa/consulente/novo", variant: "secondary" as const },
  { label: "Cadastrar meus dados", href: "/solucoes/organizacao-em-harmonia/tucxa/consulente/cadastro", variant: "primary" as const },
  { label: "Site do Tucxa", href: "/solucoes/organizacao-em-harmonia/tucxa", variant: "secondary" as const },
];

export default function LoginConsulenteTucxaPage() {
  const [destination, setDestination] = useState<Destination>(initialDestination);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function resolveAuthEmail() {
    const response = await fetch("/api/organizacao-em-harmonia/site-tucxa/consulentes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve-login", identifier }),
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
      const { error: authError } = await supabaseBrowser.auth.signInWithPassword({ email: authEmail, password });
      if (authError) {
        throw new Error("Não foi possível entrar. Confira WhatsApp/e-mail e senha, ou use 'Esqueci minha senha'.");
      }

      const target = destination === "contribuicao"
        ? "/solucoes/organizacao-em-harmonia/tucxa/consulente/contribuicao?tipo=identificada"
        : "/solucoes/organizacao-em-harmonia/tucxa/consulente/painel";
      window.location.href = target;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar agora.");
      setLoading(false);
      setMessage("Caso seja seu primeiro acesso, faça o cadastro e aguarde a validação da organização do Tucxa.");
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader actions={headerActions} navLabel="Menu de acesso do consulente" />

      <section className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="rounded-[1.75rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6">
          <p className="text-xs font-black tracking-[0.22em] text-[#2F6B43] sm:text-sm">Acesso do consulente</p>
          <h1 className="mt-2 text-2xl font-black text-[#123D2C] sm:text-3xl">Entre no Atendimento em Harmonia ou no Corrente em Dia.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
            Use este acesso depois que a organização do Tucxa validar seu cadastro. A senha é a mesma criada no primeiro cadastro.
          </p>

          <form onSubmit={submit} className="mt-5 grid gap-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => setDestination("agenda")} className={`rounded-2xl p-4 text-left font-black ring-1 transition ${destination === "agenda" ? "bg-[#E9F2E7] text-[#123D2C] ring-[#123D2C]/20" : "bg-white text-slate-600 ring-[#123D2C]/10"}`}>
                Atendimento em Harmonia
              </button>
              <button type="button" onClick={() => setDestination("contribuicao")} className={`rounded-2xl p-4 text-left font-black ring-1 transition ${destination === "contribuicao" ? "bg-[#E9F2E7] text-[#123D2C] ring-[#123D2C]/20" : "bg-white text-slate-600 ring-[#123D2C]/10"}`}>
                Corrente em Dia
              </button>
            </div>

            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">WhatsApp ou e-mail</span>
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="rounded-2xl border border-[#123D2C]/15 bg-white p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]"
                placeholder="seu@email.com ou (19) 99999-9999"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">Senha</span>
              <div className="flex rounded-2xl border border-[#123D2C]/15 bg-white focus-within:border-[#2F6B43] focus-within:ring-4 focus-within:ring-[#E9F2E7]">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  className="min-w-0 flex-1 rounded-2xl bg-transparent p-4 text-base outline-none"
                  placeholder="Digite sua senha"
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="shrink-0 px-4 text-sm font-black text-[#123D2C]">
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </label>

            {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
            {message && <p className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-800 ring-1 ring-amber-100">{message}</p>}

            <button disabled={loading} className="rounded-2xl bg-[#123D2C] px-5 py-4 text-base font-black text-white shadow-lg shadow-green-900/10 transition hover:-translate-y-0.5 disabled:opacity-60">
              {loading ? "Entrando..." : "Entrar"}
            </button>

            <Link href="/solucoes/organizacao-em-harmonia/tucxa/consulente/esqueci-senha" className="text-center text-sm font-black text-[#123D2C] underline underline-offset-4">
              Esqueci minha senha
            </Link>
          </form>
        </div>
      </section>
    </main>
  );
}

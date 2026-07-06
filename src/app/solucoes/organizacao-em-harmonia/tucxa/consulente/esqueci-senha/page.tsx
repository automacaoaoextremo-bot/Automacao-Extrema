"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const headerActions = [
  { label: "Entrar", href: "/solucoes/organizacao-em-harmonia/tucxa/consulente/login", variant: "primary" as const },
  { label: "É novo por aqui", href: "/solucoes/organizacao-em-harmonia/tucxa/consulente/novo", variant: "secondary" as const },
  { label: "Site do Tucxa", href: "/solucoes/organizacao-em-harmonia/tucxa", variant: "secondary" as const },
];

export default function EsqueciSenhaConsulentePage() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!identifier.trim()) {
      setError("Informe o e-mail cadastrado ou o WhatsApp para solicitar apoio da organização.");
      return;
    }

    setLoading(true);
    try {
      if (identifier.includes("@")) {
        const { error: resetError } = await supabaseBrowser.auth.resetPasswordForEmail(identifier.trim().toLowerCase(), {
          redirectTo: `${window.location.origin}/solucoes/organizacao-em-harmonia/tucxa/consulente/login`,
        });
        if (resetError) throw resetError;
        setMessage("Se este e-mail estiver cadastrado, você receberá um link para trocar a senha.");
      } else {
        const response = await fetch("/api/organizacao-em-harmonia/site-tucxa/consulentes/senha", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier }),
        });
        const result = (await response.json()) as { message?: string; error?: string };
        if (!response.ok) throw new Error(result.error || "Não foi possível solicitar apoio para troca de senha.");
        setMessage(result.message || "Solicitação enviada. A organização do Tucxa fará o retorno pelo WhatsApp informado.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível solicitar a troca de senha agora.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader actions={headerActions} navLabel="Menu de recuperação de senha do consulente" />

      <section className="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="rounded-[1.75rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6">
          <p className="text-xs font-black tracking-[0.22em] text-[#2F6B43] sm:text-sm">Troca de senha</p>
          <h1 className="mt-2 text-2xl font-black text-[#123D2C] sm:text-3xl">Recupere o acesso com segurança.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
            Informe seu e-mail cadastrado para receber um link de troca. Se você usa apenas WhatsApp, a organização do Tucxa recebe a solicitação e orienta o próximo passo.
          </p>

          <form onSubmit={submit} className="mt-5 grid gap-4">
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">E-mail ou WhatsApp</span>
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="rounded-2xl border border-[#123D2C]/15 bg-white p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]"
                placeholder="seu@email.com ou (19) 99999-9999"
              />
            </label>

            {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
            {message && <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}

            <button disabled={loading} className="rounded-2xl bg-[#123D2C] px-5 py-4 text-base font-black text-white shadow-lg shadow-green-900/10 transition hover:-translate-y-0.5 disabled:opacity-60">
              {loading ? "Enviando..." : "Solicitar troca de senha"}
            </button>

            <Link href="/solucoes/organizacao-em-harmonia/tucxa/consulente/login" className="text-center text-sm font-black text-[#123D2C] underline underline-offset-4">
              Voltar para o login
            </Link>
          </form>
        </div>
      </section>
    </main>
  );
}

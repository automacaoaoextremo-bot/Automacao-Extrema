"use client";

import { FormEvent, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

type AccessResponse = {
  authEmail?: string;
  error?: string;
};

async function resolveAuthEmail(identifier: string) {
  const value = identifier.trim();
  if (!value) throw new Error("Informe seu e-mail ou WhatsApp.");

  const response = await fetch("/api/organizacao-em-harmonia/filhos-corrente/acesso", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "resolve-login", identifier: value }),
  });
  const result = (await response.json()) as AccessResponse;
  if (!response.ok || !result.authEmail) throw new Error(result.error || "Não foi possível localizar seu cadastro liberado pelo Tucxa.");
  if (result.authEmail.endsWith("@organizacao-em-harmonia.local")) {
    throw new Error("Seu acesso foi criado pelo WhatsApp e ainda não possui e-mail real para recuperação automática. Procure a organização do Tucxa ou use o botão Dúvidas?.");
  }
  return result.authEmail;
}

export default function EsqueciSenhaFilhoDaCorrentePage() {
  const [identifier, setIdentifier] = useState("");
  const [loadingReset, setLoadingReset] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoadingReset(true);

    try {
      const authEmail = await resolveAuthEmail(identifier);
      const redirectTo = `${window.location.origin}/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/trocar-senha`;
      const { error: resetError } = await supabaseBrowser.auth.resetPasswordForEmail(authEmail, { redirectTo });
      if (resetError) throw resetError;
      setMessage("Enviamos um link seguro para o e-mail vinculado ao seu cadastro. Abra o link recebido para definir a nova senha.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o link de troca de senha.");
    } finally {
      setLoadingReset(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={[
          { label: "Voltar ao login", href: "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login", variant: "primary" },
          { label: "Site do Tucxa", href: "/solucoes/organizacao-em-harmonia/tucxa", variant: "secondary" },
        ]}
        navLabel="Menu de troca de senha do Tucxa"
      />

      <section className="mx-auto max-w-3xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="rounded-[1.75rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2F6B43]">Esqueci minha senha</p>
          <h1 className="mt-2 text-2xl font-black text-[#123D2C] sm:text-3xl">Solicite um link seguro para trocar a senha.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
            Informe seu e-mail ou WhatsApp. Por segurança, o sistema envia um link para o e-mail vinculado ao cadastro antes de liberar a criação da nova senha.
          </p>
          <p className="mt-2 rounded-2xl bg-[#F7FAF2] p-3 text-xs font-semibold leading-5 text-slate-600 ring-1 ring-[#123D2C]/10">
            Assim, ninguém consegue trocar a senha apenas sabendo o WhatsApp ou e-mail de um Filho da Corrente.
          </p>

          <form onSubmit={requestReset} className="mt-5 grid gap-4">
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">E-mail ou WhatsApp</span>
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="rounded-2xl border border-[#123D2C]/15 bg-white p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]"
                placeholder="seu@email.com ou (19) 99999-9999"
                required
              />
            </label>
            <button disabled={loadingReset} className="rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white shadow-lg shadow-green-900/10 transition hover:-translate-y-0.5 disabled:opacity-60">
              {loadingReset ? "Enviando..." : "Enviar link seguro de troca"}
            </button>
          </form>

          {(error || message) && (
            <div className="mt-4">
              {error && <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
              {message && <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

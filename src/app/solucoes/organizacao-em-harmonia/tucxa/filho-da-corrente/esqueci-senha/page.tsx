"use client";

import { FormEvent, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

type AccessResponse = {
  authEmail?: string;
  error?: string;
};

function isEmail(value: string) {
  return value.includes("@");
}

async function resolveAuthEmail(identifier: string) {
  const value = identifier.trim();
  if (!value) throw new Error("Informe seu e-mail ou WhatsApp.");
  if (isEmail(value)) return value.toLowerCase();

  const response = await fetch("/api/organizacao-em-harmonia/filhos-corrente/acesso", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "resolve-login", identifier: value }),
  });
  const result = (await response.json()) as AccessResponse;
  if (!response.ok || !result.authEmail) throw new Error(result.error || "Não foi possível localizar seu cadastro pelo WhatsApp.");
  return result.authEmail;
}

export default function EsqueciSenhaFilhoDaCorrentePage() {
  const [identifier, setIdentifier] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoadingReset(true);

    try {
      const authEmail = await resolveAuthEmail(identifier);
      const redirectTo = `${window.location.origin}/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/esqueci-senha`;
      const { error: resetError } = await supabaseBrowser.auth.resetPasswordForEmail(authEmail, { redirectTo });
      if (resetError) throw resetError;
      setMessage("Enviamos um link de troca de senha para o e-mail vinculado ao seu cadastro. Abra o link e volte a esta página para definir a nova senha.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o link de troca de senha.");
    } finally {
      setLoadingReset(false);
    }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (newPassword.length < 8) {
      setError("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("A confirmação da senha não confere.");
      return;
    }

    setLoadingUpdate(true);
    try {
      const { error: updateError } = await supabaseBrowser.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Senha atualizada com sucesso. Você já pode voltar e entrar com WhatsApp/e-mail e a nova senha.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível trocar a senha. Abra o link recebido por e-mail e tente novamente.");
    } finally {
      setLoadingUpdate(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={[
          { label: "Voltar ao login", href: "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente", variant: "primary" },
          { label: "Primeiro acesso", href: "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente#primeiro-acesso", variant: "secondary" },
          { label: "Site do Tucxa", href: "/solucoes/organizacao-em-harmonia/tucxa", variant: "secondary" },
        ]}
        navLabel="Menu de troca de senha do Tucxa"
      />

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-8">
        <div className="rounded-[1.75rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2F6B43]">Esqueci minha senha</p>
          <h1 className="mt-2 text-2xl font-black text-[#123D2C] sm:text-3xl">Receba um link para trocar a senha.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
            Informe seu e-mail ou WhatsApp. Se o cadastro já estiver vinculado a um e-mail, o sistema enviará um link seguro para troca da senha.
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
              {loadingReset ? "Enviando..." : "Enviar link de troca"}
            </button>
          </form>
        </div>

        <div className="rounded-[1.75rem] bg-[#E9F2E7] p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2F6B43]">Nova senha</p>
          <h2 className="mt-2 text-2xl font-black text-[#123D2C] sm:text-3xl">Depois de abrir o link, defina sua nova senha.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
            Ao clicar no link recebido por e-mail, volte para esta página e cadastre uma senha com pelo menos 8 caracteres.
          </p>

          <form onSubmit={updatePassword} className="mt-5 grid gap-4">
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">Nova senha</span>
              <div className="flex rounded-2xl border border-[#123D2C]/15 bg-white focus-within:border-[#2F6B43] focus-within:ring-4 focus-within:ring-[#DCEBDB]">
                <input
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  className="min-w-0 flex-1 rounded-2xl bg-transparent p-4 text-base outline-none"
                  placeholder="Mínimo 8 caracteres"
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="shrink-0 px-4 text-sm font-black text-[#123D2C]">
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">Confirmar nova senha</span>
              <input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                type={showPassword ? "text" : "password"}
                className="rounded-2xl border border-[#123D2C]/15 bg-white p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#DCEBDB]"
                placeholder="Digite novamente"
              />
            </label>
            <button disabled={loadingUpdate} className="rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white shadow-lg shadow-green-900/10 transition hover:-translate-y-0.5 disabled:opacity-60">
              {loadingUpdate ? "Salvando..." : "Trocar senha"}
            </button>
          </form>
        </div>

        {(error || message) && (
          <div className="lg:col-span-2">
            {error && <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
            {message && <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}
          </div>
        )}
      </section>
    </main>
  );
}

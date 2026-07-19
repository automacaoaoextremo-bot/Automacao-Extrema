"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AeSolutionHeader } from "@/components/ae-solution-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const CLIENT_HOME = "/solucoes/organizacao-em-harmonia/cliente";
const CLIENT_LOGIN = "/solucoes/organizacao-em-harmonia/login";
const CLIENT_PASSWORD_RESET = "/solucoes/organizacao-em-harmonia/login/trocar-senha";

function isEmail(value: string) {
  return value.includes("@");
}

function normalizeClientReturnTo(rawValue: string | null) {
  if (typeof window === "undefined") return CLIENT_HOME;
  const raw = (rawValue || "").trim();
  if (!raw) return CLIENT_HOME;
  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.origin !== window.location.origin) return CLIENT_HOME;
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (path.startsWith(CLIENT_HOME) && !path.startsWith(CLIENT_LOGIN) && !path.startsWith("//")) return path;
  } catch {
    return CLIENT_HOME;
  }
  return CLIENT_HOME;
}

function safeReturnTo() {
  if (typeof window === "undefined") return CLIENT_HOME;
  const params = new URLSearchParams(window.location.search);
  const fromUrl = normalizeClientReturnTo(params.get("returnTo"));
  if (fromUrl !== CLIENT_HOME) {
    window.sessionStorage.setItem("oh_client_return_to", fromUrl);
    return fromUrl;
  }
  return normalizeClientReturnTo(window.sessionStorage.getItem("oh_client_return_to"));
}

function consumeSafeReturnTo() {
  const destination = safeReturnTo();
  if (typeof window !== "undefined") window.sessionStorage.removeItem("oh_client_return_to");
  return destination;
}

function passwordResetRedirectUrl() {
  if (typeof window === "undefined") return CLIENT_LOGIN;
  const returnTo = safeReturnTo();
  const params = new URLSearchParams();
  if (returnTo !== CLIENT_HOME) params.set("returnTo", returnTo);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return `${window.location.origin}${CLIENT_PASSWORD_RESET}${suffix}`;
}

export default function OrganizacaoEmHarmoniaLoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordLoading, setNewPasswordLoading] = useState(false);
  const [newPasswordMessage, setNewPasswordMessage] = useState("");

  useEffect(() => {
    const { data } = supabaseBrowser.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
        setResetMessage("Link validado. Defina uma nova senha para continuar.");
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      supabaseBrowser.auth.getUser().then(async ({ data }) => {
        if (!active || !data.user) return;
        const metadata = data.user.user_metadata ?? {};
        if (metadata.oh_profile === "filho-da-corrente" || metadata.oh_profile === "consulente") {
          await supabaseBrowser.auth.signOut();
          if (active) setError("Este acesso é exclusivo dos responsáveis pela organização. Use a área própria do TUCXA.");
          return;
        }
        const destination = safeReturnTo();
        const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (destination !== current) window.location.replace(destination);
      });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResetMessage("");
    setLoading(true);
    try {
      const authEmail = identifier.trim().toLowerCase();
      if (!authEmail || !isEmail(authEmail)) throw new Error("Informe o e-mail do responsável pela organização.");
      const { error: authError } = await supabaseBrowser.auth.signInWithPassword({ email: authEmail, password });
      if (authError) throw new Error("Não foi possível entrar. Confira e-mail e senha ou use Esqueci minha senha.");
      const { data: userData } = await supabaseBrowser.auth.getUser();
      const metadata = userData.user?.user_metadata ?? {};
      if (metadata.oh_profile === "filho-da-corrente" || metadata.oh_profile === "consulente") {
        await supabaseBrowser.auth.signOut();
        throw new Error("Este acesso é exclusivo dos responsáveis pela organização. Use a área própria do TUCXA.");
      }
      window.location.href = consumeSafeReturnTo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar agora.");
      setLoading(false);
    }
  }

  async function requestPasswordReset() {
    setError("");
    setResetMessage("");
    const value = identifier.trim().toLowerCase();
    if (!value) {
      setResetMessage("Informe seu e-mail no campo acima e clique novamente em Esqueci minha senha.");
      return;
    }
    if (!isEmail(value)) {
      setResetMessage("Para redefinir a senha, informe o e-mail de responsável cadastrado.");
      return;
    }
    setResetLoading(true);
    const { error: resetError } = await supabaseBrowser.auth.resetPasswordForEmail(value, { redirectTo: passwordResetRedirectUrl() });
    setResetLoading(false);
    setResetMessage(resetError
      ? "Não foi possível enviar o link. Confira o e-mail ou fale com a Automação Extrema."
      : "Enviamos um link de redefinição, caso este e-mail esteja cadastrado.");
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNewPasswordMessage("");
    if (newPassword.length < 8) {
      setNewPasswordMessage("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    setNewPasswordLoading(true);
    const { error: updateError } = await supabaseBrowser.auth.updateUser({ password: newPassword });
    setNewPasswordLoading(false);
    if (updateError) {
      setNewPasswordMessage("Não foi possível atualizar a senha. Solicite um novo link.");
      return;
    }
    setNewPasswordMessage("Senha atualizada com sucesso.");
    setRecoveryMode(false);
    setPassword("");
    setNewPassword("");
    window.setTimeout(() => {
      window.location.href = consumeSafeReturnTo();
    }, 500);
  }

  return (
    <main className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <AeSolutionHeader
        solutionName="Organização em Harmonia"
        logoSrc="/organizacao-em-harmonia-logo.svg"
        logoAlt="Logo Organização em Harmonia"
        actions={[]}
        sectionLinks={[]}
        topAction={
          <Link href="/solucoes/organizacao-em-harmonia" className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#31C16B]/30 bg-[#31C16B] px-4 py-2 text-sm font-black text-[#00334E] shadow-md shadow-emerald-200/70 transition hover:-translate-y-0.5 hover:bg-[#43db7c]">
            ← Voltar
          </Link>
        }
      />

      <section className="mx-auto max-w-3xl px-4 py-5 lg:py-8">
        <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-slate-100 sm:p-7">
          <div className="space-y-3">
            <p className="text-sm font-black uppercase tracking-[0.28em] text-[#2F6B43]">Já sou cliente</p>
            <h1 className="text-3xl font-black text-[#00334E]">Acessar Organização em Harmonia</h1>
            <p className="text-base leading-7 text-slate-700">Área exclusiva para o responsável pela organização.</p>
          </div>

          {recoveryMode && (
            <form onSubmit={updatePassword} className="mt-5 rounded-[1.5rem] bg-emerald-50 p-4 ring-1 ring-emerald-100 sm:p-5">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2F6B43]">Redefinir senha</p>
              <h2 className="mt-2 text-2xl font-black text-[#00334E]">Criar nova senha</h2>
              <label className="mt-5 block">
                <span className="text-sm font-bold text-slate-700">Nova senha</span>
                <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" autoComplete="new-password" className="mt-2 w-full rounded-2xl border border-slate-300 bg-white p-4 text-base outline-none transition focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-100" placeholder="Digite a nova senha" required />
              </label>
              {newPasswordMessage && <p className="mt-4 rounded-2xl bg-white p-3 text-sm font-bold text-emerald-800">{newPasswordMessage}</p>}
              <button type="submit" disabled={newPasswordLoading} className="mt-5 w-full rounded-2xl bg-[#31C16B] px-5 py-4 text-base font-black text-[#00334E] shadow-lg shadow-emerald-200 ring-2 ring-[#31C16B]/20 transition hover:-translate-y-0.5 hover:bg-[#43db7c] disabled:opacity-60">
                {newPasswordLoading ? "Atualizando..." : "Atualizar senha"}
              </button>
            </form>
          )}

          <form onSubmit={onSubmit} className="mt-5">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">E-mail do responsável</span>
              <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} type="email" autoComplete="username" className="mt-2 w-full rounded-2xl border border-slate-300 bg-white p-4 text-base outline-none transition focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-100" placeholder="responsavel@email.com" required />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-bold text-slate-700">Senha</span>
              <div className="mt-2 flex rounded-2xl border border-slate-300 bg-white focus-within:border-[#31C16B] focus-within:ring-4 focus-within:ring-emerald-100">
                <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} autoComplete="current-password" className="min-w-0 flex-1 rounded-2xl bg-transparent p-4 text-base outline-none" placeholder="Digite a senha" required />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="shrink-0 px-4 text-sm font-black text-[#00334E]">{showPassword ? "Ocultar" : "Mostrar"}</button>
              </div>
            </label>

            {error && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
            {resetMessage && <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{resetMessage}</p>}

            <button type="submit" disabled={loading} className="mt-6 w-full rounded-2xl bg-[#31C16B] px-5 py-4 text-base font-black text-[#00334E] shadow-lg shadow-emerald-200 ring-2 ring-[#31C16B]/20 transition hover:-translate-y-0.5 hover:bg-[#43db7c] disabled:opacity-60">
              {loading ? "Entrando..." : "Entrar no painel"}
            </button>
            <button type="button" onClick={requestPasswordReset} disabled={resetLoading} className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#00334E] transition hover:-translate-y-0.5 hover:border-[#31C16B] hover:bg-emerald-50 disabled:opacity-60">
              {resetLoading ? "Enviando link..." : "Esqueci minha senha"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

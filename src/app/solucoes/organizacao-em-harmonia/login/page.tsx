"use client";

import { FormEvent, useEffect, useState } from "react";
import { OrganizacaoPublicHeader } from "@/components/organizacao-em-harmonia/organizacao-public-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const CLIENT_HOME = "/solucoes/organizacao-em-harmonia/cliente";
const CLIENT_LOGIN = "/solucoes/organizacao-em-harmonia/login";
const CLIENT_PASSWORD_RESET = "/solucoes/organizacao-em-harmonia/login/trocar-senha";
const AE_HELP_WHATSAPP = `https://wa.me/5519989848246?text=${encodeURIComponent(
  "Olá, preciso de ajuda com a Organização em Harmonia.",
)}`;

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
    <main id="inicio" className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <OrganizacaoPublicHeader
        actions={[{ label: "Ajuda", href: AE_HELP_WHATSAPP, variant: "primary" }]}
        backFallbackHref="/solucoes/organizacao-em-harmonia"
      />

      <section className="mx-auto max-w-2xl px-2.5 py-1.5 sm:px-4 sm:py-4 lg:py-6">
        <div className="rounded-[1.25rem] bg-white p-2.5 shadow-xl ring-1 ring-slate-100 sm:rounded-[2rem] sm:p-6">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#2F6B43] sm:text-xs">Já sou cliente</p>
            <h1 className="mt-0.5 text-xl font-black leading-tight text-[#00334E] sm:mt-1 sm:text-3xl">Acessar Organização em Harmonia</h1>
            <p className="mt-0.5 text-[10px] font-semibold leading-4 text-slate-600 sm:mt-2 sm:text-sm">Área exclusiva para o responsável pela organização.</p>
          </div>

          {recoveryMode && (
            <form onSubmit={updatePassword} className="mt-2 rounded-xl bg-emerald-50 p-2.5 ring-1 ring-emerald-100 sm:mt-4 sm:rounded-2xl sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#2F6B43] sm:text-xs">Redefinir senha</p>
                  <h2 className="text-base font-black text-[#00334E] sm:text-xl">Criar nova senha</h2>
                </div>
              </div>
              <label className="mt-2 block">
                <span className="text-[10px] font-bold text-slate-700 sm:text-sm">Nova senha</span>
                <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" autoComplete="new-password" className="mt-0.5 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none transition focus:border-[#31C16B] focus:ring-2 focus:ring-emerald-100 sm:mt-1 sm:rounded-2xl sm:p-3" placeholder="Mínimo de 8 caracteres" required />
              </label>
              {newPasswordMessage && <p className="mt-1.5 rounded-xl bg-white p-2 text-[10px] font-bold leading-4 text-emerald-800 sm:mt-3 sm:text-sm">{newPasswordMessage}</p>}
              <button type="submit" disabled={newPasswordLoading} className="mt-2 w-full rounded-xl bg-[#31C16B] px-4 py-2.5 text-sm font-black text-[#00334E] shadow-sm transition hover:bg-[#43db7c] disabled:opacity-60 sm:mt-4 sm:rounded-2xl sm:py-3">
                {newPasswordLoading ? "Atualizando..." : "Atualizar senha"}
              </button>
            </form>
          )}

          <form onSubmit={onSubmit} className="mt-2.5 sm:mt-4">
            <label className="block">
              <span className="text-[10px] font-bold text-slate-700 sm:text-sm">E-mail do responsável</span>
              <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} type="email" autoComplete="username" className="mt-0.5 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none transition focus:border-[#31C16B] focus:ring-2 focus:ring-emerald-100 sm:mt-1 sm:rounded-2xl sm:p-3" placeholder="responsavel@email.com" required />
            </label>

            <label className="mt-2 block sm:mt-3">
              <span className="text-[10px] font-bold text-slate-700 sm:text-sm">Senha</span>
              <div className="mt-0.5 flex rounded-xl border border-slate-300 bg-white focus-within:border-[#31C16B] focus-within:ring-2 focus-within:ring-emerald-100 sm:mt-1 sm:rounded-2xl">
                <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} autoComplete="current-password" className="min-w-0 flex-1 rounded-xl bg-transparent px-2.5 py-2 text-sm outline-none sm:rounded-2xl sm:p-3" placeholder="Digite a senha" required />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="shrink-0 px-3 text-[10px] font-black text-[#00334E] sm:px-4 sm:text-sm">{showPassword ? "Ocultar" : "Mostrar"}</button>
              </div>
            </label>

            {error && <p className="mt-2 rounded-xl bg-red-50 p-2 text-[10px] font-bold leading-4 text-red-700 sm:mt-3 sm:text-sm">{error}</p>}
            {resetMessage && <p className="mt-2 rounded-xl bg-emerald-50 p-2 text-[10px] font-bold leading-4 text-emerald-800 sm:mt-3 sm:text-sm">{resetMessage}</p>}

            <div className="mt-2.5 grid grid-cols-2 gap-2 sm:mt-4">
              <button type="submit" disabled={loading} className="rounded-xl bg-[#31C16B] px-3 py-2.5 text-sm font-black text-[#00334E] shadow-sm transition hover:bg-[#43db7c] disabled:opacity-60 sm:rounded-2xl sm:px-5 sm:py-3">
                {loading ? "Entrando..." : "Entrar no painel"}
              </button>
              <button type="button" onClick={requestPasswordReset} disabled={resetLoading} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-black text-[#00334E] transition hover:border-[#31C16B] hover:bg-emerald-50 disabled:opacity-60 sm:rounded-2xl sm:px-5 sm:py-3 sm:text-sm">
                {resetLoading ? "Enviando..." : "Esqueci minha senha"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

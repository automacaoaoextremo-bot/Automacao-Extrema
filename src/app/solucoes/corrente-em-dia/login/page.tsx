"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AeSolutionHeader } from "@/components/ae-solution-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function CorrenteEmDiaClientLoginPage() {
  const [email, setEmail] = useState("");
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

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabaseBrowser.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError("Não foi possível entrar. Confira e-mail e senha do cliente Corrente em Dia.");
      setLoading(false);
      return;
    }

    window.location.href = "/solucoes/corrente-em-dia/cliente";
  }

  async function requestPasswordReset() {
    setError("");
    setResetMessage("");

    if (!email.trim()) {
      setResetMessage("Informe seu e-mail no campo acima e clique novamente em Esqueci minha senha.");
      return;
    }

    setResetLoading(true);
    const { error: resetError } = await supabaseBrowser.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/solucoes/corrente-em-dia/login`,
    });
    setResetLoading(false);

    if (resetError) {
      setResetMessage("Não foi possível enviar o link de redefinição. Confira o e-mail ou fale com o responsável pela organização.");
      return;
    }

    setResetMessage("Enviamos um link de redefinição para este e-mail, se ele estiver cadastrado no Corrente em Dia.");
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
      setNewPasswordMessage("Não foi possível atualizar a senha. Solicite um novo link de redefinição.");
      return;
    }

    setNewPasswordMessage("Senha atualizada com sucesso. Você já pode acessar o painel do Corrente em Dia.");
    setRecoveryMode(false);
    setPassword("");
    setNewPassword("");
  }

  return (
    <main className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <AeSolutionHeader
        solutionName="Corrente em Dia"
        logoSrc="/corrente-em-dia-logo.svg"
        logoAlt="Logo Corrente em Dia"
        actions={[]}
        sectionLinks={[]}
        topAction={
          <Link
            href="/solucoes/corrente-em-dia"
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#31C16B]/30 bg-[#31C16B] px-4 py-2 text-sm font-black text-[#00334E] shadow-md shadow-emerald-200/70 transition hover:-translate-y-0.5 hover:bg-[#43db7c]"
          >
            ← Voltar
          </Link>
        }
      />

      <section className="mx-auto max-w-3xl px-4 py-5 lg:py-8">
        <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-slate-100 sm:p-7">
          <div className="space-y-3">
            <p className="text-sm font-black uppercase tracking-[0.28em] text-[#2F6B43]">Área do cliente - login</p>
            <p className="text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
              Acesse para acompanhar contribuições, comprovantes e informações de gestão. Cada perfil visualiza apenas o que corresponde ao seu papel na organização, com mais clareza, confiança e cuidado com os dados pessoais.
            </p>
          </div>

          {recoveryMode && (
            <form onSubmit={updatePassword} className="mt-5 rounded-[1.5rem] bg-emerald-50 p-4 ring-1 ring-emerald-100 sm:p-5">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2F6B43]">Redefinir senha</p>
              <h2 className="mt-2 text-2xl font-black text-[#00334E]">Criar nova senha</h2>
              <label className="mt-5 block">
                <span className="text-sm font-bold text-slate-700">Nova senha</span>
                <input
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  type="password"
                  autoComplete="new-password"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white p-4 text-base outline-none transition focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-100"
                  placeholder="Digite a nova senha"
                  required
                />
              </label>
              {newPasswordMessage && <p className="mt-4 rounded-2xl bg-white p-3 text-sm font-bold text-emerald-800">{newPasswordMessage}</p>}
              <button
                type="submit"
                disabled={newPasswordLoading}
                className="mt-5 w-full rounded-2xl bg-[#31C16B] px-5 py-4 text-base font-black text-[#00334E] shadow-lg shadow-emerald-200 ring-2 ring-[#31C16B]/20 transition hover:-translate-y-0.5 hover:bg-[#43db7c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {newPasswordLoading ? "Atualizando..." : "Atualizar senha"}
              </button>
            </form>
          )}

          <form onSubmit={onSubmit} className="mt-5">
            <h1 className="text-3xl font-black text-[#00334E]">Acessar painel</h1>

            <label className="mt-6 block">
              <span className="text-sm font-bold text-slate-700">E-mail</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white p-4 text-base outline-none transition focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-100"
                placeholder="email@organizacao.com.br"
                required
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-bold text-slate-700">Senha</span>
              <div className="mt-2 flex rounded-2xl border border-slate-300 bg-white focus-within:border-[#31C16B] focus-within:ring-4 focus-within:ring-emerald-100">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="min-w-0 flex-1 rounded-2xl bg-transparent p-4 text-base outline-none"
                  placeholder="Digite a senha"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="shrink-0 px-4 text-sm font-black text-[#00334E]"
                >
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </label>

            {error && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
            {resetMessage && <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{resetMessage}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-2xl bg-[#31C16B] px-5 py-4 text-base font-black text-[#00334E] shadow-lg shadow-emerald-200 ring-2 ring-[#31C16B]/20 transition hover:-translate-y-0.5 hover:bg-[#43db7c] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Entrar no painel"}
            </button>

            <button
              type="button"
              onClick={requestPasswordReset}
              disabled={resetLoading}
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#00334E] transition hover:-translate-y-0.5 hover:border-[#31C16B] hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resetLoading ? "Enviando link..." : "Esqueci minha senha"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

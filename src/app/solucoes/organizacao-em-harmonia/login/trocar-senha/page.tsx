"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AeSolutionHeader } from "@/components/ae-solution-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const CLIENT_HOME = "/solucoes/organizacao-em-harmonia/cliente";
const CLIENT_LOGIN = "/solucoes/organizacao-em-harmonia/login";

function targetAfterReset() {
  if (typeof window === "undefined") return CLIENT_HOME;
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get("returnTo") || "";
  if (returnTo.startsWith(CLIENT_HOME) && !returnTo.startsWith("//") && !returnTo.includes("http://") && !returnTo.includes("https://")) {
    return returnTo;
  }
  return CLIENT_HOME;
}

export default function TrocarSenhaOrganizacaoPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("Validando link de redefinição...");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const { data } = supabaseBrowser.auth.onAuthStateChange((event) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
        setMessage("Link validado. Crie uma nova senha para continuar.");
      }
    });

    supabaseBrowser.auth.getSession().then(({ data: sessionData }) => {
      if (!active) return;
      if (sessionData.session) {
        setReady(true);
        setMessage("Link validado. Crie uma nova senha para continuar.");
      } else {
        setMessage("Abra esta página pelo link recebido no e-mail de redefinição de senha.");
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("A confirmação da senha não confere.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabaseBrowser.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError("Não foi possível atualizar a senha. Solicite um novo link de redefinição.");
      return;
    }

    setMessage("Senha atualizada com sucesso. Redirecionando para o painel...");
    window.setTimeout(() => {
      window.location.href = targetAfterReset();
    }, 700);
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
          <Link href={CLIENT_LOGIN} className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#31C16B]/30 bg-[#31C16B] px-4 py-2 text-sm font-black text-[#00334E] shadow-md shadow-emerald-200/70 transition hover:-translate-y-0.5 hover:bg-[#43db7c]">
            ← Voltar ao login
          </Link>
        }
      />

      <section className="mx-auto max-w-2xl px-4 py-8">
        <form onSubmit={onSubmit} className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-100 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-[#2F6B43]">Nova senha</p>
          <h1 className="mt-2 text-3xl font-black text-[#00334E]">Trocar senha</h1>
          {message && <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</p>}
          {error && <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}

          <label className="mt-6 block">
            <span className="text-sm font-bold text-slate-700">Nova senha</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="new-password"
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white p-4 text-base outline-none transition focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-100"
              placeholder="Mínimo 8 caracteres"
              required
              disabled={!ready || loading}
            />
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-bold text-slate-700">Confirmar nova senha</span>
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              autoComplete="new-password"
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white p-4 text-base outline-none transition focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-100"
              placeholder="Digite novamente"
              required
              disabled={!ready || loading}
            />
          </label>

          <button type="submit" disabled={!ready || loading} className="mt-6 w-full rounded-2xl bg-[#31C16B] px-5 py-4 text-base font-black text-[#00334E] shadow-lg shadow-emerald-200 ring-2 ring-[#31C16B]/20 transition hover:-translate-y-0.5 hover:bg-[#43db7c] disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? "Atualizando..." : "Atualizar senha"}
          </button>
        </form>
      </section>
    </main>
  );
}

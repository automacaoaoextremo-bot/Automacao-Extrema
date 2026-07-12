"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AeSolutionHeader } from "@/components/ae-solution-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const CLIENT_LOGIN = "/solucoes/organizacao-em-harmonia/login";
const CLIENT_PASSWORD_RESET = "/solucoes/organizacao-em-harmonia/login/trocar-senha";

function redirectUrl() {
  if (typeof window === "undefined") return CLIENT_PASSWORD_RESET;
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get("returnTo") || "";
  const safeReturnTo = returnTo.startsWith("/solucoes/organizacao-em-harmonia/cliente") && !returnTo.startsWith("//") ? returnTo : "";
  const suffix = safeReturnTo ? `?returnTo=${encodeURIComponent(safeReturnTo)}` : "";
  return `${window.location.origin}${CLIENT_PASSWORD_RESET}${suffix}`;
}

export default function EsqueciSenhaOrganizacaoPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const value = email.trim().toLowerCase();
    if (!value || !value.includes("@")) {
      setError("Informe o e-mail de gestor cadastrado na Organização em Harmonia.");
      return;
    }

    setLoading(true);
    const { error: resetError } = await supabaseBrowser.auth.resetPasswordForEmail(value, {
      redirectTo: redirectUrl(),
    });
    setLoading(false);

    if (resetError) {
      setError("Não foi possível enviar o link de redefinição agora. Confira o e-mail ou tente novamente em alguns minutos.");
      return;
    }

    setMessage("Se este e-mail estiver cadastrado, você receberá um link para trocar a senha. Verifique também spam/lixo eletrônico.");
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
          <p className="text-sm font-black uppercase tracking-[0.28em] text-[#2F6B43]">Recuperar acesso</p>
          <h1 className="mt-2 text-3xl font-black text-[#00334E]">Esqueci minha senha</h1>
          <p className="mt-3 leading-7 text-slate-700">
            Informe o e-mail de gestor da Organização em Harmonia. Enviaremos um link seguro para criar uma nova senha.
          </p>

          <label className="mt-6 block">
            <span className="text-sm font-bold text-slate-700">E-mail de gestor</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white p-4 text-base outline-none transition focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-100"
              placeholder="seu@email.com"
              required
            />
          </label>

          {error && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          {message && <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</p>}

          <button type="submit" disabled={loading} className="mt-6 w-full rounded-2xl bg-[#31C16B] px-5 py-4 text-base font-black text-[#00334E] shadow-lg shadow-emerald-200 ring-2 ring-[#31C16B]/20 transition hover:-translate-y-0.5 hover:bg-[#43db7c] disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? "Enviando..." : "Enviar link de redefinição"}
          </button>
        </form>
      </section>
    </main>
  );
}

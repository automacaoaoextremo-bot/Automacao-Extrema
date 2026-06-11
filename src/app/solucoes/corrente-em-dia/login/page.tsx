"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AeSolutionHeader } from "@/components/ae-solution-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function CorrenteEmDiaClientLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <main className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <AeSolutionHeader
        solutionName="Corrente em Dia"
        logoSrc="/corrente-em-dia-logo.svg"
        logoAlt="Logo Corrente em Dia"
        actions={[]}
        sectionLinks={[]}
      />

      <section className="mx-auto grid max-w-5xl gap-8 px-4 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-12">
        <div className="space-y-5">
          <div className="flex justify-end">
            <Link
              href="/solucoes/corrente-em-dia"
              className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#00334E] shadow-sm transition hover:-translate-y-0.5 hover:border-[#31C16B] hover:bg-emerald-50"
            >
              ← Voltar
            </Link>
          </div>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#2F6B43]">Área do cliente</p>
          <h1 className="text-4xl font-black leading-tight text-[#00334E]">Entrar no Corrente em Dia</h1>
          <p className="text-lg leading-8 text-slate-700">
            Acesso para federações, associações, terreiros e responsáveis autorizados acompanharem arrecadações, contribuições, comprovantes e condições de Cliente Fundador.
          </p>
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <p className="font-black text-[#00334E]">Usuários de teste</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Crie um usuário no Supabase Authentication com o mesmo e-mail de uma pessoa fictícia, por exemplo <strong>rita.menezes@exemplo.com</strong> ou <strong>paulo.nogueira@exemplo.com</strong>, e defina uma senha de teste. O painel localizará a pessoa pelo e-mail do login.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="rounded-[2rem] bg-white p-5 shadow-xl sm:p-7">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2F6B43]">Login do cliente</p>
          <h2 className="mt-2 text-3xl font-black text-[#00334E]">Acessar painel</h2>

          <label className="mt-6 block">
            <span className="text-sm font-bold text-slate-700">E-mail</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white p-4 text-base outline-none transition focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-100"
              placeholder="rita.menezes@exemplo.com"
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

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-2xl bg-[#31C16B] px-5 py-4 text-base font-black text-[#00334E] shadow-lg shadow-emerald-200 ring-2 ring-[#31C16B]/20 transition hover:-translate-y-0.5 hover:bg-[#43db7c] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar no Corrente em Dia"}
          </button>

          <p className="mt-4 text-center text-sm leading-6 text-slate-500">
            Esqueceu a senha? Solicite a redefinição para a Automação Extrema ou para o responsável pela organização durante o piloto.
          </p>
        </form>
      </section>
    </main>
  );
}

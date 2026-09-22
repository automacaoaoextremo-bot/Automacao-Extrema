"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CAIXA_CLARO_BASE, CAIXA_CLARO_LOGIN, CAIXA_CLARO_SILVAMATTANO } from "@/lib/caixa-claro";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function CaixaClaroLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void supabaseBrowser.auth.getSession().then((result) => {
      if (result.data.session) router.replace(CAIXA_CLARO_SILVAMATTANO);
    });
  }, [router]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const { error } = await supabaseBrowser.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setMessage("E-mail ou senha inválidos. Se este for o primeiro acesso, confirme com o responsável se seu usuário já foi criado e vinculado à família.");
      setLoading(false);
      return;
    }
    router.replace(CAIXA_CLARO_SILVAMATTANO);
  }

  async function sendReset() {
    if (!email.trim()) {
      setMessage("Informe seu e-mail para solicitar a troca de senha.");
      return;
    }
    const redirectTo = `${window.location.origin}${CAIXA_CLARO_LOGIN}`;
    const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setMessage(error ? error.message : "Se o e-mail estiver cadastrado, o Supabase enviará as instruções de recuperação.");
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#00334E] px-4 py-8">
      <section className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <Link href={CAIXA_CLARO_BASE}>
          <Image src="/caixa-claro/logo-caixa-claro.svg" alt="Caixa Claro" width={640} height={180} className="w-full rounded-2xl bg-white" priority />
        </Link>
        <p className="mt-5 text-center text-sm font-black uppercase tracking-[0.18em] text-[#00A8CC]">Família SilvaMattano</p>
        <h1 className="mt-2 text-center text-2xl font-black text-[#00334E]">Acesso individual</h1>
        <p className="mt-2 text-center text-sm leading-6 text-slate-600">Cada membro utiliza seu próprio e-mail e senha. As senhas ficam somente no Supabase Auth.</p>

        <form onSubmit={signIn} className="mt-6 space-y-3">
          <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Seu e-mail" className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#00A8CC] focus:ring-2 focus:ring-[#00A8CC]/15" />
          <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha" className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#00A8CC] focus:ring-2 focus:ring-[#00A8CC]/15" />
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#31C16B] px-4 py-3 font-black text-[#00334E] disabled:opacity-50">{loading ? "Entrando…" : "Entrar"}</button>
        </form>

        <button type="button" onClick={() => void sendReset()} className="mt-4 w-full text-sm font-bold text-[#00A8CC] underline underline-offset-4">Esqueci / quero trocar minha senha</button>
        {message ? <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm leading-6 text-slate-700">{message}</p> : null}
      </section>
    </main>
  );
}

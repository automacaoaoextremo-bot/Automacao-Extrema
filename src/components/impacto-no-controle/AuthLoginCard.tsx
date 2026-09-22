"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PublicHeader } from "@/components/impacto-no-controle/PublicHeader";
import { createSupabaseBrowserClient } from "@/lib/impacto-no-controle/supabase/browser";

type Props = {
  title: string;
  description: string;
  defaultEmail?: string;
  backHref?: string;
};

export function AuthLoginCard({ title, description, defaultEmail = "", backHref = "/solucoes/impacto-no-controle" }: Props) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function login() {
    setError(null);
    setInfo(null);
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) return setError("Não foi possível entrar. Verifique e-mail e senha.");
    router.push("/solucoes/impacto-no-controle/gestao");
  }

  async function forgotPassword() {
    setError(null);
    setInfo(null);
    if (!email.trim()) return setError("Informe o e-mail para receber as instruções de redefinição de senha.");
    setResetLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/solucoes/impacto-no-controle/redefinir-senha`,
    });
    setResetLoading(false);
    if (resetError) return setError("Não foi possível solicitar a recuperação agora. Tente novamente em instantes.");
    setInfo("Se este e-mail estiver cadastrado, as instruções de redefinição de senha serão enviadas.");
  }

  return (
    <>
      <PublicHeader showAccessLinks={false} />
      <main className="container-page grid min-h-[calc(100vh-74px)] place-items-center py-6">
        <div className="card w-full max-w-md p-6">
          <Link href={backHref} className="text-sm font-bold text-[var(--brand)]">← Voltar</Link>
          <h1 className="mt-4 text-3xl font-black text-[var(--brand-dark)]">{title}</h1>
          <p className="mt-2 text-[var(--muted)]">{description}</p>
          <div className="mt-6 space-y-4">
            <div>
              <label className="label">E-mail</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label">Senha</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
            {info ? <div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{info}</div> : null}
            <button className="btn-primary" onClick={login} disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
            <button className="w-full text-center text-sm font-bold text-[var(--brand)] underline" onClick={forgotPassword} disabled={resetLoading}>
              {resetLoading ? "Enviando..." : "Esqueci minha senha"}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

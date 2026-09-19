"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PublicHeader } from "@/components/impacto-no-controle/PublicHeader";
import { createSupabaseBrowserClient } from "@/lib/impacto-no-controle/supabase/browser";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function updatePassword() {
    setError(null);
    setInfo(null);
    if (password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== confirm) return setError("A confirmação de senha não confere.");
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) return setError("Não foi possível redefinir a senha. Abra novamente o link recebido por e-mail.");
    setInfo("Senha redefinida com sucesso. Você já pode entrar novamente.");
    setTimeout(() => router.push("/solucoes/impacto-no-controle/cliente/login"), 1200);
  }

  return (
    <>
      <PublicHeader showAccessLinks={false} />
      <main className="container-page grid min-h-[calc(100vh-74px)] place-items-center py-6">
        <div className="card w-full max-w-md p-6">
          <Link href="/solucoes/impacto-no-controle" className="text-sm font-bold text-[var(--brand)]">← Voltar</Link>
          <h1 className="mt-4 text-3xl font-black text-[var(--brand-dark)]">Redefinir senha</h1>
          <p className="mt-2 text-[var(--muted)]">Informe sua nova senha de acesso.</p>
          <div className="mt-6 space-y-4">
            <div>
              <label className="label">Nova senha</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <label className="label">Confirmar nova senha</label>
              <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
            {info ? <div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{info}</div> : null}
            <button className="btn-primary" onClick={updatePassword} disabled={loading}>{loading ? "Salvando..." : "Salvar nova senha"}</button>
          </div>
        </div>
      </main>
    </>
  );
}

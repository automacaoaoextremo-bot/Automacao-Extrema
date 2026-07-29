"use client";

import { FormEvent, useEffect, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const LOGIN_PATH = "/solucoes/organizacao-em-harmonia/tucxa/consulente/login";
const PANEL_PATH = "/solucoes/organizacao-em-harmonia/tucxa/consulente/painel";

function safeReturnTo() {
  if (typeof window === "undefined") return PANEL_PATH;
  const value = new URLSearchParams(window.location.search).get("returnTo") || "";
  const allowedBase = "/solucoes/organizacao-em-harmonia/tucxa/consulente/";
  return value.startsWith(allowedBase) && !value.startsWith("//") ? value : PANEL_PATH;
}

export default function TrocarSenhaConsulenteTucxaPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void supabaseBrowser.auth.getSession().then(({ data }) => {
      if (!data.session) {
        const returnTo = `${window.location.pathname}${window.location.search}`;
        window.location.replace(`${LOGIN_PATH}?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }
      setChecking(false);
    });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("A nova senha e a confirmação não conferem.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabaseBrowser.auth.updateUser({
      password,
      data: {
        must_change_password: false,
        password_changed_at: new Date().toISOString(),
      },
    });

    if (updateError) {
      const normalizedMessage = updateError.message.toLowerCase();
      const samePassword =
        normalizedMessage.includes("different from the old password") ||
        normalizedMessage.includes("different from old password") ||
        normalizedMessage.includes("same password") ||
        normalizedMessage.includes("password should be different");

      setError(
        samePassword
          ? "A nova senha deve ser diferente da senha temporária recebida no cadastro. Escolha outra senha para continuar."
          : "Não foi possível trocar a senha. Confira os dados e tente novamente.",
      );
      setLoading(false);
      return;
    }

    window.location.replace(safeReturnTo());
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader actions={[]} navLabel="Troca obrigatória de senha" showSessionName />
      <section className="mx-auto max-w-xl px-4 py-6 sm:px-6 lg:px-8">
        <article className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#CFE2C7]">Primeiro acesso</p>
          <h1 className="mt-2 text-3xl font-black">Crie sua senha definitiva</h1>
          <p className="mt-3 leading-7 text-[#E6F0E2]">
            A senha recebida no cadastro é temporária. Troque-a agora antes de acessar o painel.
          </p>

          {checking ? (
            <p className="mt-5 rounded-2xl bg-white/10 p-4 font-bold">Verificando sua sessão...</p>
          ) : (
            <form onSubmit={submit} className="mt-5 grid gap-3 rounded-[1.5rem] bg-white p-4 text-[#10251C]">
              <label className="grid gap-2">
                <span className="text-sm font-black text-[#123D2C]">Nova senha</span>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  autoComplete="new-password"
                  className="rounded-2xl border border-slate-200 px-4 py-4 outline-none focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-100"
                  required
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-black text-[#123D2C]">Confirmar nova senha</span>
                <input
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  autoComplete="new-password"
                  className="rounded-2xl border border-slate-200 px-4 py-4 outline-none focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-100"
                  required
                />
              </label>
              <button type="button" onClick={() => setShowPassword((current) => !current)} className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 font-black text-[#123D2C]">
                {showPassword ? "Ocultar senhas" : "Mostrar senhas"}
              </button>
              {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
              <button type="submit" disabled={loading} className="min-h-12 rounded-2xl bg-[#123D2C] px-5 font-black text-white disabled:opacity-60">
                {loading ? "Salvando..." : "Salvar nova senha e continuar"}
              </button>
            </form>
          )}
        </article>
      </section>
    </main>
  );
}

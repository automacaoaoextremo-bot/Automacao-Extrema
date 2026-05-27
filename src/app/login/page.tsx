"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { error: loginError } = await supabaseBrowser.auth.signInWithPassword({ email, password });

    if (loginError) {
      setError("Não foi possível entrar. Confira e-mail e senha do usuário cadastrado no Supabase Auth.");
      setLoading(false);
      return;
    }

    router.replace("/admin/ae");
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-[#00334E] px-4 py-12 text-white">
        <section className="mx-auto max-w-md rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#00A8CC]">Gestão AE</p>
          <h1 className="mt-2 text-3xl font-bold text-[#00334E]">Entrar</h1>
          <p className="mt-3 text-sm text-slate-600">
            Use um usuário criado em Authentication &gt; Users no Supabase.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-semibold">E-mail</label>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                required
                className="mt-1 w-full rounded-xl border border-slate-300 p-3"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Senha</label>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                required
                className="mt-1 w-full rounded-xl border border-slate-300 p-3"
              />
            </div>

            {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#31C16B] px-5 py-3 font-bold text-[#00334E] disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Entrar na gestão"}
            </button>
          </form>
        </section>
      </main>
    </>
  );
}

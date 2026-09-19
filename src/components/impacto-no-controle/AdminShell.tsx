"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/impacto-no-controle/supabase/browser";

type Me = {
  user: { role: string; name: string | null; email: string; client_id: string | null };
  client: { name: string; slug: string } | null;
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    async function loadMe() {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/impacto-no-controle/admin/me", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setMe(await res.json());
    }
    loadMe();
  }, [supabase.auth]);

  const isOwner = me?.user.role === "owner";
  const title = isOwner ? "Gestão" : me?.client?.name || "Cliente";

  async function logout() {
    await supabase.auth.signOut();
    router.push(isOwner ? "/solucoes/impacto-no-controle/gestao/login" : "/solucoes/impacto-no-controle/cliente/login");
  }

  return (
    <div className="min-h-screen bg-[#f7f6ef]">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-white/95 backdrop-blur">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-2">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <Link href="/solucoes/impacto-no-controle/gestao" className="flex min-w-0 items-center gap-3 font-extrabold text-[var(--brand-dark)]">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--brand)] text-white">IC</span>
              <span className="brand-title">Impacto no Controle • {title}</span>
            </Link>
            <Link
              href="/"
              className="ae-header-badge"
              aria-label="Abrir site da Automação Extrema"
            >
              <span className="ae-label">Desenvolvido por</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ae-logo-horizontal.png" alt="Automação Extrema" />
              <span className="ae-click-hint">Clique no logo e nos conheça</span>
            </Link>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm font-bold">
            <Link className="btn-secondary !w-auto !py-2" href="/solucoes/impacto-no-controle/gestao">Dashboard</Link>
            <Link className="btn-secondary !w-auto !py-2" href="/solucoes/impacto-no-controle/gestao/campanhas">{isOwner ? "Campanhas" : "Minhas campanhas"}</Link>
            {isOwner ? <Link className="btn-secondary !w-auto !py-2" href="/solucoes/impacto-no-controle/gestao/clientes">Clientes</Link> : null}
            <button className="btn-secondary !w-auto !py-2" onClick={logout}>Sair</button>
          </nav>
        </div>
      </header>
      <main className="container-page py-4 md:py-6">{children}</main>
    </div>
  );
}

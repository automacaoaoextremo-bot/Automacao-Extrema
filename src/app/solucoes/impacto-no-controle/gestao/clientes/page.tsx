"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/impacto-no-controle/AdminShell";
import { createSupabaseBrowserClient } from "@/lib/impacto-no-controle/supabase/browser";

type ClientRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  pix_key: string | null;
  responsible_name: string | null;
  responsible_email: string | null;
  responsible_whatsapp: string | null;
};

export default function ClientsPage() {
  const supabase = createSupabaseBrowserClient();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setError("Faça login para acessar a gestão.");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/impacto-no-controle/admin/clients", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) setError(json.error || "Erro ao carregar clientes.");
      else setClients(json.clients || []);
      setLoading(false);
    }
    load();
  }, [supabase.auth]);

  return (
    <AdminShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-[var(--brand-dark)]">Clientes</h1>
          <p className="mt-2 text-[var(--muted)]">Clientes cadastrados, identidade visual, Pix e responsáveis.</p>
        </div>
      </div>

      {loading ? <p className="mt-6">Carregando...</p> : null}
      {error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}

      <div className="mt-6 grid gap-4">
        {clients.map((client) => (
          <div key={client.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                {client.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={client.logo_url} alt={client.name} className="h-16 w-16 rounded-2xl border border-[var(--border)] object-contain bg-white" />
                ) : <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#eef5ec] font-black text-[var(--brand-dark)]">IC</div>}
                <div>
                  <span className="badge">/{client.slug}</span>
                  <h2 className="mt-2 text-2xl font-black text-[var(--brand-dark)]">{client.name}</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">Responsável: {client.responsible_name || "-"} • {client.responsible_email || "-"}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">Pix: {client.pix_key || "-"}</p>
                </div>
              </div>
              <Link className="btn-secondary !w-auto" href={`/solucoes/impacto-no-controle/acoes/${client.slug}`} target="_blank">Página pública</Link>
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}

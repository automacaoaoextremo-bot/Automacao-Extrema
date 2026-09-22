"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/impacto-no-controle/AdminShell";
import { createSupabaseBrowserClient } from "@/lib/impacto-no-controle/supabase/browser";
import { formatMoneyFromCents, kgFromAmount } from "@/lib/impacto-no-controle/format";

type CampaignRow = {
  id: string;
  slug: string;
  title: string;
  client_name: string;
  status: string;
  target_amount_cents: number;
  impact_value_cents: number;
  impact_unit: string;
  confirmed_amount_cents: number;
  pending_amount_cents: number;
  confirmed_count: number;
  pending_count: number;
};

export default function CampaignsPage() {
  const supabase = createSupabaseBrowserClient();
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) {
        setError("Faça login para acessar a gestão.");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/impacto-no-controle/admin/campaigns", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) setError(json.error || "Erro ao carregar campanhas.");
      else setRows(json.campaigns || []);
      setLoading(false);
    }
    load();
  }, [supabase.auth]);

  return (
    <AdminShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-[var(--brand-dark)]">Campanhas</h1>
          <p className="mt-2 text-[var(--muted)]">Acompanhe arrecadação, pagamentos pendentes e impacto estimado.</p>
        </div>
        <Link className="btn-primary !w-auto" href="/solucoes/impacto-no-controle" target="_blank">Abrir Impacto no Controle</Link>
      </div>

      {loading ? <p className="mt-6">Carregando...</p> : null}
      {error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}

      <div className="mt-6 grid gap-4">
        {rows.map((row) => (
          <Link key={row.id} href={`/solucoes/impacto-no-controle/gestao/campanhas/${row.id}`} className="card block p-5 hover:shadow-lg">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="badge">{row.client_name} • {row.status}</span>
                <h2 className="mt-3 text-2xl font-black text-[var(--brand-dark)]">{row.title}</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">/{row.slug}</p>
              </div>
              <div className="grid gap-2 text-right sm:grid-cols-3 sm:text-left">
                <div><p className="text-sm text-[var(--muted)]">Confirmado</p><strong>{formatMoneyFromCents(row.confirmed_amount_cents)}</strong></div>
                <div><p className="text-sm text-[var(--muted)]">Pendente</p><strong>{formatMoneyFromCents(row.pending_amount_cents)}</strong></div>
                <div>
                  <p className="text-sm text-[var(--muted)]">Impacto</p>
                  <strong>
                    {row.impact_value_cents > 0
                      ? `${kgFromAmount(row.confirmed_amount_cents, row.impact_value_cents)} ${row.impact_unit || "unidade(s)"}`
                      : `${row.confirmed_count || 0} participação(ões)`}
                  </strong>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}

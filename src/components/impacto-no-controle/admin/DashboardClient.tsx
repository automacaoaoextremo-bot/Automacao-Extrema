"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/impacto-no-controle/AdminShell";
import { MetricCard } from "@/components/impacto-no-controle/MetricCard";
import { createSupabaseBrowserClient } from "@/lib/impacto-no-controle/supabase/browser";
import { formatMoneyFromCents } from "@/lib/impacto-no-controle/format";

type CampaignRow = {
  id: string;
  slug: string;
  title: string;
  client_name: string;
  status: string;
  target_amount_cents: number;
  impact_value_cents: number;
  confirmed_amount_cents: number;
  pending_amount_cents: number;
  confirmed_count: number;
  pending_count: number;
};

type Me = { user: { role: string; name: string | null; email: string }; client: { name: string } | null };

export function DashboardClient() {
  const supabase = createSupabaseBrowserClient();
  const [me, setMe] = useState<Me | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) {
        setError("Faça login para acessar.");
        setLoading(false);
        return;
      }
      const [meRes, campaignsRes] = await Promise.all([
        fetch("/api/impacto-no-controle/admin/me", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/impacto-no-controle/admin/campaigns", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const meJson = await meRes.json();
      const campaignsJson = await campaignsRes.json();
      if (!meRes.ok || !campaignsRes.ok) setError(meJson.error || campaignsJson.error || "Erro ao carregar dados.");
      else {
        setMe(meJson);
        setCampaigns(campaignsJson.campaigns || []);
      }
      setLoading(false);
    }
    load();
  }, [supabase.auth]);

  const totals = useMemo(() => campaigns.reduce((acc, item) => {
    acc.confirmed += item.confirmed_amount_cents || 0;
    acc.pending += item.pending_amount_cents || 0;
    acc.confirmedCount += item.confirmed_count || 0;
    acc.pendingCount += item.pending_count || 0;
    return acc;
  }, { confirmed: 0, pending: 0, confirmedCount: 0, pendingCount: 0 }), [campaigns]);

  const isOwner = me?.user.role === "owner";

  return (
    <AdminShell>
      <section>
        <h1 className="text-3xl font-black text-[var(--brand-dark)]">{isOwner ? "Painel de Gestão" : "Área do Cliente"}</h1>
        <p className="mt-2 text-[var(--muted)]">
          {isOwner
            ? "Acompanhe clientes, campanhas, aprovações pendentes e resultados gerais."
            : "Acompanhe somente suas campanhas contratadas, configure a divulgação e aprove pagamentos."}
        </p>

        {loading ? <p className="mt-6">Carregando...</p> : null}
        {error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <MetricCard title="Campanhas" value={String(campaigns.length)} hint={isOwner ? "Total acessível na gestão" : "Campanhas do cliente"} />
          <MetricCard title="Confirmado" value={formatMoneyFromCents(totals.confirmed)} hint="Pagamentos aprovados" />
          <MetricCard title="Pendente" value={formatMoneyFromCents(totals.pending)} hint={`${totals.pendingCount} participação(ões) aguardando aprovação`} />
          <MetricCard title="Participações" value={String(totals.confirmedCount)} hint="Participações com pagamento aprovado" />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Link className="card block p-5 hover:shadow-lg" href="/solucoes/impacto-no-controle/gestao/campanhas">
            <h2 className="text-xl font-black text-[var(--brand-dark)]">Campanhas</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Configurar datas, textos, meta, prêmio, Pix, cotas, mensagens e aprovar comprovantes.</p>
          </Link>
          {isOwner ? (
            <Link className="card block p-5 hover:shadow-lg" href="/solucoes/impacto-no-controle/gestao/clientes">
              <h2 className="text-xl font-black text-[var(--brand-dark)]">Clientes</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Visualizar clientes, identidade visual e campanhas vinculadas.</p>
            </Link>
          ) : null}
          <div className="card p-5">
            <h2 className="text-xl font-black text-[var(--brand-dark)]">Sair com segurança</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Use o botão Sair no cabeçalho ao terminar as aprovações ou alterações.</p>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}

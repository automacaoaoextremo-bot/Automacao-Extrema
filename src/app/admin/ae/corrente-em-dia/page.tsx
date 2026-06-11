"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminPageShell } from "@/components/admin-page-shell";
import { adminFetch } from "@/lib/admin-fetch";
import { currencyBR, organizationTypeLabel, type CorrenteDashboardItem, type CorrenteOrganization } from "@/lib/corrente-em-dia";

type Payload = {
  dashboard: CorrenteDashboardItem[];
  organizations: CorrenteOrganization[];
};

export default function AdminCorrenteEmDiaPage() {
  const [payload, setPayload] = useState<Payload>({ dashboard: [], organizations: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    adminFetch<Payload>("/api/admin/corrente-em-dia/dashboard")
      .then((result) => {
        if (!isMounted) return;
        setPayload(result);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar Corrente em Dia.");
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const totals = useMemo(() => {
    return payload.dashboard.reduce(
      (acc, item) => {
        acc.expected += Number(item.expected_amount ?? 0);
        acc.approved += Number(item.approved_amount ?? 0);
        acc.pending += Number(item.pending_amount ?? 0);
        acc.review += Number(item.review_count ?? 0);
        acc.divergent += Number(item.divergent_count ?? 0);
        return acc;
      },
      { expected: 0, approved: 0, pending: 0, review: 0, divergent: 0 },
    );
  }, [payload.dashboard]);

  return (
    <AdminPageShell
      title="Corrente em Dia"
      description="Gestão da V1: entidades, arrecadações, QR Code Pix, comprovantes, aprovação humana e relatórios simples para federações, associações e terreiros."
      actions={
        <Link href="/solucoes/corrente-em-dia" className="rounded-xl bg-[#31C16B] px-4 py-3 text-sm font-bold text-[#00334E] shadow">
          Ver landing
        </Link>
      }
    >
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
      {loading && <div className="rounded-2xl bg-white p-4 text-slate-600 shadow">Carregando painel...</div>}

      <section className="grid gap-4 md:grid-cols-5">
        {[
          ["Previsto", currencyBR(totals.expected)],
          ["Aprovado", currencyBR(totals.approved)],
          ["Pendente", currencyBR(totals.pending)],
          ["Em revisão", String(totals.review)],
          ["Divergente", String(totals.divergent)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-3xl bg-white p-5 shadow">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-black text-[#00334E]">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-3xl bg-white p-4 shadow sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-[#00334E]">Entidades do piloto</h2>
              <p className="text-sm text-slate-600">Dados fictícios para ensaio e testes.</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.15em] text-slate-500">
                <tr>
                  <th className="px-3 py-2">Entidade</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Cidade</th>
                  <th className="px-3 py-2">Página</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payload.organizations.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-3 font-bold text-slate-800">{item.name}</td>
                    <td className="px-3 py-3 text-slate-600">{organizationTypeLabel(item.organization_type)}</td>
                    <td className="px-3 py-3 text-slate-600">{item.city}/{item.state}</td>
                    <td className="px-3 py-3">
                      <Link href={`/c/${item.slug}`} className="font-bold text-emerald-700">Abrir</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow sm:p-5">
          <h2 className="text-xl font-black text-[#00334E]">Acompanhamento mensal</h2>
          <div className="mt-4 space-y-3">
            {payload.dashboard.slice(0, 8).map((item) => (
              <div key={`${item.organization_id}-${item.reference_month}`} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-800">{item.organization_name}</p>
                    <p className="text-xs text-slate-500">{organizationTypeLabel(item.organization_type)} • {item.reference_month ?? "sem movimento"}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">{currencyBR(item.approved_amount)}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <span className="rounded-xl bg-slate-50 p-2">Pendentes: <b>{item.pending_count}</b></span>
                  <span className="rounded-xl bg-slate-50 p-2">Revisão: <b>{item.review_count}</b></span>
                  <span className="rounded-xl bg-slate-50 p-2">Divergentes: <b>{item.divergent_count}</b></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AdminPageShell>
  );
}

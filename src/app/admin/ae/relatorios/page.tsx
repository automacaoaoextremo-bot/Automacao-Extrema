"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";

type Lead = {
  id: string;
  full_name: string | null;
  whatsapp: string | null;
  email: string | null;
  main_area: string | null;
  main_pain: string | null;
  urgency: string | null;
  diagnostic_score: number;
  status: string;
  created_at: string;
  ae_solutions?: { name: string } | null;
};

type Match = { score: number; ae_solutions?: { name: string; slug: string } | null };

type ReportsPayload = {
  leads: Lead[];
  matches: Match[];
  followups: unknown[];
};

export default function RelatoriosPage() {
  const [payload, setPayload] = useState<ReportsPayload>({ leads: [], matches: [], followups: [] });
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch<ReportsPayload>("/api/admin/reports")
      .then(setPayload)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar relatórios."));
  }, []);

  const pains = useMemo(() => countBy(payload.leads, (lead) => lead.main_pain || "não informado"), [payload.leads]);
  const areas = useMemo(() => countBy(payload.leads, (lead) => lead.main_area || "não informado"), [payload.leads]);
  const solutions = useMemo(() => countBy(payload.matches, (match) => match.ae_solutions?.name || "não informado"), [payload.matches]);
  const hotLeads = payload.leads.filter((lead) => lead.diagnostic_score >= 9).slice(0, 20);

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <section className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#00334E]">Relatórios automáticos</h1>
          <p className="text-slate-600">Dores mais citadas, soluções mais recomendadas e leads mais quentes.</p>
        </div>

        {error && <div className="rounded-2xl bg-red-50 p-4 text-red-700">{error}</div>}

        <div className="grid gap-6 lg:grid-cols-3">
          <Ranking title="Dores mais citadas" items={pains} />
          <Ranking title="Áreas mais citadas" items={areas} />
          <Ranking title="Soluções mais recomendadas" items={solutions} />
        </div>

        <section className="rounded-2xl bg-white p-5 shadow">
          <h2 className="text-xl font-bold text-[#00334E]">Leads mais quentes</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2">Lead</th>
                  <th className="p-2">Dor</th>
                  <th className="p-2">Solução</th>
                  <th className="p-2">Score</th>
                  <th className="p-2">Ação</th>
                </tr>
              </thead>
              <tbody>
                {hotLeads.map((lead) => (
                  <tr key={lead.id} className="border-b align-top">
                    <td className="p-2">
                      <p className="font-bold">{lead.full_name || "Sem nome"}</p>
                      <p className="text-xs text-slate-500">{lead.whatsapp} · {lead.email}</p>
                    </td>
                    <td className="p-2">{lead.main_pain}</td>
                    <td className="p-2">{lead.ae_solutions?.name ?? "-"}</td>
                    <td className="p-2 font-bold text-[#00334E]">{lead.diagnostic_score}</td>
                    <td className="p-2">
                      <Link href={`/admin/ae/leads/${lead.id}`} className="font-bold text-[#00A8CC]">Abrir</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function Ranking({ title, items }: { title: string; items: Array<{ label: string; count: number }> }) {
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <section className="rounded-2xl bg-white p-5 shadow">
      <h2 className="text-xl font-bold text-[#00334E]">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between gap-3 text-sm">
              <span className="font-semibold text-slate-700">{item.label}</span>
              <span className="font-bold text-[#00334E]">{item.count}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-[#00A8CC]" style={{ width: `${(item.count / max) * 100}%` }} />
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-500">Sem dados ainda.</p>}
      </div>
    </section>
  );
}

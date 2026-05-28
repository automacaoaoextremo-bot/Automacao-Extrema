"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

type Solution = {
  id: string;
  name: string;
  current_status: string;
  stage: string;
  priority: number;
  source_file: string | null;
};

export default function AdminAEPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [leadResult, solutionResult] = await Promise.all([
          adminFetch<{ leads: Lead[] }>("/api/admin/leads"),
          adminFetch<{ solutions: Solution[] }>("/api/admin/solutions"),
        ]);
        setLeads(leadResult.leads);
        setSolutions(solutionResult.solutions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar painel.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const hotLeads = leads.filter((lead) => lead.diagnostic_score >= 9).length;

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <section className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#00334E]">Gestão Automação Extrema</h1>
          <p className="text-slate-600">Leads, diagnósticos, soluções e funil de aquisição.</p>
        </div>

        {error && <div className="rounded-2xl bg-red-50 p-4 text-red-700">{error}</div>}
        {loading && <div className="rounded-2xl bg-white p-4 shadow">Carregando...</div>}

        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Diagnósticos" value={leads.length} />
          <Metric label="Leads quentes" value={hotLeads} />
          <Metric label="Soluções" value={solutions.length} />
          <Metric label="Média score" value={leads.length ? Math.round(leads.reduce((sum, lead) => sum + lead.diagnostic_score, 0) / leads.length) : 0} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-[#00334E]">Soluções em andamento</h2>
              <Link href="/admin/ae/solucoes" className="text-sm font-bold text-[#00A8CC]">Editar</Link>
            </div>
            <div className="mt-4 space-y-3">
              {solutions.slice(0, 8).map((solution) => (
                <Link key={solution.id} href={`/admin/ae/solucoes/${solution.id}`} className="block rounded-2xl border border-slate-200 p-3 hover:border-[#00A8CC]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">{solution.name}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">P{solution.priority}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{solution.current_status} · {solution.stage}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-[#00334E]">Últimos diagnósticos</h2>
              <Link href="/admin/ae/funil" className="text-sm font-bold text-[#00A8CC]">Ver funil</Link>
            </div>
            <div className="mt-4 space-y-3">
              {leads.slice(0, 8).map((lead) => (
                <Link key={lead.id} href={`/admin/ae/leads/${lead.id}`} className="block rounded-2xl border border-slate-200 p-3 hover:border-[#00A8CC]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{lead.full_name || "Sem nome"}</p>
                      <p className="text-sm text-slate-600">{lead.main_area} · {lead.main_pain}</p>
                      <p className="text-xs text-slate-500">{new Date(lead.created_at).toLocaleString("pt-BR")}</p>
                    </div>
                    <span className="rounded-full bg-[#31C16B]/20 px-3 py-1 text-sm font-bold text-[#00334E]">{lead.diagnostic_score}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#00334E]">{value}</p>
    </div>
  );
}

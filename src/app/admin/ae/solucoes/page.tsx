"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminPageShell } from "@/components/admin-page-shell";
import { adminFetch } from "@/lib/admin-fetch";

type Solution = {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  target_audience: string | null;
  current_status: string;
  stage: string;
  priority: number;
  is_active: boolean;
  main_pains: string | null;
};

export default function SolucoesPage() {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch<{ solutions: Solution[] }>("/api/admin/solutions")
      .then((result) => setSolutions(result.solutions))
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar soluções."))
      .finally(() => setLoading(false));
  }, []);

  const activeCount = solutions.filter((solution) => solution.is_active).length;

  return (
    <AdminPageShell
      title="Soluções"
      description="Cadastre e evolua as soluções da Automação Extrema com público, dores, funcionalidades, sites de clientes e posicionamento de Oceano Azul."
      actions={
        <>
          <Link href="/admin/ae/catalogo" className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:border-[#00A8CC]">
            Catálogo
          </Link>
          <Link href="/admin/ae/solucoes/nova" className="rounded-xl bg-[#31C16B] px-4 py-3 text-sm font-bold text-[#00334E] shadow">
            + Nova solução
          </Link>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Soluções cadastradas" value={solutions.length} />
        <Metric label="Ativas" value={activeCount} />
        <Metric label="Em validação/operação" value={solutions.filter((solution) => ["validando", "mvp", "operacao"].includes(solution.current_status)).length} />
      </div>

      {error && <div className="rounded-2xl bg-red-50 p-4 text-red-700">{error}</div>}
      {loading && <div className="rounded-2xl bg-white p-5 text-slate-600 shadow">Carregando soluções...</div>}

      {!loading && solutions.length === 0 && !error && (
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-[#00334E]">Nenhuma solução cadastrada ainda</h2>
          <p className="mt-2 text-slate-600">Cadastre a primeira solução para começar a validar dores, públicos e oportunidades de mercado.</p>
          <Link href="/admin/ae/solucoes/nova" className="mt-4 inline-block rounded-xl bg-[#31C16B] px-5 py-3 font-bold text-[#00334E]">
            Cadastrar primeira solução
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {solutions.map((solution) => (
          <Link key={solution.id} href={`/admin/ae/solucoes/${solution.id}`} className="rounded-2xl bg-white p-5 shadow hover:ring-2 hover:ring-[#00A8CC]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[#00334E]">{solution.name}</h2>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">/{solution.slug}</p>
                <p className="mt-2 text-sm text-slate-600">{solution.short_description}</p>
              </div>
              <span className="rounded-full bg-[#31C16B]/20 px-3 py-1 text-sm font-bold text-[#00334E]">P{solution.priority}</span>
            </div>
            {solution.target_audience && <p className="mt-4 text-sm text-slate-600"><strong>Público:</strong> {solution.target_audience}</p>}
            {solution.main_pains && <p className="mt-2 text-sm text-slate-600"><strong>Dores:</strong> {solution.main_pains}</p>}
            <p className="mt-4 text-sm font-semibold text-slate-700">
              {solution.current_status} · {solution.stage} · {solution.is_active ? "Ativa" : "Inativa"}
            </p>
          </Link>
        ))}
      </div>
    </AdminPageShell>
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

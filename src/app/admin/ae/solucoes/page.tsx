"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";

type Solution = {
  id: string;
  name: string;
  short_description: string;
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

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <Link href="/admin/ae" className="text-sm font-bold text-[#00A8CC]">← Voltar para Gestão</Link>
            <h1 className="mt-2 text-3xl font-bold text-[#00334E]">Soluções</h1>
            <p className="text-slate-600">Cadastre, edite status, prioridade e descrição das ideias em andamento.</p>
          </div>

          <Link
            href="/admin/ae/solucoes/nova"
            className="inline-flex items-center justify-center rounded-xl bg-[#31C16B] px-5 py-3 text-sm font-bold text-[#00334E] shadow hover:brightness-105"
          >
            + Nova solução
          </Link>
        </div>

        {error && <div className="rounded-2xl bg-red-50 p-4 text-red-700">{error}</div>}
        {loading && <div className="rounded-2xl bg-white p-5 text-slate-600 shadow">Carregando soluções...</div>}

        {!loading && solutions.length === 0 && !error && (
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold text-[#00334E]">Nenhuma solução cadastrada ainda</h2>
            <p className="mt-2 text-slate-600">Cadastre a primeira solução para começar a validar dores e oportunidades de mercado.</p>
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
                  <p className="mt-2 text-sm text-slate-600">{solution.short_description}</p>
                </div>
                <span className="rounded-full bg-[#31C16B]/20 px-3 py-1 text-sm font-bold text-[#00334E]">P{solution.priority}</span>
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-700">
                {solution.current_status} · {solution.stage} · {solution.is_active ? "Ativa" : "Inativa"}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

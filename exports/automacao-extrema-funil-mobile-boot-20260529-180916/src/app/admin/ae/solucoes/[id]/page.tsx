"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-fetch";

type Solution = {
  id: string;
  name: string;
  short_description: string;
  target_audience: string | null;
  main_pains: string | null;
  current_status: string;
  stage: string;
  priority: number;
  is_active: boolean;
};

export default function EditSolutionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [solution, setSolution] = useState<Solution | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminFetch<{ solution: Solution }>(`/api/admin/solutions/${params.id}`)
      .then((result) => setSolution(result.solution))
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar solução."));
  }, [params.id]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!solution) return;

    const formData = new FormData(event.currentTarget);
    setMessage("");
    setError("");
    setSaving(true);

    try {
      const result = await adminFetch<{ solution: Solution }>(`/api/admin/solutions/${solution.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: String(formData.get("name") || ""),
          short_description: String(formData.get("short_description") || ""),
          target_audience: String(formData.get("target_audience") || ""),
          main_pains: String(formData.get("main_pains") || ""),
          current_status: String(formData.get("current_status") || ""),
          stage: String(formData.get("stage") || ""),
          priority: Number(formData.get("priority") || 0),
          is_active: formData.get("is_active") === "on",
        }),
      });
      setSolution(result.solution);
      setMessage("Solução atualizada com sucesso.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar solução.");
    } finally {
      setSaving(false);
    }
  }

  if (!solution) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <section className="mx-auto max-w-4xl rounded-2xl bg-white p-5 shadow">
          <div className="mb-4">
            <Link href="/admin/ae/solucoes" className="text-sm font-bold text-[#00A8CC]">← Voltar para Soluções</Link>
          </div>
          {error || "Carregando..."}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <section className="mx-auto max-w-4xl rounded-2xl bg-white p-5 shadow">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <Link href="/admin/ae/solucoes" className="text-sm font-bold text-[#00A8CC]">← Voltar para Soluções</Link>
            <h1 className="mt-3 text-3xl font-bold text-[#00334E]">Editar solução</h1>
            <p className="mt-1 text-slate-600">Atualize o status conforme validação, implementação e operação.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/ae/solucoes" className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:border-[#00A8CC]">
              Cancelar
            </Link>
            <Link href="/admin/ae" className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:border-[#00A8CC]">
              Ir para Gestão
            </Link>
          </div>
        </div>

        {message && (
          <div className="mt-4 rounded-xl bg-green-50 p-3 text-green-700">
            <p>{message}</p>
            <Link href="/admin/ae/solucoes" className="mt-2 inline-block text-sm font-bold text-green-800 underline">
              Voltar para lista de soluções
            </Link>
          </div>
        )}
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Input name="name" label="Nome" defaultValue={solution.name} />
          <Textarea name="short_description" label="Descrição curta" defaultValue={solution.short_description} rows={3} />
          <Textarea name="target_audience" label="Público-alvo" defaultValue={solution.target_audience ?? ""} rows={3} />
          <Textarea name="main_pains" label="Dores principais" defaultValue={solution.main_pains ?? ""} rows={4} />

          <div className="grid gap-4 md:grid-cols-3">
            <Select name="current_status" label="Status" defaultValue={solution.current_status} options={["ideia", "validando", "mvp", "case", "operacao", "pausada"]} />
            <Select name="stage" label="Etapa" defaultValue={solution.stage} options={["descoberta", "validacao", "implementacao", "operacao", "escala"]} />
            <Input name="priority" label="Prioridade" type="number" defaultValue={String(solution.priority)} />
          </div>

          <label className="flex gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold">
            <input name="is_active" type="checkbox" defaultChecked={solution.is_active} />
            Solução ativa no diagnóstico
          </label>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/admin/ae/solucoes" className="rounded-xl border border-slate-300 px-5 py-3 text-center font-bold text-slate-700 hover:border-[#00A8CC]">
              Cancelar e voltar
            </Link>
            <button disabled={saving} className="rounded-xl bg-[#31C16B] px-5 py-3 font-bold text-[#00334E] disabled:opacity-60">
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function Input({ name, label, defaultValue, type = "text" }: { name: string; label: string; defaultValue: string; type?: string }) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-700">{label}</label>
      <input name={name} type={type} defaultValue={defaultValue} className="mt-1 w-full rounded-xl border border-slate-300 p-3" />
    </div>
  );
}

function Textarea({ name, label, defaultValue, rows }: { name: string; label: string; defaultValue: string; rows: number }) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-700">{label}</label>
      <textarea name={name} defaultValue={defaultValue} rows={rows} className="mt-1 w-full rounded-xl border border-slate-300 p-3" />
    </div>
  );
}

function Select({ name, label, defaultValue, options }: { name: string; label: string; defaultValue: string; options: string[] }) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-700">{label}</label>
      <select name={name} defaultValue={defaultValue} className="mt-1 w-full rounded-xl border border-slate-300 p-3">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

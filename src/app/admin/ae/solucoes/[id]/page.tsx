"use client";

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
    }
  }

  if (!solution) {
    return <main className="min-h-screen bg-slate-100 p-6"><section className="mx-auto max-w-4xl rounded-2xl bg-white p-5 shadow">Carregando...</section></main>;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <section className="mx-auto max-w-4xl rounded-2xl bg-white p-5 shadow">
        <h1 className="text-3xl font-bold text-[#00334E]">Editar solução</h1>
        <p className="mt-1 text-slate-600">Atualize o status conforme validação, implementação e operação.</p>

        {message && <p className="mt-4 rounded-xl bg-green-50 p-3 text-green-700">{message}</p>}
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

          <button className="rounded-xl bg-[#31C16B] px-5 py-3 font-bold text-[#00334E]">Salvar alterações</button>
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

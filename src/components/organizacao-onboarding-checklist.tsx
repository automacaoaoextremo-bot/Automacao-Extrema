"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

type ChecklistItem = {
  key: string;
  title: string;
  description: string;
  href: string;
  group: string;
};

type ChecklistState = Record<string, { percent: number; completed: boolean }>;

const checklistItems: ChecklistItem[] = [
  {
    key: "cadastro-organizacao",
    title: "Cadastro da organização",
    description: "Dados básicos, contato, cidade, endereço e módulos habilitados.",
    href: "/solucoes/organizacao-em-harmonia/cliente/cadastro",
    group: "Geral",
  },
  {
    key: "base-unica",
    title: "Base Única",
    description: "Envolvidos, funções, grupos, localidades, entidades e orientações.",
    href: "/solucoes/organizacao-em-harmonia/cliente/base-unica",
    group: "Base Única",
  },
  {
    key: "agenda-viva",
    title: "Agenda Viva",
    description: "Eventos, calendário, recorrências, localidade, público e aprovações.",
    href: "/solucoes/organizacao-em-harmonia/cliente/agenda-viva",
    group: "Agenda Viva",
  },
  {
    key: "atendimento-em-harmonia",
    title: "Atendimento em Harmonia",
    description: "Fluxos de acolhimento, encaminhamentos, retornos e entidades.",
    href: "/solucoes/organizacao-em-harmonia/cliente/atendimento-em-harmonia",
    group: "Atendimento",
  },
  {
    key: "corrente-em-dia",
    title: "Corrente em Dia",
    description: "Contribuições identificadas/anônimas, comprovantes e conferência financeira.",
    href: "/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia",
    group: "Financeiro",
  },
  {
    key: "site-publico",
    title: "Site público e textos",
    description: "Logo, cabeçalho, páginas públicas, regulamento, horários e chamadas.",
    href: "/solucoes/organizacao-em-harmonia/cliente/configuracoes/site",
    group: "Configurações",
  },
];

function clampPercent(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function OrganizacaoOnboardingChecklist() {
  const router = useRouter();
  const [state, setState] = useState<ChecklistState>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        router.replace("/solucoes/organizacao-em-harmonia/login");
        return;
      }

      const response = await fetch("/api/organizacao-em-harmonia/cliente/checklist", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = (await response.json()) as { checklist?: ChecklistState; error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível carregar o checklist.");
      if (active) setState(result.checklist ?? {});
    }

    const timer = window.setTimeout(() => {
      load()
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : "Erro ao carregar checklist.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [router]);

  const overallPercent = useMemo(() => {
    if (checklistItems.length === 0) return 0;
    const total = checklistItems.reduce((sum, item) => sum + (state[item.key]?.percent ?? 0), 0);
    return Math.round(total / checklistItems.length);
  }, [state]);

  async function saveItem(itemKey: string, nextPercent: number) {
    const percent = clampPercent(nextPercent);
    setState((current) => ({ ...current, [itemKey]: { percent, completed: percent >= 100 } }));
    setSavingKey(itemKey);
    setMessage("");
    setError("");

    try {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        router.replace("/solucoes/organizacao-em-harmonia/login");
        return;
      }

      const response = await fetch("/api/organizacao-em-harmonia/cliente/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itemKey, percent }),
      });
      const result = (await response.json()) as { checklist?: ChecklistState; error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar o checklist.");
      if (result.checklist) setState(result.checklist);
      setMessage("Percentual do checklist atualizado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar checklist.");
    } finally {
      setSavingKey("");
    }
  }

  return (
    <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#2F6B43]">Configuração inicial</p>
          <h2 className="mt-2 text-2xl font-black text-[#00334E]">Checklist de implantação assistida</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Como vários itens dependem de validação humana, informe manualmente o percentual de conclusão de cada etapa. O progresso fica salvo nas configurações da organização.
          </p>
        </div>
        <div className="rounded-3xl bg-[#F4FBF7] p-4 text-center ring-1 ring-emerald-100 lg:min-w-44">
          <p className="text-4xl font-black text-[#123D2C]">{overallPercent}%</p>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">concluído</p>
        </div>
      </div>

      {loading && <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Carregando checklist...</p>}
      {error && <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
      {message && <p className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {checklistItems.map((item) => {
          const percent = state[item.key]?.percent ?? 0;
          return (
            <article key={item.key} className="rounded-3xl bg-[#FBFDF9] p-4 ring-1 ring-[#123D2C]/10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">{item.group}</p>
                  <h3 className="mt-1 text-lg font-black text-[#00334E]">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                </div>
                <Link href={item.href} className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5">
                  Abrir
                </Link>
              </div>

              <div className="mt-4 grid gap-2">
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[#31C16B]" style={{ width: `${percent}%` }} />
                </div>
                <label className="grid gap-1 sm:grid-cols-[1fr_120px] sm:items-center">
                  <span className="text-sm font-black text-[#00334E]">Percentual de conclusão manual</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={percent}
                    onChange={(event) => saveItem(item.key, Number(event.target.value))}
                    disabled={savingKey === item.key}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-[#00334E] outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]"
                  />
                </label>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

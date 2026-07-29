"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { defaultTucxaPublicContent, TucxaPublicCard, TucxaPublicContent } from "@/lib/organizacao-em-harmonia/tucxa-public-content-defaults";

type ApiResponse = {
  content?: TucxaPublicContent;
  error?: string;
};

function emptyCard(): TucxaPublicCard {
  return { title: "", description: "" };
}

export default function ConfiguracaoRegulamentoTucxaPage() {
  const router = useRouter();
  const [content, setContent] = useState<TucxaPublicContent>(defaultTucxaPublicContent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const authToken = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;
    if (!token) router.replace("/solucoes/organizacao-em-harmonia/login");
    return token;
  }, [router]);

  const request = useCallback(async (init?: RequestInit) => {
    const token = await authToken();
    if (!token) return null;

    const response = await fetch("/api/organizacao-em-harmonia/cliente/regulamento", {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
    });
    const result = (await response.json()) as ApiResponse;
    if (!response.ok) throw new Error(result.error || "Não foi possível concluir a ação.");
    return result;
  }, [authToken]);

  useEffect(() => {
    let active = true;
    request()
      .then((result) => {
        if (active && result?.content) setContent(result.content);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Erro ao carregar regulamento.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [request]);

  function update<K extends keyof TucxaPublicContent>(key: K, value: TucxaPublicContent[K]) {
    setContent((current) => ({ ...current, [key]: value }));
  }

  function updateModule(module: "atendimentoEmHarmonia" | "agendaViva" | "correnteEmDia", field: keyof TucxaPublicContent["atendimentoEmHarmonia"], value: string) {
    setContent((current) => ({
      ...current,
      [module]: { ...current[module], [field]: value },
    }));
  }

  function updateCard(listName: "consulenteGuidelines" | "consulenteServices", index: number, field: keyof TucxaPublicCard, value: string) {
    setContent((current) => ({
      ...current,
      [listName]: current[listName].map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  }

  function addCard(listName: "consulenteGuidelines" | "consulenteServices") {
    setContent((current) => ({ ...current, [listName]: [...current[listName], emptyCard()] }));
  }

  function removeCard(listName: "consulenteGuidelines" | "consulenteServices", index: number) {
    setContent((current) => ({ ...current, [listName]: current[listName].filter((_, itemIndex) => itemIndex !== index) }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const result = await request({ method: "POST", body: JSON.stringify({ content }) });
      if (result?.content) setContent(result.content);
      setMessage("Regulamento e orientações salvos. O site público do Tucxa passa a usar estas informações sem precisar alterar código.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar regulamento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <OrganizacaoClientShell
      title="Regulamento, horários e orientações públicas"
      description="Cadastre as informações do Tucxa que aparecem para Consulentes / Filhos de Fora. Quando horário, regra ou texto mudar, basta atualizar aqui para refletir no site público."
    >
      {loading ? (
        <div className="rounded-[2rem] bg-white p-6 font-bold text-slate-600 shadow ring-1 ring-slate-100">Carregando orientações...</div>
      ) : (
        <form onSubmit={save} className="grid gap-5">
          <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2F6B43]">Conteúdo público do Tucxa</p>
                <h2 className="mt-2 text-2xl font-black text-[#00334E]">É novo por aqui</h2>
                <p className="mt-2 leading-7 text-slate-600">Texto introdutório e cartões de orientação exibidos para quem ainda não conhece o Tucxa.</p>
              </div>
              <Link href="/solucoes/organizacao-em-harmonia/tucxa/consulente/novo" target="_blank" className="rounded-2xl bg-slate-100 px-5 py-3 text-center text-sm font-black text-[#00334E] transition hover:-translate-y-0.5">
                Ver página pública
              </Link>
            </div>

            <label className="mt-5 grid gap-1">
              <span className="text-sm font-black text-[#00334E]">Introdução da página</span>
              <textarea value={content.newHereIntro} onChange={(event) => update("newHereIntro", event.target.value)} className="min-h-28 rounded-2xl border border-slate-200 p-3 leading-7" />
            </label>
          </section>

          <EditableCards
            title="Orientações, regras e horários"
            description="Inclua horários de atendimento, regra de porta, senha/ficha, silêncio, preparo e qualquer orientação que precise aparecer para Consulentes / Filhos de Fora."
            items={content.consulenteGuidelines}
            onAdd={() => addCard("consulenteGuidelines")}
            onRemove={(index) => removeCard("consulenteGuidelines", index)}
            onChange={(index, field, value) => updateCard("consulenteGuidelines", index, field, value)}
          />

          <section className="grid gap-5 lg:grid-cols-3">
            <ModuleCard
              title="Módulo Atendimento em Harmonia"
              labelValue={content.atendimentoEmHarmonia.shortLabel}
              headlineValue={content.atendimentoEmHarmonia.title}
              descriptionValue={content.atendimentoEmHarmonia.description}
              ctaValue={content.atendimentoEmHarmonia.callToAction}
              onChange={(field, value) => updateModule("atendimentoEmHarmonia", field, value)}
            />
            <ModuleCard
              title="Módulo Agenda Viva"
              labelValue={content.agendaViva.shortLabel}
              headlineValue={content.agendaViva.title}
              descriptionValue={content.agendaViva.description}
              ctaValue={content.agendaViva.callToAction}
              onChange={(field, value) => updateModule("agendaViva", field, value)}
            />
            <ModuleCard
              title="Módulo Corrente em Dia"
              labelValue={content.correnteEmDia.shortLabel}
              headlineValue={content.correnteEmDia.title}
              descriptionValue={content.correnteEmDia.description}
              ctaValue={content.correnteEmDia.callToAction}
              onChange={(field, value) => updateModule("correnteEmDia", field, value)}
            />
          </section>

          <EditableCards
            title="Cartões da página Consulente"
            description="Cards resumidos que aparecem na página inicial do Consulente / Filho de Fora."
            items={content.consulenteServices}
            onAdd={() => addCard("consulenteServices")}
            onRemove={(index) => removeCard("consulenteServices", index)}
            onChange={(index, field, value) => updateCard("consulenteServices", index, field, value)}
          />

          {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
          {message && <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button disabled={saving} className="rounded-2xl bg-[#31C16B] px-5 py-4 font-black text-[#00334E] shadow-lg shadow-emerald-100 transition hover:-translate-y-0.5 disabled:opacity-60 sm:min-w-64">
              {saving ? "Salvando..." : "Salvar regulamento"}
            </button>
            <Link href="/solucoes/organizacao-em-harmonia/tucxa/consulente" target="_blank" className="rounded-2xl bg-white px-5 py-4 text-center font-black text-[#00334E] shadow ring-1 ring-slate-100 transition hover:-translate-y-0.5 sm:min-w-64">
              Abrir área do consulente
            </Link>
          </div>
        </form>
      )}
    </OrganizacaoClientShell>
  );
}

function EditableCards({
  title,
  description,
  items,
  onAdd,
  onRemove,
  onChange,
}: {
  title: string;
  description: string;
  items: TucxaPublicCard[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, field: keyof TucxaPublicCard, value: string) => void;
}) {
  return (
    <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-[#00334E]">{title}</h2>
          <p className="mt-2 leading-7 text-slate-600">{description}</p>
        </div>
        <button type="button" onClick={onAdd} className="rounded-2xl bg-[#00334E] px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5">
          Adicionar item
        </button>
      </div>

      <div className="mt-5 grid gap-4">
        {items.map((item, index) => (
          <div key={`${item.title}-${index}`} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-[#00334E]">Item {index + 1}</p>
              {items.length > 1 && (
                <button type="button" onClick={() => onRemove(index)} className="text-sm font-black text-red-700 underline underline-offset-4">
                  Remover
                </button>
              )}
            </div>
            <label className="mt-3 grid gap-1">
              <span className="text-sm font-black text-[#00334E]">Título</span>
              <input value={item.title} onChange={(event) => onChange(index, "title", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3" />
            </label>
            <label className="mt-3 grid gap-1">
              <span className="text-sm font-black text-[#00334E]">Descrição</span>
              <textarea value={item.description} onChange={(event) => onChange(index, "description", event.target.value)} className="min-h-28 rounded-2xl border border-slate-200 bg-white p-3 leading-7" />
            </label>
          </div>
        ))}
      </div>
    </section>
  );
}

function ModuleCard({
  title,
  labelValue,
  headlineValue,
  descriptionValue,
  ctaValue,
  onChange,
}: {
  title: string;
  labelValue: string;
  headlineValue: string;
  descriptionValue: string;
  ctaValue: string;
  onChange: (field: keyof TucxaPublicContent["atendimentoEmHarmonia"], value: string) => void;
}) {
  return (
    <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
      <h2 className="text-2xl font-black text-[#00334E]">{title}</h2>
      <div className="mt-5 grid gap-4">
        <Input label="Nome curto no menu" value={labelValue} onChange={(value) => onChange("shortLabel", value)} />
        <Input label="Título do módulo" value={headlineValue} onChange={(value) => onChange("title", value)} />
        <label className="grid gap-1">
          <span className="text-sm font-black text-[#00334E]">Descrição pública</span>
          <textarea value={descriptionValue} onChange={(event) => onChange("description", event.target.value)} className="min-h-28 rounded-2xl border border-slate-200 p-3 leading-7" />
        </label>
        <Input label="Texto do botão" value={ctaValue} onChange={(value) => onChange("callToAction", value)} />
      </div>
    </section>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-black text-[#00334E]">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl border border-slate-200 p-3" />
    </label>
  );
}

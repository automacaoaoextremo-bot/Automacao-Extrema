"use client";

import { FormEvent, useEffect, useState } from "react";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";

type Person = { id: string; full_name: string; email: string | null; whatsapp: string | null; active: boolean | null };
type ApprovalRule = { id: string; scope: string; label: string; responsible_person_id: string | null; fallback_email: string | null; fallback_whatsapp: string | null; active: boolean | null };
type Payload = { people?: Person[]; rules?: ApprovalRule[]; error?: string };

const approvalScopes = [
  { scope: "consulente-cadastro", label: "Cadastro de Consulente / Filho de Fora" },
  { scope: "filho-corrente-cadastro", label: "Cadastro de Filho da Corrente" },
  { scope: "agenda-evento", label: "Eventos e atividades da Agenda Viva" },
  { scope: "atendimento-agendamento", label: "Atendimentos e encaminhamentos" },
  { scope: "corrente-contribuicao", label: "Contribuições e comprovantes" },
];

export default function ConfiguracoesAprovacoesPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [rules, setRules] = useState<Record<string, ApprovalRule>>({});
  const [loading, setLoading] = useState(true);
  const [savingScope, setSavingScope] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function hydrate(payload: Payload) {
    setPeople(payload.people ?? []);
    setRules(Object.fromEntries((payload.rules ?? []).map((rule) => [rule.scope, rule])));
  }

  useEffect(() => {
    fetch("/api/organizacao-em-harmonia/cliente/aprovacoes")
      .then(async (response) => {
        const payload = (await response.json()) as Payload;
        if (!response.ok) throw new Error(payload.error || "Erro ao carregar aprovações.");
        hydrate(payload);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Erro ao carregar aprovações."))
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>, scope: string, defaultLabel: string) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSavingScope(scope);

    const form = new FormData(event.currentTarget);
    const body = {
      scope,
      label: String(form.get("label") || defaultLabel),
      responsiblePersonId: String(form.get("responsiblePersonId") || ""),
      fallbackEmail: String(form.get("fallbackEmail") || ""),
      fallbackWhatsapp: String(form.get("fallbackWhatsapp") || ""),
      active: true,
    };

    try {
      const response = await fetch("/api/organizacao-em-harmonia/cliente/aprovacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as Payload;
      if (!response.ok) throw new Error(payload.error || "Erro ao salvar responsável.");
      hydrate(payload);
      setMessage("Responsável salvo. As próximas aprovações desse tipo serão direcionadas conforme esta configuração.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar responsável.");
    } finally {
      setSavingScope("");
    }
  }

  return (
    <OrganizacaoClientShell title="Responsáveis por aprovação" description="Defina quem recebe cada aprovação por módulo, tipo de evento ou fluxo público do Tucxa.">
      <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2F6B43]">Configuração prática</p>
        <h2 className="mt-2 text-2xl font-black text-[#00334E]">Aprovação vai para a pessoa certa</h2>
        <p className="mt-2 max-w-4xl leading-7 text-slate-600">
          Cadastros, eventos, atendimentos e contribuições podem ter responsáveis diferentes. Quando não houver pessoa selecionada, o sistema usa o e-mail/WhatsApp de fallback, mantendo a Automação Extrema em cópia nos e-mails.
        </p>
      </section>

      {loading && <p className="rounded-2xl bg-white p-4 font-bold text-slate-700 shadow ring-1 ring-slate-100">Carregando...</p>}
      {error && <p className="rounded-2xl bg-red-50 p-4 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
      {message && <p className="rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}

      <section className="grid gap-5 lg:grid-cols-2">
        {approvalScopes.map((item) => {
          const rule = rules[item.scope];
          return (
            <form key={item.scope} onSubmit={(event) => submit(event, item.scope, item.label)} className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">{item.scope}</p>
              <h3 className="mt-2 text-xl font-black text-[#00334E]">{item.label}</h3>
              <div className="mt-4 grid gap-3">
                <label className="grid gap-1">
                  <span className="text-sm font-black text-[#00334E]">Nome da regra</span>
                  <input name="label" defaultValue={rule?.label || item.label} className="rounded-2xl border border-slate-200 p-3 outline-none focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-50" />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm font-black text-[#00334E]">Responsável cadastrado</span>
                  <select name="responsiblePersonId" defaultValue={rule?.responsible_person_id || ""} className="rounded-2xl border border-slate-200 bg-white p-3 outline-none focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-50">
                    <option value="">Usar fallback abaixo</option>
                    {people.map((person) => (
                      <option key={person.id} value={person.id}>{person.full_name}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-sm font-black text-[#00334E]">E-mail fallback</span>
                  <input name="fallbackEmail" type="email" defaultValue={rule?.fallback_email || "automacao.ao.extremo@gmail.com"} className="rounded-2xl border border-slate-200 p-3 outline-none focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-50" />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm font-black text-[#00334E]">WhatsApp fallback</span>
                  <input name="fallbackWhatsapp" defaultValue={rule?.fallback_whatsapp || ""} className="rounded-2xl border border-slate-200 p-3 outline-none focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-50" placeholder="19999999999" />
                </label>
                <button disabled={savingScope === item.scope} className="rounded-2xl bg-[#31C16B] px-5 py-3 font-black text-[#00334E] shadow-lg shadow-emerald-100 disabled:opacity-60">
                  {savingScope === item.scope ? "Salvando..." : "Salvar responsável"}
                </button>
              </div>
            </form>
          );
        })}
      </section>
    </OrganizacaoClientShell>
  );
}

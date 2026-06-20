"use client";

import { FormEvent, useEffect, useState } from "react";
import { CorrenteClientHeader } from "@/components/corrente-client-header";
import { CorrenteContextualHelp } from "@/components/corrente-contextual-help";
import { currencyBR } from "@/lib/corrente-em-dia";
import { BRAZIL_STATES } from "@/lib/brazil-locations";
import { supabaseBrowser } from "@/lib/supabase-browser";

type ContributionOption = { description: string; amount: string };

type FormState = {
  contact_name: string;
  contact_email: string;
  whatsapp: string;
  organization_type: string;
  name: string;
  responsible_manager_name: string;
  pix_key: string;
  pix_receiver_name: string;
  default_individual_amount: string;
  contribution_due_mode: string;
  contribution_due_day: string;
  reminder_before_due_enabled: boolean;
  reminder_due_day_enabled: boolean;
  reminder_after_due_enabled: boolean;
  reminder_five_days_after_enabled: boolean;
  state: string;
  city: string;
  postal_code: string;
  address_line: string;
  neighborhood: string;
  address_number: string;
  address_complement: string;
};

const initialForm: FormState = {
  contact_name: "",
  contact_email: "",
  whatsapp: "",
  organization_type: "terreiro",
  name: "",
  responsible_manager_name: "",
  pix_key: "",
  pix_receiver_name: "",
  default_individual_amount: "",
  contribution_due_mode: "until_day",
  contribution_due_day: "10",
  reminder_before_due_enabled: false,
  reminder_due_day_enabled: false,
  reminder_after_due_enabled: false,
  reminder_five_days_after_enabled: false,
  state: "SP",
  city: "Campinas",
  postal_code: "",
  address_line: "",
  neighborhood: "",
  address_number: "",
  address_complement: "",
};

function moneyToInput(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value).replace(".", ",");
}

export default function CorrenteCadastroPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [options, setOptions] = useState<ContributionOption[]>([]);
  const [cities, setCities] = useState<string[]>(["Campinas"]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        window.location.href = "/solucoes/corrente-em-dia/login";
        return;
      }

      const response = await fetch("/api/corrente-em-dia/cliente/cadastro", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível carregar cadastro.");

      const org = result.organization ?? {};
      const contact = result.contact ?? {};
      if (!active) return;
      setForm({
        contact_name: contact.name ?? org.contact_name ?? "",
        contact_email: contact.email ?? org.contact_email ?? org.email ?? "",
        whatsapp: contact.whatsapp ?? org.whatsapp ?? "",
        organization_type: org.organization_type ?? "terreiro",
        name: org.name ?? "",
        responsible_manager_name: org.responsible_manager_name ?? contact.name ?? "",
        pix_key: org.pix_key ?? "",
        pix_receiver_name: org.pix_receiver_name ?? "",
        default_individual_amount: moneyToInput(org.default_individual_amount),
        contribution_due_mode: org.contribution_due_mode ?? "until_day",
        contribution_due_day: org.contribution_due_day ? String(org.contribution_due_day) : "10",
        reminder_before_due_enabled: Boolean(org.reminder_before_due_enabled),
        reminder_due_day_enabled: Boolean(org.reminder_due_day_enabled),
        reminder_after_due_enabled: Boolean(org.reminder_after_due_enabled),
        reminder_five_days_after_enabled: Boolean(org.reminder_five_days_after_enabled),
        state: org.state ?? "SP",
        city: org.city ?? "Campinas",
        postal_code: org.postal_code ?? "",
        address_line: org.address_line ?? "",
        neighborhood: org.neighborhood ?? "",
        address_number: org.address_number ?? "",
        address_complement: org.address_complement ?? "",
      });
      setOptions((result.contributionOptions ?? []).filter((item: { is_default?: boolean }) => !item.is_default).map((item: { description: string; amount: number | null }) => ({ description: item.description, amount: moneyToInput(item.amount) })));
    }

    const timer = window.setTimeout(() => {
      load()
        .catch((err) => {
          if (active) setMessage(err instanceof Error ? err.message : "Erro ao carregar cadastro.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadCities() {
      const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${form.state}/municipios?orderBy=nome`);
      const data = (await response.json()) as { nome: string }[];
      if (!active) return;
      const names = data.map((item) => item.nome);
      setCities(names.length > 0 ? names : ["Campinas"]);
      setForm((prev) => {
        if (names.includes(prev.city)) return prev;
        return { ...prev, city: prev.state === "SP" ? "Campinas" : names[0] ?? "" };
      });
    }

    const timer = window.setTimeout(() => {
      loadCities().catch(() => undefined);
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [form.state]);

  async function lookupCep() {
    const cep = form.postal_code.replace(/\D/g, "");
    if (cep.length !== 8) {
      setMessage("Informe um CEP com 8 números.");
      return;
    }

    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = (await response.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
    if (data.erro) {
      setMessage("CEP não encontrado.");
      return;
    }

    setForm((prev) => ({
      ...prev,
      address_line: data.logradouro ?? prev.address_line,
      neighborhood: data.bairro ?? prev.neighborhood,
      city: data.localidade ?? prev.city,
      state: data.uf ?? prev.state,
    }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      window.location.href = "/solucoes/corrente-em-dia/login";
      return;
    }

    try {
      const response = await fetch("/api/corrente-em-dia/cliente/cadastro", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, contribution_options: options }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar cadastro.");
      setMessage("Cadastro salvo com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao salvar cadastro.");
    } finally {
      setSaving(false);
    }
  }

  function update(key: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <main className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <CorrenteClientHeader />
      <section className="mx-auto max-w-5xl px-4 py-6">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-[#2F6B43]">Cadastro</p>
        <h1 className="mt-2 text-4xl font-black text-[#00334E]">Organização e contribuição</h1>
        <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">
          Comece pelo essencial: dados de contato, Pix, valor padrão e vencimento. Depois, ajuste contribuintes individualmente quando necessário.
        </p>

        <div className="mt-5">
          <CorrenteContextualHelp title="O que preencher primeiro?" href="/solucoes/corrente-em-dia/cliente/primeiros-passos">
            Preencha contato, chave Pix, valor padrão e dia de contribuição. Esses dados reduzem dúvidas na hora de liberar contribuintes e comprovantes.
          </CorrenteContextualHelp>
        </div>

        {loading ? (
          <p className="mt-6 rounded-2xl bg-white p-5 shadow-sm">Carregando cadastro...</p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-5 rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-slate-100 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="sm:col-span-1">
                <span className="text-sm font-bold">Nome do contato</span>
                <input value={form.contact_name} onChange={(e) => update("contact_name", e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" />
              </label>
              <label>
                <span className="text-sm font-bold">E-mail</span>
                <input value={form.contact_email} onChange={(e) => update("contact_email", e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" />
              </label>
              <label>
                <span className="text-sm font-bold">WhatsApp</span>
                <input value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="text-sm font-bold">Organização</span>
                <select value={form.organization_type} onChange={(e) => update("organization_type", e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 p-3">
                  <option value="associacao">Associação</option>
                  <option value="federacao">Federação</option>
                  <option value="terreiro">Terreiro</option>
                </select>
              </label>
              <label>
                <span className="text-sm font-bold">Nome da organização</span>
                <input value={form.name} onChange={(e) => update("name", e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" />
              </label>
              <label>
                <span className="text-sm font-bold">Responsável pela gestão do sistema</span>
                <input value={form.responsible_manager_name} onChange={(e) => update("responsible_manager_name", e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" />
              </label>
              <label>
                <span className="text-sm font-bold">Chave Pix para receber contribuições</span>
                <input value={form.pix_key} onChange={(e) => update("pix_key", e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" />
              </label>
              <label>
                <span className="text-sm font-bold">Nome do recebedor Pix</span>
                <input value={form.pix_receiver_name} onChange={(e) => update("pix_receiver_name", e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" />
              </label>
              <label>
                <span className="text-sm font-bold">Valor padrão individual</span>
                <input value={form.default_individual_amount} onChange={(e) => update("default_individual_amount", e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" placeholder="Ex.: 50,00" />
              </label>
            </div>

            <div className="rounded-3xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-black text-[#00334E]">Outras formas de contribuição</p>
                  <p className="text-sm text-slate-600">Inclua quantas opções forem necessárias.</p>
                </div>
                <button type="button" onClick={() => setOptions((prev) => [...prev, { description: "", amount: "" }])} className="rounded-full bg-[#00334E] px-4 py-2 text-sm font-black text-white">Adicionar</button>
              </div>
              <div className="mt-4 space-y-3">
                {options.map((item, index) => (
                  <div key={`${index}-${item.description}`} className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
                    <input value={item.description} onChange={(e) => setOptions((prev) => prev.map((option, optionIndex) => optionIndex === index ? { ...option, description: e.target.value } : option))} className="rounded-2xl border border-slate-300 p-3" placeholder="Descrição" />
                    <input value={item.amount} onChange={(e) => setOptions((prev) => prev.map((option, optionIndex) => optionIndex === index ? { ...option, amount: e.target.value } : option))} className="rounded-2xl border border-slate-300 p-3" placeholder="Valor" />
                    <button type="button" onClick={() => setOptions((prev) => prev.filter((_, optionIndex) => optionIndex !== index))} className="rounded-2xl border border-red-200 px-4 py-2 text-sm font-black text-red-700">Remover</button>
                  </div>
                ))}
                {options.length === 0 && <p className="text-sm text-slate-500">Nenhuma forma adicional cadastrada. Valor padrão: {currencyBR(Number(form.default_individual_amount.replace(",", ".") || 0))}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label>
                <span className="text-sm font-bold">Dia padrão</span>
                <select value={form.contribution_due_mode} onChange={(e) => update("contribution_due_mode", e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 p-3">
                  <option value="fixed_day">Dia fixo</option>
                  <option value="until_day">Até dia</option>
                  <option value="free_month">Qualquer dia</option>
                </select>
              </label>
              <label>
                <span className="text-sm font-bold">Dia</span>
                <input disabled={form.contribution_due_mode === "free_month"} value={form.contribution_due_day} onChange={(e) => update("contribution_due_day", e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 p-3 disabled:bg-slate-100" />
              </label>
            </div>

            <div className="rounded-3xl bg-emerald-50 p-4">
              <p className="font-black text-[#00334E]">Lembretes automáticos por e-mail</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="flex gap-2"><input type="checkbox" checked={form.reminder_before_due_enabled} onChange={(e) => update("reminder_before_due_enabled", e.target.checked)} /> Dia anterior ao vencimento</label>
                <label className="flex gap-2"><input type="checkbox" checked={form.reminder_due_day_enabled} onChange={(e) => update("reminder_due_day_enabled", e.target.checked)} /> No dia do vencimento</label>
                <label className="flex gap-2"><input type="checkbox" checked={form.reminder_after_due_enabled} onChange={(e) => update("reminder_after_due_enabled", e.target.checked)} /> Dia seguinte ao vencimento</label>
                <label className="flex gap-2"><input type="checkbox" checked={form.reminder_five_days_after_enabled} onChange={(e) => update("reminder_five_days_after_enabled", e.target.checked)} /> Cinco dias após vencimento</label>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="text-sm font-bold">UF</span>
                <select value={form.state} onChange={(e) => update("state", e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 p-3">
                  {BRAZIL_STATES.map((state) => <option key={state.uf} value={state.uf}>{state.uf} - {state.name}</option>)}
                </select>
              </label>
              <label>
                <span className="text-sm font-bold">Cidade</span>
                <select value={form.city} onChange={(e) => update("city", e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 p-3">
                  {cities.map((city) => <option key={city} value={city}>{city}</option>)}
                </select>
              </label>
              <label>
                <span className="text-sm font-bold">CEP</span>
                <div className="mt-1 flex gap-2">
                  <input value={form.postal_code} onChange={(e) => update("postal_code", e.target.value)} className="w-full rounded-2xl border border-slate-300 p-3" />
                  <button type="button" onClick={lookupCep} className="rounded-2xl bg-[#00334E] px-4 py-2 text-sm font-black text-white">Pesquisar</button>
                </div>
              </label>
              <label>
                <span className="text-sm font-bold">Endereço</span>
                <input value={form.address_line} onChange={(e) => update("address_line", e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" />
              </label>
              <label>
                <span className="text-sm font-bold">Bairro</span>
                <input value={form.neighborhood} onChange={(e) => update("neighborhood", e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" />
              </label>
              <label>
                <span className="text-sm font-bold">Número</span>
                <input value={form.address_number} onChange={(e) => update("address_number", e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" />
              </label>
              <label className="sm:col-span-2">
                <span className="text-sm font-bold">Complemento</span>
                <input value={form.address_complement} onChange={(e) => update("address_complement", e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" />
              </label>
            </div>

            {message && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-[#00334E]">{message}</p>}
            <button type="submit" disabled={saving} className="w-full rounded-2xl bg-[#31C16B] px-6 py-4 font-black text-[#00334E] shadow-lg disabled:opacity-60">
              {saving ? "Salvando..." : "Salvar cadastro"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

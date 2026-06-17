"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CorrenteClientHeader } from "@/components/corrente-client-header";
import { currencyBR } from "@/lib/corrente-em-dia";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Role = { id: string; name: string; slug: string };
type ContributionOption = { id: string; description: string; amount: number | null; is_active: boolean };
type Contributor = {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp: string | null;
  status: string | null;
  auth_user_id: string | null;
  role_id: string | null;
  role_name: string | null;
  contribution_amount: number | null;
  contribution_due_day: number | null;
  contribution_due_mode: string | null;
};

type Payload = {
  contributors: Contributor[];
  roles: Role[];
  organization: { default_individual_amount: number | null; contribution_due_day: number | null; contribution_due_mode: string | null } | null;
  contributionOptions: ContributionOption[];
};

const initialForm = {
  full_name: "",
  role_id: "",
  email: "",
  whatsapp: "",
  contribution_amount: "",
  contribution_due_day: "",
  contribution_due_mode: "until_day",
  rule_type: "individual",
  create_login: true,
  status: "ativo",
};

function normalizeWhatsapp(value: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function accessWhatsAppLink(contributor: Contributor) {
  const message = [
    `Olá, ${contributor.full_name.split(/\s+/)[0] || "tudo bem"}!`,
    "Seu cadastro no Corrente em Dia foi preparado para acompanhar contribuições, comprovantes e histórico com segurança.",
    contributor.email ? `E-mail de acesso: ${contributor.email}` : "",
    "Link: https://www.automacaoextrema.com/solucoes/corrente-em-dia/login",
  ].filter(Boolean).join("\n");
  return `https://wa.me/${normalizeWhatsapp(contributor.whatsapp)}?text=${encodeURIComponent(message)}`;
}

export default function CorrenteContribuintesPage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [form, setForm] = useState(initialForm);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function token() {
    const { data } = await supabaseBrowser.auth.getSession();
    return data.session?.access_token ?? "";
  }

  async function load() {
    const authToken = await token();
    if (!authToken) {
      window.location.href = "/solucoes/corrente-em-dia/login";
      return;
    }
    const url = query ? `/api/corrente-em-dia/cliente/contribuintes?q=${encodeURIComponent(query)}` : "/api/corrente-em-dia/cliente/contribuintes";
    const response = await fetch(url, { headers: { Authorization: `Bearer ${authToken}` } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar contribuintes.");
    setPayload(result);
    if (!form.contribution_amount && result.organization?.default_individual_amount) {
      setForm((prev) => ({
        ...prev,
        contribution_amount: String(result.organization.default_individual_amount).replace(".", ","),
        contribution_due_day: result.organization.contribution_due_day ? String(result.organization.contribution_due_day) : "",
        contribution_due_mode: result.organization.contribution_due_mode ?? "until_day",
      }));
    }
  }

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      load()
        .catch((err) => {
          if (active) setMessage(err instanceof Error ? err.message : "Erro ao carregar contribuintes.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
    // A carga inicial precisa rodar apenas uma vez; recarregamentos após ações usam load() diretamente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => payload?.contributors ?? [], [payload?.contributors]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const authToken = await token();
    const response = await fetch("/api/corrente-em-dia/cliente/contribuintes", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(form),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || "Não foi possível cadastrar contribuinte.");
      return;
    }
    setMessage(result.temporaryPassword ? `Contribuinte cadastrado. Senha temporária: ${result.temporaryPassword}` : "Contribuinte cadastrado.");
    setForm(initialForm);
    await load();
  }

  return (
    <main className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <CorrenteClientHeader />
      <section className="mx-auto max-w-6xl px-4 py-6">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-[#2F6B43]">Contribuintes</p>
        <h1 className="mt-2 text-4xl font-black text-[#00334E]">Pessoas, funções e acessos</h1>
        <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">
          Cadastre contribuintes, escolha a função, ajuste valor e vencimento individual, crie login e gere mensagem para WhatsApp.
        </p>

        {message && <p className="mt-5 rounded-2xl bg-white p-4 font-bold text-[#00334E] shadow-sm">{message}</p>}
        {loading && <p className="mt-5 rounded-2xl bg-white p-4 shadow-sm">Carregando...</p>}

        {!loading && payload && (
          <div className="mt-6 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <form onSubmit={onSubmit} className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-slate-100">
              <h2 className="text-2xl font-black text-[#00334E]">Novo contribuinte</h2>
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-sm font-bold">Nome completo</span>
                  <input value={form.full_name} onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" />
                </label>
                <label className="block">
                  <span className="text-sm font-bold">Função</span>
                  <select value={form.role_id} onChange={(e) => setForm((prev) => ({ ...prev, role_id: e.target.value }))} className="mt-1 w-full rounded-2xl border border-slate-300 p-3">
                    <option value="">Selecione</option>
                    {payload.roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                  </select>
                  <a href="/solucoes/corrente-em-dia/cliente/configuracoes" className="mt-1 inline-block text-sm font-bold text-[#00334E] underline">Incluir nova função em Configurações</a>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className="text-sm font-bold">E-mail</span>
                    <input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" />
                  </label>
                  <label>
                    <span className="text-sm font-bold">WhatsApp</span>
                    <input value={form.whatsapp} onChange={(e) => setForm((prev) => ({ ...prev, whatsapp: e.target.value }))} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className="text-sm font-bold">Valor da contribuição</span>
                    <input value={form.contribution_amount} onChange={(e) => setForm((prev) => ({ ...prev, contribution_amount: e.target.value }))} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" />
                  </label>
                  <label>
                    <span className="text-sm font-bold">Tipo</span>
                    <select value={form.rule_type} onChange={(e) => setForm((prev) => ({ ...prev, rule_type: e.target.value }))} className="mt-1 w-full rounded-2xl border border-slate-300 p-3">
                      <option value="individual">Individual</option>
                      {payload.contributionOptions.map((option) => <option key={option.id} value="eventual">{option.description} - {currencyBR(option.amount)}</option>)}
                      <option value="livre">Livre</option>
                      <option value="isento">Isento</option>
                    </select>
                  </label>
                  <label>
                    <span className="text-sm font-bold">Dia de contribuição</span>
                    <input value={form.contribution_due_day} onChange={(e) => setForm((prev) => ({ ...prev, contribution_due_day: e.target.value }))} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" />
                  </label>
                  <label>
                    <span className="text-sm font-bold">Modo</span>
                    <select value={form.contribution_due_mode} onChange={(e) => setForm((prev) => ({ ...prev, contribution_due_mode: e.target.value }))} className="mt-1 w-full rounded-2xl border border-slate-300 p-3">
                      <option value="fixed_day">Dia fixo</option>
                      <option value="until_day">Até dia</option>
                      <option value="free_month">Qualquer dia</option>
                    </select>
                  </label>
                </div>
                <label className="flex gap-2 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-950">
                  <input type="checkbox" checked={form.create_login} onChange={(e) => setForm((prev) => ({ ...prev, create_login: e.target.checked }))} /> Criar login no Supabase e gerar senha temporária
                </label>
                <label className="block">
                  <span className="text-sm font-bold">Status</span>
                  <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} className="mt-1 w-full rounded-2xl border border-slate-300 p-3">
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </label>
                <button type="submit" className="w-full rounded-2xl bg-[#31C16B] px-6 py-4 font-black text-[#00334E] shadow-lg">Salvar contribuinte</button>
              </div>
            </form>

            <div className="space-y-4">
              <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <input value={query} onChange={(e) => setQuery(e.target.value)} className="rounded-2xl border border-slate-300 p-3" placeholder="Filtrar por nome ou e-mail" />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setLoading(true); load().finally(() => setLoading(false)); }} className="rounded-2xl bg-[#00334E] px-4 py-3 text-sm font-black text-white">Filtrar</button>
                    <a href="/modelos/modelo-importacao-contribuintes-corrente-em-dia.csv" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-[#00334E]">Modelo</a>
                  </div>
                </div>
                <label className="mt-4 block rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  Upload da planilha
                  <input type="file" accept=".csv,.xlsx" className="mt-2 block w-full" />
                  <span className="mt-2 block">Nesta versão, use o modelo para preparar os dados. A importação completa usa a página de Acessos já criada.</span>
                </label>
              </div>

              {filtered.map((item) => (
                <div key={item.id} className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xl font-black text-[#00334E]">{item.full_name}</p>
                      <p className="text-sm text-slate-500">{item.role_name ?? "Sem função"} • {item.status ?? "ativo"}</p>
                    </div>
                    <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">{item.auth_user_id ? "Login criado" : "Sem login"}</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <p><strong>E-mail:</strong> {item.email ?? "não informado"}</p>
                    <p><strong>WhatsApp:</strong> {item.whatsapp ?? "não informado"}</p>
                    <p><strong>Valor:</strong> {currencyBR(item.contribution_amount)}</p>
                    <p><strong>Dia:</strong> {item.contribution_due_mode === "free_month" ? "Qualquer dia" : item.contribution_due_day ?? "padrão"}</p>
                  </div>
                  {item.whatsapp && (
                    <a href={accessWhatsAppLink(item)} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-2xl bg-[#31C16B] px-4 py-3 text-sm font-black text-[#00334E]">
                      Enviar acesso por WhatsApp
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

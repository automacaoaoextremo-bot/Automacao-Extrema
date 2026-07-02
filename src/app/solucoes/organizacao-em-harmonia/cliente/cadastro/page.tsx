
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

const moduleOptions = [
  { slug: "agenda-viva", label: "Agenda Viva" },
  { slug: "atendimento-em-harmonia", label: "Atendimento em Harmonia" },
  { slug: "corrente-em-dia", label: "Corrente em Dia" },
];

const organizationTypes = ["Terreiro", "Associação", "Federação", "ONG", "Instituto", "Grupo voluntário", "Outro"];

type OrganizationPayload = {
  id: string;
  name: string | null;
  organization_type: string | null;
  email: string | null;
  whatsapp: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  zip_code: string | null;
  enabled_modules: string[] | null;
  notes: string | null;
};

type CepResponse = {
  erro?: boolean;
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

type FormState = {
  name: string;
  organizationType: string;
  email: string;
  whatsapp: string;
  city: string;
  state: string;
  zipCode: string;
  address: string;
  number: string;
  complement: string;
  enabledModules: string[];
  notes: string;
};

const emptyForm: FormState = {
  name: "",
  organizationType: "Terreiro",
  email: "",
  whatsapp: "",
  city: "Campinas",
  state: "SP",
  zipCode: "",
  address: "",
  number: "",
  complement: "",
  enabledModules: ["agenda-viva", "atendimento-em-harmonia", "corrente-em-dia"],
  notes: "",
};

function formFromOrganization(organization: OrganizationPayload | null): FormState {
  if (!organization) return emptyForm;
  return {
    name: organization.name ?? "",
    organizationType: organization.organization_type ?? "Terreiro",
    email: organization.email ?? "",
    whatsapp: organization.whatsapp ?? "",
    city: organization.city ?? "Campinas",
    state: organization.state ?? "SP",
    zipCode: organization.zip_code ?? "",
    address: organization.address ?? "",
    number: organization.number ?? "",
    complement: organization.complement ?? "",
    enabledModules: organization.enabled_modules?.length ? organization.enabled_modules : emptyForm.enabledModules,
    notes: organization.notes ?? "",
  };
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCep(value: string) {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function addressFromCep(data: CepResponse) {
  return [data.logradouro, data.bairro].filter(Boolean).join(" - ");
}

export default function OrganizacaoCadastroPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepMessage, setCepMessage] = useState("");
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

      const response = await fetch("/api/organizacao-em-harmonia/cliente/cadastro", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível carregar cadastro.");
      if (active) setForm(formFromOrganization(result.organization ?? null));
    }

    const timer = window.setTimeout(() => {
      load()
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : "Erro ao carregar cadastro.");
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

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleModule(moduleSlug: string) {
    setForm((current) => {
      const exists = current.enabledModules.includes(moduleSlug);
      return {
        ...current,
        enabledModules: exists
          ? current.enabledModules.filter((item) => item !== moduleSlug)
          : [...current.enabledModules, moduleSlug],
      };
    });
  }

  async function searchCep() {
    const cep = onlyDigits(form.zipCode);
    setCepMessage("");
    if (!cep) return;
    if (cep.length !== 8) {
      setCepMessage("Informe um CEP com 8 dígitos para pesquisar automaticamente.");
      return;
    }

    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = (await response.json()) as CepResponse;
      if (!response.ok || data.erro) {
        setCepMessage("CEP não localizado. Você pode preencher o endereço manualmente.");
        return;
      }

      setForm((current) => ({
        ...current,
        zipCode: data.cep ?? formatCep(cep),
        address: addressFromCep(data) || current.address,
        city: data.localidade || current.city,
        state: data.uf || current.state,
        complement: current.complement || data.complemento || "",
      }));
      setCepMessage("Endereço preenchido pelo CEP. Confira e informe número/complemento se necessário.");
    } catch {
      setCepMessage("Não foi possível consultar o CEP agora. Você pode preencher manualmente.");
    } finally {
      setCepLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        router.replace("/solucoes/organizacao-em-harmonia/login");
        return;
      }
      const response = await fetch("/api/organizacao-em-harmonia/cliente/cadastro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar cadastro.");
      setForm(formFromOrganization(result.organization ?? null));
      setMessage("Cadastro da organização salvo.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar cadastro.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <OrganizacaoClientShell
      eyebrow="Cadastro"
      title="Dados da organização"
      description="Confirme apenas o essencial para iniciar com segurança. O restante pode ser refinado conforme a implantação assistida avança."
    >
      {loading && <p className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">Carregando cadastro...</p>}
      {error && <p className="rounded-3xl bg-red-50 p-5 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
      {message && <p className="rounded-3xl bg-emerald-50 p-5 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}

      {!loading && (
        <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#2F6B43]">Organização</p>
          <h2 className="mt-2 text-2xl font-black text-[#00334E]">Comece pelo essencial</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Estes dados alimentam a Base Única, o Agenda Viva, o Atendimento em Harmonia e o Corrente em Dia. Campos não obrigatórios podem ser preenchidos depois.
          </p>
          <div className="mt-4 rounded-3xl bg-emerald-50 p-4 text-sm leading-6 text-[#00334E] ring-1 ring-emerald-100">
            <p className="font-black">Localidade principal aberta para preenchimento</p>
            <p className="mt-1 text-slate-700">Preencha abaixo a sede/localidade principal. Organizações com mais de um espaço podem cadastrar outros locais, como salão de eventos, ponto de encontro ou atividade externa.</p>
            <Link href="/solucoes/organizacao-em-harmonia/cliente/base-unica/localidades" className="mt-3 inline-flex rounded-full bg-white px-4 py-2 font-black text-[#00334E] ring-1 ring-emerald-100">+ Adicionar outra localidade</Link>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 md:col-span-2">
              <span className="text-sm font-black text-[#00334E]">Nome da organização *</span>
              <input value={form.name} onChange={(event) => update("name", event.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder="Ex.: Templo de Umbanda Caboclo Sete Flexa - TUCXA" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#00334E]">Tipo de organização</span>
              <select value={form.organizationType} onChange={(event) => update("organizationType", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3">
                {organizationTypes.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#00334E]">WhatsApp principal</span>
              <input value={form.whatsapp} onChange={(event) => update("whatsapp", event.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder="(19) 99999-9999" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#00334E]">E-mail principal</span>
              <input value={form.email} onChange={(event) => update("email", event.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder="contato@exemplo.com" />
            </label>
            <div className="grid gap-1">
              <span className="text-sm font-black text-[#00334E]">CEP</span>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={form.zipCode}
                  onBlur={searchCep}
                  onChange={(event) => update("zipCode", formatCep(event.target.value))}
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 p-3"
                  placeholder="00000-000"
                />
                <button type="button" onClick={searchCep} disabled={cepLoading || onlyDigits(form.zipCode).length !== 8} className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-[#00334E] ring-1 ring-emerald-100 disabled:opacity-50">
                  {cepLoading ? "Pesquisando..." : "Pesquisar CEP"}
                </button>
              </div>
              {cepMessage && <span className="text-xs font-semibold text-slate-500">{cepMessage}</span>}
            </div>
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#00334E]">UF</span>
              <input value={form.state} onChange={(event) => update("state", event.target.value.toUpperCase())} maxLength={2} className="rounded-2xl border border-slate-200 p-3" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#00334E]">Cidade</span>
              <input value={form.city} onChange={(event) => update("city", event.target.value)} className="rounded-2xl border border-slate-200 p-3" />
            </label>
            <label className="grid gap-1 md:col-span-2">
              <span className="text-sm font-black text-[#00334E]">Endereço</span>
              <input value={form.address} onChange={(event) => update("address", event.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder="Rua, avenida, bairro" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#00334E]">Número</span>
              <input value={form.number} onChange={(event) => update("number", event.target.value)} className="rounded-2xl border border-slate-200 p-3" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#00334E]">Complemento</span>
              <input value={form.complement} onChange={(event) => update("complement", event.target.value)} className="rounded-2xl border border-slate-200 p-3" />
            </label>
          </div>

          <div className="mt-6 rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
            <p className="text-sm font-black text-[#00334E]">Módulos habilitados</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {moduleOptions.map((module) => (
                <label key={module.slug} className="flex items-center gap-3 rounded-2xl bg-white p-4 font-bold text-[#00334E] ring-1 ring-emerald-100">
                  <input type="checkbox" checked={form.enabledModules.includes(module.slug)} onChange={() => toggleModule(module.slug)} className="h-5 w-5" />
                  {module.label}
                </label>
              ))}
            </div>
          </div>

          <label className="mt-5 grid gap-1">
            <span className="text-sm font-black text-[#00334E]">Observações internas</span>
            <textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} className="min-h-28 rounded-2xl border border-slate-200 p-3" placeholder="Ex.: validação inicial pelo Agenda Viva, treinamento de diretoria e responsáveis antes da avaliação de 30 dias." />
          </label>

          <button type="button" onClick={save} disabled={saving || !form.name.trim()} className="mt-5 rounded-2xl bg-[#31C16B] px-5 py-3 font-black text-[#00334E] disabled:opacity-60">
            {saving ? "Salvando..." : "Salvar cadastro da organização"}
          </button>
        </section>
      )}
    </OrganizacaoClientShell>
  );
}

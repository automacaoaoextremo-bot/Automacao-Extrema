"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Organization = {
  id: string;
  name: string | null;
  slug: string | null;
  organization_type: string | null;
  email: string | null;
  whatsapp: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  zip_code: string | null;
  status: string | null;
  enabled_modules: string[] | null;
  notes: string | null;
};

type Location = {
  id: string;
  name: string;
  location_type: string | null;
  zip_code: string | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  is_primary: boolean;
  active: boolean;
  notes: string | null;
};

type Payload = {
  organization: Organization | null;
  locations: Location[];
  locationWarning?: string | null;
};

type FormState = {
  name: string;
  organizationType: string;
  email: string;
  whatsapp: string;
  zipCode: string;
  address: string;
  number: string;
  complement: string;
  city: string;
  state: string;
  notes: string;
  enabledModules: string[];
};

const moduleOptions = [
  {
    slug: "agenda-viva",
    label: "Agenda Viva",
    description: "Calendário, eventos, recorrências, aprovações e visualização para Filhos da Corrente e Consulentes.",
  },
  {
    slug: "atendimento-em-harmonia",
    label: "Atendimento em Harmonia",
    description: "Organização de acolhimentos, entidades, retornos, encaminhamentos e solicitações de atendimento.",
  },
  {
    slug: "corrente-em-dia",
    label: "Corrente em Dia",
    description: "Contribuições, comprovantes, conferência financeira e redução de cobranças manuais.",
  },
];

const emptyForm: FormState = {
  name: "",
  organizationType: "",
  email: "",
  whatsapp: "",
  zipCode: "",
  address: "",
  number: "",
  complement: "",
  city: "",
  state: "",
  notes: "",
  enabledModules: ["agenda-viva", "atendimento-em-harmonia", "corrente-em-dia"],
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCep(value: string) {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.length <= 5 ? digits : `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function formatWhatsapp(value: string) {
  const digits = onlyDigits(value).slice(0, 13);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
}

function formFromOrganization(organization: Organization | null): FormState {
  if (!organization) return emptyForm;
  return {
    name: organization.name ?? "",
    organizationType: organization.organization_type ?? "",
    email: organization.email ?? "",
    whatsapp: organization.whatsapp ? formatWhatsapp(organization.whatsapp) : "",
    zipCode: organization.zip_code ? formatCep(organization.zip_code) : "",
    address: organization.address ?? "",
    number: organization.number ?? "",
    complement: organization.complement ?? "",
    city: organization.city ?? "",
    state: organization.state ?? "",
    notes: organization.notes ?? "",
    enabledModules: organization.enabled_modules?.length ? organization.enabled_modules : emptyForm.enabledModules,
  };
}

function primaryLocation(locations: Location[]) {
  return locations.find((item) => item.is_primary) ?? locations[0] ?? null;
}

export default function OrganizacaoCadastroPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepMessage, setCepMessage] = useState("");

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
      const result = (await response.json()) as Payload & { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível carregar o cadastro da organização.");
      if (active) {
        setPayload(result);
        setForm(formFromOrganization(result.organization));
      }
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

  const location = useMemo(() => primaryLocation(payload?.locations ?? []), [payload?.locations]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleModule(slug: string) {
    setForm((current) => {
      const exists = current.enabledModules.includes(slug);
      return {
        ...current,
        enabledModules: exists ? current.enabledModules.filter((item) => item !== slug) : [...current.enabledModules, slug],
      };
    });
  }

  async function searchCep() {
    const cep = onlyDigits(form.zipCode);
    setCepMessage("");
    if (cep.length !== 8) {
      setCepMessage("Informe um CEP com 8 dígitos para pesquisar.");
      return;
    }

    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = (await response.json()) as { erro?: boolean; cep?: string; logradouro?: string; bairro?: string; localidade?: string; uf?: string; complemento?: string };
      if (!response.ok || data.erro) {
        setCepMessage("CEP não localizado. Preencha o endereço manualmente.");
        return;
      }
      setForm((current) => ({
        ...current,
        zipCode: data.cep ?? formatCep(cep),
        address: data.logradouro || current.address,
        city: data.localidade || current.city,
        state: data.uf || current.state,
        complement: current.complement || data.complemento || "",
      }));
      setCepMessage("Endereço preenchido pelo CEP. Confira número e complemento.");
    } catch {
      setCepMessage("Não foi possível pesquisar o CEP agora. Preencha manualmente.");
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as Payload & { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar os dados da organização.");
      setPayload(result);
      setForm(formFromOrganization(result.organization));
      setMessage("Dados da organização atualizados com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar cadastro.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <OrganizacaoClientShell
      title="Cadastro — Dados da organização"
      description="Confirme os dados essenciais da organização. Solicitações de atividades e eventos ficam no módulo Agenda Viva, separado deste cadastro."
    >
      {loading && <p className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">Carregando cadastro da organização...</p>}
      {error && <p className="rounded-3xl bg-red-50 p-5 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
      {message && <p className="rounded-3xl bg-emerald-50 p-5 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}

      {!loading && (
        <>
          <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-[#2F6B43]">Dados principais</p>
                <h2 className="mt-2 text-2xl font-black text-[#00334E]">Organização cliente</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Estes dados alimentam o cabeçalho, comunicações, localidades padrão e regras básicas da Organização em Harmonia.
                </p>
              </div>
              <span className="rounded-full bg-[#F4FBF7] px-4 py-2 text-xs font-black text-[#123D2C] ring-1 ring-emerald-100">
                {payload?.organization?.status || "ativo"}
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Input label="Nome da organização *" value={form.name} onChange={(value) => update("name", value)} placeholder="Ex.: TUCXA" />
              <Input label="Tipo de organização" value={form.organizationType} onChange={(value) => update("organizationType", value)} placeholder="Ex.: templo, associação, ONG" />
              <Input label="E-mail principal" value={form.email} onChange={(value) => update("email", value)} placeholder="contato@organizacao.com" />
              <Input label="WhatsApp principal" value={form.whatsapp} onChange={(value) => update("whatsapp", formatWhatsapp(value))} placeholder="(19) 99999-9999" />

              <div className="grid gap-1">
                <span className="text-sm font-black text-[#00334E]">CEP</span>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input value={form.zipCode} onBlur={searchCep} onChange={(event) => update("zipCode", formatCep(event.target.value))} className="min-w-0 flex-1 rounded-2xl border border-slate-200 p-3" placeholder="00000-000" />
                  <button type="button" onClick={searchCep} disabled={cepLoading || onlyDigits(form.zipCode).length !== 8} className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-[#00334E] ring-1 ring-emerald-100 disabled:opacity-50">
                    {cepLoading ? "Pesquisando..." : "Pesquisar CEP"}
                  </button>
                </div>
                {cepMessage && <span className="text-xs font-semibold text-slate-500">{cepMessage}</span>}
              </div>
              <Input label="Cidade" value={form.city} onChange={(value) => update("city", value)} />
              <Input label="UF" value={form.state} onChange={(value) => update("state", value.toUpperCase().slice(0, 2))} />
              <Input label="Endereço" value={form.address} onChange={(value) => update("address", value)} />
              <Input label="Número" value={form.number} onChange={(value) => update("number", value)} />
              <Input label="Complemento" value={form.complement} onChange={(value) => update("complement", value)} />
              <label className="grid gap-1 md:col-span-2">
                <span className="text-sm font-black text-[#00334E]">Observações internas</span>
                <textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} className="min-h-28 rounded-2xl border border-slate-200 p-3" placeholder="Informações internas sobre implantação, responsáveis e próximos passos." />
              </label>
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#2F6B43]">Módulos habilitados</p>
            <h2 className="mt-2 text-2xl font-black text-[#00334E]">Escolha o que será usado pelo cliente</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {moduleOptions.map((module) => (
                <label key={module.slug} className={`cursor-pointer rounded-3xl p-4 ring-1 transition ${form.enabledModules.includes(module.slug) ? "bg-emerald-50 ring-emerald-200" : "bg-slate-50 ring-slate-100"}`}>
                  <span className="flex items-start gap-3">
                    <input type="checkbox" checked={form.enabledModules.includes(module.slug)} onChange={() => toggleModule(module.slug)} className="mt-1 h-5 w-5" />
                    <span>
                      <span className="block font-black text-[#00334E]">{module.label}</span>
                      <span className="mt-1 block text-sm leading-6 text-slate-600">{module.description}</span>
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1fr_0.75fr]">
            <div className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#2F6B43]">Localidade principal</p>
              <h2 className="mt-2 text-2xl font-black text-[#00334E]">Endereço usado como base</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Ao salvar o cadastro, a localidade principal é atualizada para manter Agenda Viva, eventos e cards públicos coerentes.
              </p>
              <div className="mt-4 rounded-3xl bg-[#F4FBF7] p-4 ring-1 ring-emerald-100">
                <p className="font-black text-[#00334E]">{location?.name || "Sede principal"}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {[location?.address || form.address, location?.number || form.number, location?.complement || form.complement, location?.district, location?.city || form.city, location?.state || form.state]
                    .filter(Boolean)
                    .join(", ") || "Endereço ainda não informado."}
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#CFE2C7]">Próximo passo</p>
              <h2 className="mt-2 text-2xl font-black">Depois de salvar</h2>
              <p className="mt-2 text-sm leading-6 text-[#E9F2E7]">
                Continue pela Base Única e Agenda Viva. O cadastro de atividades/eventos fica no módulo Agenda Viva, não nesta página.
              </p>
            </div>
          </section>

          <div className="sticky bottom-4 z-20 rounded-[2rem] bg-white/95 p-3 shadow-2xl ring-1 ring-slate-100 backdrop-blur sm:flex sm:items-center sm:justify-between sm:p-4">
            <p className="text-sm font-bold text-slate-600">Revise os dados e salve para atualizar a organização e a localidade principal.</p>
            <button type="button" onClick={save} disabled={saving || !form.name.trim()} className="mt-3 w-full rounded-2xl bg-[#00334E] px-5 py-3 font-black text-white disabled:opacity-60 sm:mt-0 sm:w-auto">
              {saving ? "Salvando..." : "Salvar dados da organização"}
            </button>
          </div>
        </>
      )}
    </OrganizacaoClientShell>
  );
}

function Input({ label, value, onChange, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-black text-[#00334E]">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder={placeholder} />
    </label>
  );
}

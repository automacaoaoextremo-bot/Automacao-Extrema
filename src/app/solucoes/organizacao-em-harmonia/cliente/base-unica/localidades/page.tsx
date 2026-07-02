"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OrganizacaoBaseUnicaSubnav } from "@/components/organizacao-base-unica-subnav";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Location = { id: string; name: string; location_type: string | null; zip_code: string | null; address: string | null; number: string | null; complement: string | null; district: string | null; city: string | null; state: string | null; is_primary: boolean; active: boolean; notes: string | null };
type Payload = { locations: Location[] };
type CepResponse = { erro?: boolean; cep?: string; logradouro?: string; complemento?: string; bairro?: string; localidade?: string; uf?: string };
type LocationForm = { id: string; name: string; locationType: string; zipCode: string; address: string; number: string; complement: string; district: string; city: string; state: string; isPrimary: boolean; active: boolean; notes: string };
const emptyForm: LocationForm = { id: "", name: "Sede principal", locationType: "sede", zipCode: "", address: "", number: "", complement: "", district: "", city: "Campinas", state: "SP", isPrimary: true, active: true, notes: "" };

function onlyDigits(value: string) { return value.replace(/\D/g, ""); }
function formatCep(value: string) { const digits = onlyDigits(value).slice(0, 8); return digits.length <= 5 ? digits : `${digits.slice(0, 5)}-${digits.slice(5)}`; }

export default function LocalidadesPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [form, setForm] = useState<LocationForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [cepMessage, setCepMessage] = useState("");

  const token = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) router.replace("/solucoes/organizacao-em-harmonia/login");
    return accessToken;
  }, [router]);

  const request = useCallback(async (init?: RequestInit) => {
    const accessToken = await token();
    if (!accessToken) return null;
    const response = await fetch("/api/organizacao-em-harmonia/cliente/base-unica", {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...(init?.headers ?? {}) },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível concluir a ação.");
    return result as Payload;
  }, [token]);

  const load = useCallback(async () => {
    const result = await request();
    if (result) setPayload(result);
  }, [request]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      load()
        .catch((err) => active && setError(err instanceof Error ? err.message : "Erro ao carregar localidades."))
        .finally(() => active && setLoading(false));
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [load]);

  function update<K extends keyof LocationForm>(key: K, value: LocationForm[K]) { setForm((current) => ({ ...current, [key]: value })); }

  async function searchCep() {
    const cep = onlyDigits(form.zipCode);
    setCepMessage("");
    if (cep.length !== 8) { setCepMessage("Informe um CEP com 8 dígitos."); return; }
    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = (await response.json()) as CepResponse;
      if (!response.ok || data.erro) { setCepMessage("CEP não localizado. Preencha manualmente."); return; }
      setForm((current) => ({ ...current, zipCode: data.cep ?? formatCep(cep), address: data.logradouro || current.address, district: data.bairro || current.district, city: data.localidade || current.city, state: data.uf || current.state, complement: current.complement || data.complemento || "" }));
      setCepMessage("Endereço preenchido pelo CEP. Informe número e complemento se necessário.");
    } catch { setCepMessage("Não foi possível consultar o CEP agora."); } finally { setCepLoading(false); }
  }

  async function saveLocation() {
    setSaving(true); setMessage(""); setError("");
    try {
      const result = await request({ method: "POST", body: JSON.stringify({ action: "upsertLocation", locationId: form.id || undefined, ...form }) });
      if (result) setPayload(result);
      setForm({ ...emptyForm, isPrimary: false, name: "Nova localidade" });
      setMessage("Localidade salva.");
    } catch (err) { setError(err instanceof Error ? err.message : "Erro ao salvar localidade."); } finally { setSaving(false); }
  }

  async function deleteLocation(location: Location) {
    if (!window.confirm(`Inativar a localidade ${location.name}?`)) return;
    setSaving(true); setMessage(""); setError("");
    try { const result = await request({ method: "POST", body: JSON.stringify({ action: "deleteLocation", locationId: location.id }) }); if (result) setPayload(result); setMessage("Localidade inativada."); } catch (err) { setError(err instanceof Error ? err.message : "Erro ao inativar localidade."); } finally { setSaving(false); }
  }

  function editLocation(location: Location) {
    setForm({ id: location.id, name: location.name, locationType: location.location_type ?? "sede", zipCode: location.zip_code ?? "", address: location.address ?? "", number: location.number ?? "", complement: location.complement ?? "", district: location.district ?? "", city: location.city ?? "Campinas", state: location.state ?? "SP", isPrimary: location.is_primary, active: location.active !== false, notes: location.notes ?? "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return <OrganizacaoClientShell title="Localidades" description="Cadastre sede principal e outros locais de atividades, eventos, grupos de estudo, ações externas ou pontos de encontro.">
    <OrganizacaoBaseUnicaSubnav />
    {loading && <p className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">Carregando localidades...</p>}
    {error && <p className="rounded-3xl bg-red-50 p-5 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
    {message && <p className="rounded-3xl bg-emerald-50 p-5 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}
    {!loading && payload && <>
      <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Localidade</p>
        <h2 className="mt-2 text-2xl font-black text-[#00334E]">{form.id ? "Editar localidade" : "Adicionar localidade"}</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Input label="Nome da localidade" value={form.name} onChange={(value) => update("name", value)} />
          <Input label="Tipo" value={form.locationType} onChange={(value) => update("locationType", value)} placeholder="sede, evento, externo" />
          <div className="grid gap-1"><span className="text-sm font-black text-[#00334E]">CEP</span><div className="flex flex-col gap-2 sm:flex-row"><input value={form.zipCode} onBlur={searchCep} onChange={(event) => update("zipCode", formatCep(event.target.value))} className="min-w-0 flex-1 rounded-2xl border border-slate-200 p-3" placeholder="00000-000" /><button type="button" onClick={searchCep} disabled={cepLoading || onlyDigits(form.zipCode).length !== 8} className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-[#00334E] ring-1 ring-emerald-100 disabled:opacity-50">{cepLoading ? "Pesquisando..." : "Pesquisar CEP"}</button></div>{cepMessage && <span className="text-xs font-semibold text-slate-500">{cepMessage}</span>}</div>
          <Input label="UF" value={form.state} onChange={(value) => update("state", value.toUpperCase())} />
          <Input label="Cidade" value={form.city} onChange={(value) => update("city", value)} />
          <Input label="Bairro" value={form.district} onChange={(value) => update("district", value)} />
          <label className="grid gap-1 md:col-span-2"><span className="text-sm font-black text-[#00334E]">Endereço</span><input value={form.address} onChange={(event) => update("address", event.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
          <Input label="Número" value={form.number} onChange={(value) => update("number", value)} />
          <Input label="Complemento" value={form.complement} onChange={(value) => update("complement", value)} />
          <label className="grid gap-1 md:col-span-2"><span className="text-sm font-black text-[#00334E]">Observações</span><textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} className="min-h-24 rounded-2xl border border-slate-200 p-3" /></label>
          <label className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100"><input type="checkbox" checked={form.isPrimary} onChange={(event) => update("isPrimary", event.target.checked)} className="h-5 w-5" /><span className="text-sm font-black text-[#00334E]">Localidade principal</span></label>
          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100"><input type="checkbox" checked={form.active} onChange={(event) => update("active", event.target.checked)} className="h-5 w-5" /><span className="text-sm font-black text-[#00334E]">Localidade ativa</span></label>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={saveLocation} disabled={saving || !form.name.trim()} className="rounded-2xl bg-[#00334E] px-5 py-3 font-black text-white disabled:opacity-60">Salvar localidade</button>{form.id && <button type="button" onClick={() => setForm({ ...emptyForm, isPrimary: false, name: "Nova localidade" })} className="rounded-2xl bg-slate-100 px-5 py-3 font-black text-[#00334E]">Cancelar edição</button>}</div>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{payload.locations.map((location) => <article key={location.id} className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100"><div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-black text-[#00334E]">{location.name}</h3><p className="text-xs font-bold text-slate-500">{location.location_type || "local"} · {location.city || "cidade"}/{location.state || "UF"}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-[#00334E]">{location.is_primary ? "Principal" : location.active === false ? "Inativa" : "Ativa"}</span></div><p className="mt-3 text-sm leading-6 text-slate-600">{[location.address, location.number, location.complement, location.district].filter(Boolean).join(", ") || "Endereço não informado."}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => editLocation(location)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-[#00334E]">Editar</button><button type="button" onClick={() => deleteLocation(location)} className="rounded-xl bg-red-50 px-3 py-2 text-sm font-black text-red-700">Inativar</button></div></article>)}{payload.locations.length === 0 && <p className="rounded-3xl bg-white p-5 font-bold text-slate-500 shadow ring-1 ring-slate-100">Nenhuma localidade cadastrada ainda.</p>}</section>
    </>}
  </OrganizacaoClientShell>;
}

function Input({ label, value, onChange, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder={placeholder} /></label>;
}

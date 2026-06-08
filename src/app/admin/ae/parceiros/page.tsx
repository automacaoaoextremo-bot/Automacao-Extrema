"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminPageShell } from "@/components/admin-page-shell";
import { adminFetch } from "@/lib/admin-fetch";
import { toSlug } from "@/lib/ae-utils";

type Partner = {
  id: string;
  name: string;
  slug: string;
  partner_type: string;
  contact_name: string | null;
  email: string | null;
  whatsapp: string | null;
  commission_percentage: number;
  status: string;
  notes: string | null;
};

const emptyForm = {
  id: "",
  name: "",
  slug: "",
  partner_type: "cerimonialista",
  contact_name: "",
  email: "",
  whatsapp: "",
  commission_percentage: "10",
  status: "ativo",
  notes: "",
};

type FormState = typeof emptyForm;

export default function ParceirosPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await adminFetch<{ partners: Partner[] }>("/api/admin/partners");
      setPartners(result.partners);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar parceiros.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    adminFetch<{ partners: Partner[] }>("/api/admin/partners")
      .then((result) => {
        if (!isMounted) return;
        setPartners(result.partners);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar parceiros.");
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function updateForm(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setSlugTouched(false);
  }

  function startEdit(partner: Partner) {
    setForm({
      id: partner.id,
      name: partner.name,
      slug: partner.slug,
      partner_type: partner.partner_type,
      contact_name: partner.contact_name ?? "",
      email: partner.email ?? "",
      whatsapp: partner.whatsapp ?? "",
      commission_percentage: String(partner.commission_percentage ?? 0),
      status: partner.status,
      notes: partner.notes ?? "",
    });
    setSlugTouched(true);
    setMessage("");
    setError("");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const body = {
      name: form.name,
      slug: form.slug,
      partner_type: form.partner_type,
      contact_name: form.contact_name,
      email: form.email,
      whatsapp: form.whatsapp,
      commission_percentage: Number(form.commission_percentage || 0),
      status: form.status,
      notes: form.notes,
    };

    try {
      if (form.id) {
        await adminFetch(`/api/admin/partners/${form.id}`, { method: "PATCH", body: JSON.stringify(body) });
        setMessage("Parceiro atualizado com sucesso.");
      } else {
        await adminFetch("/api/admin/partners", { method: "POST", body: JSON.stringify(body) });
        setMessage("Parceiro cadastrado com sucesso.");
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar parceiro.");
    } finally {
      setSaving(false);
    }
  }

  async function archive(partner: Partner) {
    if (!confirm(`Arquivar ${partner.name}? Novas aquisições não devem usar este parceiro por padrão.`)) return;
    try {
      await adminFetch(`/api/admin/partners/${partner.id}`, { method: "DELETE" });
      setMessage("Parceiro arquivado com sucesso.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao arquivar parceiro.");
    }
  }

  return (
    <AdminPageShell
      title="Parceiros"
      description="Cadastro de cerimonialistas, ONGs, buffets, influenciadores e parceiros que podem indicar clientes e receber percentual por aquisição."
      actions={<button onClick={resetForm} className="rounded-xl bg-[#31C16B] px-4 py-3 text-sm font-bold text-[#00334E] shadow">+ Novo parceiro</button>}
    >
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl bg-white p-4 shadow sm:p-5">
          <h2 className="text-xl font-bold text-[#00334E]">Parceiros cadastrados</h2>
          <p className="mt-1 text-sm text-slate-600">Use status e percentual para controlar modelo de comissão sem deixar combinado solto no WhatsApp.</p>

          {loading && <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-slate-600">Carregando...</p>}
          {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-red-700">{error}</p>}
          {message && <p className="mt-4 rounded-2xl bg-green-50 p-4 text-green-700">{message}</p>}

          <div className="mt-4 space-y-3">
            {partners.map((partner) => (
              <article key={partner.id} className={`rounded-2xl border p-4 ${partner.status === "arquivado" ? "bg-slate-50 opacity-70" : "bg-white"}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-bold text-[#00334E]">{partner.name}</h3>
                    <p className="text-sm text-slate-600">{partner.partner_type} · {partner.commission_percentage}% · {partner.status}</p>
                    {(partner.contact_name || partner.whatsapp || partner.email) && (
                      <p className="mt-1 text-xs text-slate-500">{[partner.contact_name, partner.whatsapp, partner.email].filter(Boolean).join(" · ")}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => startEdit(partner)} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Editar</button>
                    <button onClick={() => archive(partner)} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-700">Arquivar</button>
                  </div>
                </div>
              </article>
            ))}
            {!loading && partners.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Nenhum parceiro cadastrado.</p>}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-4 shadow sm:p-5">
          <h2 className="text-xl font-bold text-[#00334E]">{form.id ? "Editar" : "Novo"} parceiro</h2>
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Nome do parceiro" value={form.name} onChange={(value) => {
                updateForm("name", value);
                if (!slugTouched) updateForm("slug", toSlug(value));
              }} required />
              <Input label="Slug" value={form.slug} onChange={(value) => {
                setSlugTouched(true);
                updateForm("slug", toSlug(value));
              }} required />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Select label="Tipo" value={form.partner_type} onChange={(value) => updateForm("partner_type", value)} options={["cerimonialista", "ong", "buffet", "influenciador", "consultor", "indicador", "outro"]} />
              <Input label="Comissão (%)" type="number" value={form.commission_percentage} onChange={(value) => updateForm("commission_percentage", value)} />
              <Select label="Status" value={form.status} onChange={(value) => updateForm("status", value)} options={["ativo", "em_validacao", "pausado", "arquivado"]} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Input label="Contato" value={form.contact_name} onChange={(value) => updateForm("contact_name", value)} />
              <Input label="WhatsApp" value={form.whatsapp} onChange={(value) => updateForm("whatsapp", value)} />
              <Input label="E-mail" type="email" value={form.email} onChange={(value) => updateForm("email", value)} />
            </div>
            <Textarea label="Observações" value={form.notes} onChange={(value) => updateForm("notes", value)} rows={4} />

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-between">
              <button type="button" onClick={resetForm} className="rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700">Cancelar</button>
              <button disabled={saving} className="rounded-xl bg-[#31C16B] px-5 py-3 font-bold text-[#00334E] disabled:opacity-60">{saving ? "Salvando..." : "Salvar parceiro"}</button>
            </div>
          </form>
        </section>
      </div>
    </AdminPageShell>
  );
}

function Input({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="mt-1 w-full rounded-xl border border-slate-300 p-3" />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function Textarea({ label, value, onChange, rows }: { label: string; value: string; onChange: (value: string) => void; rows: number }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} className="mt-1 w-full rounded-xl border border-slate-300 p-3" />
    </label>
  );
}

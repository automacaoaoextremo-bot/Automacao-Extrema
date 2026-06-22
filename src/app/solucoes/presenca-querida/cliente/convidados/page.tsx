"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { PresencaClientShell } from "@/components/presenca-client-header";
import { PresencaContextualHelp } from "@/components/presenca-contextual-help";
import { PRESENCA_GUEST_STATUS_LABELS, type PresencaGuest, type PresencaGuestStatus } from "@/lib/presenca-querida";
import { supabaseBrowser } from "@/lib/supabase-browser";

type GuestForm = {
  id: string;
  full_name: string;
  whatsapp: string;
  email: string;
  group_name: string;
  relationship_label: string;
  relationship_context: string;
  adults_count: number;
  children_count: number;
  companions_allowed: number;
  dietary_notes: string;
  notes: string;
  guest_status: PresencaGuestStatus;
  is_active: boolean;
};

const emptyForm: GuestForm = {
  id: "",
  full_name: "",
  whatsapp: "",
  email: "",
  group_name: "Família",
  relationship_label: "",
  relationship_context: "",
  adults_count: 1,
  children_count: 0,
  companions_allowed: 0,
  dietary_notes: "",
  notes: "",
  guest_status: "pendente",
  is_active: true,
};

function guestToForm(guest: PresencaGuest): GuestForm {
  return {
    ...emptyForm,
    id: guest.id,
    full_name: guest.full_name,
    whatsapp: guest.whatsapp ?? "",
    email: guest.email ?? "",
    group_name: guest.group_name ?? "",
    relationship_label: guest.relationship_label ?? "",
    relationship_context: guest.relationship_context ?? "",
    adults_count: Number(guest.adults_count ?? 1),
    children_count: Number(guest.children_count ?? 0),
    companions_allowed: Number(guest.companions_allowed ?? 0),
    dietary_notes: guest.dietary_notes ?? "",
    notes: guest.notes ?? "",
    guest_status: guest.guest_status,
    is_active: Boolean(guest.is_active ?? true),
  };
}

function sanitizeNumber(value: string, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return Math.round(number);
}

export default function PresencaConvidadosPage() {
  const [guests, setGuests] = useState<PresencaGuest[]>([]);
  const [form, setForm] = useState<GuestForm>(emptyForm);
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function getToken() {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Sessão expirada.");
    return token;
  }

  async function loadGuests() {
    const token = await getToken();
    const response = await fetch("/api/presenca-querida/cliente/guests", { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar convidados.");
    setGuests(result.guests ?? []);
  }

  useEffect(() => {
    let active = true;
    window.setTimeout(() => {
      loadGuests()
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : "Erro ao carregar convidados.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
    };
    // Carregamento inicial controlado por sessão Supabase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    return guests.reduce(
      (acc, guest) => {
        if (guest.is_active === false) acc.inactive += 1;
        else acc.active += 1;
        if (guest.approval_status === "aprovado") acc.approved += 1;
        if (guest.approval_status === "pendente") acc.pendingApproval += 1;
        return acc;
      },
      { active: 0, inactive: 0, approved: 0, pendingApproval: 0 },
    );
  }, [guests]);

  function update<K extends keyof GuestForm>(field: K, value: GuestForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const token = await getToken();
      const response = await fetch("/api/presenca-querida/cliente/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar convidado.");
      setMessage(form.id ? "Convidado atualizado." : "Convidado incluído.");
      setForm(emptyForm);
      await loadGuests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar convidado.");
    } finally {
      setSaving(false);
    }
  }

  async function actionGuest(id: string, action: string) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const token = await getToken();
      const response = await fetch("/api/presenca-querida/cliente/guests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível atualizar.");
      setMessage("Convidado atualizado.");
      await loadGuests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar convidado.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteGuest(id: string) {
    if (!window.confirm("Excluir definitivamente este convidado?")) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const token = await getToken();
      const response = await fetch(`/api/presenca-querida/cliente/guests?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível excluir.");
      setMessage("Convidado excluído.");
      await loadGuests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir convidado.");
    } finally {
      setSaving(false);
    }
  }

  async function onCsvFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setCsvText(await file.text());
  }

  async function importCsv() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const token = await getToken();
      const response = await fetch("/api/presenca-querida/cliente/guests/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ csv: csvText }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível importar.");
      setMessage(`Importação concluída: ${result.imported} incluídos, ${result.skipped} ignorados.`);
      setCsvText("");
      await loadGuests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar convidados.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PresencaClientShell>
      <section className="grid gap-5 xl:grid-cols-[1fr_0.34fr]">
        <div className="grid gap-5">
          <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-7">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E85D75]">Convidados</p>
            <h1 className="mt-2 text-3xl font-black text-[#00334E]">Lista, parentesco, relacionamento e importação</h1>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">Cadastre quem é parente e, para amigos ou outros grupos, registre de onde surgiu o relacionamento. Isso alimenta convites personalizados sem citar datas desnecessárias.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-rose-50 p-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">Ativos</p><p className="text-2xl font-black text-[#00334E]">{totals.active}</p></div>
              <div className="rounded-2xl bg-rose-50 p-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">Inativos</p><p className="text-2xl font-black text-[#00334E]">{totals.inactive}</p></div>
              <div className="rounded-2xl bg-rose-50 p-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">Aprovados</p><p className="text-2xl font-black text-[#00334E]">{totals.approved}</p></div>
              <div className="rounded-2xl bg-rose-50 p-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">Pend. aprovação</p><p className="text-2xl font-black text-[#00334E]">{totals.pendingApproval}</p></div>
            </div>
          </div>

          <form onSubmit={onSubmit} className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-7">
            <h2 className="text-2xl font-black text-[#00334E]">{form.id ? "Editar convidado" : "Incluir convidado"}</h2>
            {message && <p className="mt-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">{message}</p>}
            {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</p>}
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Nome</span><input value={form.full_name} onChange={(item) => update("full_name", item.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">WhatsApp</span><input value={form.whatsapp} onChange={(item) => update("whatsapp", item.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">E-mail</span><input value={form.email} onChange={(item) => update("email", item.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Grupo</span><input value={form.group_name} onChange={(item) => update("group_name", item.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Parentesco</span><input value={form.relationship_label} onChange={(item) => update("relationship_label", item.target.value)} placeholder="Ex.: irmã, prima, tia" className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Origem do relacionamento</span><input value={form.relationship_context} onChange={(item) => update("relationship_context", item.target.value)} placeholder="Ex.: amiga da escola, trabalho, grupo espiritual" className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Adultos</span><input type="number" min={0} value={form.adults_count} onChange={(item) => update("adults_count", sanitizeNumber(item.target.value, 1))} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Crianças</span><input type="number" min={0} value={form.children_count} onChange={(item) => update("children_count", sanitizeNumber(item.target.value, 0))} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Acompanhantes permitidos</span><input type="number" min={0} value={form.companions_allowed} onChange={(item) => update("companions_allowed", sanitizeNumber(item.target.value, 0))} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Status</span><select value={form.guest_status} onChange={(item) => update("guest_status", item.target.value as PresencaGuestStatus)} className="rounded-2xl border border-slate-200 bg-white p-3">{Object.entries(PRESENCA_GUEST_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="grid gap-1 md:col-span-2"><span className="text-sm font-black text-[#00334E]">Observações</span><textarea value={form.notes} onChange={(item) => update("notes", item.target.value)} className="min-h-24 rounded-2xl border border-slate-200 p-3" /></label>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button type="submit" disabled={saving} className="rounded-2xl bg-[#E85D75] px-5 py-3 font-black text-white disabled:opacity-60">{saving ? "Salvando..." : "Salvar"}</button>
              {form.id && <button type="button" onClick={() => setForm(emptyForm)} className="rounded-2xl bg-slate-100 px-5 py-3 font-black text-[#00334E]">Cancelar edição</button>}
            </div>
          </form>

          <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-black text-[#00334E]">Importar por CSV</h2>
              <a href="/api/presenca-querida/cliente/guests/template" className="rounded-2xl bg-[#00334E] px-4 py-3 text-center text-sm font-black text-white">Baixar template CSV</a>
            </div>
            <input type="file" accept=".csv,text/csv" onChange={onCsvFile} className="mt-4 w-full rounded-2xl bg-rose-50 p-3 text-sm" />
            <textarea value={csvText} onChange={(item) => setCsvText(item.target.value)} placeholder="Ou cole aqui o conteúdo do CSV" className="mt-3 min-h-32 w-full rounded-2xl border border-slate-200 p-3" />
            <button type="button" onClick={importCsv} disabled={saving || !csvText.trim()} className="mt-3 rounded-2xl bg-[#E85D75] px-5 py-3 font-black text-white disabled:opacity-60">Importar convidados</button>
          </div>

          <div className="overflow-x-auto rounded-[2rem] bg-white shadow-xl ring-1 ring-rose-100">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead className="bg-rose-50 text-[#00334E]"><tr><th className="px-4 py-3">Nome</th><th>Grupo</th><th>Parentesco/relacionamento</th><th>Status</th><th>Aprovação</th><th>Totais</th><th>Ações</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={7} className="px-4 py-5 font-bold text-slate-500">Carregando...</td></tr>}
                {!loading && guests.map((guest) => (
                  <tr key={guest.id} className="border-t border-rose-100 align-top">
                    <td className="px-4 py-3"><p className="font-black text-[#00334E]">{guest.full_name}</p><p className="text-xs text-slate-500">{guest.whatsapp || "Sem WhatsApp"}</p></td>
                    <td className="py-3">{guest.group_name || "—"}</td>
                    <td className="py-3">{guest.relationship_label || guest.relationship_context || guest.invite_context || "—"}</td>
                    <td className="py-3">{PRESENCA_GUEST_STATUS_LABELS[guest.guest_status]}</td>
                    <td className="py-3">{guest.approval_status || "pendente"}</td>
                    <td className="py-3">A:{guest.adults_count} C:{guest.children_count} Ac:{guest.companions_allowed}</td>
                    <td className="py-3 pr-4"><div className="flex flex-wrap gap-2"><button onClick={() => setForm(guestToForm(guest))} className="font-black text-[#00334E] underline">Editar</button><button onClick={() => actionGuest(guest.id, guest.is_active === false ? "activate" : "inactivate")} className="font-black text-[#00334E] underline">{guest.is_active === false ? "Ativar" : "Inativar"}</button><button onClick={() => deleteGuest(guest.id)} className="font-black text-red-700 underline">Excluir</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <PresencaContextualHelp title="Convite mais pessoal" href="/solucoes/presenca-querida/cliente/mensagens" actionLabel="Gerar convites">
          <p>Parentesco e origem do relacionamento permitem que cada convite pareça escrito para aquela pessoa, sem virar mensagem genérica de RSVP.</p>
        </PresencaContextualHelp>
      </section>
    </PresencaClientShell>
  );
}

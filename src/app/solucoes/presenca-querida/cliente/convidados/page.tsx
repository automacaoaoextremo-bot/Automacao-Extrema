"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
  primary_guest_id: string;
  household_label: string;
  is_invite_recipient: boolean;
  adults_count: number;
  children_count: number;
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
  primary_guest_id: "",
  household_label: "",
  is_invite_recipient: true,
  adults_count: 1,
  children_count: 0,
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
    primary_guest_id: guest.primary_guest_id ?? "",
    household_label: guest.household_label ?? "",
    is_invite_recipient: Boolean(guest.is_invite_recipient ?? !guest.primary_guest_id),
    adults_count: Number(guest.adults_count ?? 1),
    children_count: Number(guest.children_count ?? 0),
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

function guestPrimaryName(guest: PresencaGuest, guests: PresencaGuest[]) {
  if (!guest.primary_guest_id) return "Convite próprio";
  return guests.find((item) => item.id === guest.primary_guest_id)?.full_name ?? "Convidado principal";
}

export default function PresencaConvidadosPage() {
  const [guests, setGuests] = useState<PresencaGuest[]>([]);
  const [form, setForm] = useState<GuestForm>(emptyForm);
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

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

  const primaryOptions = useMemo(() => guests.filter((guest) => guest.id !== form.id && guest.is_active !== false && guest.primary_guest_id == null), [form.id, guests]);

  const linkedByPrimary = useMemo(() => {
    return guests.reduce<Record<string, PresencaGuest[]>>((acc, guest) => {
      if (!guest.primary_guest_id) return acc;
      acc[guest.primary_guest_id] = [...(acc[guest.primary_guest_id] ?? []), guest];
      return acc;
    }, {});
  }, [guests]);

  const totals = useMemo(() => {
    return guests.reduce(
      (acc, guest) => {
        if (guest.is_active === false) acc.inactive += 1;
        else acc.active += 1;
        if (guest.is_invite_recipient !== false && !guest.primary_guest_id) acc.recipients += 1;
        if (guest.primary_guest_id) acc.linked += 1;
        if (guest.approval_status === "aprovado") acc.approved += 1;
        if (guest.approval_status === "pendente") acc.pendingApproval += 1;
        return acc;
      },
      { active: 0, inactive: 0, recipients: 0, linked: 0, approved: 0, pendingApproval: 0 },
    );
  }, [guests]);

  function update<K extends keyof GuestForm>(field: K, value: GuestForm[K]) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "primary_guest_id") {
        next.is_invite_recipient = String(value ?? "").trim() ? false : true;
      }
      return next;
    });
  }

  function startEditingGuest(guest: PresencaGuest) {
    setForm(guestToForm(guest));
    setError("");
    setMessage(`Editando cadastro de ${guest.full_name}. Faça os ajustes e clique em Salvar convidado.`);
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
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
    if (!window.confirm("Excluir definitivamente este convidado? Se ele for convidado principal, revise antes os convidados vinculados.")) return;
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
      setMessage(`Importação concluída: ${result.imported} incluídos, ${result.linked ?? 0} vinculados, ${result.skipped} ignorados.`);
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
            <h1 className="mt-2 text-3xl font-black text-[#00334E]">Lista, vínculos e convite individual</h1>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Cadastre cada pessoa como uma linha. Quando alguém não tiver WhatsApp próprio no cadastro, vincule ao convidado principal que receberá o convite. Assim a confirmação vale para todos os nomes daquele convite, sem botão genérico de acompanhante.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-6">
              <div className="rounded-2xl bg-rose-50 p-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">Ativos</p><p className="text-2xl font-black text-[#00334E]">{totals.active}</p></div>
              <div className="rounded-2xl bg-rose-50 p-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">Convites</p><p className="text-2xl font-black text-[#00334E]">{totals.recipients}</p></div>
              <div className="rounded-2xl bg-rose-50 p-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">Vinculados</p><p className="text-2xl font-black text-[#00334E]">{totals.linked}</p></div>
              <div className="rounded-2xl bg-rose-50 p-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">Inativos</p><p className="text-2xl font-black text-[#00334E]">{totals.inactive}</p></div>
              <div className="rounded-2xl bg-rose-50 p-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">Aprovados</p><p className="text-2xl font-black text-[#00334E]">{totals.approved}</p></div>
              <div className="rounded-2xl bg-rose-50 p-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">Pendentes</p><p className="text-2xl font-black text-[#00334E]">{totals.pendingApproval}</p></div>
            </div>
          </div>

          <form ref={formRef} onSubmit={onSubmit} className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-7">
            <h2 className="text-2xl font-black text-[#00334E]">{form.id ? "Editar convidado" : "Incluir convidado"}</h2>
            {message && <p className="mt-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">{message}</p>}
            {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</p>}
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Nome</span><input value={form.full_name} onChange={(item) => update("full_name", item.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">WhatsApp de quem recebe o convite</span><input value={form.whatsapp} onChange={(item) => update("whatsapp", item.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder="Deixe vazio para convidado vinculado" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">E-mail</span><input value={form.email} onChange={(item) => update("email", item.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Grupo</span><input value={form.group_name} onChange={(item) => update("group_name", item.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Parentesco</span><input value={form.relationship_label} onChange={(item) => update("relationship_label", item.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder="Ex.: Prima, Tia, Cunhado" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Origem da relação / amizade</span><input value={form.relationship_context} onChange={(item) => update("relationship_context", item.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder="Ex.: amiga da escola, trabalho, grupo espiritual" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Convidado principal</span><select value={form.primary_guest_id} onChange={(item) => update("primary_guest_id", item.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="">Recebe convite próprio</option>{primaryOptions.map((guest) => <option key={guest.id} value={guest.id}>{guest.full_name}</option>)}</select></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Grupo familiar / vínculo</span><input value={form.household_label} onChange={(item) => update("household_label", item.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder="Ex.: Família da Leticia" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Adultos</span><input type="number" min={0} value={form.adults_count} onChange={(item) => update("adults_count", sanitizeNumber(item.target.value, 1))} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Crianças</span><input type="number" min={0} value={form.children_count} onChange={(item) => update("children_count", sanitizeNumber(item.target.value, 0))} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Status</span><select value={form.guest_status} onChange={(item) => update("guest_status", item.target.value as PresencaGuestStatus)} className="rounded-2xl border border-slate-200 bg-white p-3">{Object.entries(PRESENCA_GUEST_STATUS_LABELS).filter(([value]) => value !== "confirmado_com_acompanhantes").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-100"><input type="checkbox" checked={form.is_active} onChange={(item) => update("is_active", item.target.checked)} className="h-5 w-5" /><span className="text-sm font-black text-[#00334E]">Convidado ativo</span></label>
            </div>
            <label className="mt-4 grid gap-1"><span className="text-sm font-black text-[#00334E]">Observação alimentar</span><input value={form.dietary_notes} onChange={(item) => update("dietary_notes", item.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
            <label className="mt-4 grid gap-1"><span className="text-sm font-black text-[#00334E]">Observações internas</span><textarea value={form.notes} onChange={(item) => update("notes", item.target.value)} className="min-h-24 rounded-2xl border border-slate-200 p-3" /></label>
            <p className="mt-3 text-sm leading-6 text-slate-500">Para marido, esposa, filho ou filha sem WhatsApp próprio, crie uma linha separada e selecione o convidado principal. Não use acompanhante livre.</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row"><button disabled={saving} className="rounded-2xl bg-[#00334E] px-5 py-3 font-black text-white disabled:opacity-60">{form.id ? "Salvar alterações" : "Salvar convidado"}</button>{form.id && <button type="button" onClick={() => { setForm(emptyForm); setMessage(""); }} className="rounded-2xl bg-slate-100 px-5 py-3 font-black text-[#00334E]">Cancelar edição</button>}</div>
          </form>

          <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-[#00334E]">Importar por CSV</h2>
                <p className="mt-2 leading-7 text-slate-600">Use o template para indicar quem recebe o convite e quais pessoas estão vinculadas a esse convidado principal.</p>
              </div>
              <a href="/api/presenca-querida/cliente/guests/template" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-black text-[#00334E] ring-1 ring-rose-100">Baixar template CSV</a>
            </div>
            <input type="file" accept=".csv,text/csv" onChange={onCsvFile} className="mt-5 block w-full rounded-2xl border border-slate-200 p-3" />
            <textarea value={csvText} onChange={(item) => setCsvText(item.target.value)} className="mt-4 min-h-36 w-full rounded-2xl border border-slate-200 p-3" placeholder="Ou cole aqui o conteúdo CSV" />
            <button onClick={importCsv} disabled={saving || !csvText.trim()} className="mt-4 rounded-2xl bg-[#E85D75] px-5 py-3 font-black text-white disabled:opacity-60">Importar convidados</button>
          </div>

          <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-7">
            <h2 className="text-2xl font-black text-[#00334E]">Convidados cadastrados</h2>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead><tr className="border-b border-rose-100 text-xs uppercase tracking-[0.18em] text-slate-400"><th className="py-3">Nome</th><th>Convite</th><th>Grupo/relação</th><th>Pessoas</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {loading && <tr><td colSpan={6} className="py-5 font-bold text-slate-500">Carregando...</td></tr>}
                  {!loading && guests.map((guest) => {
                    const linked = linkedByPrimary[guest.id] ?? [];
                    return (
                      <tr key={guest.id} className="border-b border-rose-50 align-top">
                        <td className="py-3"><p className="font-black text-[#00334E]">{guest.full_name}</p><p className="text-xs text-slate-500">{guest.whatsapp || "Sem WhatsApp próprio"}</p>{linked.length > 0 && <p className="mt-1 text-xs font-bold text-[#E85D75]">Vincula: {linked.map((item) => item.full_name).join(", ")}</p>}</td>
                        <td className="py-3">{guest.primary_guest_id ? `Vinculado a ${guestPrimaryName(guest, guests)}` : "Recebe convite"}<br /><span className="text-xs text-slate-500">{guest.is_invite_recipient === false ? "não recebe WhatsApp" : "recebe WhatsApp"}</span></td>
                        <td className="py-3"><p>{guest.group_name || "-"}</p><p className="text-xs text-slate-500">{guest.relationship_label || guest.relationship_context || "sem vínculo descrito"}</p></td>
                        <td className="py-3">A:{guest.adults_count} C:{guest.children_count}</td>
                        <td className="py-3"><span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-[#00334E]">{PRESENCA_GUEST_STATUS_LABELS[guest.guest_status] || guest.guest_status}</span><br /><span className="text-xs text-slate-500">{guest.is_active === false ? "Inativo" : "Ativo"}</span></td>
                        <td className="py-3"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => startEditingGuest(guest)} className="rounded-xl bg-slate-100 px-3 py-2 font-black text-[#00334E]">Editar</button><button type="button" onClick={() => actionGuest(guest.id, guest.is_active === false ? "activate" : "inactivate")} className="rounded-xl bg-slate-100 px-3 py-2 font-black text-[#00334E]">{guest.is_active === false ? "Ativar" : "Inativar"}</button>{guest.primary_guest_id && <button type="button" onClick={() => actionGuest(guest.id, "make_recipient")} className="rounded-xl bg-slate-100 px-3 py-2 font-black text-[#00334E]">Tornar principal</button>}<button type="button" onClick={() => deleteGuest(guest.id)} className="rounded-xl bg-red-50 px-3 py-2 font-black text-red-700">Excluir</button></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <PresencaContextualHelp title="Convite sem acompanhante livre" href="/solucoes/presenca-querida/cliente/mensagens" actionLabel="Gerar mensagens">
          <p>O convite deve ser individual ou vinculado a nomes reais. Assim a confirmação fica mais clara: Leticia confirma por ela e pelos convidados associados, sem abrir uma opção genérica de acompanhante.</p>
          <p className="mt-3">Use parentesco e origem do relacionamento para dar contexto emocional à mensagem personalizada.</p>
        </PresencaContextualHelp>
      </section>
    </PresencaClientShell>
  );
}

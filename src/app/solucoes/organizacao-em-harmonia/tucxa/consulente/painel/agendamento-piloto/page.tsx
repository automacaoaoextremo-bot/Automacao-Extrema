"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const API = "/api/organizacao-em-harmonia/consulente/agendamento-piloto";
const LOGIN = "/solucoes/organizacao-em-harmonia/agendamento/login";
type DateOption = { date: string; label: string; entity: { id: string; name: string; available: number } };
type Appointment = { id: string; appointmentDate: string; appointmentTime: string; entityName: string; status: string; confirmationStatus: string; order: number | null };
type Payload = { profile: { fullName: string; whatsapp: string; email: string }; preferences: { openUpcomingOnLogin: boolean }; defaultEntity: { id: string; name: string }; dates: DateOption[]; appointments: Appointment[] };
type Modal = "agendar" | "agendamentos" | "cadastro" | "configuracoes" | null;

function shortDate(value: string) { const [y,m,d] = value.split("-"); return y && m && d ? `${d}/${m}/${y}` : value; }
function statusLabel(value: string) { return ({ solicitado: "Aguardando confirmação", confirmado: "Confirmado", cancelado: "Cancelado", presente: "Presente", concluido: "Concluído" } as Record<string,string>)[value] || value; }

export default function ConsulenteAgendamentoPilotoPage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [profile, setProfile] = useState({ fullName: "", whatsapp: "", email: "" });
  const [openUpcoming, setOpenUpcoming] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const callApi = useCallback(async (body?: Record<string, unknown>) => {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) { window.location.replace(LOGIN); throw new Error("Sessão não encontrada."); }
    const response = await fetch(API, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não foi possível concluir a operação.");
    return data;
  }, []);

  const load = useCallback(async (openOnLogin = false) => {
    setError("");
    try {
      const data = await callApi() as Payload;
      setPayload(data); setProfile(data.profile); setOpenUpcoming(data.preferences.openUpcomingOnLogin);
      if (openOnLogin && data.preferences.openUpcomingOnLogin && data.appointments.length) setModal("agendamentos");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível carregar o painel."); }
    finally { setLoading(false); }
  }, [callApi]);

  useEffect(() => {
    const bootstrap = async () => {
      await Promise.resolve();
      await load(true);
    };
    void bootstrap();
  }, [load]);

  async function book() {
    if (!selectedDate) return;
    setSaving(true); setError(""); setMessage("");
    try { const data = await callApi({ action: "book", appointmentDate: selectedDate }); setMessage(data.message || "Agendamento realizado."); setSelectedDate(""); await load(false); setModal("agendamentos"); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível agendar."); }
    finally { setSaving(false); }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try { const data = await callApi({ action: "update-profile", ...profile }); setMessage(data.message || "Dados atualizados."); await load(false); setModal(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível atualizar."); }
    finally { setSaving(false); }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try { const data = await callApi({ action: "save-settings", openUpcomingOnLogin: openUpcoming }); setMessage(data.message || "Configuração salva."); await load(false); setModal(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar."); }
    finally { setSaving(false); }
  }

  async function signOut() { await supabaseBrowser.auth.signOut(); window.location.replace(LOGIN); }

  return <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
    <TucxaPublicHeader actions={[{ label: "Início", href: "/solucoes/organizacao-em-harmonia/agendamento", variant: "primary" }, { label: "Voltar", href: "/solucoes/organizacao-em-harmonia/agendamento", variant: "secondary" }]} navLabel="Agendamento · Consulente" showSupport />
    <section className="mx-auto max-w-5xl px-3 py-5 sm:px-6">
      <div className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#CFE2C7]">Consulente</p>
        <h1 className="mt-2 text-2xl font-black sm:text-3xl">Olá, {payload?.profile.fullName?.split(/\s+/)[0] || "Consulente"}.</h1>
        <p className="mt-2 font-semibold text-[#E8F1E5]">Aqui você agenda seu atendimento, consulta seus próximos agendamentos e mantém seus dados atualizados.</p><button type="button" onClick={() => void signOut()} className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-sm font-black text-white ring-1 ring-white/30">Sair</button>
      </div>
      {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
      {message && <p className="mt-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}
      {loading ? <p className="mt-6 font-bold">Carregando...</p> : <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Card title="Agendar" text={payload?.defaultEntity.name ? `Sua Entidade padrão: ${payload.defaultEntity.name}.` : "Procure a Recepção para definir sua Entidade padrão."} onClick={() => setModal("agendar")} />
        <Card title="Meus agendamentos" text={`${payload?.appointments.length || 0} próximo(s) agendamento(s).`} onClick={() => setModal("agendamentos")} />
        <Card title="Cadastro" text="Atualize somente seus dados pessoais." onClick={() => setModal("cadastro")} />
        <Card title="Configurações" text="Escolha se seus próximos agendamentos devem abrir ao entrar." onClick={() => setModal("configuracoes")} />
      </div>}
    </section>

    {modal && payload && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.currentTarget === e.target) setModal(null); }}>
      <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:rounded-[2rem] sm:p-6">
        <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black text-[#123D2C]">{modal === "agendar" ? "Agendar atendimento" : modal === "agendamentos" ? "Meus agendamentos" : modal === "cadastro" ? "Cadastro" : "Configurações"}</h2><button onClick={() => setModal(null)} className="rounded-xl bg-slate-100 px-3 py-2 font-black">Fechar</button></div>
        {modal === "agendar" && <div className="mt-5 grid gap-3">
          <p className="rounded-2xl bg-[#F7FAF2] p-4 font-semibold">Entidade padrão: <strong>{payload.defaultEntity.name || "não definida"}</strong>. As datas abaixo já excluem dias sem atendimento e feriados.</p>
          {!payload.dates.length ? <p className="font-semibold text-amber-800">Não há datas com vaga disponíveis no período.</p> : payload.dates.map((item) => <label key={item.date} className="flex cursor-pointer gap-3 rounded-2xl border border-[#123D2C]/15 p-4"><input type="radio" name="date" checked={selectedDate === item.date} onChange={() => setSelectedDate(item.date)} /><span><strong>{shortDate(item.date)}</strong><br/><span className="text-sm text-slate-600">{item.entity.name} · {item.entity.available} vaga(s)</span></span></label>)}
          <button disabled={!selectedDate || saving} onClick={() => void book()} className="rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white disabled:opacity-50">{saving ? "Agendando..." : "Confirmar agendamento"}</button>
        </div>}
        {modal === "agendamentos" && <div className="mt-5 grid gap-3">{payload.appointments.length ? payload.appointments.map((item) => <article key={item.id} className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10"><strong className="text-[#123D2C]">{shortDate(item.appointmentDate)} · {item.appointmentTime}</strong><p className="mt-1 font-semibold">{item.entityName}</p><p className="text-sm text-slate-600">{statusLabel(item.status)}{item.order ? ` · Ordem ${item.order}` : ""}</p></article>) : <p className="font-semibold">Você não possui próximos agendamentos.</p>}</div>}
        {modal === "cadastro" && <form onSubmit={saveProfile} className="mt-5 grid gap-3"><input value={profile.fullName} onChange={(e) => setProfile((v) => ({...v, fullName:e.target.value}))} placeholder="Nome completo" className="rounded-xl border p-3" required/><input value={profile.whatsapp} onChange={(e) => setProfile((v) => ({...v, whatsapp:e.target.value}))} placeholder="WhatsApp com DDD" className="rounded-xl border p-3" required/><input value={profile.email} onChange={(e) => setProfile((v) => ({...v, email:e.target.value}))} placeholder="E-mail (opcional)" type="email" className="rounded-xl border p-3"/><button disabled={saving} className="rounded-xl bg-[#123D2C] p-3 font-black text-white">Salvar dados pessoais</button></form>}
        {modal === "configuracoes" && <form onSubmit={saveSettings} className="mt-5 grid gap-4"><label className="flex items-start gap-3 rounded-2xl bg-[#F7FAF2] p-4 font-semibold"><input type="checkbox" checked={openUpcoming} onChange={(e) => setOpenUpcoming(e.target.checked)} className="mt-1"/><span>Abrir meus próximos agendamentos automaticamente quando eu entrar no sistema.</span></label><button disabled={saving} className="rounded-xl bg-[#123D2C] p-3 font-black text-white">Salvar configuração</button></form>}
      </section>
    </div>}
  </main>;
}

function Card({ title, text, onClick }: { title: string; text: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="rounded-[1.5rem] bg-white p-5 text-left shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5"><span className="block text-lg font-black text-[#123D2C]">{title}</span><span className="mt-1 block text-sm font-semibold text-slate-600">{text}</span><span className="mt-3 block text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">Toque para abrir</span></button>; }

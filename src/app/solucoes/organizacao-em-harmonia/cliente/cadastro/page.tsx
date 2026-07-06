"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { AGENDA_VIVA_TUCXA_INITIAL_RULES, TUCXA_WEEKDAY_SERVICE_RULES } from "@/lib/organizacao-em-harmonia";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Person = {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp: string | null;
  active: boolean;
};

type EventType = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  requires_approval: boolean;
  active: boolean;
  sort_order: number;
};

type AgendaEvent = {
  id: string;
  title: string;
  event_type: string;
  event_type_id: string | null;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  all_day: boolean;
  recurrence_rule: string | null;
  location: string | null;
  group_slug: string | null;
  responsible_person_id: string | null;
  created_by_person_id: string | null;
  approved_by_person_id: string | null;
  approved_at: string | null;
  requires_approval: boolean;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type Payload = {
  organization: { id: string; name: string; slug: string | null } | null;
  people: Person[];
  eventTypes: EventType[];
  events: AgendaEvent[];
};

type FormState = {
  eventId: string;
  title: string;
  eventTypeId: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  location: string;
  groupSlug: string;
  responsiblePersonId: string;
  notes: string;
  imageUrl: string;
  imageAlt: string;
  imageEmoji: string;
  highlightVisual: boolean;
  requiresApproval: boolean;
};

const emptyForm: FormState = {
  eventId: "",
  title: "",
  eventTypeId: "",
  startsAt: "",
  endsAt: "",
  allDay: false,
  location: "",
  groupSlug: "",
  responsiblePersonId: "",
  notes: "",
  imageUrl: "",
  imageAlt: "",
  imageEmoji: "",
  highlightVisual: true,
  requiresApproval: true,
};

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  recorrente: "Recorrente",
  pendente_aprovacao: "Pendente de aprovação",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  ajuste_solicitado: "Ajuste solicitado",
};

const eventColorClasses: Record<string, string> = {
  bazar: "bg-lime-100 text-lime-950 ring-lime-200",
  caminhada: "bg-emerald-100 text-emerald-950 ring-emerald-200",
  "grupo-estudos": "bg-yellow-100 text-yellow-950 ring-yellow-200",
  "dia-filme": "bg-rose-100 text-rose-950 ring-rose-200",
  "mostra-cultural": "bg-orange-100 text-orange-950 ring-orange-200",
  "clube-livro": "bg-amber-100 text-amber-950 ring-amber-200",
  "grupo-1": "bg-green-100 text-green-950 ring-green-200",
  "grupo-2": "bg-sky-100 text-sky-950 ring-sky-200",
  "grupo-segunda-feira": "bg-rose-100 text-rose-950 ring-rose-200",
  "grupo-terca-feira": "bg-sky-100 text-sky-950 ring-sky-200",
  "tratamento-espiritual-transformacao": "bg-emerald-100 text-emerald-950 ring-emerald-200",
};

function dateInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function formatDate(value: string | null) {
  if (!value) return "Data a confirmar";
  return new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}

function dayKey(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.toLocaleString("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric" });
  const month = date.toLocaleString("en-CA", { timeZone: "America/Sao_Paulo", month: "2-digit" });
  const day = date.toLocaleString("en-CA", { timeZone: "America/Sao_Paulo", day: "2-digit" });
  return `${year}-${month}-${day}`;
}

function localDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day: number | null; key: string }> = [];
  for (let index = 0; index < first.getDay(); index += 1) {
    cells.push({ day: null, key: `empty-${index}` });
  }
  for (let day = 1; day <= totalDays; day += 1) {
    cells.push({ day, key: localDate(year, month, day) });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, key: `tail-${cells.length}` });
  }
  return cells;
}

function eventTypeFor(event: AgendaEvent, types: EventType[]) {
  return types.find((item) => item.id === event.event_type_id) ?? null;
}

function colorFor(event: AgendaEvent, types: EventType[]) {
  const type = eventTypeFor(event, types);
  return eventColorClasses[type?.slug ?? event.event_type] ?? "bg-white text-[#00334E] ring-slate-200";
}

function metadataText(event: AgendaEvent, key: string) {
  const value = event.metadata?.[key];
  return typeof value === "string" ? value : "";
}

function eventImageUrl(event: AgendaEvent) {
  return metadataText(event, "image_url");
}

function eventImageAlt(event: AgendaEvent) {
  return metadataText(event, "image_alt") || event.title;
}

function eventEmoji(event: AgendaEvent) {
  const emoji = metadataText(event, "image_emoji");
  if (emoji) return emoji;
  const key = event.event_type || "";
  if (key.includes("bazar")) return "🛍️";
  if (key.includes("caminhada")) return "🚶";
  if (key.includes("filme")) return "🎬";
  if (key.includes("livro")) return "📚";
  if (key.includes("cultural") || key.includes("mostra")) return "🎭";
  if (key.includes("estudo")) return "💡";
  return "📌";
}

function visualTime(value: string | null, allDay: boolean) {
  if (allDay || !value) return "";
  return new Date(value).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
}

function eventTooltip(event: AgendaEvent) {
  return [
    event.title,
    formatDate(event.starts_at),
    event.location ? `Local: ${event.location}` : "Local a confirmar",
    `Status: ${statusLabels[event.status] ?? event.status}`,
    event.notes ? `Obs.: ${event.notes}` : "",
  ].filter(Boolean).join("\n");
}

function canStoreDataImage(dataUrl: string) {
  return dataUrl.length <= 900_000;
}

function publicStatusClass(status: string) {
  if (status === "aprovado") return "bg-emerald-50 text-emerald-900 ring-emerald-100";
  if (status === "pendente_aprovacao") return "bg-amber-50 text-amber-900 ring-amber-100";
  if (status === "reprovado") return "bg-red-50 text-red-700 ring-red-100";
  return "bg-slate-50 text-slate-700 ring-slate-100";
}

export default function OrganizacaoAgendaVivaPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [approvalWhatsappUrl, setApprovalWhatsappUrl] = useState("");
  const year = 2026;
  const month = 6;

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        router.replace("/solucoes/organizacao-em-harmonia/login");
        return;
      }

      const response = await fetch("/api/organizacao-em-harmonia/cliente/agenda-viva", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível carregar Agenda Viva.");
      if (active) setPayload(result);
    }

    const timer = window.setTimeout(() => {
      load()
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : "Erro ao carregar Agenda Viva.");
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

  const eventsByDay = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    for (const event of payload?.events ?? []) {
      const key = dayKey(event.starts_at);
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [payload?.events]);

  const upcomingEvents = useMemo(() => {
    const now = new Date("2026-07-01T00:00:00-03:00");
    return (payload?.events ?? [])
      .filter((event) => event.starts_at && new Date(event.starts_at).getTime() >= now.getTime())
      .slice(0, 8);
  }, [payload?.events]);

  const pendingEvents = useMemo(() => {
    return (payload?.events ?? []).filter((event) => event.status === "pendente_aprovacao");
  }, [payload?.events]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function authenticatedRequest(init: RequestInit) {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      router.replace("/solucoes/organizacao-em-harmonia/login");
      return null;
    }

    const response = await fetch("/api/organizacao-em-harmonia/cliente/agenda-viva", {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível concluir a ação.");
    return result as Payload & { approvalWhatsappUrl?: string };
  }

  async function onImageFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Selecione um arquivo de imagem.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) return;
      if (!canStoreDataImage(dataUrl)) {
        setError("Imagem muito grande para esta versão de teste. Use uma imagem menor ou informe uma URL da imagem.");
        return;
      }
      setError("");
      setForm((current) => ({
        ...current,
        imageUrl: dataUrl,
        imageAlt: current.imageAlt || file.name.replace(/\.[^.]+$/, ""),
      }));
    };
    reader.readAsDataURL(file);
  }

  async function saveEvent() {
    setSaving(true);
    setMessage("");
    setError("");
    setApprovalWhatsappUrl("");
    try {
      const selectedType = payload?.eventTypes.find((item) => item.id === form.eventTypeId);
      const result = await authenticatedRequest({
        method: "POST",
        body: JSON.stringify({
          action: "upsertEvent",
          ...form,
          eventType: selectedType?.slug || "atividade",
        }),
      });
      if (result) setPayload(result);
      if (result?.approvalWhatsappUrl) setApprovalWhatsappUrl(result.approvalWhatsappUrl);
      setForm(emptyForm);
      setMessage("Atividade/evento enviado para aprovação. O aprovador recebeu e-mail e você pode abrir o WhatsApp pré-preenchido abaixo.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar atividade.");
    } finally {
      setSaving(false);
    }
  }

  async function decideEvent(eventId: string, action: "approveEvent" | "rejectEvent" | "requestAdjustments") {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await authenticatedRequest({
        method: "POST",
        body: JSON.stringify({ action, eventId }),
      });
      if (result) setPayload(result);
      setMessage(action === "approveEvent" ? "Atividade aprovada e liberada no calendário." : "Status da atividade atualizado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar atividade.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(eventId: string) {
    if (!window.confirm("Excluir esta atividade ainda não aprovada?")) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await authenticatedRequest({
        method: "POST",
        body: JSON.stringify({ action: "deleteEvent", eventId }),
      });
      if (result) setPayload(result);
      setMessage("Atividade excluída.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir atividade.");
    } finally {
      setSaving(false);
    }
  }

  function editEvent(event: AgendaEvent) {
    setForm({
      eventId: event.id,
      title: event.title,
      eventTypeId: event.event_type_id ?? "",
      startsAt: dateInputValue(event.starts_at),
      endsAt: dateInputValue(event.ends_at),
      allDay: event.all_day,
      location: event.location ?? "",
      groupSlug: event.group_slug ?? "",
      responsiblePersonId: event.responsible_person_id ?? "",
      notes: event.notes ?? "",
      imageUrl: eventImageUrl(event),
      imageAlt: eventImageAlt(event),
      imageEmoji: eventEmoji(event),
      highlightVisual: event.metadata?.highlight_visual !== false,
      requiresApproval: event.requires_approval,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const visualMonthCells = monthMatrix(year, month);

  return (
    <OrganizacaoClientShell
  title="Cadastro — Dados da organização"
  description="Confirme apenas o essencial para iniciar com segurança. O restante pode ser refinado conforme a implantação assistida avança."
>
      {loading && <p className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">Carregando Agenda Viva...</p>}
      {error && <p className="rounded-3xl bg-red-50 p-5 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
      {message && <p className="rounded-3xl bg-emerald-50 p-5 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}
      {approvalWhatsappUrl && <a href={approvalWhatsappUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-2xl bg-[#31C16B] px-5 py-3 font-black text-[#00334E] shadow">Enviar solicitação também pelo WhatsApp</a>}

      {!loading && payload && (
        <>
          <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#2F6B43]">Solicitar atividade/evento</p>
            <h2 className="mt-2 text-2xl font-black text-[#00334E]">{form.eventId ? "Editar solicitação" : "Cadastrar nova solicitação"}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Qualquer pessoa ativa pode registrar uma atividade. Ela fica pendente até a Presidência/Diretoria aprovar. Antes da aprovação, a solicitação pode ser editada.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 md:col-span-2"><span className="text-sm font-black text-[#00334E]">Nome da atividade/evento *</span><input value={form.title} onChange={(event) => update("title", event.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder="Ex.: Grupo de Estudos, Bazar, Clube do Livro, Festa Junina" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Tipo de atividade</span><select value={form.eventTypeId} onChange={(event) => update("eventTypeId", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="">Selecionar tipo</option>{payload.eventTypes.filter((item) => item.active !== false).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Responsável</span><select value={form.responsiblePersonId} onChange={(event) => update("responsiblePersonId", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="">A definir</option>{payload.people.filter((person) => person.active !== false).map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}</select></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Início</span><input type="datetime-local" value={form.startsAt} onChange={(event) => update("startsAt", event.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Fim</span><input type="datetime-local" value={form.endsAt} onChange={(event) => update("endsAt", event.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Grupo / categoria</span><select value={form.groupSlug} onChange={(event) => update("groupSlug", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="">Não definido</option><option value="evento">Evento</option><option value="grupo-1">Grupo 1</option><option value="grupo-2">Grupo 2</option><option value="segunda">Segunda</option><option value="terca">Terça</option><option value="quarta">Quarta</option><option value="ferias">Férias</option></select></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Local</span><input value={form.location} onChange={(event) => update("location", event.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder="Presencial, online, salão, etc." /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Emoji/ícone curto</span><input value={form.imageEmoji} onChange={(event) => update("imageEmoji", event.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder="Ex.: 🎬, 📚, 🚶" maxLength={4} /></label>
              <label className="grid gap-1 md:col-span-2"><span className="text-sm font-black text-[#00334E]">Imagem do evento</span><div className="grid gap-3 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100 md:grid-cols-[1fr_auto]"><input value={form.imageUrl.startsWith("data:") ? "Imagem anexada ao formulário" : form.imageUrl} onChange={(event) => update("imageUrl", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3" placeholder="Cole uma URL pública da imagem ou selecione um arquivo abaixo" disabled={form.imageUrl.startsWith("data:")} /><input type="file" accept="image/*" onChange={onImageFile} className="rounded-2xl border border-slate-200 bg-white p-3 text-sm" />{form.imageUrl && <div className="md:col-span-2 flex flex-col gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-100 sm:flex-row sm:items-center"><div className="h-20 w-20 overflow-hidden rounded-2xl bg-lime-50 ring-1 ring-lime-100"><Image src={form.imageUrl} alt={form.imageAlt || form.title || "Imagem do evento"} width={80} height={80} unoptimized className="h-full w-full object-cover" /></div><div className="flex-1"><input value={form.imageAlt} onChange={(event) => update("imageAlt", event.target.value)} className="w-full rounded-2xl border border-slate-200 p-3" placeholder="Texto alternativo / descrição da imagem" /><button type="button" onClick={() => update("imageUrl", "")} className="mt-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-[#00334E]">Remover imagem</button></div></div>}</div></label>
              <label className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100"><input type="checkbox" checked={form.allDay} onChange={(event) => update("allDay", event.target.checked)} className="h-5 w-5" /><span className="text-sm font-black text-[#00334E]">Dia inteiro</span></label>
              <label className="flex items-center gap-3 rounded-2xl bg-lime-50 p-4 ring-1 ring-lime-100"><input type="checkbox" checked={form.highlightVisual} onChange={(event) => update("highlightVisual", event.target.checked)} className="h-5 w-5" /><span className="text-sm font-black text-[#00334E]">Destacar no calendário visual</span></label>
              <label className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100"><input type="checkbox" checked={form.requiresApproval} onChange={(event) => update("requiresApproval", event.target.checked)} className="h-5 w-5" /><span className="text-sm font-black text-[#00334E]">Precisa de aprovação</span></label>
              <label className="grid gap-1 md:col-span-2"><span className="text-sm font-black text-[#00334E]">Observações</span><textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} className="min-h-24 rounded-2xl border border-slate-200 p-3" placeholder="Descreva objetivo, público, responsáveis, materiais, comunicação e qualquer regra importante." /></label>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={saveEvent} disabled={saving || !form.title.trim()} className="rounded-2xl bg-[#00334E] px-5 py-3 font-black text-white disabled:opacity-60">{form.eventId ? "Salvar e reenviar para aprovação" : "Enviar para aprovação"}</button>{form.eventId && <button type="button" onClick={() => setForm(emptyForm)} className="rounded-2xl bg-slate-100 px-5 py-3 font-black text-[#00334E]">Cancelar edição</button>}</div>
          </section>

          <section className="rounded-[2rem] bg-[#00334E] p-5 text-white shadow sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-200">Tucxa — validação inicial</p>
            <h2 className="mt-2 text-2xl font-black">Regras mínimas antes de publicar atividades</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {AGENDA_VIVA_TUCXA_INITIAL_RULES.map((item) => <div key={item} className="rounded-2xl bg-white/10 p-4 text-sm font-semibold leading-6 text-white/85">{item}</div>)}
            </div>
          </section>

          <section className="overflow-hidden rounded-[2.5rem] bg-[#eef8b9] p-0 shadow ring-1 ring-lime-200">
            <div className="relative overflow-hidden bg-gradient-to-br from-white via-lime-50 to-[#e6f59b] px-5 py-8 sm:px-8">
              <div className="absolute right-4 top-3 hidden text-8xl opacity-20 md:block">🌿</div>
              <div className="relative z-10 flex flex-col gap-2">
                <p className="text-2xl font-black uppercase tracking-[0.24em] text-[#2F3F16] sm:text-3xl">Julho Cultural</p>
                <p className="text-sm font-black uppercase tracking-[0.55em] text-[#2F3F16]">TUCXA</p>
                <h2 className="mt-8 text-5xl font-black text-[#3B4E16] sm:text-6xl">Calendário</h2>
                <p className="text-xl font-black text-[#3B4E16] sm:text-2xl">Julho 2026</p>
              </div>
            </div>

            <div className="relative bg-[#dff28f] p-3 sm:p-6">
              <div className="pointer-events-none absolute bottom-0 left-1/2 hidden -translate-x-1/2 text-8xl opacity-20 md:block">🤲🏾</div>
              <div className="relative z-10 grid grid-cols-7 gap-2 text-center text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#3B4E16]/70 sm:text-xs">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <span key={day}>{day}</span>)}
              </div>
              <div className="relative z-10 mt-2 grid grid-cols-7 gap-2 sm:gap-3">
                {visualMonthCells.map((cell) => {
                  const events = cell.day ? eventsByDay.get(cell.key) ?? [] : [];
                  return (
                    <div key={cell.key} className={`min-h-24 rounded-[1.7rem] p-1.5 ring-1 sm:min-h-32 sm:p-2.5 ${cell.day ? "bg-[#fbffe7]/95 ring-lime-200" : "bg-transparent ring-transparent"}`}>
                      {cell.day && <p className="text-sm font-black text-[#314414] sm:text-base">{String(cell.day).padStart(2, "0")}/07</p>}
                      <div className="mt-1 space-y-1 sm:mt-2">
                        {events.slice(0, 2).map((event) => {
                          const image = eventImageUrl(event);
                          const time = visualTime(event.starts_at, event.all_day);
                          return (
                            <button key={event.id} type="button" title={eventTooltip(event)} onClick={() => editEvent(event)} className={`group relative w-full overflow-hidden rounded-2xl p-1 text-center text-[0.62rem] font-black leading-4 shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md sm:text-[0.72rem] ${colorFor(event, payload.eventTypes)}`}>
                              {image ? <span className="mx-auto mb-1 block h-9 w-9 overflow-hidden rounded-xl bg-white/70 ring-1 ring-white/70 sm:h-11 sm:w-11"><Image src={image} alt={eventImageAlt(event)} width={44} height={44} unoptimized className="h-full w-full object-cover" /></span> : <span className="mx-auto mb-1 block text-xl leading-none sm:text-2xl">{eventEmoji(event)}</span>}
                              <span className="block break-words">{event.title}</span>
                              {time && <span className="block text-[0.58rem] font-black opacity-80 sm:text-[0.68rem]">{time}</span>}
                              <span className="pointer-events-none absolute left-1/2 top-full z-20 hidden w-56 -translate-x-1/2 rounded-2xl bg-white p-3 text-left text-xs font-bold leading-5 text-slate-700 shadow-xl ring-1 ring-slate-100 group-hover:block">{eventTooltip(event)}</span>
                            </button>
                          );
                        })}
                        {events.length > 2 && <span className="block rounded-full bg-lime-200 px-2 py-1 text-[0.65rem] font-black text-lime-950">+{events.length - 2}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#2F6B43]">Próximos compromissos</p>
              <h2 className="mt-2 text-2xl font-black text-[#00334E]">O que vem agora</h2>
              <div className="mt-5 space-y-3">
                {upcomingEvents.map((event) => (
                  <article key={event.id} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><h3 className="font-black text-[#00334E]">{event.title}</h3><span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${publicStatusClass(event.status)}`}>{statusLabels[event.status] ?? event.status}</span></div>
                    <p className="mt-2 text-sm font-semibold text-slate-600">{formatDate(event.starts_at)} · {event.location || "local a confirmar"}</p>
                    <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => editEvent(event)} className="rounded-xl bg-white px-3 py-2 text-sm font-black text-[#00334E] ring-1 ring-slate-100">Editar</button>{["rascunho", "pendente_aprovacao", "ajuste_solicitado"].includes(event.status) && <button type="button" onClick={() => deleteEvent(event.id)} className="rounded-xl bg-red-50 px-3 py-2 text-sm font-black text-red-700">Excluir</button>}</div>
                  </article>
                ))}
                {upcomingEvents.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">Nenhuma atividade futura cadastrada.</p>}
              </div>
            </div>

            <div className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#2F6B43]">Aprovações</p>
              <h2 className="mt-2 text-2xl font-black text-[#00334E]">Pendentes da Presidência/Diretoria</h2>
              <div className="mt-5 space-y-3">
                {pendingEvents.map((event) => (
                  <article key={event.id} className="rounded-3xl bg-amber-50 p-4 ring-1 ring-amber-100">
                    <h3 className="font-black text-[#00334E]">{event.title}</h3>
                    <p className="mt-2 text-sm font-semibold text-slate-700">{formatDate(event.starts_at)} · {event.location || "local a confirmar"}</p>
                    <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => decideEvent(event.id, "approveEvent")} className="rounded-xl bg-[#31C16B] px-3 py-2 text-sm font-black text-[#00334E]">Aprovar</button><button type="button" onClick={() => decideEvent(event.id, "requestAdjustments")} className="rounded-xl bg-white px-3 py-2 text-sm font-black text-[#00334E] ring-1 ring-amber-100">Pedir ajuste</button><button type="button" onClick={() => decideEvent(event.id, "rejectEvent")} className="rounded-xl bg-red-50 px-3 py-2 text-sm font-black text-red-700">Reprovar</button></div>
                  </article>
                ))}
                {pendingEvents.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">Nenhuma solicitação pendente.</p>}
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6">
            <p className="text-sm font-black uppercase tracking-[0.28em] text-[#2F6B43]">Vínculos operacionais</p>
            <h2 className="mt-2 text-2xl font-black text-[#00334E]">O calendário depende da Base Única</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Cada envolvido pode ser associado como cavalinho, cambono, apoio da recepção, organização, Grupo 1, Grupo 2 ou ambos. Assim, cada atividade já nasce com as pessoas certas vinculadas.</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {TUCXA_WEEKDAY_SERVICE_RULES.map((item) => <article key={item.slug} className={`rounded-2xl p-4 text-sm font-semibold leading-6 ring-1 ${item.colorClass}`}><p className="font-black">{item.label}</p><p className="mt-1 font-black">{item.title}</p><p className="mt-2 opacity-80">{item.summary}</p></article>)}
            </div>
          </section>
        </>
      )}
    </OrganizacaoClientShell>
  );
}

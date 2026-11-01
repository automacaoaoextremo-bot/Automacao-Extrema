"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

const API = "/api/organizacao-em-harmonia/filhos-corrente/agendamento-piloto/diagnostico-envios";

type Recipient = {
  personId?: string;
  person?: string;
  entity?: string;
  phone?: string;
  eligible?: boolean;
  source?: string;
  previewMessage?: string;
};
type Diagnostic = { reason: string; phoneMasked?: string };
type DispatchHistory = {
  audience: string;
  recipient_person_id: string;
  status: string;
  audit_email_status: string;
  sent_at: string | null;
};
type Report = {
  ok: boolean;
  date: string;
  holiday: boolean;
  calendarClosed?: boolean;
  weekdayEnabled: boolean;
  messagesSent: number;
  databaseWrites: number;
  configured: {
    deploymentEnvironment?: string;
    auditEmailRecipient?: string;
    auditEmailConfigured?: boolean;
    generalWhatsapp?: boolean;
    generalDispatchAllowedForDate?: boolean;
  };
  receptionSummaryPreview?: { appointmentCount: number; summary?: string; summaryAfternoon?: string };
  counts?: { reminders: number; reception: number; cavalinhos: number };
  recepcao?: Recipient[];
  cavalinhos?: Recipient[];
  additionalReceptionDiagnostics?: Diagnostic[];
  dispatchHistory?: DispatchHistory[];
};
type Tab = "resumo" | "recepcao" | "cavalinhos" | "auditoria";
const PER_PAGE = 4;

async function authorizedGet(query: string): Promise<unknown> {
  const { data: { session } } = await supabaseBrowser.auth.getSession();
  if (!session?.access_token) throw new Error("Entre no sistema com seu acesso da Recepção.");
  const response = await fetch(`${API}?${query}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: "no-store",
  });
  const json = await response.json();
  if (!response.ok || !json.ok) throw new Error(json.error || "Falha ao consultar os envios.");
  return json;
}
function dateLabel(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC", weekday: "short", day: "2-digit", month: "2-digit", year: "numeric",
  }).format(date);
}
/** Um mesmo contato não deve aparecer repetidamente para o mesmo público. */
function uniqueSortedRecipients(items: Recipient[]): Recipient[] {
  const map = new Map<string, Recipient>();
  for (const item of items) {
    const key = item.personId || item.phone || `${item.person || ""}:${item.entity || ""}`;
    if (!map.has(key)) map.set(key, item);
  }
  return [...map.values()].sort((a, b) => (a.person || "").localeCompare(b.person || "", "pt-BR", { sensitivity: "base" }));
}
function occurrenceDateLabel(iso: string): string {
  const base = dateLabel(iso);
  const occurrence = Math.floor((Number(iso.slice(8, 10)) - 1) / 7) + 1;
  const weekday = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return `${base} · ${occurrence}ª ${weekday === 1 ? "segunda" : "terça"} do mês`;
}
function errorText(e: unknown): string {
  return e instanceof Error ? e.message : "Não foi possível consultar os dados.";
}
function Pager({ page, count, onPage }: { page: number; count: number; onPage: (page: number) => void }) {
  const pages = Math.ceil(count / PER_PAGE);
  if (pages < 2) return null;
  return <div className="mt-3 flex items-center justify-between gap-2 text-sm font-bold text-[#123D2C]">
    <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Anterior</button>
    <span>Página {page} de {pages}</span>
    <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Próxima</button>
  </div>;
}

/** Apenas consultas: nenhuma rota desta tela cria envios ou grava dados. */
export function TucxaDiagnosticoEnviosContent() {
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [tab, setTab] = useState<Tab>("resumo");
  const [page, setPage] = useState(1);
  const [datesLoading, setDatesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ title: string; message: string } | null>(null);

  const inspect = useCallback(async (iso: string) => {
    if (!iso) return;
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const result = await authorizedGet(`date=${encodeURIComponent(iso)}`) as Report;
      setReport(result);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void authorizedGet("mode=dates").then((result) => {
      if (!active) return;
      const raw = (result as { dates?: unknown }).dates;
      const dates = Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s)) : [];
      setAvailableDates(dates);
      const first = dates[0] || "";
      setDate(first);
      if (first) void inspect(first);
    }).catch((e: unknown) => {
      if (active) setError(errorText(e));
    }).finally(() => {
      if (active) setDatesLoading(false);
    });
    return () => { active = false; };
  }, [inspect]);

  const excluded = Boolean(report && (report.holiday || report.calendarClosed || !report.weekdayEnabled || !report.configured.generalDispatchAllowedForDate));
  const reception = uniqueSortedRecipients(report?.recepcao || []);
  const cavalinhos = uniqueSortedRecipients(report?.cavalinhos || []);
  const history = report?.dispatchHistory || [];
  const selectTab = (next: Tab) => { setTab(next); setPage(1); };
  const visible = <T,>(items: T[]) => items.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return <div className="grid gap-3 text-[#123D2C]">
    <p className="text-xs text-slate-600">Pré-verificação somente leitura. Não dispara WhatsApp, não envia e-mail e não grava dados.</p>
    <form onSubmit={(event) => { event.preventDefault(); void inspect(date); }} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
      <label className="grid min-w-0 gap-1 text-xs font-bold">Data do atendimento
        <select aria-label="Data do atendimento" value={date} disabled={datesLoading || availableDates.length === 0} onChange={(event) => { setDate(event.target.value); setPage(1); setReport(null); }} className="min-w-0 rounded-xl border border-[#C6D7CB] bg-white px-2 py-3 text-sm">
          {!date && <option value="">{datesLoading ? "Carregando..." : "Selecione a data"}</option>}
          {availableDates.map((iso) => <option key={iso} value={iso}>{occurrenceDateLabel(iso)}</option>)}
        </select>
      </label>
      <button type="submit" disabled={!date || datesLoading || loading} className="rounded-xl bg-[#123D2C] px-3 py-3 text-xs font-bold text-white disabled:opacity-50">
        {loading ? "Consultando..." : "Verificar"}
      </button>
    </form>
    {!datesLoading && availableDates.length === 0 && !error && <p className="rounded-xl bg-amber-50 p-3 text-sm">Não há datas futuras previstas na escala. Verifique as configurações das Entidades.</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
    {report && <>
      <div className={`rounded-xl p-3 text-xs font-semibold ${excluded ? "bg-amber-50 text-amber-900" : "bg-green-50 text-green-900"}`}>
        {report.holiday ? "Feriado ou centro fechado: nenhum envio elegível." : report.calendarClosed ? "Centro sem atendimento conforme calendário cadastrado: sem envios." : excluded ? "Envios não autorizados para esta data." : "Dia habilitado: previsão de destinatários, não confirmação de entrega."}
        <p className="mt-1">Consulta: {report.messagesSent} mensagens enviadas · {report.databaseWrites} gravações.</p>
      </div>
      <div role="tablist" aria-label="Detalhes do diagnóstico" className="grid grid-cols-4 gap-1">
        {(["resumo", "recepcao", "cavalinhos", "auditoria"] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => selectTab(item)} className={`rounded-lg px-1 py-2 text-[10px] font-bold sm:text-xs ${tab === item ? "bg-[#123D2C] text-white" : "bg-[#EFF5EF] text-[#123D2C]"}`}>
          {item === "resumo" ? "Resumo" : item === "recepcao" ? "Recepção" : item === "cavalinhos" ? "Cavalinhos" : "Auditoria"}
        </button>)}
      </div>
      {tab === "resumo" && <section role="tabpanel" className="grid gap-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([[
            "Agendamentos", report.receptionSummaryPreview?.appointmentCount ?? 0,
          ], ["Lembretes", report.counts?.reminders ?? 0], ["Recepção", report.counts?.reception ?? 0], ["Cavalinhos", report.counts?.cavalinhos ?? 0]] as Array<[string, number]>).map(([label, value]) => <div key={label} className="rounded-xl border border-[#E0EAE1] p-3"><strong className="block text-2xl">{value}</strong><span className="text-xs">{label}</span></div>)}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setPreview({ title: "Prévia da Recepção — 8h", message: report.receptionSummaryPreview?.summary || "Sem resumo para a data." })} className="rounded-xl bg-[#E9F2E7] p-3 text-xs font-bold">Prévia das 8h</button>
          <button type="button" onClick={() => setPreview({ title: "Atualização da Recepção — 16h", message: report.receptionSummaryPreview?.summaryAfternoon || "Sem resumo para a data." })} className="rounded-xl bg-[#E9F2E7] p-3 text-xs font-bold">Atualização das 16h</button>
        </div>
        <p className="text-xs text-slate-500">O horário exibido nas mensagens é de referência. A entrega deve ser confirmada pelos registros da integração.</p>
      </section>}
      {tab === "recepcao" && <section role="tabpanel" className="grid gap-2">
        <p className="text-xs text-slate-500">Prévia às 8h e atualização às 16h. Destinatários únicos, identificados pelo número de celular.</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="rounded-lg bg-[#E9F2E7] p-2 text-xs font-bold" onClick={() => setPreview({ title: "Prévia da Recepção — 8h", message: report.receptionSummaryPreview?.summary || "Sem resumo." })}>Ver mensagem das 8h</button>
          <button type="button" className="rounded-lg bg-[#E9F2E7] p-2 text-xs font-bold" onClick={() => setPreview({ title: "Atualização da Recepção — 16h", message: report.receptionSummaryPreview?.summaryAfternoon || "Sem resumo." })}>Ver mensagem das 16h</button>
        </div>
        {reception.length === 0 && <p className="text-sm">Nenhum destinatário previsto.</p>}
        {visible(reception).map((person, index) => <div key={`${person.personId || "p"}-${(page - 1) * PER_PAGE + index}`} className="rounded-xl border border-[#E0EAE1] p-3 text-sm"><div className="flex items-center justify-between gap-2"><strong>{person.person || "Cadastro não localizado"}</strong><span className={`text-xs font-bold ${person.eligible ? "text-green-700" : "text-amber-700"}`}>{person.eligible ? "Elegível" : "Não elegível"}</span></div><p className="text-xs text-slate-600">{person.phone || "Celular indisponível"} · {person.source === "additional_recipient" ? "Destinatário adicional" : "Escala da Recepção"}</p></div>)}
        <Pager page={page} count={reception.length} onPage={setPage} />
        {(report.additionalReceptionDiagnostics || []).length > 0 && <details className="rounded-xl bg-amber-50 p-3"><summary className="text-xs font-bold">Diagnósticos de contatos adicionais</summary>{report.additionalReceptionDiagnostics?.map((item, i) => <p key={i} className="text-xs">{item.phoneMasked || "***"} — {item.reason}</p>)}</details>}
      </section>}
      {tab === "cavalinhos" && <section role="tabpanel" className="grid gap-2">
        <p className="text-xs text-slate-500">Entidades escaladas sem agendamentos também aparecem; entidades indisponíveis ficam excluídas.</p>
        {cavalinhos.length === 0 && <p className="text-sm">Nenhum Cavalinho previsto.</p>}
        {visible(cavalinhos).map((person, index) => <div key={`${person.personId || "p"}-${(page - 1) * PER_PAGE + index}`} className="rounded-xl border border-[#E0EAE1] p-3 text-sm"><div className="flex items-center justify-between gap-2"><button type="button" onClick={() => setPreview({ title: `Mensagem prevista para ${person.person || "Cavalinho"}`, message: person.previewMessage || "Mensagem não disponível." })} className="text-left font-bold text-[#176A3A] underline underline-offset-2" aria-label={`Ver mensagem prevista para ${person.person || "Cavalinho"}`}>{person.person || "Cadastro não localizado"}</button><span className={`text-xs font-bold ${person.eligible ? "text-green-700" : "text-amber-700"}`}>{person.eligible ? "Elegível" : "Não elegível"}</span></div><p className="text-xs text-slate-600">{person.entity || "Entidade"} · {person.phone || "Celular indisponível"}</p></div>)}
        <Pager page={page} count={cavalinhos.length} onPage={setPage} />
      </section>}
      {tab === "auditoria" && <section role="tabpanel" className="grid gap-2">
        <div className="grid gap-1 rounded-xl bg-[#F6F8F4] p-3 text-xs"><p>Ambiente: <strong>{report.configured.deploymentEnvironment || "Não informado"}</strong></p><p>BotConversa: <strong>{report.configured.generalWhatsapp ? "Habilitado" : "Desabilitado"}</strong></p><p>SMTP: <strong>{report.configured.auditEmailConfigured ? "Configurado" : "Não configurado"}</strong></p><p>E-mail de auditoria: <strong>{report.configured.auditEmailRecipient || "Não informado"}</strong></p></div>
        {history.length === 0 && <p className="text-sm">Nenhum envio registrado para esta data.</p>}
        {visible(history).map((entry, i) => <div key={`${entry.recipient_person_id}-${i}`} className="rounded-xl border border-[#E0EAE1] p-3 text-xs"><strong>{entry.audience === "reception_preview" ? "Prévia da Recepção" : entry.audience === "reception" ? "Atualização da Recepção" : "Cavalinho"}</strong><p>Status: {entry.status} · Auditoria: {entry.audit_email_status}</p><p>{entry.sent_at ? new Date(entry.sent_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "Sem horário de envio"}</p></div>)}
        <Pager page={page} count={history.length} onPage={setPage} />
        <p className="text-xs text-slate-500">Registro de disparo não comprova recebimento no aparelho.</p>
      </section>}
    </>}
    {preview && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-3" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(null); }}>
      <section role="dialog" aria-modal="true" aria-label={preview.title} className="flex max-h-[86dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b p-3"><h3 className="text-sm font-black">{preview.title}</h3><button type="button" autoFocus onClick={() => setPreview(null)} className="rounded-lg bg-[#123D2C] px-3 py-2 text-xs font-bold text-white">Fechar</button></header>
        <pre className="overflow-y-auto whitespace-pre-wrap break-words p-4 text-xs leading-5">{preview.message}</pre>
        <p className="border-t p-3 text-[11px] text-slate-500">Somente previsão de conteúdo; nenhum WhatsApp ou e-mail foi enviado.</p>
      </section>
    </div>}
  </div>;
}

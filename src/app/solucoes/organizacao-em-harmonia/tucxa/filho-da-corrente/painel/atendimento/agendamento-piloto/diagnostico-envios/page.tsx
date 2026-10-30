"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

const BASE = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento/agendamento-piloto";
const API = "/api/organizacao-em-harmonia/filhos-corrente/agendamento-piloto/diagnostico-envios";

type Recipient = {
  personId?: string;
  person?: string;
  entity?: string;
  phone?: string;
  eligible?: boolean;
  source?: string;
  uniquePhone?: boolean;
};
type Diagnostic = { reason: string; phoneMasked?: string };
type Report = {
  ok: boolean;
  dryRun: boolean;
  date: string;
  holiday: boolean;
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
  receptionSummaryPreview?: {appointmentCount: number; summary?: string};
  counts?: {reminders: number; reception: number; cavalinhos: number};
  recepcao?: Recipient[];
  cavalinhos?: Recipient[];
  additionalReceptionDiagnostics?: Diagnostic[];
  dispatchHistory?: Array<{
    audience: string;
    recipient_person_id: string;
    status: string;
    audit_email_status: string;
    sent_at: string | null;
  }>;
};
function todayCampinas() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find(item => item.type === type)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}
function masked(value?: string) {
  if (!value) return "Celular não informado";
  return value;
}

/** Consulta apenas os dados de diagnóstico, sem realizar disparos ou gravações. */
async function fetchReport(selectedDate: string): Promise<Report> {
  const { data: { session } } = await supabaseBrowser.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Entre no sistema com seu acesso da Recepção.");
  }
  const response = await fetch(`${API}?date=${encodeURIComponent(selectedDate)}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.error || "Não foi possível consultar os envios.");
  }
  return result as Report;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Falha ao consultar.";
}

export default function TucxaDiagnosticoEnvios() {
  const [initialDate] = useState(todayCampinas);
  const [date, setDate] = useState(initialDate);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const inspect = useCallback(async (selectedDate: string) => {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      setReport(await fetchReport(selectedDate));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Consulta inicial assíncrona; trocar a data não gera consulta até clicar em Verificar.
  // As atualizações de estado ocorrem após a Promise, não dentro do efeito síncrono.
  useEffect(() => {
    let active = true;
    void fetchReport(initialDate)
      .then((result) => {
        if (active) setReport(result);
      })
      .catch((err: unknown) => {
        if (active) setError(errorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [initialDate]);

  const excluded = report?.holiday || !report?.weekdayEnabled || !report?.configured.generalDispatchAllowedForDate;

  return (
    <main className="min-h-screen bg-[#F3F7F0] px-3 py-6 text-[#123D2C] sm:px-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          <Link href={BASE} className="text-sm font-bold text-[#2F6B43]">← Voltar aos Agendamentos</Link>
          <h1 className="mt-3 text-2xl font-black sm:text-3xl">Diagnóstico dos Envios Automáticos</h1>
          <p className="mt-2 text-sm text-slate-600">Pré-verificação sem disparos, inclusive em ambiente Preview. Apenas consulta os dados do TUCXA: não dispara WhatsApp, não envia e-mail e não grava no banco.</p>
          <form onSubmit={e => {e.preventDefault(); void inspect(date);}} className="mt-5 flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm font-semibold">
              Data do atendimento
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                required className="rounded-lg border border-[#C6D7CB] bg-white p-2.5" />
            </label>
            <button type="submit" disabled={loading || !date}
              className="rounded-xl bg-[#123D2C] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
              {loading ? "Consultando..." : "Verificar programação"}
            </button>
          </form>
        </header>

        {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</p>}
        {report && (
          <>
            <div className={`rounded-2xl p-4 text-sm font-semibold ${excluded ? "bg-amber-100 text-amber-900" : "bg-green-100 text-green-900"}`}>
              {report.holiday ? "Feriado / centro fechado: todos os envios estão inelegíveis."
                : excluded ? "Dia não liberado para os envios automáticos."
                  : "Dia habilitado. Os destinatários abaixo são uma previsão, não confirmação de entrega."}
              <p className="mt-1 text-xs">Simulação: {report.messagesSent} mensagens enviadas · {report.databaseWrites} alterações no banco.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["Agendamentos", report.receptionSummaryPreview?.appointmentCount ?? 0],
                ["Lembretes elegíveis", report.counts?.reminders ?? 0],
                ["Recepção elegível", report.counts?.reception ?? 0],
                ["Cavalinhos elegíveis", report.counts?.cavalinhos ?? 0],
              ].map(([label,value]) => (
                <div key={label} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="text-3xl font-black">{value}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-600">{label}</div>
                </div>
              ))}
            </div>
            <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-lg font-black">Recepção — prévia 8h e atualização 16h</h2>
              <p className="mb-3 text-xs text-slate-600">A escala e os destinatários adicionais autorizados são combinados sem duplicar o mesmo celular.</p>
              <div className="space-y-2">
                {(report.recepcao || []).length === 0 && <p className="text-sm text-slate-500">Nenhum destinatário previsto para esta data.</p>}
                {(report.recepcao || []).map((person, index) => (
                  <div key={person.personId || index} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E0EAE1] px-3 py-2">
                    <div>
                      <div className="font-bold">{person.person || "Cadastro não localizado"}</div>
                      <div className="text-xs text-slate-600">{masked(person.phone)} · {person.source === "additional_recipient" ? "Destinatário adicional" : "Escala da Recepção"}</div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${person.eligible ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"}`}>
                      {person.eligible ? "Elegível" : "Não elegível"}
                    </span>
                  </div>
                ))}
              </div>
              {(report.additionalReceptionDiagnostics || []).length > 0 && (
                <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                  <strong>Contatos adicionais que precisam de atenção:</strong>
                  {(report.additionalReceptionDiagnostics || []).map((item, i) => (
                    <p key={i}>{item.phoneMasked || "***"} — {item.reason}</p>
                  ))}
                </div>
              )}
            </section>
            <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-lg font-black">Cavalinhos</h2>
              <p className="mb-3 text-xs text-slate-600">Entidades suspensas não devem entrar nesta lista; cavalinho sem agendamento permanece elegível quando escalado.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(report.cavalinhos || []).map((item, i) => (
                  <div key={`${item.personId}-${item.entity}-${i}`} className="rounded-xl border border-[#E0EAE1] p-3">
                    <div className="text-sm font-bold">{item.person || "Não localizado"}</div>
                    <div className="text-xs text-slate-600">{item.entity || "Entidade"} · {masked(item.phone)}</div>
                    <div className={`mt-1 text-xs font-semibold ${item.eligible ? "text-green-700" : "text-amber-700"}`}>{item.eligible ? "Elegível" : "Não elegível"}</div>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-lg font-black">Execuções registradas para a data</h2>
              <p className="mb-3 text-xs text-slate-600">Dados de histórico do Supabase (não comprovam entrega do WhatsApp ao aparelho).</p>
              {(report.dispatchHistory || []).length === 0
                ? <p className="text-sm text-slate-500">Nenhum disparo registrado até o momento.</p>
                : <div className="grid gap-2 sm:grid-cols-2">
                    {(report.dispatchHistory || []).map((item, index) => (
                      <div key={`${item.audience}-${item.recipient_person_id}-${index}`} className="rounded-xl border border-[#E0EAE1] p-3 text-sm">
                        <strong>{item.audience === "reception_preview" ? "Prévia da Recepção" : item.audience === "reception" ? "Atualização da Recepção" : "Cavalinho"}</strong>
                        <p className="text-xs text-slate-600">Status: {item.status} · Auditoria: {item.audit_email_status}</p>
                        <p className="text-xs text-slate-600">Registrado: {item.sent_at ? new Date(item.sent_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "sem horário de envio"}</p>
                      </div>
                    ))}
                  </div>}
            </section>
            <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-lg font-black">Configurações e auditoria</h2>
              <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                <div>Ambiente: <strong>{report.configured.deploymentEnvironment || "Não informado"}</strong></div>
                <div>BotConversa: <strong>{report.configured.generalWhatsapp ? "Habilitado" : "Não habilitado"}</strong></div>
                <div>SMTP: <strong>{report.configured.auditEmailConfigured ? "Configurado" : "Não configurado"}</strong></div>
                <div>E-mail de auditoria: <strong>{report.configured.auditEmailRecipient || "Não informado"}</strong></div>
              </dl>
              <p className="mt-3 text-xs text-slate-500">Esta tela não comprova entrega pelo BotConversa nem recebimento SMTP. Para confirmar envios realizados, consulte os logs e o histórico de disparos.</p>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-bold">Ver texto previsto para o resumo da Recepção</summary>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-[#F6F8F4] p-3 text-xs">{report.receptionSummaryPreview?.summary || "Sem resumo para a data."}</pre>
              </details>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

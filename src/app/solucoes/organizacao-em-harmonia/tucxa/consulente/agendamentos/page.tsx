"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ConsulentePanelHeader } from "@/components/organizacao-em-harmonia/consulente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Appointment = {
  id: string;
  eventId: string | null;
  appointmentDate: string;
  appointmentTime: string;
  appointmentStartTime: string;
  status: string;
  notes: string | null;
  order: number | null;
  canEdit: boolean;
  canDelete: boolean;
  editDeadline: string | null;
  editBlockedReason: string;
  cancelledAt: string | null;
  cancellationReason: string | null;
  entity: {
    id: string | null;
    name: string;
    line: string | null;
    entityType: string | null;
    guidance: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

type Payload = {
  profile: {
    fullName: string;
    whatsapp: string;
    email: string;
    communicationsOptIn: boolean;
  };
  appointments: Appointment[];
  settings: {
    appointmentEditCutoffMinutes: number;
  };
};

const LOGIN_PATH = "/solucoes/organizacao-em-harmonia/tucxa/consulente/login";
const BOOKING_PATH = "/solucoes/organizacao-em-harmonia/tucxa/consulente/agendar";
const API_PATH = "/api/organizacao-em-harmonia/site-tucxa/agendamentos";
const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

function todayInSaoPaulo() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function dateFromIso(value: string) {
  const [year = "", month = "", day = ""] = value.split("-");
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
}

function longDateLabel(isoDate: string) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateFromIso(isoDate));
  return label.charAt(0).toLocaleUpperCase("pt-BR") + label.slice(1);
}

function dateTimeLabel(value: string | null) {
  if (!value) return "Não informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: SAO_PAULO_TIME_ZONE,
  }).format(date);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    confirmado: "Confirmado",
    solicitado: "Solicitado",
    aprovado: "Aprovado",
    presente: "Presente",
    concluido: "Concluído",
    cancelado: "Excluído",
    cancelamento_solicitado: "Exclusão solicitada",
    ausente: "Ausente",
  };
  return labels[status] || status.replaceAll("_", " ");
}

function statusClasses(status: string) {
  if (["confirmado", "aprovado", "presente", "concluido"].includes(status)) return "bg-emerald-50 text-emerald-800 ring-emerald-100";
  if (["cancelado", "ausente"].includes(status)) return "bg-red-50 text-red-700 ring-red-100";
  return "bg-amber-50 text-amber-800 ring-amber-100";
}

export default function AgendamentosConsulentePage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [requestCode, setRequestCode] = useState("");
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [blockedEdit, setBlockedEdit] = useState<Appointment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);

  const authorizedFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.href = `${LOGIN_PATH}?returnTo=${encodeURIComponent(returnTo)}`;
      throw new Error("Sua sessão expirou.");
    }

    const response = await fetch(input, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });
    const result = await response.json();
    if (response.status === 401) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.href = `${LOGIN_PATH}?returnTo=${encodeURIComponent(returnTo)}`;
      throw new Error("Sua sessão expirou.");
    }
    if (!response.ok) {
      const routeError = new Error(result.error || "Não foi possível concluir a ação.");
      Object.assign(routeError, { requestId: result.requestId || "" });
      throw routeError;
    }
    return result;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setRequestCode("");
    try {
      const result = await authorizedFetch(`${API_PATH}?view=mine`);
      setPayload(result as Payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar seus agendamentos.");
      setRequestCode(String((err as { requestId?: string })?.requestId || ""));
    } finally {
      setLoading(false);
    }
  }, [authorizedFetch]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function cancelAppointment() {
    if (!cancelTarget) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await authorizedFetch(API_PATH, {
        method: "POST",
        body: JSON.stringify({ action: "cancel", appointmentId: cancelTarget.id }),
      });
      setMessage(result.message || "Agendamento excluído.");
      setCancelTarget(null);
      setSelected(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir o agendamento.");
      setRequestCode(String((err as { requestId?: string })?.requestId || ""));
    } finally {
      setSaving(false);
    }
  }

  const today = todayInSaoPaulo();
  const upcoming = useMemo(
    () => (payload?.appointments ?? [])
      .filter((appointment) => appointment.appointmentDate >= today && !["cancelado", "ausente"].includes(appointment.status))
      .sort((left, right) => left.appointmentDate.localeCompare(right.appointmentDate) || left.appointmentStartTime.localeCompare(right.appointmentStartTime)),
    [payload?.appointments, today],
  );
  const previous = useMemo(
    () => (payload?.appointments ?? [])
      .filter((appointment) => appointment.appointmentDate < today || ["cancelado", "ausente"].includes(appointment.status))
      .sort((left, right) => right.appointmentDate.localeCompare(left.appointmentDate) || right.appointmentStartTime.localeCompare(left.appointmentStartTime)),
    [payload?.appointments, today],
  );

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <ConsulentePanelHeader navLabel="Meus agendamentos" />
      <section className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
        <header className="rounded-[1.75rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7]">Atendimento em Harmonia</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-black leading-tight sm:text-4xl">Agendamentos</h1>
              <p className="mt-2 text-sm font-semibold text-[#EEF7EA]">Consulte, altere dentro do prazo definido pelo TUCXA ou exclua um agendamento a qualquer momento.</p>
            </div>
            <Link href={BOOKING_PATH} className="flex min-h-13 items-center justify-center rounded-2xl bg-white px-5 py-4 font-black text-[#123D2C]">Novo agendamento</Link>
          </div>
        </header>

        {loading && <p className="mt-4 rounded-2xl bg-white p-4 font-bold text-slate-600 ring-1 ring-[#123D2C]/10">Carregando seus agendamentos...</p>}
        {message && <p className="mt-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}
        {error && (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700 ring-1 ring-red-100">
            <p>{error}</p>
            {requestCode && <p className="mt-1 text-xs">Código para suporte: {requestCode}</p>}
            <button type="button" onClick={() => void load()} className="mt-3 rounded-xl bg-white px-4 py-2 text-sm font-black ring-1 ring-red-200">Tentar novamente</button>
          </div>
        )}

        {!loading && payload && (
          <div className="mt-4 grid gap-5">
            <AppointmentSection title="Próximos agendamentos" appointments={upcoming} emptyText="Você não possui próximos agendamentos." onView={setSelected} onBlockedEdit={setBlockedEdit} onCancel={setCancelTarget} />
            <AppointmentSection title="Agendamentos anteriores" appointments={previous} emptyText="Nenhum agendamento anterior encontrado." onView={setSelected} onBlockedEdit={setBlockedEdit} onCancel={setCancelTarget} />
          </div>
        )}
      </section>

      {selected && (
        <Modal title="Detalhes do agendamento" onClose={() => setSelected(null)}>
          <div className="grid gap-3 text-sm font-semibold leading-6 text-slate-700">
            <Detail label="Data">{longDateLabel(selected.appointmentDate)}</Detail>
            <Detail label="Período/horário">{selected.appointmentTime}</Detail>
            <Detail label="Entidade">{selected.entity.name}</Detail>
            <Detail label="Linha/tipo">{selected.entity.line || selected.entity.entityType || "Não informado"}</Detail>
            <Detail label="Ordem">{selected.order ?? "A confirmar"}</Detail>
            <Detail label="Status"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${statusClasses(selected.status)}`}>{statusLabel(selected.status)}</span></Detail>
            <Detail label="Orientações">{selected.entity.guidance || "Siga as orientações da recepção no dia do atendimento."}</Detail>
            {selected.notes && <Detail label="Observação informada">{selected.notes}</Detail>}
            {!selected.canEdit && selected.editBlockedReason && <Detail label="Edição">{selected.editBlockedReason}</Detail>}
            {selected.cancelledAt && <Detail label="Excluído em">{dateTimeLabel(selected.cancelledAt)}</Detail>}
          </div>
          <AppointmentActions appointment={selected} onBlockedEdit={setBlockedEdit} onCancel={setCancelTarget} />
        </Modal>
      )}

      {blockedEdit && (
        <Modal title="Edição indisponível" onClose={() => setBlockedEdit(null)}>
          <p className="rounded-2xl bg-amber-50 p-4 font-bold leading-6 text-amber-900 ring-1 ring-amber-100">{blockedEdit.editBlockedReason || "Este agendamento não pode mais ser alterado."}</p>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">A opção Excluir continua disponível, conforme a regra da organização.</p>
        </Modal>
      )}

      {cancelTarget && (
        <Modal title="Excluir agendamento?" onClose={() => !saving && setCancelTarget(null)}>
          <p className="rounded-2xl bg-red-50 p-4 font-bold leading-6 text-red-800 ring-1 ring-red-100">Confirma a exclusão do agendamento de {longDateLabel(cancelTarget.appointmentDate)}, no período {cancelTarget.appointmentTime}, com {cancelTarget.entity.name}?</p>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">A vaga será liberada. Para segurança e histórico da organização, o registro será marcado como excluído, sem apagamento físico.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" disabled={saving} onClick={() => setCancelTarget(null)} className="min-h-13 rounded-2xl bg-white px-4 font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">Voltar</button>
            <button type="button" disabled={saving} onClick={() => void cancelAppointment()} className="min-h-13 rounded-2xl bg-red-700 px-4 font-black text-white disabled:opacity-60">{saving ? "Excluindo..." : "Excluir"}</button>
          </div>
        </Modal>
      )}
    </main>
  );
}

function AppointmentSection({
  title,
  appointments,
  emptyText,
  onView,
  onBlockedEdit,
  onCancel,
}: {
  title: string;
  appointments: Appointment[];
  emptyText: string;
  onView: (appointment: Appointment) => void;
  onBlockedEdit: (appointment: Appointment) => void;
  onCancel: (appointment: Appointment) => void;
}) {
  return (
    <section className="rounded-[1.75rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-black text-[#123D2C]">{title}</h2>
        <span className="rounded-full bg-[#E9F2E7] px-3 py-1 text-xs font-black text-[#123D2C]">{appointments.length}</span>
      </div>
      <div className="mt-3 grid gap-2">
        {appointments.map((appointment) => (
          <article key={appointment.id} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="font-black text-[#123D2C]">{appointment.entity.name}</h3>
                <p className="mt-1 text-sm font-semibold text-slate-600">{longDateLabel(appointment.appointmentDate)} · {appointment.appointmentTime}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`rounded-full px-2 py-1 text-[0.68rem] font-black ring-1 ${statusClasses(appointment.status)}`}>{statusLabel(appointment.status)}</span>
                  {appointment.order && <span className="rounded-full bg-white px-2 py-1 text-[0.68rem] font-black text-[#123D2C] ring-1 ring-slate-200">Ordem {appointment.order}</span>}
                </div>
              </div>
              <AppointmentActions appointment={appointment} onView={() => onView(appointment)} onBlockedEdit={onBlockedEdit} onCancel={onCancel} compact />
            </div>
          </article>
        ))}
        {!appointments.length && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">{emptyText}</p>}
      </div>
    </section>
  );
}

function AppointmentActions({
  appointment,
  onView,
  onBlockedEdit,
  onCancel,
  compact = false,
}: {
  appointment: Appointment;
  onView?: () => void;
  onBlockedEdit: (appointment: Appointment) => void;
  onCancel: (appointment: Appointment) => void;
  compact?: boolean;
}) {
  return (
    <div className={`${compact ? "grid grid-cols-3" : "mt-4 grid grid-cols-2"} gap-2`}>
      {onView && <button type="button" onClick={onView} className="min-h-11 rounded-xl bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">Visualizar</button>}
      {appointment.canEdit ? (
        <Link href={`${BOOKING_PATH}?edit=${encodeURIComponent(appointment.id)}`} className="flex min-h-11 items-center justify-center rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white">Editar</Link>
      ) : (
        <button type="button" onClick={() => onBlockedEdit(appointment)} className="min-h-11 rounded-xl bg-slate-200 px-3 py-2 text-xs font-black text-slate-600">Editar</button>
      )}
      {appointment.canDelete && <button type="button" onClick={() => onCancel(appointment)} className="min-h-11 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-100">Excluir</button>}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return <div className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10"><p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#2F6B43]">{label}</p><div className="mt-1">{children}</div></div>;
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#10251C]/75 p-2 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <section className="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-[2rem]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#123D2C]/10 p-3 sm:p-4">
          <h2 className="min-w-0 truncate text-base font-black uppercase tracking-[0.13em] text-[#123D2C] sm:text-xl">{title}</h2>
          <button type="button" onClick={onClose} className="min-h-11 shrink-0 rounded-2xl bg-[#123D2C] px-4 text-sm font-black text-white">Fechar</button>
        </header>
        <div className="overflow-y-auto p-4 sm:p-5">{children}</div>
      </section>
    </div>
  );
}

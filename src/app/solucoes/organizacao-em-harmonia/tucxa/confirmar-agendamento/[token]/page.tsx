"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const API_PATH = "/api/organizacao-em-harmonia/site-tucxa/agendamento-piloto/confirmar";

type Appointment = {
  id: string;
  firstName: string;
  appointmentDate: string;
  appointmentDateLabel: string;
  appointmentTime: string;
  entityName: string;
  status: string;
  confirmationStatus: string;
  confirmationExpiresAt: string;
  confirmedAt: string;
};

export default function ConfirmarAgendamentoTucxaPage() {
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === "string" ? params.token : "";
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_PATH}?token=${encodeURIComponent(token)}`, { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as { appointment?: Appointment; error?: string };
      if (!response.ok || !data.appointment) throw new Error(data.error || "Link de confirmação não localizado.");
      setAppointment(data.appointment);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível abrir este link.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function respond(action: "confirm" | "decline") {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action }),
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível registrar sua resposta.");
      setMessage(data.message || "Resposta registrada.");
      await load();
    } catch (respondError) {
      setError(respondError instanceof Error ? respondError.message : "Não foi possível registrar sua resposta.");
    } finally {
      setSaving(false);
    }
  }

  const pending = appointment?.confirmationStatus === "pending";
  const confirmed = appointment?.confirmationStatus === "confirmed";
  const declined = appointment?.confirmationStatus === "declined" || appointment?.status === "cancelado";
  const expired = appointment?.confirmationStatus === "expired";

  return (
    <main className="min-h-screen bg-[#F7FAF2] px-3 py-5 text-[#10251C] sm:py-10">
      <section className="mx-auto max-w-xl overflow-hidden rounded-[2rem] bg-white shadow-xl ring-1 ring-[#123D2C]/10">
        <header className="bg-[#123D2C] p-5 text-white sm:p-7">
          <div className="flex items-center gap-3">
            <Image src="/clientes/tucxa/tucxa-logo.jpg" alt="Tucxa" width={48} height={48} className="h-12 w-12 rounded-full bg-white object-cover" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#CFE2C7]">Tucxa · Atendimento em Harmonia</p>
              <h1 className="mt-1 text-2xl font-black">Confirmação de atendimento</h1>
            </div>
          </div>
        </header>

        <div className="p-5 sm:p-7">
          {loading && <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-600">Validando seu agendamento...</p>}
          {error && <p className="rounded-2xl bg-red-50 p-4 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
          {message && <p className="rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}

          {appointment && (
            <>
              <p className="text-lg font-black text-[#123D2C]">Olá, {appointment.firstName}.</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                Confira os dados abaixo. Sua resposta ajuda a Recepção a organizar as vagas e acolher cada pessoa com mais clareza.
              </p>

              <div className="mt-4 grid gap-2 rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                <Detail label="Data" value={appointment.appointmentDateLabel} />
                <Detail label="Horário" value={appointment.appointmentTime} />
                <Detail label="Entidade" value={appointment.entityName} />
              </div>

              {pending && (
                <div className="mt-4 grid gap-2">
                  <button type="button" disabled={saving} onClick={() => void respond("confirm")} className="rounded-2xl bg-[#123D2C] px-4 py-4 font-black text-white disabled:opacity-50">{saving ? "Registrando..." : "Confirmar minha presença"}</button>
                  <button type="button" disabled={saving} onClick={() => void respond("decline")} className="rounded-2xl bg-red-50 px-4 py-4 font-black text-red-700 ring-1 ring-red-100 disabled:opacity-50">Não poderei comparecer</button>
                </div>
              )}

              {confirmed && <StateBox tone="green" title="Presença confirmada">Seu atendimento está reservado. Obrigado por confirmar.</StateBox>}
              {declined && <StateBox tone="amber" title="Vaga liberada">Recebemos seu aviso de que não poderá comparecer.</StateBox>}
              {expired && <StateBox tone="amber" title="Prazo encerrado">O prazo de confirmação terminou. Entre em contato com a Recepção do Tucxa para verificar a situação do atendimento.</StateBox>}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-3"><span className="text-xs font-black uppercase tracking-[0.12em] text-[#2F6B43]">{label}</span><span className="text-right text-sm font-black text-[#123D2C]">{value}</span></div>;
}

function StateBox({ tone, title, children }: { tone: "green" | "amber"; title: string; children: React.ReactNode }) {
  const classes = tone === "green" ? "bg-emerald-50 text-emerald-900 ring-emerald-100" : "bg-amber-50 text-amber-900 ring-amber-100";
  return <div className={`mt-4 rounded-2xl p-4 ring-1 ${classes}`}><p className="font-black">{title}</p><p className="mt-1 text-sm font-semibold leading-6">{children}</p></div>;
}

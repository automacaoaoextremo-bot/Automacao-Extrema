"use client";

import Image from "next/image";
import { useState } from "react";
import type { TucxaConfirmationAppointment } from "@/lib/organizacao-em-harmonia/tucxa-confirmation";

const API_PATH = "/api/organizacao-em-harmonia/site-tucxa/agendamento-piloto/confirmar";

type Props = {
  token: string;
  initialAppointment: TucxaConfirmationAppointment | null;
  initialError?: string;
};

export default function ConfirmationClient({ token, initialAppointment, initialError = "" }: Props) {
  const [appointment, setAppointment] = useState<TucxaConfirmationAppointment | null>(initialAppointment);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState("");

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

      if (action === "confirm") {
        setAppointment((current) => current ? {
          ...current,
          status: "confirmado",
          confirmationStatus: "confirmed",
          confirmedAt: new Date().toISOString(),
        } : current);
        // O próprio estado confirmado e os dados abaixo já dão o retorno visual necessário.
        // Evita repetir ordem de agendamento e orientação sobre ordem de chegada no topo.
        setMessage("");
      } else {
        setAppointment((current) => current ? {
          ...current,
          status: "cancelado",
          confirmationStatus: "declined",
        } : current);
        setMessage(data.message || "Recebemos seu aviso. A vaga foi liberada.");
      }
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
          {error && <p className="rounded-2xl bg-red-50 p-4 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
          {message && <p className="rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}

          {appointment && (
            <>
              <p className={`${message ? "mt-4 " : ""}text-lg font-black text-[#123D2C]`}>Olá, {appointment.firstName}.</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                {confirmed
                  ? "Sua presença está confirmada conforme os dados abaixo."
                  : "Confira os dados abaixo. Sua resposta ajuda a Recepção a organizar as vagas e acolher cada pessoa com mais clareza."}
              </p>

              <div className="mt-4 grid gap-2 rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                <Detail label="Data" value={appointment.appointmentDateLabel} />
                <Detail label="Chegada" value={appointment.arrivalWindow} />
                <Detail label="Porta fecha" value={appointment.doorClosesAt} />
                <Detail label="Início dos atendimentos" value={appointment.appointmentTime} />
                <Detail label="Término previsto" value={appointment.endTime} />
                <Detail label="Entidade" value={appointment.entityName} />
                {typeof appointment.order === "number" && appointment.order > 0 && (
                  <Detail label="Ordem de agendamento" value={String(appointment.order)} />
                )}
              </div>

              {!declined && !expired && (
                <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-amber-950 ring-1 ring-amber-200">
                  <p className="text-sm font-black leading-6">
                    IMPORTANTE: Mesmo com o agendamento, o atendimento é por ordem de chegada.
                  </p>
                </div>
              )}

              {pending && (
                <div className="mt-4 grid gap-2">
                  <button type="button" disabled={saving} onClick={() => void respond("confirm")} className="rounded-2xl bg-[#123D2C] px-4 py-4 font-black text-white disabled:opacity-50">
                    {saving ? "Registrando..." : "Confirmar minha presença"}
                  </button>
                  <button type="button" disabled={saving} onClick={() => void respond("decline")} className="rounded-2xl bg-red-50 px-4 py-4 font-black text-red-700 ring-1 ring-red-100 disabled:opacity-50">
                    Não poderei comparecer
                  </button>
                </div>
              )}

              {declined && !expired && <StateBox tone="amber" title="Vaga liberada">Recebemos seu aviso de que não poderá comparecer.</StateBox>}
              {expired && <StateBox tone="amber" title="Prazo encerrado">O prazo de confirmação terminou. Entre em contato com a Recepção do Tucxa para verificar a situação do atendimento.</StateBox>}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs font-black uppercase tracking-[0.1em] text-[#2F6B43]">{label}</span>
      <span className="text-right text-sm font-black text-[#123D2C]">{value}</span>
    </div>
  );
}

function StateBox({ tone, title, children }: { tone: "green" | "amber"; title: string; children: React.ReactNode }) {
  const classes = tone === "green" ? "bg-emerald-50 text-emerald-900 ring-emerald-100" : "bg-amber-50 text-amber-900 ring-amber-100";
  return (
    <div className={`mt-4 rounded-2xl p-4 ring-1 ${classes}`}>
      <p className="font-black">{title}</p>
      <p className="mt-1 text-sm font-semibold leading-6">{children}</p>
    </div>
  );
}

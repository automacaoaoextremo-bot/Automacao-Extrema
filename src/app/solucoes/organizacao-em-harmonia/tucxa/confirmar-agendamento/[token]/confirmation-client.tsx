"use client";

import Image from "next/image";
import { useState } from "react";
import type { TucxaConfirmationAppointment } from "@/lib/organizacao-em-harmonia/tucxa-confirmation";
import { TUCXA_ADDRESS, TUCXA_ADDRESS_SHORT, TUCXA_MAPS_URL } from "@/lib/organizacao-em-harmonia/tucxa-location";

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
    if (saving) return;
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
        setMessage(data.message || "Presença confirmada. Obrigado!");
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
    <main className="min-h-[100dvh] bg-[#F7FAF2] px-2 py-2 text-[#10251C] sm:px-3 sm:py-8">
      <section className="mx-auto max-w-xl overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-[#123D2C]/10 sm:rounded-[2rem]">
        <header className="bg-[#123D2C] px-4 py-3 text-white sm:px-6 sm:py-5">
          <div className="flex items-center gap-3">
            <Image src="/clientes/tucxa/tucxa-logo.jpg" alt="TUCXA" width={40} height={40} className="h-10 w-10 shrink-0 rounded-full bg-white object-cover" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#CFE2C7]">TUCXA · Atendimento em Harmonia</p>
              <h1 className="text-lg font-extrabold leading-6 sm:text-2xl">Confirmar presença</h1>
            </div>
          </div>
        </header>

        <div className={`px-4 pt-3 sm:px-6 sm:pt-5 ${pending ? "pb-36 sm:pb-5" : "pb-5"}`}>
          {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 ring-1 ring-red-100">{error}</p>}
          {message && <p role="status" className="mb-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}

          {appointment && (
            <>
              <p className="text-base font-extrabold text-[#123D2C] sm:text-lg">Olá, {appointment.firstName}!</p>
              <p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm">
                {confirmed ? "Sua presença está confirmada." : pending ? "Confira os dados e escolha uma opção abaixo." : "Confira os dados do agendamento."}
              </p>

              <div className="mt-3 grid gap-1.5 rounded-xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10 sm:gap-2 sm:p-4">
                <Detail label="Data" value={appointment.appointmentDateLabel} />
                <Detail label="Entidade" value={appointment.entityName} />
                <Detail label="Chegada" value={appointment.arrivalWindow} />
                <Detail label="Porta fecha" value={appointment.doorClosesAt} />
              </div>

              <div className="mt-3 rounded-xl border border-[#DDE7D8] p-3">
                <p className="text-xs font-extrabold uppercase tracking-wide text-[#2F6B43]">📍 Local do atendimento</p>
                <p className="mt-1 text-xs leading-4 text-[#123D2C] sm:text-sm">{TUCXA_ADDRESS_SHORT}</p>
                <a className="mt-1 inline-block text-xs font-bold text-[#176748] underline underline-offset-2" href={TUCXA_MAPS_URL} target="_blank" rel="noopener noreferrer" aria-label="Abrir endereço do TUCXA no Google Maps">Abrir no Google Maps</a>
              </div>

              <details className="mt-3 rounded-xl border border-[#DDE7D8] bg-white p-3 text-sm">
                <summary className="cursor-pointer font-bold text-[#123D2C]">Orientações e horários completos</summary>
                <div className="mt-2 space-y-1.5 text-xs leading-5 text-slate-700 sm:text-sm">
                  <p><strong>Início dos atendimentos:</strong> {appointment.appointmentTime}. <strong>Término previsto:</strong> {appointment.endTime}.</p>
                  <p>Mesmo com agendamento, o atendimento é por ordem de chegada.</p>
                  <p>O agendamento é individual. Cada acompanhante que precise de atendimento deve ter seu próprio agendamento.</p>
                  <p><strong>Endereço completo:</strong> {TUCXA_ADDRESS}</p>
                  <p>Em caso de dúvida, fale com a Recepção do TUCXA.</p>
                </div>
              </details>

              {pending && (
                <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#DDE7D8] bg-white/95 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-[0_-6px_24px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:static sm:mt-4 sm:grid sm:gap-2 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
                  <div className="mx-auto grid max-w-xl gap-2">
                    <button type="button" disabled={saving} onClick={() => void respond("confirm")} className="min-h-12 rounded-xl bg-[#123D2C] px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-50 sm:text-base">
                      {saving ? "Registrando..." : "Confirmar minha presença"}
                    </button>
                    <button type="button" disabled={saving} onClick={() => void respond("decline")} className="min-h-11 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 ring-1 ring-red-100 disabled:opacity-50 sm:text-base">
                      Não poderei comparecer
                    </button>
                  </div>
                </div>
              )}

              {declined && !expired && <StateBox title="Vaga liberada">Recebemos seu aviso de que não poderá comparecer.</StateBox>}
              {expired && <StateBox title="Prazo encerrado">O prazo de confirmação terminou. Fale com a Recepção do TUCXA para verificar a situação.</StateBox>}
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
      <span className="shrink-0 text-[11px] font-extrabold uppercase tracking-wide text-[#2F6B43]">{label}</span>
      <span className="text-right text-xs font-extrabold text-[#123D2C] sm:text-sm">{value}</span>
    </div>
  );
}

function StateBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div role="status" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200">
      <p className="font-extrabold">{title}</p>
      <p className="mt-1">{children}</p>
    </div>
  );
}

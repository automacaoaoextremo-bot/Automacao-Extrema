"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Appointment = {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  entityName: string;
  consulenteName: string;
  whatsapp: string;
  order: number | null;
  status: string;
};

type Payload = {
  appointments?: Appointment[];
  error?: string;
};

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(Date.UTC(year, month - 1, day, 12)),
  );
}

function whatsappUrl(appointment: Appointment) {
  const digits = appointment.whatsapp.replace(/\D/g, "");
  if (!digits) return "";
  const phone = digits.startsWith("55") ? digits : `55${digits}`;
  const message = [
    `Olá, ${appointment.consulenteName}.`,
    "",
    "Estou entrando em contato sobre seu atendimento no TUCXA:",
    `Data: ${formatDate(appointment.appointmentDate)}`,
    `Período: ${appointment.appointmentTime}`,
    `Entidade: ${appointment.entityName}`,
    appointment.order ? `Ordem prevista: ${appointment.order}` : "",
    "",
    "Podemos prosseguir por aqui?",
  ].filter(Boolean).join("\n");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function UpcomingEntityAppointmentsLoginModal() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void supabaseBrowser.auth.getSession().then(async ({ data }) => {
        const token = data.session?.access_token;
        if (!token) return;
        const response = await fetch("/api/organizacao-em-harmonia/filhos-corrente/entidade-agendamentos", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = (await response.json().catch(() => ({}))) as Payload;
        if (!active || !response.ok) return;
        const nextAppointments = payload.appointments ?? [];
        setAppointments(nextAppointments);
        setOpen(nextAppointments.length > 0);
      });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || appointments.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-[#10251C]/80 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Atendimentos previstos para o Cavalinho">
      <section className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">Função Cavalinho</p>
            <h2 className="break-words text-xl font-black leading-tight text-[#123D2C]">Atendimentos previstos para suas entidades</h2>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="shrink-0 rounded-xl bg-[#123D2C] px-4 py-2 font-black text-white">Fechar</button>
        </header>
        <div className="min-h-0 overflow-y-auto p-4">
          <div className="grid gap-2">
            {appointments.map((appointment) => {
              const conversationUrl = whatsappUrl(appointment);
              return (
                <article key={appointment.id} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-black capitalize text-[#123D2C]">{formatDate(appointment.appointmentDate)}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{appointment.appointmentTime} · {appointment.entityName}</p>
                      <p className="mt-1 font-black text-[#123D2C]">{appointment.consulenteName}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[0.68rem] font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">Ordem {appointment.order ?? "a confirmar"}</span>
                  </div>
                  {conversationUrl && (
                    <a href={conversationUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[#25D366] px-3 py-2 text-sm font-black text-[#073B1D]">
                      Falar com o Consulente no WhatsApp
                    </a>
                  )}
                </article>
              );
            })}
          </div>
          <Link href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento/consultar-agendamentos" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#123D2C] px-4 py-2 text-center font-black text-white">
            Consultar todos os atendimentos
          </Link>
        </div>
      </section>
    </div>
  );
}

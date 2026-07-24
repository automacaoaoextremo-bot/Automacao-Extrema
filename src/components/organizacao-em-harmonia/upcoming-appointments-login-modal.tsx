"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Appointment = {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  order: number | null;
  entityName: string;
};

type Payload = {
  appointments?: Appointment[];
  preference?: boolean;
  error?: string;
};

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(Date.UTC(year, month - 1, day, 12)),
  );
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    confirmado: "Confirmado",
    solicitado: "Solicitado",
    aprovado: "Aprovado",
    presente: "Presente",
    concluido: "Concluído",
  };
  return labels[value] || value;
}

export function UpcomingAppointmentsLoginModal({ appointmentsHref }: { appointmentsHref: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [preference, setPreference] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const timeoutId = window.setTimeout(() => {
      void supabaseBrowser.auth.getSession().then(async ({ data }) => {
        const token = data.session?.access_token;
        if (!token) return;
        const response = await fetch("/api/organizacao-em-harmonia/site-tucxa/upcoming-appointments", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = (await response.json().catch(() => ({}))) as Payload;
        if (!active || !response.ok) return;
        const nextAppointments = payload.appointments ?? [];
        const nextPreference = payload.preference !== false;
        setAppointments(nextAppointments);
        setPreference(nextPreference);
        setOpen(nextPreference && nextAppointments.length > 0);
      });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  async function savePreference(nextPreference: boolean) {
    setSaving(true);
    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      await fetch("/api/organizacao-em-harmonia/site-tucxa/upcoming-appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ showUpcomingAppointmentsOnLogin: nextPreference }),
      });
    } finally {
      setSaving(false);
    }
  }

  function closeModal() {
    setOpen(false);
  }

  if (!open || appointments.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#10251C]/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Próximos agendamentos">
      <section className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">Ao entrar</p>
            <h2 className="truncate text-xl font-black text-[#123D2C]">Seus próximos agendamentos</h2>
          </div>
          <button type="button" disabled={saving} onClick={closeModal} className="shrink-0 rounded-2xl bg-[#123D2C] px-4 py-2 font-black text-white disabled:opacity-60">
            Fechar
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto p-4">
          <div className="grid gap-2">
            {appointments.map((appointment) => (
              <article key={appointment.id} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black capitalize text-[#123D2C]">{formatDate(appointment.appointmentDate)}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-600">{appointment.appointmentTime} · {appointment.entityName}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">
                    Ordem {appointment.order ?? "a confirmar"}
                  </span>
                </div>
                <p className="mt-2 text-xs font-black uppercase tracking-[0.1em] text-[#2F6B43]">{statusLabel(appointment.status)}</p>
              </article>
            ))}
          </div>

          <label className="mt-4 flex items-start gap-3 rounded-2xl bg-blue-50 p-3 text-sm font-bold text-blue-950 ring-1 ring-blue-100">
            <input
              type="checkbox"
              checked={preference}
              onChange={(event) => {
                const nextPreference = event.target.checked;
                setPreference(nextPreference);
                void savePreference(nextPreference);
              }}
              className="mt-1 size-5 accent-[#123D2C]"
            />
            <span>Mostrar meus próximos agendamentos sempre que eu entrar.</span>
          </label>

          <Link href={appointmentsHref} className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-[#123D2C] px-5 py-3 text-center font-black text-white">
            Ver todos os meus agendamentos
          </Link>
        </div>
      </section>
    </div>
  );
}

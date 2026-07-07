"use client";

import { FormEvent, useMemo, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

type AppointmentStatus = "agendado" | "alteracao_solicitada" | "cancelamento_solicitado";

type Appointment = { id: number; date: string; period: string; type: string; status: AppointmentStatus };

const headerActions = [
  { label: "Atendimento", href: "#atendimento", variant: "primary" as const },
  { label: "Agenda Viva", href: "#agenda-viva", variant: "secondary" as const },
  { label: "Corrente em Dia", href: "#corrente-em-dia", variant: "secondary" as const },
  { label: "Site do Tucxa", href: "/solucoes/organizacao-em-harmonia/tucxa", variant: "secondary" as const },
];

const statusLabel: Record<AppointmentStatus, string> = {
  agendado: "Agendado",
  alteracao_solicitada: "Alteração solicitada",
  cancelamento_solicitado: "Cancelamento solicitado",
};

export default function PainelConsulenteTucxaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([
    { id: 1, date: "Próxima segunda disponível", period: "18h às 22h", type: "Atendimento de segunda", status: "agendado" },
  ]);
  const [serviceType, setServiceType] = useState("Atendimento de segunda");
  const [preferredDate, setPreferredDate] = useState("");
  const [notes, setNotes] = useState("");
  const [filter, setFilter] = useState("todos");
  const [message, setMessage] = useState("");

  const filteredAppointments = useMemo(() => {
    if (["todos", "completa", "futuros"].includes(filter)) return appointments;
    return appointments.filter((item) => item.type.toLowerCase().includes(filter));
  }, [appointments, filter]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Appointment = {
      id: Date.now(),
      date: preferredDate || "Data a confirmar",
      period: serviceType.includes("quarta") ? "18h30 às 22h" : "18h às 22h",
      type: serviceType,
      status: "alteracao_solicitada",
    };
    setAppointments((current) => [next, ...current]);
    setPreferredDate("");
    setNotes("");
    setMessage("Solicitação registrada para conferência da organização do Tucxa. O retorno será enviado pelo WhatsApp/e-mail cadastrado.");
  }

  function updateStatus(id: number, status: AppointmentStatus) {
    setAppointments((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
    setMessage(status === "cancelamento_solicitado" ? "Solicitação de cancelamento enviada para conferência." : "Solicitação de alteração registrada.");
  }

  function removeAppointment(id: number) {
    setAppointments((current) => current.filter((item) => item.id !== id));
    setMessage("Agendamento removido da visualização. Em produção, a exclusão definitiva depende da regra da organização.");
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader actions={headerActions} navLabel="Menu do painel do consulente" />

      <section className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="rounded-[1.75rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7">
          <p className="text-xs font-black tracking-[0.22em] text-[#2F6B43] sm:text-sm">Painel do Consulente / Filho de Fora</p>
          <h1 className="mt-2 max-w-4xl text-3xl font-black leading-tight text-[#123D2C] sm:text-4xl">Atendimento, agenda e contribuições no mesmo lugar.</h1>
          <p className="mt-3 max-w-4xl text-base leading-7 text-slate-700">
            Acompanhe orientações do Atendimento em Harmonia, consulte a Agenda Viva e use o Corrente em Dia para contribuições identificadas. Tudo pensado para reduzir desencontros e preservar o cuidado humano do Tucxa.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <a id="atendimento" href="#agendamentos" className="rounded-[1.5rem] bg-[#123D2C] p-5 text-white shadow-lg shadow-green-900/10 transition hover:-translate-y-0.5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#CFE2C7]">Atendimento em Harmonia</p>
            <h2 className="mt-2 text-xl font-black">Agendar ou alterar atendimento</h2>
            <p className="mt-2 text-sm leading-6 text-[#EEF7EA]">Solicite atendimento de segunda, terça ou Transformação de quarta quando houver encaminhamento.</p>
          </a>
          <a id="agenda-viva" href="#agendamentos" className="rounded-[1.5rem] bg-white p-5 text-[#123D2C] shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">Agenda Viva</p>
            <h2 className="mt-2 text-xl font-black">Consultar calendário e filtros</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Veja eventos disponíveis, seus agendamentos e solicitações por tipo ou período.</p>
          </a>
          <a id="corrente-em-dia" href="/solucoes/organizacao-em-harmonia/tucxa/consulente/contribuicao?tipo=identificada" className="rounded-[1.5rem] bg-[#E9F2E7] p-5 text-[#123D2C] shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">Corrente em Dia</p>
            <h2 className="mt-2 text-xl font-black">Contribuição identificada</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">Escolha valor, forma de pagamento e envie comprovante quando necessário.</p>
          </a>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <form onSubmit={submit} className="rounded-[1.75rem] bg-white p-5 shadow-lg shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6">
            <h2 className="text-xl font-black text-[#123D2C]">Nova solicitação</h2>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-1">
                <span className="text-sm font-black text-[#123D2C]">Tipo de atendimento</span>
                <select value={serviceType} onChange={(event) => setServiceType(event.target.value)} className="rounded-2xl border border-[#123D2C]/15 bg-white p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]">
                  <option>Atendimento de segunda</option>
                  <option>Atendimento de terça</option>
                  <option>Transformação de quarta</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-black text-[#123D2C]">Data desejada</span>
                <input value={preferredDate} onChange={(event) => setPreferredDate(event.target.value)} type="date" className="rounded-2xl border border-[#123D2C]/15 bg-white p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]" />
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-black text-[#123D2C]">Observação</span>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-24 rounded-2xl border border-[#123D2C]/15 bg-white p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]" placeholder="Escreva apenas o necessário para orientar o agendamento." />
              </label>

              <button className="rounded-2xl bg-[#123D2C] px-5 py-4 text-base font-black text-white shadow-lg shadow-green-900/10 transition hover:-translate-y-0.5">
                Enviar solicitação
              </button>
            </div>
          </form>

          <div id="agendamentos" className="rounded-[1.75rem] bg-white p-5 shadow-lg shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-[#123D2C]">Meus agendamentos</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Use os filtros para consultar por tipo e solicite alteração, cancelamento ou exclusão.</p>
              </div>
              <label className="grid gap-1">
                <span className="text-xs font-black text-[#123D2C]">Filtro</span>
                <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-2xl border border-[#123D2C]/15 bg-white px-3 py-2 text-sm outline-none">
                  <option value="todos">Todos os meus</option>
                  <option value="completa">Agenda completa</option>
                  <option value="futuros">A partir de hoje</option>
                  <option value="segunda">Segunda</option>
                  <option value="terça">Terça</option>
                  <option value="quarta">Quarta</option>
                </select>
              </label>
            </div>

            {message && <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}

            <div className="mt-4 grid gap-3">
              {filteredAppointments.map((appointment) => (
                <article key={appointment.id} className="rounded-3xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-black text-[#123D2C]">{appointment.type}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-600">{appointment.date} • {appointment.period}</p>
                      <p className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">{statusLabel[appointment.status]}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => updateStatus(appointment.id, "alteracao_solicitada")} className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">Alterar</button>
                      <button type="button" onClick={() => updateStatus(appointment.id, "cancelamento_solicitado")} className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">Cancelar</button>
                      <button type="button" onClick={() => removeAppointment(appointment.id)} className="rounded-full bg-white px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-100">Excluir</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

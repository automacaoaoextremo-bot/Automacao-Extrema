"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AeSolutionHeader } from "@/components/ae-solution-header";

type SubmitState = {
  status: "idle" | "sending" | "error";
  message: string;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export default function PresencaQueridaLeadPage() {
  const [contactName, setContactName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [eventType, setEventType] = useState("aniversario");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [guestsEstimate, setGuestsEstimate] = useState("");
  const [eventContext, setEventContext] = useState("");
  const [consent, setConsent] = useState(false);
  const [founderConsent, setFounderConsent] = useState(false);
  const [testimonialPermission, setTestimonialPermission] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle", message: "" });

  const isValid = contactName.trim() && onlyDigits(whatsapp).length >= 10 && email.trim() && consent;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);

    if (!isValid) {
      setSubmitState({ status: "error", message: "Preencha nome, WhatsApp, e-mail e aceite o contato para continuar." });
      return;
    }

    setSubmitState({ status: "sending", message: "" });

    try {
      const response = await fetch("/api/presenca-querida/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "site_presenca_querida_minimo",
          contactName,
          whatsapp,
          email,
          eventType,
          eventName,
          eventDate,
          city,
          state,
          guestsEstimate,
          eventContext,
          founderTermsAccepted: founderConsent,
          testimonialPermission,
          lgpdContactConsent: consent,
        }),
      });

      const responseText = await response.text();
      let result: { error?: string; leadId?: string } = {};

      if (responseText) {
        try {
          result = JSON.parse(responseText) as { error?: string; leadId?: string };
        } catch {
          result = { error: responseText };
        }
      }

      if (!response.ok) {
        throw new Error(result.error || `Não foi possível enviar o cadastro. Código HTTP: ${response.status}`);
      }

      const params = new URLSearchParams({
        nome: contactName,
        email,
        whatsapp: onlyDigits(whatsapp),
        leadId: result.leadId ?? "",
      });

      window.location.href = `/solucoes/presenca-querida/obrigado?${params.toString()}`;
    } catch (error) {
      setSubmitState({
        status: "error",
        message: error instanceof Error ? error.message : "Erro inesperado ao enviar o cadastro.",
      });
    }
  }

  return (
    <main className="min-h-screen bg-[#fffaf8] text-slate-800">
      <AeSolutionHeader
        solutionName="Presença Querida"
        logoSrc="/presenca-querida-logo.svg"
        logoAlt="Logo Presença Querida"
        homeHref="/solucoes/presenca-querida"
        navLabel="Menu do Presença Querida"
        actions={[]}
        sectionLinks={[]}
        topAction={
          <Link
            href="/solucoes/presenca-querida"
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#E85D75]/30 bg-[#E85D75] px-4 py-2 text-sm font-black text-white shadow-md shadow-rose-200/70 transition hover:-translate-y-0.5 hover:bg-[#f06c84]"
          >
            ← Voltar
          </Link>
        }
      />

      <section className="mx-auto max-w-3xl px-4 pb-8 pt-3 sm:pb-10 sm:pt-5">
        <div className="rounded-[2rem] bg-white p-4 shadow-xl ring-1 ring-rose-100 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#E85D75] sm:text-sm">
            Cadastro de interesse
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-[#00334E] sm:text-4xl">
            Quero conhecer o Presença Querida
          </h1>

          <p className="mt-3 rounded-3xl bg-rose-50 p-4 text-sm font-semibold leading-6 text-slate-700 ring-1 ring-rose-100 sm:text-base sm:leading-7">
            Informe os dados principais para liberar o primeiro acesso. Os detalhes do evento, convite, lista de convidados, LGPD e condição de Cliente Fundador serão confirmados dentro da área logada.
          </p>

          <form onSubmit={onSubmit} className="mt-4">
            <div className="grid gap-3">
              <label>
                <span className="text-sm font-bold text-slate-700">Nome do responsável *</span>
                <input
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-300 p-3"
                  placeholder="Nome de quem organiza ou decide"
                />
                {touched && !contactName.trim() && <span className="mt-1 block text-sm font-bold text-red-600">Informe o nome do responsável.</span>}
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="text-sm font-bold text-slate-700">WhatsApp *</span>
                  <input
                    value={whatsapp}
                    onChange={(event) => setWhatsapp(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-300 p-3"
                    placeholder="(19) 99999-9999"
                    inputMode="tel"
                  />
                  {touched && onlyDigits(whatsapp).length < 10 && <span className="mt-1 block text-sm font-bold text-red-600">Informe o WhatsApp com DDD.</span>}
                </label>

                <label>
                  <span className="text-sm font-bold text-slate-700">E-mail *</span>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    className="mt-1 w-full rounded-2xl border border-slate-300 p-3"
                    placeholder="contato@exemplo.com"
                  />
                  {touched && !email.trim() && <span className="mt-1 block text-sm font-bold text-red-600">Informe o e-mail.</span>}
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="text-sm font-bold text-slate-700">Tipo de evento</span>
                  <select value={eventType} onChange={(event) => setEventType(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 bg-white p-3">
                    <option value="aniversario">Aniversário</option>
                    <option value="festa_surpresa">Festa surpresa</option>
                    <option value="bodas">Bodas</option>
                    <option value="casamento">Casamento</option>
                    <option value="confraternizacao">Confraternização</option>
                    <option value="evento_familiar">Evento familiar</option>
                    <option value="outro">Outro</option>
                  </select>
                </label>

                <label>
                  <span className="text-sm font-bold text-slate-700">Nome do evento</span>
                  <input
                    value={eventName}
                    onChange={(event) => setEventName(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-300 p-3"
                    placeholder="Ex.: Daniela 50 anos"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label>
                  <span className="text-sm font-bold text-slate-700">Data prevista</span>
                  <input value={eventDate} onChange={(event) => setEventDate(event.target.value)} type="date" className="mt-1 w-full rounded-2xl border border-slate-300 p-3" />
                </label>
                <label>
                  <span className="text-sm font-bold text-slate-700">Cidade</span>
                  <input value={city} onChange={(event) => setCity(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" placeholder="Campinas" />
                </label>
                <label>
                  <span className="text-sm font-bold text-slate-700">UF</span>
                  <input value={state} onChange={(event) => setState(event.target.value.toUpperCase().slice(0, 2))} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" placeholder="SP" maxLength={2} />
                </label>
              </div>

              <label>
                <span className="text-sm font-bold text-slate-700">Quantidade estimada de convidados</span>
                <input
                  value={guestsEstimate}
                  onChange={(event) => setGuestsEstimate(event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-300 p-3"
                  placeholder="Ex.: 120"
                  inputMode="numeric"
                />
              </label>

              <label>
                <span className="text-sm font-bold text-slate-700">Conte rapidamente a dor principal</span>
                <textarea
                  value={eventContext}
                  onChange={(event) => setEventContext(event.target.value)}
                  className="mt-1 min-h-28 w-full rounded-2xl border border-slate-300 p-3"
                  placeholder="Ex.: respostas espalhadas no WhatsApp, medo de cobrar confirmação, acompanhantes incertos, dificuldade para prever buffet..."
                />
              </label>
            </div>

            <div className="mt-4 space-y-3">
              <label className="flex gap-3 rounded-2xl bg-rose-50 p-4 text-sm leading-6 text-rose-950">
                <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-5 w-5 shrink-0" />
                <span>Autorizo a Automação Extrema a usar estes dados para contato sobre o Presença Querida. A confirmação formal de LGPD será feita no primeiro acesso.</span>
              </label>

              <label className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                <input type="checkbox" checked={founderConsent} onChange={(event) => setFounderConsent(event.target.checked)} className="mt-1 h-5 w-5 shrink-0" />
                <span>Tenho interesse em participar como Cliente Fundador. A confirmação dos termos será feita dentro da área logada.</span>
              </label>

              <label className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                <input type="checkbox" checked={testimonialPermission} onChange={(event) => setTestimonialPermission(event.target.checked)} className="mt-1 h-5 w-5 shrink-0" />
                <span>Autorizo conversar sobre possível depoimento, uso de prints sem dados sensíveis e aprendizado do case, sempre com aprovação antes de divulgar.</span>
              </label>
            </div>

            {submitState.status === "error" && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{submitState.message}</p>}

            <button
              type="submit"
              disabled={submitState.status === "sending"}
              className="mt-5 inline-flex w-full min-h-14 items-center justify-center rounded-2xl bg-[#E85D75] px-6 py-4 text-center text-base font-black text-white shadow-lg shadow-rose-900/15 transition hover:-translate-y-0.5 hover:bg-[#f06c84] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitState.status === "sending" ? "Enviando interesse..." : "Enviar interesse"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

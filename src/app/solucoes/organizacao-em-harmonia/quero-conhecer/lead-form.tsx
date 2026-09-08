"use client";

import { FormEvent, useMemo, useState } from "react";
import { OrganizacaoPublicHeader } from "@/components/organizacao-em-harmonia/organizacao-public-header";
import {
  moduleInfo,
  moduleLabel,
  normalizeOrganizacaoModulo,
  normalizeWhatsapp,
  type OrganizacaoModulo,
} from "@/lib/organizacao-em-harmonia";

type SubmitState = {
  status: "idle" | "sending" | "error";
  message: string;
};

const AE_HELP_WHATSAPP = `https://wa.me/5519989848246?text=${encodeURIComponent(
  "Olá, preciso de ajuda com a Organização em Harmonia.",
)}`;

export function OrganizacaoLeadForm({ initialModule }: { initialModule: OrganizacaoModulo }) {
  const selectedModule = useMemo(() => normalizeOrganizacaoModulo(initialModule), [initialModule]);
  const [contactName, setContactName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [founderConsent, setFounderConsent] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle", message: "" });

  const current = moduleInfo(selectedModule);
  const canSend = contactName.trim() && whatsapp.trim() && email.trim();
  const interestLine = selectedModule === "organizacao-em-harmonia" ? "Organização em Harmonia" : moduleLabel(selectedModule);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!canSend) return;

    setSubmitState({ status: "sending", message: "Registrando seu interesse..." });

    try {
      const normalizedWhatsapp = normalizeWhatsapp(whatsapp);
      const response = await fetch("/api/organizacao-em-harmonia/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "site_organizacao_em_harmonia_minimo",
          modulo: selectedModule,
          contactName,
          responsibleName: contactName,
          whatsapp: normalizedWhatsapp,
          email,
          founderTermsAccepted: founderConsent,
          testimonialPermission: founderConsent,
          lgpdContactConsent: consent,
          observations:
            "Cadastro mínimo pelo Quero Conhecer único da Organização em Harmonia. A organização, os módulos habilitados, regras, permissões, LGPD e termos de Cliente Fundador serão confirmados na área logada.",
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível enviar o cadastro de interesse.");

      const params = new URLSearchParams({
        modulo: selectedModule,
        nome: contactName,
        email,
        whatsapp: normalizedWhatsapp,
        leadId: String(result.leadId ?? ""),
      });

      setContactName("");
      setWhatsapp("");
      setEmail("");
      setConsent(false);
      setFounderConsent(false);
      setTouched(false);

      window.location.href = `/solucoes/organizacao-em-harmonia/obrigado?${params.toString()}`;
    } catch (error) {
      setSubmitState({
        status: "error",
        message: error instanceof Error ? error.message : "Erro inesperado ao enviar o cadastro.",
      });
    }
  }

  return (
    <main id="inicio" className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <OrganizacaoPublicHeader
        actions={[{ label: "Ajuda", href: AE_HELP_WHATSAPP, variant: "primary" }]}
        backFallbackHref={current.href}
      />

      <section className="mx-auto max-w-3xl px-2.5 py-1.5 sm:px-4 sm:py-4">
        <div className="rounded-[1.25rem] bg-white p-2.5 shadow-xl ring-1 ring-slate-100 sm:rounded-[2rem] sm:p-6">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#2F6B43] sm:text-xs">Cadastro de interesse</p>
              <h1 className="mt-0.5 text-xl font-black leading-tight text-[#00334E] sm:mt-1 sm:text-3xl">Quero conhecer</h1>
            </div>
            <span className="max-w-[44%] truncate rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black text-[#2F6B43] ring-1 ring-emerald-100 sm:text-xs">
              {interestLine}
            </span>
          </div>

          <p className="mt-1.5 rounded-xl bg-emerald-50 px-2.5 py-1.5 text-[10px] font-semibold leading-4 text-slate-700 ring-1 ring-emerald-100 sm:mt-3 sm:p-3 sm:text-sm sm:leading-5">
            Informe nome, WhatsApp e e-mail. Os demais dados serão confirmados depois na área logada.
          </p>

          <form onSubmit={onSubmit} className="mt-2 sm:mt-4">
            <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
              <label>
                <span className="text-[10px] font-bold text-slate-700 sm:text-sm">Nome *</span>
                <input
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  className="mt-0.5 w-full rounded-xl border border-slate-300 px-2.5 py-2 text-sm outline-none focus:border-[#31C16B] focus:ring-2 focus:ring-emerald-100 sm:mt-1 sm:rounded-2xl sm:p-3"
                  placeholder="Nome do contato"
                />
                {touched && !contactName.trim() && <span className="mt-0.5 block text-[9px] font-bold text-red-600">Informe o nome.</span>}
              </label>

              <label>
                <span className="text-[10px] font-bold text-slate-700 sm:text-sm">WhatsApp *</span>
                <input
                  value={whatsapp}
                  onChange={(event) => setWhatsapp(event.target.value)}
                  className="mt-0.5 w-full rounded-xl border border-slate-300 px-2.5 py-2 text-sm outline-none focus:border-[#31C16B] focus:ring-2 focus:ring-emerald-100 sm:mt-1 sm:rounded-2xl sm:p-3"
                  placeholder="(19) 99999-9999"
                  inputMode="tel"
                />
                {touched && !whatsapp.trim() && <span className="mt-0.5 block text-[9px] font-bold text-red-600">Informe o WhatsApp.</span>}
              </label>

              <label>
                <span className="text-[10px] font-bold text-slate-700 sm:text-sm">E-mail *</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  className="mt-0.5 w-full rounded-xl border border-slate-300 px-2.5 py-2 text-sm outline-none focus:border-[#31C16B] focus:ring-2 focus:ring-emerald-100 sm:mt-1 sm:rounded-2xl sm:p-3"
                  placeholder="contato@exemplo.com"
                />
                {touched && !email.trim() && <span className="mt-0.5 block text-[9px] font-bold text-red-600">Informe o e-mail.</span>}
              </label>
            </div>

            <div className="mt-2 grid gap-1.5 sm:mt-4 sm:grid-cols-2 sm:gap-3">
              <label className="flex gap-2 rounded-xl bg-emerald-50 px-2.5 py-2 text-[9px] font-semibold leading-4 text-emerald-950 ring-1 ring-emerald-100 sm:rounded-2xl sm:p-3 sm:text-xs">
                <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Autorizo contato da Automação Extrema sobre esta solução. A confirmação formal de LGPD será feita no primeiro acesso.</span>
              </label>

              <label className="flex gap-2 rounded-xl bg-slate-50 px-2.5 py-2 text-[9px] font-semibold leading-4 text-slate-700 ring-1 ring-slate-100 sm:rounded-2xl sm:p-3 sm:text-xs">
                <input type="checkbox" checked={founderConsent} onChange={(event) => setFounderConsent(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Tenho interesse em ser Cliente Fundador. Os termos serão apresentados para aceite na área logada.</span>
              </label>
            </div>

            {submitState.status === "error" && (
              <p className="mt-2 rounded-xl bg-red-50 p-2 text-[10px] font-bold leading-4 text-red-700 sm:mt-4 sm:p-3 sm:text-sm">{submitState.message}</p>
            )}

            <button
              type="submit"
              disabled={submitState.status === "sending"}
              className="mt-2.5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#31C16B] px-4 py-2.5 text-center text-sm font-black text-[#00334E] shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-[#43db7c] disabled:cursor-not-allowed disabled:opacity-60 sm:mt-5 sm:min-h-14 sm:rounded-2xl sm:px-6 sm:py-4 sm:text-base"
            >
              {submitState.status === "sending" ? "Enviando..." : "Enviar interesse"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

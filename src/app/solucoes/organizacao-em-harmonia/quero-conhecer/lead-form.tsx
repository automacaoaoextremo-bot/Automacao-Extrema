"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { AeSolutionHeader } from "@/components/ae-solution-header";
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
    <main className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <AeSolutionHeader
        solutionName="Organização em Harmonia"
        logoSrc="/organizacao-em-harmonia-logo.svg"
        logoAlt="Logo Organização em Harmonia"
        actions={[]}
        sectionLinks={[]}
        homeHref="/solucoes/organizacao-em-harmonia"
        topAction={
          <Link
            href={current.href}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#31C16B]/30 bg-[#31C16B] px-4 py-2 text-sm font-black text-[#00334E] shadow-md shadow-emerald-200/70 transition hover:-translate-y-0.5 hover:bg-[#43db7c]"
          >
            ← Voltar
          </Link>
        }
      />

      <section className="mx-auto max-w-3xl px-4 pb-8 pt-3 sm:pb-10 sm:pt-5">
        <div className="rounded-[2rem] bg-white p-4 shadow-xl ring-1 ring-slate-100 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#2F6B43] sm:text-sm">
            Cadastro de interesse
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-[#00334E] sm:text-4xl">
            Quero conhecer a Organização em Harmonia
          </h1>

          <p className="mt-3 rounded-3xl bg-emerald-50 p-4 text-sm font-semibold leading-6 text-slate-700 ring-1 ring-emerald-100 sm:text-base sm:leading-7">
            Informe apenas nome do contato, WhatsApp e e-mail para iniciar o atendimento. Os dados da organização, módulos habilitados, permissões, regras, LGPD e condição de Cliente Fundador serão confirmados depois, dentro da área logada, com mais calma e segurança.
          </p>

          {selectedModule !== "organizacao-em-harmonia" && (
            <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-700 ring-1 ring-slate-100">
              Interesse indicado pela página anterior: {interestLine}. Essa informação será registrada sem criar mais uma etapa no formulário.
            </p>
          )}

          <form onSubmit={onSubmit} className="mt-4">
            <div className="grid gap-3">
              <label>
                <span className="text-sm font-bold text-slate-700">Nome do contato *</span>
                <input
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-300 p-3"
                  placeholder="Nome de contato da organização"
                />
                {touched && !contactName.trim() && (
                  <span className="mt-1 block text-sm font-bold text-red-600">Informe o nome do contato.</span>
                )}
              </label>

              <label>
                <span className="text-sm font-bold text-slate-700">WhatsApp *</span>
                <input
                  value={whatsapp}
                  onChange={(event) => setWhatsapp(event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-300 p-3"
                  placeholder="(19) 99999-9999"
                  inputMode="tel"
                />
                {touched && !whatsapp.trim() && (
                  <span className="mt-1 block text-sm font-bold text-red-600">Informe o WhatsApp.</span>
                )}
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
                {touched && !email.trim() && (
                  <span className="mt-1 block text-sm font-bold text-red-600">Informe o e-mail.</span>
                )}
              </label>
            </div>

            <div className="mt-4 space-y-3">
              <label className="flex gap-3 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0"
                />
                <span>
                  Autorizo a Automação Extrema a usar estes dados para contato sobre a Organização em Harmonia. A confirmação formal de LGPD será feita no primeiro acesso.
                </span>
              </label>

              <label className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                <input
                  type="checkbox"
                  checked={founderConsent}
                  onChange={(event) => setFounderConsent(event.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0"
                />
                <span>
                  Tenho interesse em participar como Cliente Fundador. A confirmação dos termos da avaliação será feita dentro da área logada, com clareza e aceite expresso.
                </span>
              </label>
            </div>

            {submitState.status === "error" && (
              <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{submitState.message}</p>
            )}

            <button
              type="submit"
              disabled={submitState.status === "sending"}
              className="mt-5 inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#31C16B] px-6 py-4 text-center text-base font-black text-[#00334E] shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-[#43db7c] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitState.status === "sending" ? "Enviando..." : "Enviar interesse"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AeSolutionHeader } from "@/components/ae-solution-header";
import { moduleInfo, moduleLabel, normalizeWhatsapp, ORGANIZACAO_MODULOS, type OrganizacaoModulo } from "@/lib/organizacao-em-harmonia";

type SubmitState = {
  status: "idle" | "sending" | "error";
  message: string;
};

export function OrganizacaoLeadForm({ initialModule }: { initialModule: OrganizacaoModulo }) {
  const [module, setModule] = useState<OrganizacaoModulo>(initialModule);
  const [contactName, setContactName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [consent, setConsent] = useState(false);
  const [founderConsent, setFounderConsent] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle", message: "" });

  const current = moduleInfo(module);
  const canSend = contactName.trim() && whatsapp.trim() && email.trim();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!canSend) return;

    setSubmitState({ status: "sending", message: "Registrando seu interesse..." });

    try {
      const response = await fetch("/api/organizacao-em-harmonia/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "site_organizacao_em_harmonia_minimo",
          modulo: module,
          contactName,
          responsibleName: contactName,
          whatsapp: normalizeWhatsapp(whatsapp),
          email,
          organizationName,
          founderTermsAccepted: founderConsent,
          testimonialPermission: founderConsent,
          lgpdContactConsent: consent,
          observations:
            "Cadastro mínimo pela página Quero Conhecer. Dados completos da organização, regras e permissões serão confirmados na próxima etapa.",
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível enviar o cadastro de interesse.");

      const params = new URLSearchParams({
        modulo: module,
        nome: contactName,
        email,
        whatsapp: normalizeWhatsapp(whatsapp),
        leadId: String(result.leadId ?? ""),
      });

      setContactName("");
      setWhatsapp("");
      setEmail("");
      setOrganizationName("");
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
            Informe apenas nome do contato, WhatsApp e e-mail. A proposta é reduzir fricção: primeiro entendemos o interesse, depois confirmamos dados da organização, permissões, regras de aprovação e módulos que fazem sentido para a validação.
          </p>

          <form onSubmit={onSubmit} className="mt-4">
            <div className="grid gap-3">
              <label>
                <span className="text-sm font-bold text-slate-700">Módulo de interesse</span>
                <select
                  value={module}
                  onChange={(event) => setModule(event.target.value as OrganizacaoModulo)}
                  className="mt-1 w-full rounded-2xl border border-slate-300 bg-white p-3"
                >
                  <option value="pacote-completo">Pacote completo — Corrente, Atendimento e Agenda</option>
                  {ORGANIZACAO_MODULOS.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

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

              <label>
                <span className="text-sm font-bold text-slate-700">Nome da organização</span>
                <input
                  value={organizationName}
                  onChange={(event) => setOrganizationName(event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-300 p-3"
                  placeholder="Opcional neste primeiro contato"
                />
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
                  Autorizo a Automação Extrema a usar estes dados para contato sobre a {moduleLabel(module)}. A confirmação formal de LGPD será feita na próxima etapa.
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
                  Tenho interesse em participar como Cliente Fundador. A confirmação dos termos da avaliação será feita depois, com clareza e aceite expresso.
                </span>
              </label>
            </div>

            {submitState.status === "error" && (
              <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{submitState.message}</p>
            )}

            <button
              type="submit"
              disabled={submitState.status === "sending"}
              className="mt-5 inline-flex w-full min-h-14 items-center justify-center rounded-2xl bg-[#31C16B] px-6 py-4 text-center text-base font-black text-[#00334E] shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-[#43db7c] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitState.status === "sending" ? "Enviando interesse..." : "Enviar interesse"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

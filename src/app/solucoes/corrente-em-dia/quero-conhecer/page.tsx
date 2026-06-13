"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AeSolutionHeader } from "@/components/ae-solution-header";
import { BRAZIL_STATES, FALLBACK_CITIES_BY_UF } from "@/lib/brazil-locations";
import { formatCorrenteOrganizationType, normalizeCorrenteOrganizationType } from "@/lib/corrente-em-dia";

type SubmitState = {
  status: "idle" | "sending" | "success" | "error";
  message: string;
  accessEmail?: string;
};

type IbgeCity = {
  nome: string;
};

export default function CorrenteEmDiaLeadPage() {
  const [organizationType, setOrganizationType] = useState("terreiro");
  const [name, setName] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [state, setState] = useState("SP");
  const [city, setCity] = useState("Campinas");
  const [cityOptions, setCityOptions] = useState<string[]>(FALLBACK_CITIES_BY_UF.SP ?? []);
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [contributorsEstimate, setContributorsEstimate] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [founderConsent, setFounderConsent] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle", message: "" });

  const canSend = name.trim() && responsibleName.trim() && whatsapp.trim() && email.trim() && state && city && consent && founderConsent;

  useEffect(() => {
    let active = true;
    const fallback = FALLBACK_CITIES_BY_UF[state] ?? [];

    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${state}/municipios?orderBy=nome`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Falha ao carregar cidades."))))
      .then((items: IbgeCity[]) => {
        if (!active) return;
        const cities = items.map((item) => item.nome).filter(Boolean);
        setCityOptions(cities.length ? cities : fallback);
      })
      .catch(() => {
        if (!active) return;
        setCityOptions(fallback);
      });

    return () => {
      active = false;
    };
  }, [state]);

  const typeLabel = useMemo(() => formatCorrenteOrganizationType(normalizeCorrenteOrganizationType(organizationType)), [organizationType]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!canSend) return;

    setSubmitState({ status: "sending", message: "Enviando dados e preparando acesso..." });

    try {
      const response = await fetch("/api/corrente-em-dia/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "site_corrente_em_dia",
          organizationType,
          organizationName: name,
          responsibleName,
          state,
          city,
          whatsapp,
          email,
          contributorsEstimate,
          observations: notes,
          founderTermsAccepted: founderConsent,
          testimonialPermission: founderConsent,
          lgpdContactConsent: consent,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível enviar o cadastro de interesse.");

      setSubmitState({
        status: "success",
        message:
          "Cadastro recebido. Se o e-mail estiver correto, as orientações de acesso serão enviadas automaticamente. Caso não encontre a mensagem, confira spam/lixo eletrônico.",
        accessEmail: result.accessEmail,
      });
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
        solutionName="Corrente em Dia"
        logoSrc="/corrente-em-dia-logo.svg"
        logoAlt="Logo Corrente em Dia"
        actions={[]}
        sectionLinks={[]}
        topAction={
          <Link
            href="/solucoes/corrente-em-dia"
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#31C16B]/30 bg-[#31C16B] px-4 py-2 text-sm font-black text-[#00334E] shadow-md shadow-emerald-200/70 transition hover:-translate-y-0.5 hover:bg-[#43db7c]"
          >
            ← Voltar
          </Link>
        }
      />

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-7 lg:grid-cols-[0.9fr_1.1fr] lg:py-10">
        <div className="space-y-5">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#2F6B43]">Cadastro de interesse</p>
          <h1 className="text-4xl font-black leading-tight text-[#00334E]">Quero conhecer o Corrente em Dia</h1>
          <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6">
            <p className="text-base leading-8 text-slate-700 sm:text-lg">
              Preencha os dados principais da sua associação, federação ou terreiro para iniciar a conversa sobre o Corrente em Dia. A proposta é entender sua realidade, apresentar uma forma mais simples de organizar contribuições e mostrar como a casa pode ganhar mais clareza, previsibilidade e segurança, com respeito ao cuidado coletivo e à proteção de dados.
            </p>
            <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-950">
              Entre como Cliente Fundador e participe da fase inicial com condições especiais, prioridade nas melhorias e acompanhamento mais próximo.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="rounded-[2rem] bg-white p-5 shadow-xl sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="text-sm font-bold text-slate-700">Tipo de organização</span>
              <select value={organizationType} onChange={(event) => setOrganizationType(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 bg-white p-3">
                <option value="federacao">Federação</option>
                <option value="associacao">Associação</option>
                <option value="terreiro">Terreiro</option>
              </select>
            </label>

            <label className="sm:col-span-2">
              <span className="text-sm font-bold text-slate-700">Nome da organização *</span>
              <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" placeholder="Ex.: Casa Pai Benedito das Matas" />
            </label>

            <label className="sm:col-span-2">
              <span className="text-sm font-bold text-slate-700">Nome do responsável *</span>
              <input value={responsibleName} onChange={(event) => setResponsibleName(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" placeholder="Nome de quem vai conversar com a AE" />
            </label>

            <label>
              <span className="text-sm font-bold text-slate-700">UF *</span>
              <select
                value={state}
                onChange={(event) => {
                  const nextState = event.target.value;
                  setState(nextState);
                  setCity("");
                  setCityOptions(FALLBACK_CITIES_BY_UF[nextState] ?? []);
                }}
                className="mt-1 w-full rounded-2xl border border-slate-300 bg-white p-3"
              >
                {BRAZIL_STATES.map((item) => (
                  <option key={item.uf} value={item.uf}>{`${item.uf} - ${item.name}`}</option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-sm font-bold text-slate-700">Cidade *</span>
              <select value={city} onChange={(event) => setCity(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 bg-white p-3">
                <option value="">Selecione</option>
                {cityOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-sm font-bold text-slate-700">WhatsApp *</span>
              <input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" placeholder="(19) 99999-9999" inputMode="tel" />
            </label>

            <label>
              <span className="text-sm font-bold text-slate-700">E-mail *</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="mt-1 w-full rounded-2xl border border-slate-300 p-3" placeholder="contato@exemplo.com" />
            </label>

            <label className="sm:col-span-2">
              <span className="text-sm font-bold text-slate-700">Estimativa de contribuintes</span>
              <input value={contributorsEstimate} onChange={(event) => setContributorsEstimate(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" placeholder="Ex.: 100" inputMode="numeric" />
            </label>

            <label className="sm:col-span-2">
              <span className="text-sm font-bold text-slate-700">Observações</span>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" placeholder="Conte rapidamente como as contribuições são controladas hoje." />
            </label>
          </div>

          <div className="mt-4 space-y-3">
            <label className="flex gap-3 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-4 w-4" />
              <span>Autorizo a Automação Extrema a usar estes dados para contato sobre o Corrente em Dia. Entendo que os dados serão tratados conforme princípios da LGPD.</span>
            </label>
            <label className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <input type="checkbox" checked={founderConsent} onChange={(event) => setFounderConsent(event.target.checked)} className="mt-1 h-4 w-4" />
              <span>Quero participar da avaliação de 30 dias como Cliente Fundador e autorizo a AE a solicitar feedback e possível depoimento/testemunho, sempre mediante confirmação expressa.</span>
            </label>
          </div>

          {touched && !canSend && <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">Preencha organização, responsável, UF, cidade, WhatsApp, e-mail e aceite os termos de contato.</p>}

          {submitState.status !== "idle" && (
            <p className={`mt-4 rounded-2xl p-4 text-sm font-bold leading-6 ${submitState.status === "success" ? "bg-emerald-50 text-emerald-950" : submitState.status === "error" ? "bg-red-50 text-red-700" : "bg-slate-50 text-slate-700"}`}>
              {submitState.message}
              {submitState.accessEmail ? <span className="block pt-1">E-mail de acesso: {submitState.accessEmail}</span> : null}
            </p>
          )}

          <button type="submit" disabled={submitState.status === "sending"} className="mt-5 w-full rounded-2xl bg-[#31C16B] px-5 py-4 font-black text-[#00334E] shadow-lg shadow-emerald-200 ring-2 ring-[#31C16B]/20 transition hover:-translate-y-0.5 hover:bg-[#43db7c] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60">
            {submitState.status === "sending" ? "Preparando cadastro..." : `Enviar interesse como ${typeLabel}`}
          </button>
        </form>
      </section>
    </main>
  );
}

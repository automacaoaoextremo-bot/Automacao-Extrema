"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { AeSolutionHeader } from "@/components/ae-solution-header";
import { buildAeWhatsAppUrl } from "@/lib/ae-public-links";

function buildWhatsappUrl(message: string) {
  return buildAeWhatsAppUrl(message);
}

export default function CorrenteEmDiaLeadPage() {
  const [organizationType, setOrganizationType] = useState("terreiro");
  const [name, setName] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [contributorsEstimate, setContributorsEstimate] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState(false);

  const canSend = name.trim() && responsibleName.trim() && whatsapp.trim() && consent;

  const whatsappUrl = useMemo(() => {
    const typeLabel = organizationType === "federacao" ? "Federação" : organizationType === "associacao" ? "Associação" : "Terreiro";
    return buildWhatsappUrl(
      [
        "Olá! Quero conhecer o Corrente em Dia como Cliente Fundador.",
        `Tipo: ${typeLabel}`,
        `Nome da organização: ${name || "não informado"}`,
        `Responsável: ${responsibleName || "não informado"}`,
        `Cidade/UF: ${city || "não informado"}/${state || "não informado"}`,
        `WhatsApp: ${whatsapp || "não informado"}`,
        `E-mail: ${email || "não informado"}`,
        `Estimativa de contribuintes: ${contributorsEstimate || "não informado"}`,
        notes ? `Observações: ${notes}` : "Observações: quero entender como organizar arrecadações, Pix e comprovantes.",
      ].join("\n"),
    );
  }, [city, contributorsEstimate, email, name, notes, organizationType, responsibleName, state, whatsapp]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!canSend) return;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
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
              <span className="text-sm font-bold text-slate-700">Cidade</span>
              <input value={city} onChange={(event) => setCity(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" placeholder="Campinas" />
            </label>

            <label>
              <span className="text-sm font-bold text-slate-700">UF</span>
              <input value={state} onChange={(event) => setState(event.target.value.toUpperCase().slice(0, 2))} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" placeholder="SP" />
            </label>

            <label>
              <span className="text-sm font-bold text-slate-700">WhatsApp *</span>
              <input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" placeholder="(19) 99999-9999" />
            </label>

            <label>
              <span className="text-sm font-bold text-slate-700">E-mail</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="mt-1 w-full rounded-2xl border border-slate-300 p-3" placeholder="contato@exemplo.com" />
            </label>

            <label className="sm:col-span-2">
              <span className="text-sm font-bold text-slate-700">Estimativa de contribuintes</span>
              <input value={contributorsEstimate} onChange={(event) => setContributorsEstimate(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" placeholder="Ex.: 30 filhos da corrente, 10 cambonos e alguns consulentes" />
            </label>

            <label className="sm:col-span-2">
              <span className="text-sm font-bold text-slate-700">Observações</span>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" placeholder="Conte rapidamente como as contribuições são controladas hoje." />
            </label>
          </div>

          <label className="mt-4 flex gap-3 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-4 w-4" />
            <span>Autorizo a Automação Extrema a usar estes dados para contato sobre o Corrente em Dia. Entendo que os dados serão tratados conforme princípios da LGPD.</span>
          </label>

          {touched && !canSend && <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">Preencha nome da organização, responsável, WhatsApp e aceite o contato.</p>}

          <button type="submit" className="mt-5 w-full rounded-2xl bg-[#31C16B] px-5 py-4 font-black text-[#00334E] shadow-lg shadow-emerald-200 ring-2 ring-[#31C16B]/20 transition hover:-translate-y-0.5 hover:bg-[#43db7c] hover:shadow-xl">
            Enviar interesse pelo WhatsApp
          </button>
        </form>
      </section>
    </main>
  );
}

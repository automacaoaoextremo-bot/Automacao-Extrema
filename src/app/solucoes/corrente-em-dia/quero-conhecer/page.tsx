"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { AeBrandStrip, AeSolutionHeader } from "@/components/ae-solution-header";

const aeWhatsappNumber = (process.env.NEXT_PUBLIC_AE_WHATSAPP_NUMBER || "").replace(/\D/g, "");

function buildWhatsappUrl(message: string) {
  const text = encodeURIComponent(message);
  if (!aeWhatsappNumber) return `https://api.whatsapp.com/send?text=${text}`;
  const number = aeWhatsappNumber.startsWith("55") ? aeWhatsappNumber : `55${aeWhatsappNumber}`;
  return `https://wa.me/${number}?text=${text}`;
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
        actions={[
          { label: "Quero Conhecer", href: "/solucoes/corrente-em-dia/quero-conhecer", variant: "secondary" },
          { label: "Já sou Cliente", href: "/login", variant: "secondary" },
        ]}
      />
      <AeBrandStrip />

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <Link href="/solucoes/corrente-em-dia" className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#00334E] shadow-sm">
            ← Voltar
          </Link>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#2F6B43]">Cadastro de interesse</p>
          <h1 className="text-4xl font-black leading-tight text-[#00334E]">Quero conhecer o Corrente em Dia</h1>
          <p className="text-lg leading-8 text-slate-700">
            Preencha os dados principais da associação, federação ou terreiro. Por enquanto, esta página organiza o primeiro contato pelo WhatsApp da Automação Extrema para validar a implantação como Cliente Fundador.
          </p>
          <div className="rounded-3xl bg-white p-5 shadow">
            <p className="font-black text-[#00334E]">O que será avaliado na conversa</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
              <li>• quantidade aproximada de contribuintes;</li>
              <li>• chave Pix oficial da organização;</li>
              <li>• necessidade de contribuição individual, familiar ou livre;</li>
              <li>• quem poderá revisar e aprovar comprovantes;</li>
              <li>• autorização e cuidados com LGPD.</li>
            </ul>
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

          <button type="submit" className="mt-5 w-full rounded-2xl bg-[#31C16B] px-5 py-4 font-black text-[#00334E] shadow transition hover:bg-[#4ada82]">
            Enviar interesse pelo WhatsApp
          </button>
        </form>
      </section>
    </main>
  );
}

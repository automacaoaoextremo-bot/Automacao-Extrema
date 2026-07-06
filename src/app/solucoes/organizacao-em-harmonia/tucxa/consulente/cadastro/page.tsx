"use client";

import { FormEvent, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

type RequestType = "atendimento" | "contribuicao" | "contribuicao-anonima";

type ConsulenteResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
  whatsappUrl?: string;
};

function initialRequestType(): RequestType {
  if (typeof window === "undefined") return "atendimento";
  const tipo = new URLSearchParams(window.location.search).get("tipo");
  return tipo === "contribuicao" ? "contribuicao" : "atendimento";
}

const requestOptions: Array<{ value: RequestType; label: string; description: string }> = [
  {
    value: "atendimento",
    label: "Orientação / cadastro",
    description: "Para receber orientação inicial, agendar atendimento ou atualizar seus dados como Filho de Fora.",
  },
  {
    value: "contribuicao",
    label: "Contribuição identificada",
    description: "Para ajudar a casa mantendo seu nome e contato vinculados à contribuição.",
  },
  {
    value: "contribuicao-anonima",
    label: "Contribuição anônima",
    description: "Para contribuir sem identificação pública. Informe contato apenas se quiser retorno.",
  },
];

const headerActions = [
  {
    label: "Consulente",
    href: "/solucoes/organizacao-em-harmonia/tucxa/consulente",
    variant: "primary" as const,
  },
  {
    label: "Site do Tucxa",
    href: "/solucoes/organizacao-em-harmonia/tucxa",
    variant: "secondary" as const,
  },
];

export default function CadastroConsulenteTucxaPage() {
  const [requestType, setRequestType] = useState<RequestType>(initialRequestType);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [preferredDay, setPreferredDay] = useState("");
  const [contributionMode, setContributionMode] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setWhatsappUrl("");

    if (requestType !== "contribuicao-anonima" && !name.trim()) {
      setError("Informe seu nome para que a organização possa localizar seu cadastro com segurança.");
      return;
    }
    if (requestType !== "contribuicao-anonima" && !whatsapp.trim() && !email.trim()) {
      setError("Informe WhatsApp ou e-mail para que a organização consiga retornar, se necessário.");
      return;
    }
    if (email && !email.includes("@")) {
      setError("Confira o e-mail informado ou deixe o campo em branco.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/organizacao-em-harmonia/site-tucxa/consulentes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestType, name, whatsapp, email, preferredDay, contributionMode, notes }),
      });
      const result = (await response.json()) as ConsulenteResponse;
      if (!response.ok) throw new Error(result.error || "Não foi possível registrar suas informações.");
      setMessage(result.message || "Informações recebidas. A organização do Tucxa dará sequência conforme a necessidade.");
      setWhatsappUrl(result.whatsappUrl || "");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar as informações.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader actions={headerActions} navLabel="Menu de cadastro de consulentes do Tucxa" />

      <section className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="rounded-[1.75rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2F6B43]">Consulente / Filho de Fora</p>
          <h1 className="mt-2 text-2xl font-black text-[#123D2C] sm:text-3xl">Informe seus dados para orientação ou contribuição.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
            Preencha somente o necessário. A organização do Tucxa usa essas informações para orientar com mais clareza e evitar desencontros no atendimento.
          </p>

          <form onSubmit={submit} className="mt-5 grid gap-4">
            <div className="grid gap-2">
              <p className="text-sm font-black text-[#123D2C]">O que você precisa?</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {requestOptions.map((option) => (
                  <label key={option.value} className={`rounded-2xl p-4 ring-1 transition ${requestType === option.value ? "bg-[#E9F2E7] ring-[#123D2C]/20" : "bg-white ring-[#123D2C]/10"}`}>
                    <span className="flex items-start gap-3">
                      <input
                        type="radio"
                        checked={requestType === option.value}
                        onChange={() => setRequestType(option.value)}
                        className="mt-1 h-5 w-5"
                      />
                      <span>
                        <span className="block text-sm font-black text-[#123D2C]">{option.label}</span>
                        <span className="mt-1 block text-xs font-semibold leading-5 text-slate-600">{option.description}</span>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">Nome completo {requestType === "contribuicao-anonima" ? "" : "*"}</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-2xl border border-[#123D2C]/15 bg-white p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]"
                placeholder="Seu nome completo"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-sm font-black text-[#123D2C]">Celular/WhatsApp</span>
                <input
                  value={whatsapp}
                  onChange={(event) => setWhatsapp(event.target.value)}
                  inputMode="tel"
                  className="rounded-2xl border border-[#123D2C]/15 bg-white p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]"
                  placeholder="(19) 99999-9999"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-black text-[#123D2C]">E-mail</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  className="rounded-2xl border border-[#123D2C]/15 bg-white p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]"
                  placeholder="Opcional"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-sm font-black text-[#123D2C]">Dia preferido, se houver</span>
                <select
                  value={preferredDay}
                  onChange={(event) => setPreferredDay(event.target.value)}
                  className="rounded-2xl border border-[#123D2C]/15 bg-white p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]"
                >
                  <option value="">Sem preferência</option>
                  <option value="segunda">Segunda-feira</option>
                  <option value="terca">Terça-feira</option>
                  <option value="quarta">Quarta-feira / Transformação</option>
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-black text-[#123D2C]">Contribuição</span>
                <select
                  value={contributionMode}
                  onChange={(event) => setContributionMode(event.target.value)}
                  className="rounded-2xl border border-[#123D2C]/15 bg-white p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]"
                >
                  <option value="">Não informar agora</option>
                  <option value="pix-identificado">Pix identificado</option>
                  <option value="pix-anonimo">Pix anônimo</option>
                  <option value="orientacao">Preciso de orientação</option>
                </select>
              </label>
            </div>

            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">Mensagem / observação</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="min-h-28 rounded-2xl border border-[#123D2C]/15 bg-white p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]"
                placeholder="Escreva o que for importante para a organização orientar melhor."
              />
            </label>

            {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
            {message && <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}

            <button disabled={loading} className="rounded-2xl bg-[#123D2C] px-5 py-4 text-base font-black text-white shadow-lg shadow-green-900/10 transition hover:-translate-y-0.5 disabled:opacity-60">
              {loading ? "Enviando..." : "Enviar para a organização do Tucxa"}
            </button>

            {whatsappUrl && (
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="rounded-2xl bg-[#E9F2E7] px-5 py-4 text-center text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5">
                Continuar pelo WhatsApp
              </a>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}

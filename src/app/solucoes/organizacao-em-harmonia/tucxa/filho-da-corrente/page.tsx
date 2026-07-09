"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { filhoDaCorrenteAgenda as fallbackFilhoDaCorrenteAgenda, filhoDaCorrenteFunctions } from "../tucxa-content";

type AccessPerson = {
  fullName: string;
  whatsapp: string;
  email: string;
  notes: string;
  accessStatus: string;
  modules: string[];
  profile?: {
    functionSlugs?: string[];
    agendaSlugs?: string[];
  } | null;
};


type AgendaOption = {
  slug: string;
  label: string;
  title?: string;
  dateLabel?: string;
  timeLabel?: string;
  recurrenceLabel?: string;
  locationLabel?: string;
  description?: string;
};

type AccessResponse = {
  ok?: boolean;
  authEmail?: string;
  person?: AccessPerson | null;
  message?: string;
  error?: string;
  whatsappUrl?: string;
};

const statusLabels: Record<string, string> = {
  ativo: "Acesso liberado",
  pendente_validacao: "Aguardando validação do responsável do Tucxa",
  ajuste_solicitado: "Ajuste solicitado",
  inativo: "Cadastro inativo",
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isEmail(value: string) {
  return value.includes("@");
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export default function FilhoDaCorrenteTucxaPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupShowPassword, setSignupShowPassword] = useState(false);
  const [notes, setNotes] = useState("");
  const [functionSlugs, setFunctionSlugs] = useState<string[]>([]);
  const [agendaSlugs, setAgendaSlugs] = useState<string[]>([]);
  const [agendaOptions, setAgendaOptions] = useState<AgendaOption[]>([...fallbackFilhoDaCorrenteAgenda]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [foundPerson, setFoundPerson] = useState<AccessPerson | null>(null);



  useEffect(() => {
    let active = true;
    fetch("/api/organizacao-em-harmonia/site-tucxa/agenda-options")
      .then(async (response) => {
        const result = (await response.json()) as { options?: Array<Partial<AgendaOption>> };
        if (!response.ok) return;
        const options = (result.options ?? [])
          .map((item) => ({
            slug: String(item.slug || "").trim(),
            label: String(item.label || "").trim(),
            title: typeof item.title === "string" ? item.title.trim() : undefined,
            dateLabel: typeof item.dateLabel === "string" ? item.dateLabel.trim() : undefined,
            timeLabel: typeof item.timeLabel === "string" ? item.timeLabel.trim() : undefined,
            recurrenceLabel: typeof item.recurrenceLabel === "string" ? item.recurrenceLabel.trim() : undefined,
            locationLabel: typeof item.locationLabel === "string" ? item.locationLabel.trim() : undefined,
            description: typeof item.description === "string" ? item.description.trim() : undefined,
          }))
          .filter((item) => item.slug && item.label);
        if (active && options.length) setAgendaOptions(options);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const focus = params.get("modo");
    if (focus === "primeiro-acesso") {
      window.setTimeout(() => document.getElementById("primeiro-acesso")?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    }
  }, []);

  const selectedSummary = useMemo(() => {
    const functionLabels = filhoDaCorrenteFunctions.filter((item) => functionSlugs.includes(item.slug)).map((item) => item.label);
    const agendaLabels = agendaOptions
      .filter((item) => agendaSlugs.includes(item.slug))
      .map((item) => (item.description ? `${item.label} (${item.description})` : item.label));
    return [...functionLabels, ...agendaLabels];
  }, [agendaOptions, agendaSlugs, functionSlugs]);

  async function resolveLoginEmail() {
    const value = identifier.trim();
    if (!value) throw new Error("Informe seu e-mail ou WhatsApp.");
    if (isEmail(value)) return value.toLowerCase();

    const response = await fetch("/api/organizacao-em-harmonia/filhos-corrente/acesso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve-login", identifier: value }),
    });
    const result = (await response.json()) as AccessResponse;
    if (!response.ok || !result.authEmail) throw new Error(result.error || "Não foi possível localizar seu cadastro pelo WhatsApp.");
    return result.authEmail;
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const authEmail = await resolveLoginEmail();
      const { error: authError } = await supabaseBrowser.auth.signInWithPassword({ email: authEmail, password });
      if (authError) {
        setLoginError("Não foi possível entrar. Confira WhatsApp/e-mail e senha. Se for seu primeiro acesso, confirme seus dados abaixo.");
        return;
      }
      window.location.href = "/solucoes/organizacao-em-harmonia/cliente";
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Não foi possível entrar agora.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function submitFirstAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!fullName.trim()) {
      setError("Informe seu nome completo.");
      return;
    }
    if (onlyDigits(whatsapp).length < 10) {
      setError("Informe seu WhatsApp com DDD. Este é o principal canal de orientação do Tucxa.");
      return;
    }
    if (functionSlugs.length === 0) {
      const confirmed = window.confirm(
        "Você não marcou nenhuma função além de Filho da Corrente. Confirma que atualmente é somente Filho da Corrente e não participa de nenhuma outra função listada?",
      );
      if (!confirmed) return;
    }
    if (signupPassword.length < 8) {
      setError("Crie uma senha com pelo menos 8 caracteres para os próximos acessos.");
      return;
    }
    if (email && !email.includes("@")) {
      setError("Confira o e-mail informado ou deixe o campo em branco.");
      return;
    }

    setSubmitLoading(true);
    try {
      const response = await fetch("/api/organizacao-em-harmonia/filhos-corrente/acesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          fullName,
          whatsapp,
          email,
          password: signupPassword,
          notes,
          functionSlugs,
          agendaSlugs,
        }),
      });
      const result = (await response.json()) as AccessResponse;
      if (!response.ok) throw new Error(result.error || "Não foi possível enviar seu cadastro.");
      setFoundPerson(result.person ?? null);
      setSignupPassword("");
      setMessage(result.message || "Cadastro recebido. O responsável do Tucxa irá confirmar seus dados e liberar o acesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar cadastro.");
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={[
          { label: "Início", href: "#inicio", variant: "primary" },
          { label: "Primeiro acesso", href: "#primeiro-acesso", variant: "secondary" },
          { label: "Voltar ao site", href: "/solucoes/organizacao-em-harmonia/tucxa", variant: "secondary" },
        ]}
        navLabel="Menu dos Filhos da Corrente do Tucxa"
      />

      <section id="inicio" className="mx-auto grid max-w-6xl scroll-mt-48 gap-5 px-4 py-5 sm:scroll-mt-44 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-8">
        <div
          id="acesso"
          className="order-1 scroll-mt-48 rounded-[1.75rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:scroll-mt-44 sm:p-6 lg:col-start-1 lg:row-start-1"
        >
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#2F6B43]">Filho da Corrente - Acesso liberado</p>
            <h1 className="mt-2 text-2xl font-black text-[#123D2C] sm:text-3xl">Entrar com WhatsApp ou e-mail</h1>
            <p className="mt-3 leading-7 text-slate-700">
              Use este acesso depois que o responsável do Tucxa validar seus dados. A senha é a mesma cadastrada no primeiro acesso.
            </p>

            <form onSubmit={login} className="mt-5 grid gap-4">
              <label className="grid gap-1">
                <span className="text-sm font-black text-[#123D2C]">E-mail ou WhatsApp</span>
                <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="rounded-2xl border border-[#123D2C]/15 bg-white p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]" placeholder="seu@email.com ou (19) 99999-9999" required />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-black text-[#123D2C]">Senha</span>
                <div className="flex rounded-2xl border border-[#123D2C]/15 bg-white focus-within:border-[#2F6B43] focus-within:ring-4 focus-within:ring-[#E9F2E7]">
                  <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} className="min-w-0 flex-1 rounded-2xl bg-transparent p-4 text-base outline-none" placeholder="Digite sua senha" required />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="shrink-0 px-4 text-sm font-black text-[#123D2C]">
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </label>
              {loginError && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{loginError}</p>}
              <button disabled={loginLoading} className="rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white shadow-lg shadow-green-900/10 transition hover:-translate-y-0.5 disabled:opacity-60">
                {loginLoading ? "Entrando..." : "Entrar"}
              </button>
              <a href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/esqueci-senha" className="text-center text-sm font-black text-[#123D2C] underline underline-offset-4">
                Esqueci minha senha
              </a>
            </form>
          </div>

        <div
          id="primeiro-acesso"
          className="order-2 scroll-mt-48 rounded-[1.75rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:scroll-mt-44 sm:p-6 lg:col-start-2 lg:row-span-2 lg:row-start-1"
        >
          <div className="rounded-[1.5rem] bg-[#E9F2E7] p-4 ring-1 ring-[#123D2C]/10">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2F6B43]">Primeiro acesso</p>
            <h2 className="mt-2 text-2xl font-black text-[#123D2C]">Confirme seus dados para validação</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Nome completo e WhatsApp são obrigatórios. O e-mail é opcional, mas recomendado para receber orientações também fora do grupo de recados do WhatsApp.
            </p>
          </div>

          <div className="mt-4 rounded-3xl bg-[#123D2C] p-4 text-white shadow-lg shadow-green-900/10">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7]">Importante</p>
            <h2 className="mt-2 text-xl font-black">Informe somente o que se aplica a você.</h2>
            <p className="mt-2 text-sm leading-6 text-[#EEF7EA]">
              As funções adicionais e a agenda ajudam a casa a orientar melhor cada filho, organizar grupos, evitar chamadas duplicadas e preparar os módulos Agenda Viva, Atendimento em Harmonia e Corrente em Dia com mais segurança.
            </p>
          </div>

          {foundPerson && (
            <div className="mt-4 rounded-3xl bg-blue-50 p-4 text-sm leading-6 text-[#123D2C] ring-1 ring-blue-100">
              <p className="font-black">Dados encontrados na Base Única</p>
              <p>Confira e ajuste abaixo. Status atual: {statusLabels[foundPerson.accessStatus] ?? foundPerson.accessStatus}</p>
            </div>
          )}

          <form onSubmit={submitFirstAccess} className="mt-5 grid gap-4">
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">Nome completo *</span>
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="rounded-2xl border border-[#123D2C]/15 p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]" placeholder="Seu nome completo" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">Celular/WhatsApp *</span>
              <input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} inputMode="tel" className="rounded-2xl border border-[#123D2C]/15 p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]" placeholder="(19) 99999-9999" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">E-mail</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="rounded-2xl border border-[#123D2C]/15 p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]" placeholder="Opcional, mas recomendado" />
              <span className="text-xs font-semibold text-slate-600">Com o e-mail, você recebe comunicados importantes em dois canais e reduz o risco de perder alguma orientação.</span>
            </label>

            <div className="rounded-3xl border border-[#123D2C]/10 bg-[#F7FAF2] p-4">
              <p className="text-sm font-black text-[#123D2C]">Função</p>
              <p className="mt-1 text-xs font-semibold text-slate-600">Marque somente as funções adicionais que você exerce. Se você for apenas Filho da Corrente, deixe sem marcar.</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">O vínculo de Filho da Corrente já fica registrado automaticamente neste cadastro.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {filhoDaCorrenteFunctions.map((item) => (
                  <label key={item.slug} className="flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10">
                    <input type="checkbox" checked={functionSlugs.includes(item.slug)} onChange={() => setFunctionSlugs((current) => toggleValue(current, item.slug))} className="mt-1 h-5 w-5" />
                    <span className="text-sm font-bold text-[#123D2C]">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-[#123D2C]/10 bg-[#F7FAF2] p-4">
              <p className="text-sm font-black text-[#123D2C]">Agenda</p>
              <p className="mt-1 text-xs font-semibold text-slate-600">Informe também os atendimentos, grupos, estudos e ações em que você está envolvido.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {agendaOptions.map((item) => (
                  <label key={item.slug} className="flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10">
                    <input type="checkbox" checked={agendaSlugs.includes(item.slug)} onChange={() => setAgendaSlugs((current) => toggleValue(current, item.slug))} className="mt-1 h-5 w-5" />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-[#123D2C]">{item.label}</span>
                      {(item.description || item.recurrenceLabel || item.dateLabel || item.timeLabel) && (
                        <span className="mt-1 block text-xs font-semibold leading-5 text-slate-600">
                          {item.description || [item.recurrenceLabel, item.dateLabel, item.timeLabel, item.locationLabel ? `Local: ${item.locationLabel}` : ""].filter(Boolean).join(" • ")}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">Crie uma senha para os próximos acessos *</span>
              <div className="flex rounded-2xl border border-[#123D2C]/15 bg-white focus-within:border-[#2F6B43] focus-within:ring-4 focus-within:ring-[#E9F2E7]">
                <input value={signupPassword} onChange={(event) => setSignupPassword(event.target.value)} type={signupShowPassword ? "text" : "password"} className="min-w-0 flex-1 rounded-2xl bg-transparent p-4 text-base outline-none" placeholder="Mínimo 8 caracteres" />
                <button type="button" onClick={() => setSignupShowPassword((value) => !value)} className="shrink-0 px-4 text-sm font-black text-[#123D2C]">
                  {signupShowPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">Observação para facilitar a validação</span>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-24 rounded-2xl border border-[#123D2C]/15 p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]" placeholder="Ex.: meu nome está abreviado no WhatsApp; participo do grupo 1; ajudo no Sementinha..." />
            </label>

            {selectedSummary.length > 0 && (
              <div className="rounded-3xl bg-[#E9F2E7] p-4 text-sm leading-6 text-[#123D2C] ring-1 ring-[#123D2C]/10">
                <p className="font-black">Resumo do que será enviado para validação</p>
                <p>{selectedSummary.join(" • ")}</p>
              </div>
            )}

            <div className="rounded-3xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 ring-1 ring-amber-100">
              <p className="font-black">Depois de enviar</p>
              <p>O responsável do Tucxa irá confirmar seus dados e liberar o acesso com as orientações detalhadas de uso.</p>
            </div>

            {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
            {message && <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</p>}

            <button disabled={submitLoading} className="rounded-2xl bg-[#123D2C] px-5 py-4 text-base font-black text-white shadow-lg shadow-green-900/10 transition hover:-translate-y-0.5 disabled:opacity-60">
              {submitLoading ? "Enviando..." : "Enviar para validação do Tucxa"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

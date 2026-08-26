"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

type ConsulenteResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
  whatsappUrl?: string;
  redirectUrl?: string;
  statusUrl?: string;
};

type Step = 1 | 2 | 3;

const headerActions = [
  { label: "Início", href: "#inicio", variant: "primary" as const },
  {
    label: "Voltar",
    href: "/solucoes/organizacao-em-harmonia/tucxa?semPopup=1#consulentes",
    variant: "secondary" as const,
  },
];

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function TouchHint() {
  return (
    <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.18em] text-[#2F6B43]">
      TOQUE PARA ABRIR
    </span>
  );
}

export default function CadastroConsulenteTucxaPage() {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [privacyNoticeAccepted, setPrivacyNoticeAccepted] = useState(false);
  const [communicationsOptIn, setCommunicationsOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [returnTo, setReturnTo] = useState("");

  const stepOneValid = name.trim().length > 0 && onlyDigits(whatsapp).length >= 10;
  const acervoContinuation = returnTo.includes("/tucxa/acervo-vivo");
  const stepTwoValid =
    password.length >= 8 &&
    (acervoContinuation ? email.includes("@") : (!email.trim() || email.includes("@")));
  const canSubmit = stepOneValid && stepTwoValid && privacyNoticeAccepted && !loading;

  const completedSteps = useMemo(
    () => [stepOneValid, stepTwoValid, privacyNoticeAccepted],
    [privacyNoticeAccepted, stepOneValid, stepTwoValid],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefilledName = params.get("name")?.trim() || "";
    const prefilledWhatsapp = params.get("whatsapp")?.trim() || "";
    const prefilledEmail = params.get("email")?.trim() || "";
    const requestedReturnTo = params.get("returnTo")?.trim() || "";

    // Os parâmetros da URL são uma fonte externa ao estado do React. Aplicamos o
    // preenchimento após o efeito iniciar para evitar atualizações síncronas de
    // estado dentro do próprio effect (react-hooks/set-state-in-effect).
    const timer = window.setTimeout(() => {
      if (prefilledName) setName(prefilledName);
      if (prefilledWhatsapp) setWhatsapp(prefilledWhatsapp);
      if (prefilledEmail) setEmail(prefilledEmail);
      if (
        requestedReturnTo.startsWith("/solucoes/organizacao-em-harmonia/tucxa/") &&
        !requestedReturnTo.startsWith("//")
      ) {
        setReturnTo(requestedReturnTo);
      }

      if (prefilledName || prefilledWhatsapp || prefilledEmail) {
        setFormOpen(true);
        setStep(1);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!formOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [formOpen]);

  function openForm(nextStep: Step = 1) {
    setError("");
    setMessage("");
    setWhatsappUrl("");
    setStep(nextStep);
    setFormOpen(true);
  }

  function goNext() {
    setError("");
    if (step === 1) {
      if (!name.trim()) {
        setError("Informe seu nome completo para continuar.");
        return;
      }
      if (onlyDigits(whatsapp).length < 10) {
        setError("Informe seu celular com WhatsApp e DDD para continuar.");
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (acervoContinuation && !email.includes("@")) {
        setError("Para empréstimos no Acervo Vivo, informe um e-mail válido para receber a confirmação e os lembretes.");
        return;
      }
      if (email && !email.includes("@")) {
        setError("Confira o e-mail informado ou deixe o campo em branco.");
        return;
      }
      if (password.length < 8) {
        setError("Crie uma senha com pelo menos 8 caracteres para continuar.");
        return;
      }
      setStep(3);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setWhatsappUrl("");

    if (!stepOneValid) {
      setStep(1);
      setError("Confira seu nome e o celular com WhatsApp antes de finalizar.");
      return;
    }
    if (!stepTwoValid) {
      setStep(2);
      setError("Confira o e-mail e crie uma senha com pelo menos 8 caracteres.");
      return;
    }
    if (!privacyNoticeAccepted) {
      setStep(3);
      setError("Leia o Aviso de Privacidade e confirme que está ciente do tratamento dos seus dados.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/organizacao-em-harmonia/site-tucxa/consulentes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit-cadastro",
          requestType: "cadastro-consulente",
          name,
          whatsapp,
          email,
          password,
          privacyNoticeAccepted,
          privacyNoticeVersion: "2026-07-19",
          communicationsOptIn,
        }),
      });
      const result = (await response.json()) as ConsulenteResponse;
      if (!response.ok) throw new Error(result.error || "Não foi possível registrar suas informações.");
      if (returnTo) {
        if (!email.includes("@")) {
          throw new Error("Informe um e-mail válido para entrar automaticamente e continuar no Acervo Vivo.");
        }

        const { error: signInError } = await supabaseBrowser.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) {
          throw new Error(
            "Cadastro concluído, mas não foi possível entrar automaticamente. Use o e-mail e a senha cadastrados para continuar.",
          );
        }

        window.location.href = returnTo;
        return;
      }
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      setMessage(
        result.message ||
          "Cadastro recebido. Seu acesso já está liberado para entrar com WhatsApp ou e-mail e a senha cadastrada.",
      );
      setWhatsappUrl(result.whatsappUrl || result.statusUrl || "");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar as informações.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main id="inicio" className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={headerActions}
        navLabel="Menu de cadastro de consulentes do Tucxa"
      />

      <section className="mx-auto max-w-xl px-3 py-3 sm:px-4 sm:py-5">
        <div className="rounded-[1.75rem] bg-white p-4 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#2F6B43] sm:text-xs">
            Cadastro de consulente
          </p>
          <h1 className="mt-1.5 text-2xl font-black leading-tight text-[#123D2C] sm:text-3xl">
            Faça seu cadastro em 3 passos rápidos.
          </h1>
          <p className="mt-2 text-sm font-semibold leading-5 text-slate-600">
            No celular, cada grupo de informações abre em uma janela própria. Assim você preenche somente o necessário, sem percorrer uma página longa.
          </p>

          <button
            type="button"
            onClick={() => openForm(1)}
            className="mt-4 w-full rounded-[1.4rem] bg-[#E9F2E7] px-4 py-4 text-left shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#DDEAD8]"
          >
            <span className="block text-lg font-black text-[#123D2C]">
              Preencher meu cadastro
            </span>
            <TouchHint />
          </button>

          <div className="mt-3 grid grid-cols-3 gap-2" aria-label="Etapas do cadastro">
            {["Identificação", "Acesso", "Privacidade"].map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => openForm((index + 1) as Step)}
                className={`rounded-2xl px-2 py-3 text-center text-[11px] font-black ring-1 transition sm:text-xs ${
                  completedSteps[index]
                    ? "bg-[#123D2C] text-white ring-[#123D2C]"
                    : "bg-white text-[#123D2C] ring-[#123D2C]/15 hover:bg-[#F7FAF2]"
                }`}
              >
                <span className="block text-[10px] uppercase tracking-[0.1em] opacity-70">
                  Passo {index + 1}
                </span>
                <span className="mt-1 block">{label}</span>
              </button>
            ))}
          </div>

          <p className="mt-3 text-center text-xs font-semibold text-slate-500">
            O acesso é liberado após o envio das informações obrigatórias.
          </p>
          <Link
            href="/solucoes/organizacao-em-harmonia/tucxa/consulente/login"
            className="mt-3 block text-center text-sm font-black text-[#123D2C] underline underline-offset-4"
          >
            Já tenho cadastro e quero entrar
          </Link>
        </div>
      </section>

      {formOpen && (
        <div
          className="fixed inset-0 z-[180] flex items-center justify-center bg-[#10251C]/75 p-2 backdrop-blur-sm sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !loading) setFormOpen(false);
          }}
        >
          <form
            onSubmit={submit}
            className="flex max-h-[calc(100dvh-1rem)] w-full max-w-xl flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-[2rem]"
            role="dialog"
            aria-modal="true"
            aria-label="Cadastro de consulente"
          >
            <header className="shrink-0 border-b border-[#123D2C]/10 bg-white px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43]">
                    Cadastro de consulente · Passo {step} de 3
                  </p>
                  <h2 className="mt-1 text-xl font-black leading-tight text-[#123D2C]">
                    {step === 1
                      ? "Quem é você?"
                      : step === 2
                        ? "Como você vai entrar?"
                        : "Confirme e libere seu acesso"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  disabled={loading}
                  className="shrink-0 rounded-xl bg-[#123D2C] px-3 py-2 text-sm font-black text-white disabled:opacity-50"
                >
                  Fechar
                </button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1">
                {[1, 2, 3].map((item) => (
                  <span
                    key={item}
                    className={`h-1.5 rounded-full ${item <= step ? "bg-[#123D2C]" : "bg-[#DDEAD8]"}`}
                  />
                ))}
              </div>
            </header>

            <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
              {step === 1 && (
                <div className="grid gap-3">
                  <label className="grid gap-1">
                    <span className="text-sm font-black text-[#123D2C]">Nome completo *</span>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="name"
                      required
                      className="rounded-2xl border border-[#123D2C]/15 bg-white p-3.5 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]"
                      placeholder="Seu nome completo"
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-sm font-black text-[#123D2C]">Celular com WhatsApp *</span>
                    <input
                      value={whatsapp}
                      onChange={(event) => setWhatsapp(event.target.value)}
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      className="rounded-2xl border border-[#123D2C]/15 bg-white p-3.5 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]"
                      placeholder="(19) 99999-9999"
                    />
                    <span className="text-xs font-semibold leading-5 text-slate-600">
                      Este será o canal principal para orientações, avisos e confirmação de cadastro.
                    </span>
                  </label>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-3">
                  <label className="grid gap-1">
                    <span className="text-sm font-black text-[#123D2C]">E-mail</span>
                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      type="email"
                      autoComplete="email"
                      className="rounded-2xl border border-[#123D2C]/15 bg-white p-3.5 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]"
                      placeholder="Opcional, mas recomendado"
                    />
                    <span className="text-xs font-semibold leading-5 text-slate-600">
                      O e-mail cria um segundo canal para confirmações e orientações importantes.
                    </span>
                  </label>

                  <label className="grid gap-1">
                    <span className="text-sm font-black text-[#123D2C]">Senha *</span>
                    <div className="flex rounded-2xl border border-[#123D2C]/15 bg-white focus-within:border-[#2F6B43] focus-within:ring-4 focus-within:ring-[#E9F2E7]">
                      <input
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        minLength={8}
                        className="min-w-0 flex-1 rounded-2xl bg-transparent p-3.5 text-base outline-none"
                        placeholder="Mínimo 8 caracteres"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="shrink-0 px-4 text-sm font-black text-[#123D2C]"
                      >
                        {showPassword ? "Ocultar" : "Mostrar"}
                      </button>
                    </div>
                  </label>
                </div>
              )}

              {step === 3 && (
                <div className="grid gap-3">
                  <section className="grid gap-3 rounded-3xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={privacyNoticeAccepted}
                        onChange={(event) => setPrivacyNoticeAccepted(event.target.checked)}
                        className="mt-1 h-5 w-5 shrink-0 accent-[#123D2C]"
                        required
                      />
                      <span className="text-sm font-semibold leading-5 text-[#123D2C]">
                        Li o{" "}
                        <Link
                          href="/solucoes/organizacao-em-harmonia/tucxa/consulente/privacidade"
                          target="_blank"
                          className="font-black underline underline-offset-4"
                        >
                          Aviso de Privacidade
                        </Link>{" "}
                        e estou ciente do tratamento dos meus dados para cadastro, acesso e agendamento no TUCXA. *
                      </span>
                    </label>

                    <label className="flex items-start gap-3 border-t border-[#123D2C]/10 pt-3">
                      <input
                        type="checkbox"
                        checked={communicationsOptIn}
                        onChange={(event) => setCommunicationsOptIn(event.target.checked)}
                        className="mt-1 h-5 w-5 shrink-0 accent-[#123D2C]"
                      />
                      <span className="text-sm font-semibold leading-5 text-[#123D2C]">
                        Aceito receber futuras informações da Organização em Harmonia do TUCXA por e-mail. Esta opção é facultativa.
                      </span>
                    </label>
                  </section>

                  <div className="rounded-2xl bg-[#E9F2E7] p-3 text-sm leading-5 text-[#123D2C] ring-1 ring-[#123D2C]/10">
                    <p className="font-black">Depois de enviar</p>
                    <p>Seu acesso será liberado automaticamente para entrar com WhatsApp ou e-mail e a senha cadastrada.</p>
                  </div>
                </div>
              )}

              {error && (
                <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">
                  {error}
                </p>
              )}
              {message && (
                <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">
                  {message}
                </p>
              )}
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block rounded-2xl bg-[#E9F2E7] px-5 py-3 text-center text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10"
                >
                  Continuar pelo WhatsApp
                </a>
              )}
            </div>

            <footer className="shrink-0 border-t border-[#123D2C]/10 bg-white p-3 sm:p-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    if (step === 1) setFormOpen(false);
                    else setStep((step - 1) as Step);
                  }}
                  disabled={loading}
                  className="rounded-xl bg-white px-4 py-3 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-50"
                >
                  {step === 1 ? "Fechar" : "Voltar"}
                </button>

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="rounded-xl bg-[#123D2C] px-4 py-3 text-sm font-black text-white"
                  >
                    Continuar
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="rounded-xl bg-[#123D2C] px-3 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35"
                    title={canSubmit ? "Criar cadastro" : "Preencha todas as informações obrigatórias"}
                  >
                    {loading ? "Enviando..." : "Criar cadastro e liberar acesso"}
                  </button>
                )}
              </div>
              {step === 3 && !canSubmit && !loading && (
                <p className="mt-2 text-center text-[11px] font-bold text-slate-500">
                  O botão será liberado quando todos os campos obrigatórios estiverem válidos.
                </p>
              )}
            </footer>
          </form>
        </div>
      )}
    </main>
  );
}

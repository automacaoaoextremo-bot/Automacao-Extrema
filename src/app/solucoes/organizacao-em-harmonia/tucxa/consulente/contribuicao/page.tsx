"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

type RecurringOption = {
  value: string;
  label: string;
  available: boolean;
  note?: string;
};

type ContributionSettings = {
  defaultMonthlyAmount: number;
  allowCustomAmount: boolean;
  allowedDueDays: number[];
  defaultDueDay: number;
  pixKey: string;
  pixReceiverName: string;
  pixCity: string;
  publicMessage: string;
  recurringOptions: RecurringOption[];
};

type ApiPayload = {
  settings?: ContributionSettings;
  error?: string;
};

type SubmitPayload = {
  ok?: boolean;
  contribution?: { id: string; status: string; due_date: string };
  pixCode?: string;
  message?: string;
  error?: string;
};

const headerActions = [
  {
    label: "Início",
    href: "/solucoes/organizacao-em-harmonia/tucxa",
    variant: "secondary" as const,
  },
  {
    label: "Prestação de contas",
    href: "/solucoes/organizacao-em-harmonia/tucxa/transparencia",
    variant: "secondary" as const,
  },
  {
    label: "Contribuir",
    href: "#contribuir",
    variant: "primary" as const,
  },
  {
    label: "Dúvidas?",
    href: "#duvidas",
    variant: "secondary" as const,
    action: "supportWhatsapp" as const,
  },
];

function initialAnonymous() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("tipo") === "anonima";
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function parseMoney(value: string) {
  const normalized = value
    .replace(/\s/g, "")
    .replace(/^R\$/i, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function ContribuicaoConsulentePage() {
  const [settings, setSettings] = useState<ContributionSettings | null>(null);
  const [anonymous, setAnonymous] = useState(initialAnonymous);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [amountOption, setAmountOption] = useState("padrao");
  const [customAmount, setCustomAmount] = useState("");
  const [recurrenceType, setRecurrenceType] = useState("pontual");
  const [preferredDueDay, setPreferredDueDay] = useState("10");
  const [reminderDays, setReminderDays] = useState<number[]>([3, 1]);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<SubmitPayload | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/organizacao-em-harmonia/site-tucxa/contribuicoes", {
      cache: "no-store",
    })
      .then(async (response) => {
        const result = (await response.json()) as ApiPayload;
        if (!response.ok) {
          throw new Error(result.error || "Não foi possível carregar as opções.");
        }
        if (!active || !result.settings) return;
        setSettings(result.settings);
        setPreferredDueDay(String(result.settings.defaultDueDay));
      })
      .catch((reason) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Erro ao carregar contribuição.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const amount = useMemo(() => {
    if (!settings) return 0;
    if (amountOption === "padrao") return settings.defaultMonthlyAmount;
    return parseMoney(customAmount);
  }, [amountOption, customAmount, settings]);

  const selectedRecurring = useMemo(
    () =>
      settings?.recurringOptions.find(
        (option) => option.value === recurrenceType,
      ),
    [recurrenceType, settings?.recurringOptions],
  );

  function toggleReminder(day: number) {
    setReminderDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day].sort((a, b) => b - a),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(null);

    if (!settings) return;
    if (amount < 1) {
      setError("Informe um valor de contribuição maior que zero.");
      return;
    }
    if (!anonymous && !name.trim()) {
      setError("Informe seu nome ou escolha contribuição não identificada.");
      return;
    }
    if (selectedRecurring && !selectedRecurring.available) {
      setError("Essa forma recorrente ainda depende da integração com um provedor.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        "/api/organizacao-em-harmonia/site-tucxa/contribuicoes",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anonymous,
            name,
            email,
            whatsapp,
            amount,
            recurrenceType,
            preferredDueDay: Number(preferredDueDay),
            reminderDaysBefore: reminderDays,
            paymentMethod,
            notes,
          }),
        },
      );
      const result = (await response.json()) as SubmitPayload;
      if (!response.ok) {
        throw new Error(result.error || "Não foi possível registrar.");
      }
      setSuccess(result);
      window.setTimeout(() => {
        document
          .getElementById("contribuicao-concluida")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao registrar contribuição.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function copyPix() {
    if (!success?.pixCode) return;
    try {
      await navigator.clipboard.writeText(success.pixCode);
    } catch {
      setError("Não foi possível copiar automaticamente. Selecione o texto.");
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={headerActions}
        navLabel="Menu de contribuição"
        showSupport={false}
      />

      <section
        id="contribuir"
        className="scroll-mt-48 mx-auto max-w-5xl space-y-5 px-4 py-5 sm:px-6 lg:px-8"
      >
        <header className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7]">
            Corrente em Dia
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
            Ajude a manter a Casa em harmonia.
          </h1>
          <p className="mt-3 max-w-4xl text-base leading-7 text-[#EEF7EA]">
            {settings?.publicMessage ||
              "Você escolhe o valor, se deseja se identificar e se prefere contribuir uma vez ou regularmente."}
          </p>
        </header>

        {loading && (
          <p className="rounded-2xl bg-white p-5 font-bold text-slate-500 shadow">
            Carregando opções...
          </p>
        )}
        {error && (
          <p className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">
            {error}
          </p>
        )}

        {!loading && settings && (
          <form onSubmit={submit} className="grid gap-5 lg:grid-cols-2">
            <section className="space-y-5 rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                  1. Identificação
                </p>
                <h2 className="mt-1 text-xl font-black text-[#123D2C]">
                  Como deseja contribuir?
                </h2>
              </div>

              <div className="grid gap-3">
                <label
                  className={`rounded-2xl p-4 ring-1 ${
                    !anonymous
                      ? "bg-[#E9F2E7] ring-[#123D2C]/20"
                      : "bg-white ring-[#123D2C]/10"
                  }`}
                >
                  <span className="flex items-start gap-3">
                    <input
                      type="radio"
                      checked={!anonymous}
                      onChange={() => setAnonymous(false)}
                      className="mt-1 h-5 w-5"
                    />
                    <span>
                      <span className="block font-black text-[#123D2C]">
                        Identificada para a Tesouraria
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-slate-600">
                        Seu nome fica protegido e nunca aparece na prestação pública.
                      </span>
                    </span>
                  </span>
                </label>
                <label
                  className={`rounded-2xl p-4 ring-1 ${
                    anonymous
                      ? "bg-[#E9F2E7] ring-[#123D2C]/20"
                      : "bg-white ring-[#123D2C]/10"
                  }`}
                >
                  <span className="flex items-start gap-3">
                    <input
                      type="radio"
                      checked={anonymous}
                      onChange={() => setAnonymous(true)}
                      className="mt-1 h-5 w-5"
                    />
                    <span>
                      <span className="block font-black text-[#123D2C]">
                        Não identificada no sistema
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-slate-600">
                        O banco ou provedor ainda pode registrar dados transacionais.
                      </span>
                    </span>
                  </span>
                </label>
              </div>

              {!anonymous && (
                <div className="grid gap-3">
                  <label className="grid gap-1 font-black text-[#123D2C]">
                    Nome
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="rounded-2xl border border-[#123D2C]/15 p-4 font-normal"
                      placeholder="Seu nome completo"
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 font-black text-[#123D2C]">
                      WhatsApp
                      <input
                        value={whatsapp}
                        onChange={(event) => setWhatsapp(event.target.value)}
                        inputMode="tel"
                        className="rounded-2xl border border-[#123D2C]/15 p-4 font-normal"
                        placeholder="(19) 99999-9999"
                      />
                    </label>
                    <label className="grid gap-1 font-black text-[#123D2C]">
                      E-mail opcional
                      <input
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        inputMode="email"
                        className="rounded-2xl border border-[#123D2C]/15 p-4 font-normal"
                        placeholder="seu@email.com"
                      />
                    </label>
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                  2. Valor
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAmountOption("padrao")}
                    className={`rounded-2xl px-4 py-4 font-black ring-1 ${
                      amountOption === "padrao"
                        ? "bg-[#123D2C] text-white ring-[#123D2C]"
                        : "bg-white text-[#123D2C] ring-[#123D2C]/10"
                    }`}
                  >
                    {money(settings.defaultMonthlyAmount)}
                  </button>
                  {settings.allowCustomAmount && (
                    <button
                      type="button"
                      onClick={() => setAmountOption("outro")}
                      className={`rounded-2xl px-4 py-4 font-black ring-1 ${
                        amountOption === "outro"
                          ? "bg-[#123D2C] text-white ring-[#123D2C]"
                          : "bg-white text-[#123D2C] ring-[#123D2C]/10"
                      }`}
                    >
                      Outro valor
                    </button>
                  )}
                </div>
                {amountOption === "outro" && (
                  <input
                    value={customAmount}
                    onChange={(event) => setCustomAmount(event.target.value)}
                    inputMode="decimal"
                    className="mt-3 w-full rounded-2xl border border-[#123D2C]/15 p-4"
                    placeholder="Ex.: 75,00"
                  />
                )}
              </div>
            </section>

            <section className="space-y-5 rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                  3. Frequência
                </p>
                <h2 className="mt-1 text-xl font-black text-[#123D2C]">
                  Uma vez ou de forma recorrente?
                </h2>
              </div>

              <div className="grid gap-2">
                {settings.recurringOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`rounded-2xl p-4 ring-1 ${
                      recurrenceType === option.value
                        ? "bg-[#E9F2E7] ring-[#123D2C]/20"
                        : "bg-white ring-[#123D2C]/10"
                    } ${!option.available ? "opacity-65" : ""}`}
                  >
                    <span className="flex items-start gap-3">
                      <input
                        type="radio"
                        checked={recurrenceType === option.value}
                        disabled={!option.available}
                        onChange={() => setRecurrenceType(option.value)}
                        className="mt-1 h-5 w-5"
                      />
                      <span>
                        <span className="block font-black text-[#123D2C]">
                          {option.label}
                        </span>
                        {option.note && (
                          <span className="mt-1 block text-xs leading-5 text-slate-600">
                            {option.note}
                          </span>
                        )}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              {recurrenceType !== "pontual" && (
                <div>
                  <p className="font-black text-[#123D2C]">
                    Melhor dia para contribuir
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {settings.allowedDueDays.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setPreferredDueDay(String(day))}
                        className={`rounded-2xl px-3 py-3 font-black ring-1 ${
                          preferredDueDay === String(day)
                            ? "bg-[#123D2C] text-white ring-[#123D2C]"
                            : "bg-white text-[#123D2C] ring-[#123D2C]/10"
                        }`}
                      >
                        Dia {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="font-black text-[#123D2C]">
                  Lembretes antes da data
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[7, 5, 3, 1].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleReminder(day)}
                      className={`rounded-full px-4 py-2 text-sm font-black ring-1 ${
                        reminderDays.includes(day)
                          ? "bg-[#123D2C] text-white ring-[#123D2C]"
                          : "bg-white text-[#123D2C] ring-[#123D2C]/10"
                      }`}
                    >
                      {day} {day === 1 ? "dia" : "dias"} antes
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                  4. Forma
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    ["pix", "Pix"],
                    ["dinheiro", "Dinheiro"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPaymentMethod(value)}
                      className={`rounded-2xl px-4 py-4 font-black ring-1 ${
                        paymentMethod === value
                          ? "bg-[#123D2C] text-white ring-[#123D2C]"
                          : "bg-white text-[#123D2C] ring-[#123D2C]/10"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="grid gap-1 font-black text-[#123D2C]">
                Observação opcional
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="min-h-24 rounded-2xl border border-[#123D2C]/15 p-4 font-normal"
                  placeholder="Ex.: contribuição referente ao mês atual"
                />
              </label>

              <p className="rounded-2xl bg-blue-50 p-3 text-sm font-bold leading-6 text-blue-900">
                Toda contribuição é sigilosa. Somente a Diretoria autorizada e a
                Tesouraria/Financeiro podem acessar valores individuais.
              </p>

              <button
                disabled={submitting}
                className="w-full rounded-2xl bg-[#123D2C] px-5 py-4 text-base font-black text-white disabled:opacity-60"
              >
                {submitting ? "Registrando..." : "Revisar e registrar"}
              </button>
            </section>
          </form>
        )}

        {success?.ok && (
          <section
            id="contribuicao-concluida"
            className="scroll-mt-48 rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-[#123D2C]/10 sm:p-7"
          >
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
              Orientação registrada
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#123D2C]">
              Obrigado por ajudar a manter o Tucxa em harmonia.
            </h2>
            <p className="mt-3 leading-7 text-slate-700">{success.message}</p>

            {success.pixCode && paymentMethod === "pix" && (
              <div className="mt-5 rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                <p className="font-black text-[#123D2C]">
                  Orientação para o Pix
                </p>
                <p className="mt-2 break-words rounded-xl bg-white p-3 text-sm font-bold text-slate-700">
                  {success.pixCode}
                </p>
                <button
                  type="button"
                  onClick={copyPix}
                  className="mt-3 w-full rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white"
                >
                  Copiar orientação
                </button>
                {recurrenceType === "pix_agendado" && (
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Programe o Pix no aplicativo do seu banco para o dia escolhido.
                    O agendamento é controlado pelo próprio banco.
                  </p>
                )}
              </div>
            )}

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Link
                href="/solucoes/organizacao-em-harmonia/tucxa/transparencia"
                className="rounded-2xl bg-[#E9F2E7] px-5 py-4 text-center font-black text-[#123D2C]"
              >
                Ver prestação de contas
              </Link>
              <Link
                href="/solucoes/organizacao-em-harmonia/tucxa"
                className="rounded-2xl bg-[#123D2C] px-5 py-4 text-center font-black text-white"
              >
                Voltar ao site do Tucxa
              </Link>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

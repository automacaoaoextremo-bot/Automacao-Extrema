"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

type RecurringOption = {
  value: string;
  label: string;
  available: boolean;
  note?: string;
};

type PaymentMethodOption = {
  value: "pix" | "cartao_credito" | "cartao_debito" | "dinheiro";
  label: string;
  online: boolean;
  available: boolean;
  needsReception: boolean;
};

type ReceptionContact = {
  name: string;
  whatsapp: string;
  whatsappUrl: string;
};

type ContributionSettings = {
  defaultMonthlyAmount: number;
  allowCustomAmount: boolean;
  suggestedAmounts: number[];
  allowedDueDays: number[];
  defaultDueDay: number;
  pixKey: string;
  pixReceiverName: string;
  pixCity: string;
  publicContributionHeadline: string;
  publicContributionMessage: string;
  receptionPaymentMessage: string;
  recurringOptions: RecurringOption[];
  paymentMethods: PaymentMethodOption[];
};

type ApiPayload = {
  settings?: ContributionSettings;
  receptionContacts?: ReceptionContact[];
  error?: string;
};

type SubmitPayload = {
  ok?: boolean;
  contribution?: {
    id: string;
    status: string;
    due_date: string;
  };
  uploadToken?: string;
  pixCopyPaste?: string | null;
  qrCodeDataUrl?: string | null;
  pix?: {
    key: string;
    receiverName: string;
    amount: number;
  } | null;
  requiresReception?: boolean;
  message?: string;
  error?: string;
};

type UploadPayload = {
  ok?: boolean;
  message?: string;
  error?: string;
};

const headerActions = [
  {
    label: "Início",
    href: "#inicio",
    variant: "secondary" as const,
  },
  {
    label: "Voltar",
    href: "/solucoes/organizacao-em-harmonia/tucxa/transparencia",
    variant: "secondary" as const,
  },
  {
    label: "Contribuir",
    href: "#contribuir",
    variant: "primary" as const,
  },
  {
    label: "Com cadastro",
    href: "#com-cadastro",
    variant: "secondary" as const,
  },
  {
    label: "Dúvidas?",
    href: "#duvidas",
    variant: "secondary" as const,
    action: "supportWhatsapp" as const,
  },
];

function initialAnonymous() {
  if (typeof window === "undefined") return true;

  const type = new URLSearchParams(window.location.search).get("tipo");
  return type !== "identificada";
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

function methodLabel(
  settings: ContributionSettings | null,
  value: string,
) {
  return (
    settings?.paymentMethods.find((method) => method.value === value)?.label ||
    value
  );
}

function receptionContactUrl(input: {
  contact: ReceptionContact;
  amount: number;
  paymentMethod: string;
  settings: ContributionSettings;
}) {
  const message = [
    `Olá, ${input.contact.name}!`,
    "",
    "Vim pelo Corrente em Dia do Tucxa.",
    `Gostaria de contribuir com ${money(input.amount)} por ${methodLabel(
      input.settings,
      input.paymentMethod,
    )}.`,
    "Minha intenção já foi registrada no sistema.",
  ].join("\n");

  return `${input.contact.whatsappUrl}?text=${encodeURIComponent(message)}`;
}

function InfoCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow ring-1 ring-[#123D2C]/10">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
        {eyebrow}
      </p>
      <h3 className="mt-2 text-lg font-black text-[#123D2C]">{title}</h3>
      <div className="mt-2 text-sm leading-6 text-slate-600">{children}</div>
    </article>
  );
}

export function PublicContributionJourney() {
  const [settings, setSettings] = useState<ContributionSettings | null>(null);
  const [receptionContacts, setReceptionContacts] = useState<
    ReceptionContact[]
  >([]);
  const [anonymous, setAnonymous] = useState(initialAnonymous);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [amountMode, setAmountMode] = useState<"suggested" | "custom">(
    "suggested",
  );
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [customAmount, setCustomAmount] = useState("");
  const [recurrenceType, setRecurrenceType] = useState("pontual");
  const [preferredDueDay, setPreferredDueDay] = useState("10");
  const [reminderDays, setReminderDays] = useState<number[]>([3, 1]);
  const [paymentMethod, setPaymentMethod] = useState<
    PaymentMethodOption["value"]
  >("pix");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofMessage, setProofMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<SubmitPayload | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    void fetch("/api/organizacao-em-harmonia/site-tucxa/contribuicoes", {
      cache: "no-store",
    })
      .then(async (response) => {
        const result = (await response.json()) as ApiPayload;

        if (!response.ok) {
          throw new Error(
            result.error || "Não foi possível carregar as opções.",
          );
        }

        if (!active || !result.settings) return;

        setSettings(result.settings);
        setReceptionContacts(result.receptionContacts ?? []);
        setPreferredDueDay(String(result.settings.defaultDueDay));
        setSelectedAmount(
          result.settings.suggestedAmounts.includes(
            result.settings.defaultMonthlyAmount,
          )
            ? result.settings.defaultMonthlyAmount
            : result.settings.suggestedAmounts[0] ||
                result.settings.defaultMonthlyAmount,
        );
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

    return amountMode === "custom"
      ? parseMoney(customAmount)
      : selectedAmount || settings.defaultMonthlyAmount;
  }, [amountMode, customAmount, selectedAmount, settings]);

  const selectedPaymentMethod = useMemo(
    () =>
      settings?.paymentMethods.find(
        (option) => option.value === paymentMethod,
      ),
    [paymentMethod, settings],
  );

  const selectedRecurring = useMemo(
    () =>
      settings?.recurringOptions.find(
        (option) => option.value === recurrenceType,
      ),
    [recurrenceType, settings],
  );

  function toggleReminder(day: number) {
    setReminderDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day].sort((left, right) => right - left),
    );
  }

  function selectPaymentMethod(value: PaymentMethodOption["value"]) {
    setPaymentMethod(value);

    if (value !== "pix") {
      setRecurrenceType("pontual");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setProofMessage("");
    setSuccess(null);
    setCopied(false);

    if (!settings) return;

    if (amount < 1) {
      setError("Informe um valor de contribuição maior que zero.");
      return;
    }

    if (!anonymous && !name.trim()) {
      setError("Informe seu nome ou escolha contribuir de forma anônima.");
      return;
    }

    if (selectedRecurring && !selectedRecurring.available) {
      setError(
        "Essa forma recorrente ainda depende da integração com um provedor.",
      );
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
    if (!success?.pixCopyPaste) return;

    try {
      await navigator.clipboard.writeText(success.pixCopyPaste);
      setCopied(true);
    } catch {
      setError("Não foi possível copiar automaticamente. Selecione o código.");
    }
  }

  async function uploadProof() {
    if (
      !proofFile ||
      !success?.contribution?.id ||
      !success.uploadToken
    ) {
      setError("Selecione o comprovante antes de enviar.");
      return;
    }

    setError("");
    setProofMessage("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.set("contributionId", success.contribution.id);
      formData.set("uploadToken", success.uploadToken);
      formData.set("file", proofFile);

      const response = await fetch(
        "/api/organizacao-em-harmonia/site-tucxa/contribuicoes/comprovante",
        {
          method: "POST",
          body: formData,
        },
      );
      const result = (await response.json()) as UploadPayload;

      if (!response.ok) {
        throw new Error(
          result.error || "Não foi possível enviar o comprovante.",
        );
      }

      setProofMessage(
        result.message ||
          "Comprovante enviado para conferência da Tesouraria/Financeiro.",
      );
      setProofFile(null);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao enviar o comprovante.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <main id="inicio" className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={headerActions}
        navLabel="Menu de contribuição"
        showSupport={false}
      />

      <section className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7]">
            Corrente em Dia
          </p>
          <h1 className="mt-2 max-w-4xl text-3xl font-black leading-tight sm:text-4xl">
            {settings?.publicContributionHeadline ||
              "Um valor possível hoje ajuda a manter muitos cuidados de pé."}
          </h1>
          <p className="mt-3 max-w-4xl text-base leading-7 text-[#EEF7EA]">
            {settings?.publicContributionMessage ||
              "Sua contribuição continua na água, na energia, na limpeza, na segurança e nos materiais que acolhem cada trabalho. Escolha uma forma simples e participe desse cuidado com liberdade, sigilo e transparência."}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <p className="font-black">Você escolhe o valor</p>
              <p className="mt-1 text-sm leading-6 text-[#EEF7EA]">
                Um valor possível é melhor do que um cuidado adiado.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <p className="font-black">Sua identidade é respeitada</p>
              <p className="mt-1 text-sm leading-6 text-[#EEF7EA]">
                A contribuição pode ser anônima e os dados individuais não
                aparecem na prestação pública.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <p className="font-black">O cuidado vira continuidade</p>
              <p className="mt-1 text-sm leading-6 text-[#EEF7EA]">
                Cada gesto ajuda a Casa a seguir preparada para acolher e
                servir.
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <InfoCard eyebrow="Estrutura" title="O que precisa continuar funcionando">
            Água, energia, limpeza, segurança, conservação e comunicação
            sustentam os trabalhos mesmo quando quase ninguém percebe.
          </InfoCard>
          <InfoCard eyebrow="Cuidado" title="Por que sua contribuição existe">
            Para transformar um valor possível em previsibilidade, organização
            e tranquilidade para a Casa cuidar melhor de cada pessoa.
          </InfoCard>
          <InfoCard eyebrow="Resultado" title="O que esse gesto torna possível">
            Uma Casa preparada, acolhedora e disponível para que o cuidado
            espiritual não seja interrompido por falta de estrutura.
          </InfoCard>
        </div>

        {loading && (
          <p className="rounded-2xl bg-white p-5 font-bold text-slate-500 shadow">
            Carregando opções...
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-2xl bg-red-50 p-4 font-bold text-red-700"
          >
            {error}
          </p>
        )}

        {!loading && settings && (
          <form
            id="contribuir"
            onSubmit={submit}
            className="scroll-mt-48 grid gap-5 lg:grid-cols-2"
          >
            <section className="space-y-5 rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                  1. Sigilo
                </p>
                <h2 className="mt-1 text-xl font-black text-[#123D2C]">
                  Como você prefere participar?
                </h2>
              </div>

              <div className="grid gap-3">
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
                        Quero contribuir de forma anônima
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-slate-600">
                        Nenhum nome será associado à intenção no sistema.
                        Instituições financeiras ainda podem registrar os dados
                        da transação.
                      </span>
                    </span>
                  </span>
                </label>

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
                        Quero me identificar para a Tesouraria
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-slate-600">
                        Seus dados ficam restritos às pessoas autorizadas e não
                        aparecem no painel público.
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
                <h2 className="mt-1 text-xl font-black text-[#123D2C]">
                  Escolha um valor possível hoje
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Não existe comparação entre gestos. Escolha com liberdade o
                  valor que cabe no seu momento.
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {settings.suggestedAmounts.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setAmountMode("suggested");
                        setSelectedAmount(value);
                      }}
                      className={`rounded-2xl px-3 py-4 font-black ring-1 ${
                        amountMode === "suggested" &&
                        selectedAmount === value
                          ? "bg-[#123D2C] text-white ring-[#123D2C]"
                          : "bg-white text-[#123D2C] ring-[#123D2C]/10"
                      }`}
                    >
                      {money(value)}
                    </button>
                  ))}

                  {settings.allowCustomAmount && (
                    <button
                      type="button"
                      onClick={() => setAmountMode("custom")}
                      className={`rounded-2xl px-3 py-4 font-black ring-1 ${
                        amountMode === "custom"
                          ? "bg-[#123D2C] text-white ring-[#123D2C]"
                          : "bg-white text-[#123D2C] ring-[#123D2C]/10"
                      }`}
                    >
                      Outro valor
                    </button>
                  )}
                </div>

                {amountMode === "custom" && (
                  <label className="mt-3 grid gap-1 font-black text-[#123D2C]">
                    Valor escolhido
                    <input
                      value={customAmount}
                      onChange={(event) =>
                        setCustomAmount(event.target.value)
                      }
                      inputMode="decimal"
                      className="rounded-2xl border border-[#123D2C]/15 p-4 font-normal"
                      placeholder="Ex.: 35,00"
                    />
                  </label>
                )}
              </div>
            </section>

            <section className="space-y-5 rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                  3. Forma
                </p>
                <h2 className="mt-1 text-xl font-black text-[#123D2C]">
                  Como deseja concluir?
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {settings.paymentMethods.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={!option.available}
                    onClick={() => selectPaymentMethod(option.value)}
                    className={`rounded-2xl px-3 py-4 text-sm font-black ring-1 ${
                      paymentMethod === option.value
                        ? "bg-[#123D2C] text-white ring-[#123D2C]"
                        : "bg-white text-[#123D2C] ring-[#123D2C]/10"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {option.label}
                    {option.needsReception && (
                      <span className="mt-1 block text-[11px] font-bold opacity-80">
                        Pela Recepção
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {selectedPaymentMethod?.needsReception && (
                <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 ring-1 ring-amber-200">
                  <p className="font-black">
                    Esta forma é concluída com a Recepção.
                  </p>
                  <p className="mt-1">
                    {settings.receptionPaymentMessage}
                  </p>
                  {receptionContacts.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {receptionContacts.map((contact) => (
                        <span
                          key={contact.whatsapp}
                          className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-amber-200"
                        >
                          {contact.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === "pix" && (
                <>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                      4. Frequência
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
                        } ${!option.available ? "opacity-60" : ""}`}
                      >
                        <span className="flex items-start gap-3">
                          <input
                            type="radio"
                            checked={recurrenceType === option.value}
                            disabled={!option.available}
                            onChange={() =>
                              setRecurrenceType(option.value)
                            }
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
                </>
              )}

              {paymentMethod === "pix" &&
                recurrenceType === "pix_agendado" && (
                  <>
                    <div>
                      <p className="font-black text-[#123D2C]">
                        Melhor dia para contribuir
                      </p>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {settings.allowedDueDays.map((day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() =>
                              setPreferredDueDay(String(day))
                            }
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
                  </>
                )}

              <label className="grid gap-1 font-black text-[#123D2C]">
                Observação opcional
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="min-h-24 rounded-2xl border border-[#123D2C]/15 p-4 font-normal"
                  placeholder="Ex.: contribuição referente ao mês atual"
                />
              </label>

              <div className="rounded-2xl bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-900">
                A contribuição é tratada com sigilo. Valores individuais ficam
                restritos às pessoas autorizadas da Diretoria e da
                Tesouraria/Financeiro.
              </div>

              <div className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                <p className="text-sm font-bold text-slate-600">
                  Valor escolhido
                </p>
                <p className="mt-1 text-2xl font-black text-[#123D2C]">
                  {money(amount)}
                </p>
              </div>

              <button
                disabled={submitting}
                className="w-full rounded-2xl bg-[#123D2C] px-5 py-4 text-base font-black text-white disabled:opacity-60"
              >
                {submitting
                  ? "Registrando..."
                  : selectedPaymentMethod?.needsReception
                    ? "Registrar e falar com a Recepção"
                    : "Gerar Pix e registrar"}
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
              Intenção registrada
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#123D2C]">
              Obrigado por transformar um valor possível em continuidade para
              a Casa.
            </h2>
            <p className="mt-3 leading-7 text-slate-700">{success.message}</p>

            {success.qrCodeDataUrl && success.pixCopyPaste && success.pix && (
              <div className="mt-5 grid gap-5 rounded-[2rem] bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10 md:grid-cols-[18rem_1fr] md:p-5">
                <div className="mx-auto rounded-2xl bg-white p-3 shadow ring-1 ring-[#123D2C]/10">
                  <Image
                    src={success.qrCodeDataUrl}
                    alt={`QR Code Pix no valor de ${money(
                      success.pix.amount,
                    )}`}
                    width={420}
                    height={420}
                    unoptimized
                    className="h-auto w-full max-w-[18rem]"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                    Pix
                  </p>
                  <h3 className="mt-1 text-xl font-black text-[#123D2C]">
                    Escaneie o QR Code ou use o Pix Copia e Cola
                  </h3>
                  <dl className="mt-3 grid gap-2 text-sm">
                    <div>
                      <dt className="font-black text-[#123D2C]">Recebedor</dt>
                      <dd className="text-slate-600">
                        {success.pix.receiverName}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-black text-[#123D2C]">Valor</dt>
                      <dd className="text-slate-600">
                        {money(success.pix.amount)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-black text-[#123D2C]">Chave</dt>
                      <dd className="break-all text-slate-600">
                        {success.pix.key}
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-3 max-h-32 overflow-auto break-all rounded-xl bg-white p-3 text-xs font-semibold leading-5 text-slate-600 ring-1 ring-[#123D2C]/10">
                    {success.pixCopyPaste}
                  </p>
                  <button
                    type="button"
                    onClick={copyPix}
                    className="mt-3 w-full rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white"
                  >
                    {copied ? "Código copiado" : "Copiar Pix Copia e Cola"}
                  </button>

                  {recurrenceType === "pix_agendado" && (
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Depois do primeiro pagamento, use o aplicativo do seu
                      banco para repetir ou agendar o Pix no dia escolhido. O
                      controle da recorrência fica no próprio banco.
                    </p>
                  )}
                </div>
              </div>
            )}

            {success.requiresReception && settings && (
              <div className="mt-5 rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
                <h3 className="text-xl font-black text-amber-950">
                  Conclua com a Recepção
                </h3>
                <p className="mt-2 text-sm leading-6 text-amber-900">
                  Escolha uma pessoa disponível da Recepção e informe que sua
                  intenção já foi registrada.
                </p>

                {receptionContacts.length > 0 ? (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {receptionContacts.map((contact) => (
                      <a
                        key={contact.whatsapp}
                        href={receptionContactUrl({
                          contact,
                          amount,
                          paymentMethod,
                          settings,
                        })}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-2xl bg-[#123D2C] px-4 py-4 text-center font-black text-white"
                      >
                        Falar com {contact.name}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl bg-white p-3 text-sm font-bold text-amber-900">
                    Nenhum contato público da Recepção está disponível no
                    momento. Use o botão Dúvidas? no cabeçalho.
                  </p>
                )}
              </div>
            )}

            {success.uploadToken && success.contribution?.id && (
              <div className="mt-5 rounded-2xl bg-white p-5 ring-1 ring-[#123D2C]/10">
                <h3 className="text-xl font-black text-[#123D2C]">
                  Enviar comprovante
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Depois de concluir o pagamento, envie uma imagem ou PDF. O
                  arquivo fica privado e disponível somente para conferência.
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(event) =>
                    setProofFile(event.target.files?.[0] ?? null)
                  }
                  className="mt-4 block w-full rounded-2xl border border-[#123D2C]/15 bg-[#F7FAF2] p-3 text-sm"
                />
                <button
                  type="button"
                  disabled={!proofFile || uploading || Boolean(proofMessage)}
                  onClick={() => void uploadProof()}
                  className="mt-3 w-full rounded-2xl bg-[#2F6B43] px-4 py-3 font-black text-white disabled:opacity-50"
                >
                  {uploading
                    ? "Enviando..."
                    : proofMessage
                      ? "Comprovante enviado"
                      : "Enviar comprovante"}
                </button>
                {proofMessage && (
                  <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
                    {proofMessage}
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

        <section
          id="com-cadastro"
          className="scroll-mt-48 rounded-[2rem] bg-[#E9F2E7] p-5 ring-1 ring-[#123D2C]/10 sm:p-7"
        >
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">
            Contribuir com cadastro
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#123D2C]">
            Prefere ter histórico, lembretes e organização recorrente?
          </h2>
          <p className="mt-3 max-w-4xl leading-7 text-slate-700">
            Acesse o caminho correspondente ao seu vínculo. O cadastro permite
            organizar contribuições identificadas, preferências de vencimento,
            lembretes e acompanhamento com sigilo.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link
              href="/solucoes/organizacao-em-harmonia/tucxa#corrente"
              className="rounded-2xl bg-[#123D2C] px-5 py-4 text-center font-black text-white"
            >
              Sou Filho da Corrente
            </Link>
            <Link
              href="/solucoes/organizacao-em-harmonia/tucxa#consulentes"
              className="rounded-2xl bg-white px-5 py-4 text-center font-black text-[#123D2C] ring-1 ring-[#123D2C]/10"
            >
              Sou Consulente / Filho de Fora
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

type ContributionMode = "anonymous" | "identified";

type RecurringOption = {
  value: string;
  label: string;
  available: boolean;
  note?: string;
};

type PaymentMethodOption = {
  value: "pix" | "recepcao";
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
  scheduledPixMessage: string;
  receiptRecoveryMessage: string;
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
    recurrence_start_date?: string | null;
    recurrence_occurrences?: number | null;
  };
  uploadToken?: string;
  trackingCode?: string;
  resumeUrl?: string;
  resumeExpiresAt?: string;
  alreadyUploaded?: boolean;
  amount?: number;
  paymentMethod?: string;
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
  code?: string;
  referenceId?: string;
};

type UploadPayload = {
  ok?: boolean;
  message?: string;
  error?: string;
};

type PublicContributionJourneyProps = {
  mode?: ContributionMode;
};

type SavedPendingContribution = {
  trackingCode: string;
  resumeUrl: string;
  amount: number;
  createdAt: string;
};

type EditableContribution = {
  id: string;
  resumeToken: string;
  trackingCode: string;
  resumeUrl: string;
};

type InformationModal = "care" | "impact" | null;
type ContributionStep = "amount" | "payment" | null;

const PENDING_CONTRIBUTION_STORAGE_KEY =
  "tucxa-corrente-em-dia-pending-contribution";

function readSavedPendingContribution() {
  if (typeof window === "undefined") return null;

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(PENDING_CONTRIBUTION_STORAGE_KEY) || "null",
    ) as Partial<SavedPendingContribution> | null;

    if (!parsed?.trackingCode || !parsed.resumeUrl) return null;

    return {
      trackingCode: parsed.trackingCode,
      resumeUrl: parsed.resumeUrl,
      amount: Number(parsed.amount) || 0,
      createdAt: parsed.createdAt || new Date().toISOString(),
    } satisfies SavedPendingContribution;
  } catch {
    return null;
  }
}

function resumeTokenFromUrl(value: string) {
  try {
    return (
      new URL(value, window.location.origin).searchParams.get("retomar") || ""
    );
  } catch {
    return "";
  }
}

function todayLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function methodLabel(settings: ContributionSettings | null, value: string) {
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
  registered?: boolean;
  trackingCode?: string;
}) {
  const message = [
    `Olá, ${input.contact.name}.`,
    "",
    "Estou no Corrente em Dia do Tucxa.",
    `Quero contribuir com ${money(input.amount)} por ${methodLabel(
      input.settings,
      input.paymentMethod,
    )}.`,
    input.registered
      ? "A intenção já foi registrada no sistema."
      : "Vou registrar a intenção no sistema antes de concluir.",
    input.trackingCode ? `Código de acompanhamento: ${input.trackingCode}.` : "",
    "Poderia me orientar para concluir a contribuição?",
  ]
    .filter(Boolean)
    .join("\n");

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

function CareInformation() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <InfoCard eyebrow="Liberdade" title="Você escolhe o valor">
        Um valor possível é melhor do que um cuidado adiado. Você decide o que
        cabe no seu momento.
      </InfoCard>
      <InfoCard eyebrow="Respeito" title="Sua identidade é respeitada">
        Na contribuição anônima, nenhum nome é solicitado ou associado à
        intenção registrada no sistema.
      </InfoCard>
      <InfoCard eyebrow="Continuidade" title="O cuidado segue adiante">
        Cada gesto ajuda o Tucxa a manter estrutura, materiais e serviços
        prontos para acolher.
      </InfoCard>
    </div>
  );
}

function ImpactInformation() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <InfoCard eyebrow="Estrutura" title="O que precisa continuar funcionando">
        Água, energia, limpeza, segurança, conservação e comunicação sustentam
        os trabalhos mesmo quando quase ninguém percebe.
      </InfoCard>
      <InfoCard eyebrow="Cuidado" title="Por que sua contribuição existe">
        Para transformar um valor possível em previsibilidade, organização e
        tranquilidade para a Casa cuidar melhor de cada pessoa.
      </InfoCard>
      <InfoCard eyebrow="Resultado" title="O que esse gesto torna possível">
        Uma Casa preparada, acolhedora e disponível para que o cuidado
        espiritual não seja interrompido por falta de estrutura.
      </InfoCard>
    </div>
  );
}

export function PublicContributionJourney({
  mode = "anonymous",
}: PublicContributionJourneyProps) {
  const anonymous = mode === "anonymous";
  const [settings, setSettings] = useState<ContributionSettings | null>(null);
  const [receptionContacts, setReceptionContacts] = useState<
    ReceptionContact[]
  >([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [amountMode, setAmountMode] = useState<"suggested" | "custom">(
    "suggested",
  );
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [customAmount, setCustomAmount] = useState("");
  const [recurrenceType, setRecurrenceType] = useState("pontual");
  const [recurrenceStartDate, setRecurrenceStartDate] = useState(todayLocal);
  const [recurrenceOccurrences, setRecurrenceOccurrences] = useState("12");
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
  const [copiedRecovery, setCopiedRecovery] = useState<
    "code" | "link" | ""
  >("");
  const [informationModal, setInformationModal] =
    useState<InformationModal>(null);
  const [activeStep, setActiveStep] = useState<ContributionStep>(null);
  const [amountConfirmed, setAmountConfirmed] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [savedPending, setSavedPending] =
    useState<SavedPendingContribution | null>(null);
  const [editingContribution, setEditingContribution] =
    useState<EditableContribution | null>(null);

  const headerActions = useMemo(
    () => [
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
        label: anonymous ? "Contribuição Anônima" : "Contribuição Identificada",
        href: "#contribuicao-anonima",
        variant: "primary" as const,
      },
      {
        label: "Contribuição com Cadastro",
        href: "#com-cadastro",
        variant: "secondary" as const,
      },
      {
        label: "Dúvidas?",
        href: "#duvidas",
        variant: "secondary" as const,
        action: "supportWhatsapp" as const,
      },
    ],
    [anonymous],
  );

  const resumeContribution = useCallback(
    async (input: { resumeToken?: string; trackingCode?: string }) => {
      setRecoveryLoading(true);
      setRecoveryError("");
      setError("");

      try {
        const response = await fetch(
          "/api/organizacao-em-harmonia/site-tucxa/contribuicoes/retomar",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          },
        );
        const result = (await response.json()) as SubmitPayload;

        if (!response.ok) {
          throw new Error(
            result.error || "Não foi possível localizar a contribuição.",
          );
        }

        setProofFile(null);
        setProofMessage("");
        setSuccess({ ...result, ok: true });
        setRecoveryOpen(false);
        setRecoveryCode("");

        if (result.alreadyUploaded) {
          window.localStorage.removeItem(PENDING_CONTRIBUTION_STORAGE_KEY);
          setSavedPending(null);
        }

        if (typeof window !== "undefined" && input.resumeToken) {
          const url = new URL(window.location.href);
          url.searchParams.delete("retomar");
          window.history.replaceState(
            null,
            "",
            `${url.pathname}${url.search}${url.hash}`,
          );
        }
      } catch (reason) {
        setRecoveryError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível retomar o comprovante.",
        );
        setRecoveryOpen(true);
      } finally {
        setRecoveryLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    let active = true;
    const timerId = window.setTimeout(() => {
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
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timerId);
    };
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setSavedPending(readSavedPendingContribution());

      const resumeToken = new URLSearchParams(window.location.search).get(
        "retomar",
      );
      if (resumeToken) {
        void resumeContribution({ resumeToken });
      }
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [resumeContribution]);

  useEffect(() => {
    if (!success?.ok && !informationModal && !recoveryOpen && !activeStep) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeStep, informationModal, recoveryOpen, success?.ok]);

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

  const paymentSummary = useMemo(() => {
    if (!settings || !selectedPaymentMethod) return "Ainda não escolhida";

    const parts = [selectedPaymentMethod.label];

    if (paymentMethod === "pix") {
      const recurringDate =
        recurrenceType === "pix_agendado" &&
        /^\d{4}-\d{2}-\d{2}$/.test(recurrenceStartDate)
          ? new Intl.DateTimeFormat("pt-BR", {
              dateStyle: "short",
              timeZone: "UTC",
            }).format(new Date(`${recurrenceStartDate}T12:00:00Z`))
          : "";

      parts.push(
        recurrenceType === "pix_agendado"
          ? recurringDate
            ? `recorrente a partir de ${recurringDate}`
            : "recorrente — data pendente"
          : "contribuição única",
      );
    }

    return parts.join(" — ");
  }, [
    paymentMethod,
    recurrenceStartDate,
    recurrenceType,
    selectedPaymentMethod,
    settings,
  ]);

  function selectPaymentMethod(value: PaymentMethodOption["value"]) {
    setPaymentMethod(value);
    setPaymentConfirmed(false);

    if (value !== "pix") {
      setRecurrenceType("pontual");
      setRecurrenceStartDate(todayLocal());
      setRecurrenceOccurrences("12");
    }
  }

  function validateAmountStep() {
    if (!settings) {
      setError("As opções de contribuição ainda estão carregando.");
      return false;
    }

    if (amount < 1) {
      setError("Informe um valor de contribuição maior que zero.");
      return false;
    }

    if (!anonymous && !name.trim()) {
      setError("Informe seu nome para registrar a contribuição identificada.");
      return false;
    }

    return true;
  }

  function validatePaymentStep() {
    if (!settings || !selectedPaymentMethod) {
      setError("Escolha uma forma de pagamento disponível.");
      return false;
    }

    if (selectedRecurring && !selectedRecurring.available) {
      setError("Essa forma recorrente ainda não está disponível.");
      return false;
    }

    if (recurrenceType === "pix_agendado") {
      const occurrences = Math.trunc(Number(recurrenceOccurrences));

      if (!/^\d{4}-\d{2}-\d{2}$/.test(recurrenceStartDate)) {
        setError("Informe a data da primeira contribuição recorrente.");
        return false;
      }

      if (recurrenceStartDate < todayLocal()) {
        setError(
          "A data da primeira contribuição recorrente não pode estar no passado.",
        );
        return false;
      }

      if (
        !Number.isFinite(occurrences) ||
        occurrences < 2 ||
        occurrences > 120
      ) {
        setError("Informe uma quantidade entre 2 e 120 contribuições.");
        return false;
      }
    }

    return true;
  }

  function confirmAmountStep() {
    setError("");

    if (!validateAmountStep()) return;

    setAmountConfirmed(true);
    setActiveStep("payment");
  }

  function confirmPaymentStep() {
    setError("");

    if (!validatePaymentStep()) return;

    setPaymentConfirmed(true);
    setActiveStep(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setProofMessage("");
    setSuccess(null);
    setCopied(false);
    setCopiedRecovery("");
    setProofFile(null);

    if (!settings) return;

    if (!amountConfirmed) {
      setError("Conclua a etapa 1. Valor antes de registrar.");
      setActiveStep("amount");
      return;
    }

    if (!paymentConfirmed) {
      setError("Conclua a etapa 2. Forma de pagamento antes de registrar.");
      setActiveStep("payment");
      return;
    }

    if (amount < 1) {
      setError("Informe um valor de contribuição maior que zero.");
      return;
    }

    if (!anonymous && !name.trim()) {
      setError("Informe seu nome para registrar a contribuição identificada.");
      return;
    }

    if (selectedRecurring && !selectedRecurring.available) {
      setError("Essa forma recorrente ainda não está disponível.");
      return;
    }

    if (recurrenceType === "pix_agendado") {
      const occurrences = Math.trunc(Number(recurrenceOccurrences));

      if (!/^\d{4}-\d{2}-\d{2}$/.test(recurrenceStartDate)) {
        setError("Informe a data da primeira contribuição recorrente.");
        return;
      }

      if (
        !Number.isFinite(occurrences) ||
        occurrences < 2 ||
        occurrences > 120
      ) {
        setError("Informe uma quantidade entre 2 e 120 contribuições.");
        return;
      }
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
            recurrenceStartDate:
              recurrenceType === "pix_agendado"
                ? recurrenceStartDate
                : null,
            recurrenceOccurrences:
              recurrenceType === "pix_agendado"
                ? Math.trunc(Number(recurrenceOccurrences))
                : null,
            paymentMethod,
            notes,
            contributionId: editingContribution?.id || null,
            resumeToken: editingContribution?.resumeToken || null,
            trackingCode: editingContribution?.trackingCode || null,
          }),
        },
      );
      const responseText = await response.text();
      let result: SubmitPayload = {};

      if (responseText) {
        try {
          result = JSON.parse(responseText) as SubmitPayload;
        } catch {
          result = {
            error:
              "O servidor não retornou uma resposta válida para o registro.",
          };
        }
      }

      if (!response.ok) {
        const reference = result.referenceId
          ? ` Referência: ${result.referenceId}.`
          : "";
        throw new Error(
          `${result.error || "Não foi possível registrar."}${reference}`,
        );
      }

      setSuccess(result);

      if (
        result.contribution?.id &&
        result.trackingCode &&
        result.resumeUrl
      ) {
        const resumeToken = resumeTokenFromUrl(result.resumeUrl);
        if (resumeToken) {
          setEditingContribution({
            id: result.contribution.id,
            resumeToken,
            trackingCode: result.trackingCode,
            resumeUrl: result.resumeUrl,
          });
        }
      }

      if (result.trackingCode && result.resumeUrl) {
        const pending = {
          trackingCode: result.trackingCode,
          resumeUrl: result.resumeUrl,
          amount,
          createdAt: new Date().toISOString(),
        } satisfies SavedPendingContribution;

        window.localStorage.setItem(
          PENDING_CONTRIBUTION_STORAGE_KEY,
          JSON.stringify(pending),
        );
        setSavedPending(pending);
      }
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

  function resetJourneyAfterCompletion() {
    setSuccess(null);
    setEditingContribution(null);
    setAmountConfirmed(false);
    setPaymentConfirmed(false);
    setActiveStep(null);
    setAmountMode("suggested");
    setSelectedAmount(
      settings?.suggestedAmounts.includes(settings.defaultMonthlyAmount)
        ? settings.defaultMonthlyAmount
        : settings?.suggestedAmounts[0] || settings?.defaultMonthlyAmount || 0,
    );
    setCustomAmount("");
    setPaymentMethod("pix");
    setRecurrenceType("pontual");
    setRecurrenceStartDate(todayLocal());
    setRecurrenceOccurrences("12");
    setNotes("");
    setProofFile(null);
    setProofMessage("");
    setCopied(false);
    setCopiedRecovery("");
    setError("");

    if (!anonymous) {
      setName("");
      setEmail("");
      setWhatsapp("");
    }
  }

  function returnToEditContribution() {
    if (
      !success?.contribution?.id ||
      !success.trackingCode ||
      !success.resumeUrl
    ) {
      setSuccess(null);
      return;
    }

    const resumeToken = resumeTokenFromUrl(success.resumeUrl);
    if (!resumeToken) {
      setError(
        "Não foi possível preparar a edição desta intenção. Feche e retome pelo código de acompanhamento.",
      );
      return;
    }

    setEditingContribution({
      id: success.contribution.id,
      resumeToken,
      trackingCode: success.trackingCode,
      resumeUrl: success.resumeUrl,
    });
    setProofFile(null);
    setProofMessage("");
    setCopied(false);
    setCopiedRecovery("");
    setSuccess(null);
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

  async function copyRecoveryValue(
    value: string | undefined,
    kind: "code" | "link",
  ) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopiedRecovery(kind);
    } catch {
      setError("Não foi possível copiar automaticamente. Selecione o conteúdo.");
    }
  }

  function resumeSavedPending() {
    if (!savedPending) return;

    const resumeToken = resumeTokenFromUrl(savedPending.resumeUrl);
    if (!resumeToken) {
      setRecoveryError(
        "O link salvo neste aparelho não é mais válido. Use o código de acompanhamento.",
      );
      setRecoveryOpen(true);
      return;
    }

    void resumeContribution({ resumeToken });
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

    setUploading(true);
    setError("");

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

      setProofMessage(result.message || "Comprovante enviado.");
      window.localStorage.removeItem(PENDING_CONTRIBUTION_STORAGE_KEY);
      setSavedPending(null);
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
              "Sua contribuição continua na água, na energia, na limpeza, na segurança e nos materiais que acolhem cada trabalho. Você escolhe como participar e ajuda a Casa a seguir preparada."}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={() => setInformationModal("care")}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-4 py-3 text-center font-black text-[#123D2C] shadow-sm"
            >
              Seu cuidado
            </button>
            <button
              type="button"
              onClick={() => setInformationModal("impact")}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#E9F2E7] px-4 py-3 text-center font-black text-[#123D2C] shadow-sm ring-1 ring-white/20"
            >
              Impacto
            </button>
          </div>

          <button
            type="button"
            onClick={() => setRecoveryOpen(true)}
            className="mt-3 text-left text-sm font-black text-[#EEF7EA] underline decoration-[#CFE2C7] underline-offset-4"
          >
            Tenho um comprovante para enviar
          </button>
        </header>

        <section
          id="contribuicao-anonima"
          className="scroll-mt-48 rounded-[2rem] bg-[#123D2C] p-5 text-white shadow sm:p-7"
        >
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#CFE2C7]">
            {anonymous ? "Contribuição Anônima" : "Contribuição Identificada"}
          </p>
          <h2 className="mt-2 text-2xl font-black">
            {anonymous
              ? "Escolha como participar sem informar sua identidade."
              : "Registre sua contribuição com seus dados para acompanhamento."}
          </h2>
          <p className="mt-3 max-w-4xl leading-7 text-[#EEF7EA]">
            {anonymous
              ? "O sistema registra apenas o valor, a forma escolhida e a situação do comprovante para que a Tesouraria/Financeiro possa realizar a conferência."
              : "Seus dados serão usados somente no acompanhamento autorizado da contribuição e não serão exibidos na prestação pública."}
          </p>
        </section>

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
            id="form-contribuicao"
            onSubmit={submit}
            className="scroll-mt-48 rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setActiveStep("amount");
                }}
                className={`rounded-2xl p-4 text-left ring-1 transition ${
                  amountConfirmed
                    ? "bg-emerald-50 ring-emerald-200"
                    : "bg-[#F7FAF2] ring-[#123D2C]/10"
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-sm font-black uppercase tracking-[0.14em] text-[#123D2C]">
                    1. Escolher valor
                  </span>
                  <span
                    className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-black ${
                      amountConfirmed
                        ? "bg-emerald-600 text-white"
                        : "bg-white text-[#123D2C] ring-1 ring-[#123D2C]/10"
                    }`}
                  >
                    {amountConfirmed ? "✓" : "Abrir"}
                  </span>
                </span>
                {amountConfirmed && (
                  <>
                    <span className="mt-3 block text-lg font-black text-[#123D2C]">
                      {money(amount)}
                    </span>
                    <span className="mt-1 block text-sm text-slate-600">
                      Etapa concluída. Toque para editar.
                    </span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError("");
                  setActiveStep("payment");
                }}
                className={`rounded-2xl p-4 text-left ring-1 transition ${
                  paymentConfirmed
                    ? "bg-emerald-50 ring-emerald-200"
                    : "bg-[#F7FAF2] ring-[#123D2C]/10"
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-sm font-black uppercase tracking-[0.14em] text-[#123D2C]">
                    2. Forma de pagamento
                  </span>
                  <span
                    className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-black ${
                      paymentConfirmed
                        ? "bg-emerald-600 text-white"
                        : "bg-white text-[#123D2C] ring-1 ring-[#123D2C]/10"
                    }`}
                  >
                    {paymentConfirmed ? "✓" : "Abrir"}
                  </span>
                </span>
                {paymentConfirmed && (
                  <>
                    <span className="mt-3 block text-lg font-black text-[#123D2C]">
                      {selectedPaymentMethod?.label || "Forma escolhida"}
                    </span>
                    <span className="mt-1 block text-sm text-slate-600">
                      {paymentSummary}. Toque para editar.
                    </span>
                  </>
                )}
              </button>
            </div>

            {!amountConfirmed || !paymentConfirmed ? (
              <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900 ring-1 ring-amber-200">
                Conclua as duas etapas. Depois, o botão para registrar a
                contribuição será liberado.
              </p>
            ) : (
              <div className="mt-4 rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">
                  Revise antes de registrar
                </p>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-black text-[#123D2C]">Valor</dt>
                    <dd className="text-slate-600">{money(amount)}</dd>
                  </div>
                  <div>
                    <dt className="font-black text-[#123D2C]">
                      Forma de pagamento
                    </dt>
                    <dd className="text-slate-600">{paymentSummary}</dd>
                  </div>
                </dl>
                <button
                  disabled={submitting}
                  className="mt-4 w-full rounded-2xl bg-[#123D2C] px-5 py-4 text-base font-black text-white disabled:opacity-60"
                >
                  {submitting
                    ? "Registrando..."
                    : selectedPaymentMethod?.needsReception
                      ? "Registrar intenção e falar com a Recepção"
                      : "Gerar Pix e registrar"}
                </button>
              </div>
            )}
          </form>
        )}

        <section className="rounded-[2rem] bg-[#E9F2E7] p-5 ring-1 ring-[#123D2C]/10 sm:p-7">
          <p
            id="com-cadastro"
            className="scroll-mt-[22rem] text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43] sm:scroll-mt-56"
          >
            Contribuição com cadastro
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#123D2C]">
            Prefere organizar histórico e preferências no seu acesso?
          </h2>
          <p className="mt-3 max-w-4xl leading-7 text-slate-700">
            Acesse o caminho correspondente ao seu vínculo para entrar ou fazer
            cadastro. Assim, sua contribuição pode ser acompanhada dentro do seu
            próprio fluxo no Corrente em Dia.
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

      {activeStep === "amount" && settings && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="etapa-valor-titulo"
        >
          <section className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:rounded-[2rem] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                  Etapa 1
                </p>
                <h2
                  id="etapa-valor-titulo"
                  className="mt-2 text-2xl font-black text-[#123D2C]"
                >
                  Escolha um valor possível hoje
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Não existe comparação entre gestos. Escolha com liberdade o
                  valor que cabe no seu momento.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveStep(null)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E9F2E7] text-xl font-black text-[#123D2C]"
                aria-label="Fechar etapa de valor"
              >
                ×
              </button>
            </div>

            {!anonymous && (
              <div className="mt-5 grid gap-3 rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                <p className="font-black text-[#123D2C]">Seus dados</p>
                <label className="grid gap-1 font-black text-[#123D2C]">
                  Nome
                  <input
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      setAmountConfirmed(false);
                    }}
                    className="rounded-2xl border border-[#123D2C]/15 p-4 font-normal"
                    placeholder="Seu nome completo"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 font-black text-[#123D2C]">
                    WhatsApp
                    <input
                      value={whatsapp}
                      onChange={(event) => {
                        setWhatsapp(event.target.value);
                        setAmountConfirmed(false);
                      }}
                      inputMode="tel"
                      className="rounded-2xl border border-[#123D2C]/15 p-4 font-normal"
                      placeholder="(19) 99999-9999"
                    />
                  </label>
                  <label className="grid gap-1 font-black text-[#123D2C]">
                    E-mail opcional
                    <input
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setAmountConfirmed(false);
                      }}
                      inputMode="email"
                      className="rounded-2xl border border-[#123D2C]/15 p-4 font-normal"
                      placeholder="seu@email.com"
                    />
                  </label>
                </div>
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {settings.suggestedAmounts.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setAmountMode("suggested");
                    setSelectedAmount(value);
                    setAmountConfirmed(false);
                  }}
                  className={`rounded-2xl px-3 py-4 font-black ring-1 ${
                    amountMode === "suggested" && selectedAmount === value
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
                  onClick={() => {
                    setAmountMode("custom");
                    setAmountConfirmed(false);
                  }}
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
              <label className="mt-4 grid gap-1 font-black text-[#123D2C]">
                Valor escolhido
                <input
                  value={customAmount}
                  onChange={(event) => {
                    setCustomAmount(event.target.value);
                    setAmountConfirmed(false);
                  }}
                  inputMode="decimal"
                  className="rounded-2xl border border-[#123D2C]/15 p-4 font-normal"
                  placeholder="Ex.: 35,00"
                />
              </label>
            )}

            <div className="mt-4 rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
              <p className="text-sm font-bold text-slate-600">
                Valor selecionado
              </p>
              <p className="mt-1 text-2xl font-black text-[#123D2C]">
                {money(amount)}
              </p>
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={confirmAmountStep}
              className="mt-5 w-full rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white"
            >
              Confirmar valor e continuar
            </button>
          </section>
        </div>
      )}

      {activeStep === "payment" && settings && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="etapa-pagamento-titulo"
        >
          <section className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:rounded-[2rem] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                  Etapa 2
                </p>
                <h2
                  id="etapa-pagamento-titulo"
                  className="mt-2 text-2xl font-black text-[#123D2C]"
                >
                  Escolha a forma de pagamento
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Pix começa selecionado. Você pode alterar esta etapa antes do
                  registro final.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveStep(null)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E9F2E7] text-xl font-black text-[#123D2C]"
                aria-label="Fechar etapa de forma de pagamento"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
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
                </button>
              ))}
            </div>

            {paymentMethod === "pix" && (
              <>
                <div className="mt-4 rounded-2xl bg-gradient-to-br from-[#123D2C] to-[#2F6B43] p-4 text-white shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#CFE2C7]">
                    Um cuidado que ganha continuidade
                  </p>
                  <h3 className="mt-2 text-xl font-black leading-tight">
                    Transforme um gesto possível em tranquilidade para todos os
                    meses.
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#EEF7EA]">
                    {settings.scheduledPixMessage}
                  </p>
                </div>

                <div className="mt-4 grid gap-2">
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
                          onChange={() => {
                            setRecurrenceType(option.value);
                            setPaymentConfirmed(false);
                          }}
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

            {paymentMethod === "pix" && recurrenceType === "pix_agendado" && (
              <div className="mt-4 grid gap-3 rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10 sm:grid-cols-2">
                <label className="grid gap-1 font-black text-[#123D2C]">
                  Data da primeira contribuição
                  <input
                    type="date"
                    min={todayLocal()}
                    value={recurrenceStartDate}
                    onChange={(event) => {
                      setRecurrenceStartDate(event.target.value);
                      setPaymentConfirmed(false);
                    }}
                    className="rounded-2xl border border-[#123D2C]/15 bg-white p-4 font-normal"
                  />
                </label>
                <label className="grid gap-1 font-black text-[#123D2C]">
                  Por quantas vezes?
                  <input
                    type="number"
                    min={2}
                    max={120}
                    inputMode="numeric"
                    value={recurrenceOccurrences}
                    onChange={(event) => {
                      setRecurrenceOccurrences(event.target.value);
                      setPaymentConfirmed(false);
                    }}
                    className="rounded-2xl border border-[#123D2C]/15 bg-white p-4 font-normal"
                    placeholder="Ex.: 12"
                  />
                </label>
                <p className="text-xs leading-5 text-slate-600 sm:col-span-2">
                  O agendamento é feito por você no aplicativo do banco. O
                  sistema registra a data inicial e a quantidade planejada para
                  que a Tesouraria compreenda a previsão sem identificar quem
                  contribuiu.
                </p>
              </div>
            )}

            <label className="mt-4 grid gap-1 font-black text-[#123D2C]">
              Observação opcional
              <textarea
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                  setPaymentConfirmed(false);
                }}
                className="min-h-24 rounded-2xl border border-[#123D2C]/15 p-4 font-normal"
                placeholder="Ex.: inclua uma observação somente quando considerar necessário"
              />
            </label>

            <div className="mt-4 rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
              <p className="text-sm font-bold text-slate-600">
                Resumo desta etapa
              </p>
              <p className="mt-1 font-black text-[#123D2C]">
                {paymentSummary}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Valor considerado: {money(amount)}
              </p>
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={confirmPaymentStep}
              className="mt-5 w-full rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white"
            >
              Confirmar forma de pagamento
            </button>
          </section>
        </div>
      )}

      {informationModal && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="informacao-contribuicao-titulo"
        >
          <section className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-t-[2rem] bg-[#F7FAF2] p-5 shadow-2xl sm:rounded-[2rem] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                  {informationModal === "care"
                    ? "Seu cuidado, do seu jeito"
                    : "O impacto do seu cuidado"}
                </p>
                <h2
                  id="informacao-contribuicao-titulo"
                  className="mt-2 text-2xl font-black leading-tight text-[#123D2C]"
                >
                  {informationModal === "care"
                    ? "Liberdade para contribuir. Respeito à sua escolha. Continuidade para a Casa."
                    : "Um gesto financeiro se transforma em estrutura, cuidado e resultado."}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setInformationModal(null)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-xl font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10"
                aria-label="Fechar informações"
              >
                ×
              </button>
            </div>

            <div className="mt-5">
              {informationModal === "care" ? (
                <CareInformation />
              ) : (
                <ImpactInformation />
              )}
            </div>

            <button
              type="button"
              onClick={() => setInformationModal(null)}
              className="mt-5 w-full rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white"
            >
              Continuar
            </button>
          </section>
        </div>
      )}

      {recoveryOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="retomar-comprovante-titulo"
        >
          <section className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:rounded-[2rem] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                  Comprovante pendente
                </p>
                <h2
                  id="retomar-comprovante-titulo"
                  className="mt-2 text-2xl font-black text-[#123D2C]"
                >
                  Conclua o envio sem precisar se identificar.
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setRecoveryOpen(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E9F2E7] text-xl font-black text-[#123D2C]"
                aria-label="Fechar retomada do comprovante"
              >
                ×
              </button>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Use o código que apareceu depois do registro ou abra o link salvo
              no mesmo aparelho. O código não revela seu nome nem seus dados.
            </p>

            {savedPending && (
              <div className="mt-4 rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">
                  Encontrado neste aparelho
                </p>
                <p className="mt-2 font-black text-[#123D2C]">
                  Código {savedPending.trackingCode}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Valor registrado: {money(savedPending.amount)}
                </p>
                <button
                  type="button"
                  disabled={recoveryLoading}
                  onClick={resumeSavedPending}
                  className="mt-3 w-full rounded-2xl bg-[#2F6B43] px-4 py-3 font-black text-white disabled:opacity-50"
                >
                  Retomar última contribuição
                </button>
              </div>
            )}

            <label className="mt-4 grid gap-1 font-black text-[#123D2C]">
              Código de acompanhamento
              <input
                value={recoveryCode}
                onChange={(event) => setRecoveryCode(event.target.value)}
                autoCapitalize="characters"
                autoComplete="off"
                className="rounded-2xl border border-[#123D2C]/15 p-4 font-mono font-bold uppercase tracking-wider"
                placeholder="ABCD-EFGH-JKLM"
              />
            </label>

            {recoveryError && (
              <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
                {recoveryError}
              </p>
            )}

            <button
              type="button"
              disabled={recoveryLoading || !recoveryCode.trim()}
              onClick={() =>
                void resumeContribution({ trackingCode: recoveryCode })
              }
              className="mt-4 w-full rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white disabled:opacity-50"
            >
              {recoveryLoading ? "Localizando..." : "Retomar envio"}
            </button>
          </section>
        </div>
      )}

      {success?.ok && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="intencao-registrada-titulo"
        >
          <section className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:rounded-[2rem] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
                  Intenção registrada
                </p>
                <h2
                  id="intencao-registrada-titulo"
                  className="mt-2 text-2xl font-black text-[#123D2C]"
                >
                  Obrigado por transformar um valor possível em continuidade
                  para a Casa.
                </h2>
              </div>
              <button
                type="button"
                onClick={resetJourneyAfterCompletion}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E9F2E7] text-xl font-black text-[#123D2C]"
                aria-label="Fechar intenção registrada"
              >
                ×
              </button>
            </div>

            <p className="mt-3 leading-7 text-slate-700">{success.message}</p>

            {success.trackingCode && success.resumeUrl && (
              <div className="mt-5 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 sm:p-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-800">
                  Envie o comprovante agora ou depois
                </p>
                <h3 className="mt-2 text-xl font-black text-amber-950">
                  Guarde seu código de acompanhamento
                </h3>
                <p className="mt-2 text-sm leading-6 text-amber-900">
                  {settings?.receiptRecoveryMessage ||
                    "Ainda não está com o comprovante? Guarde o código ou copie o link para concluir depois, sem precisar se identificar."}
                </p>
                <p className="mt-3 rounded-xl bg-white p-3 text-center font-mono text-lg font-black tracking-wider text-[#123D2C] ring-1 ring-amber-200">
                  {success.trackingCode}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      void copyRecoveryValue(success.trackingCode, "code")
                    }
                    className="rounded-2xl bg-white px-4 py-3 font-black text-[#123D2C] ring-1 ring-amber-200"
                  >
                    {copiedRecovery === "code"
                      ? "Código copiado"
                      : "Copiar código"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void copyRecoveryValue(success.resumeUrl, "link")
                    }
                    className="rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white"
                  >
                    {copiedRecovery === "link"
                      ? "Link copiado"
                      : "Copiar link"}
                  </button>
                </div>
              </div>
            )}

            {success.qrCodeDataUrl && success.pixCopyPaste && success.pix && (
              <div className="mt-5 grid gap-5 rounded-[2rem] bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10 md:grid-cols-[18rem_1fr] md:p-5">
                <div className="mx-auto rounded-2xl bg-white p-3 shadow ring-1 ring-[#123D2C]/10">
                  <Image
                    src={success.qrCodeDataUrl}
                    alt={`QR Code Pix no valor de ${money(success.pix.amount)}`}
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
                      <dt className="font-black text-[#123D2C]">
                        Chave Pix Tucxa
                      </dt>
                      <dd className="break-all font-bold text-slate-700">
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
                      No aplicativo do banco, programe o primeiro Pix para{" "}
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeZone: "UTC",
                      }).format(
                        new Date(`${recurrenceStartDate}T12:00:00Z`),
                      )}{" "}
                      e configure {recurrenceOccurrences} repetições.
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
                          registered: true,
                          trackingCode: success.trackingCode,
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
                  A Tesouraria/Financeiro já enxerga esta contribuição como
                  aguardando comprovante. Depois do pagamento, envie uma imagem
                  ou PDF para permitir a conferência.
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
              {editingContribution && !proofMessage && !success.alreadyUploaded && (
                <button
                  type="button"
                  onClick={returnToEditContribution}
                  className="w-full rounded-2xl bg-white px-5 py-4 text-center font-black text-[#123D2C] ring-1 ring-[#123D2C]/15"
                >
                  Voltar e Editar
                </button>
              )}
              <button
                type="button"
                onClick={resetJourneyAfterCompletion}
                className="w-full rounded-2xl bg-[#123D2C] px-5 py-4 text-center font-black text-white"
              >
                {success.uploadToken && !proofMessage
                  ? "Fechar e enviar comprovante depois"
                  : "Fechar"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

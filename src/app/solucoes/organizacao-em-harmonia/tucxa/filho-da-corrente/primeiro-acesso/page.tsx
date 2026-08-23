"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { CavalinhoEntitySelector } from "@/components/organizacao-em-harmonia/cavalinho-entity-selector";
import { SementinhaSubfunctionSelector } from "@/components/organizacao-em-harmonia/sementinha-subfunction-selector";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import {
  SEMENTINHA_COORDINATOR_SLUG,
  SEMENTINHA_SUBFUNCTIONS,
  isSementinhaSubfunctionSlug,
} from "@/lib/organizacao-em-harmonia/sementinha-functions";
import {
  filhoDaCorrenteAgenda as fallbackFilhoDaCorrenteAgenda,
  filhoDaCorrenteFunctions,
} from "../../tucxa-content";

type EntityOption = {
  id: string;
  name: string;
  line?: string;
  entityType?: string;
  appointmentEnabled?: boolean;
};

type AgendaOption = {
  slug: string;
  legacySlug?: string;
  label: string;
  title?: string;
  dateLabel?: string;
  timeLabel?: string;
  recurrenceLabel?: string;
  locationLabel?: string;
  description?: string;
};

type DraftItem = {
  slug: string;
  label: string;
  description?: string;
};

type FamilyPersonOption = { id: string; fullName: string };
type FamilyRelationshipOption = { id: string; slug: string; label: string };
type FamilyLinkDraft = {
  personId: string;
  personName: string;
  relationshipTypeId: string;
  relationshipLabel: string;
};

type FirstAccessDraft = {
  fullName: string;
  whatsapp: string;
  email: string;
  password: string;
  notes: string;
  functionSlugs: string[];
  agendaSlugs: string[];
  selectedFunctions: Array<{ slug: string; label: string }>;
  selectedAgenda: Array<{ slug: string; label: string; description: string }>;
  cavalinhoEntityIds: string[];
  cavalinhoConsulenteEntityId: string;
  cavalinhoConsulenteDefinitionCompleted: boolean;
  selectedEntities: Array<{ id: string; name: string }>;
  familyLinks: FamilyLinkDraft[];
  createdAt: string;
};

const FIRST_ACCESS_DRAFT_KEY = "oh_tucxa_filho_corrente_primeiro_acesso";

type RegistrationDialog = "dados" | "participacao" | null;
type ParticipationPage = 1 | 2 | 3 | 4;
type RegistrationStep = "dados" | "participacao";
type RegistrationStepState = Record<RegistrationStep, boolean>;

type RegistrationModalProps = {
  eyebrow: string;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
};

function RegistrationModal({
  eyebrow,
  title,
  children,
  footer,
  onClose,
}: RegistrationModalProps) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#10251C]/75 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <section className="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-[2rem]">
        <header className="shrink-0 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#2F6B43] sm:text-xs">
                {eyebrow}
              </p>
              <h2 className="mt-0.5 text-lg font-black leading-tight text-[#123D2C] sm:text-2xl">
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl bg-[#123D2C] px-3 py-2 text-sm font-black text-white shadow-sm transition hover:bg-[#2F6B43] sm:px-4"
            >
              Fechar
            </button>
          </div>
        </header>
        <div className="min-h-0 overflow-y-auto p-3 sm:p-5">{children}</div>
        {footer && (
          <footer className="shrink-0 border-t border-slate-100 bg-white p-3 sm:p-5">
            {footer}
          </footer>
        )}
      </section>
    </div>
  );
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || value.trim();
}

function isThursdayGroup(item: AgendaOption) {
  const searchable = normalizeSearch(
    [item.slug, item.legacySlug, item.label, item.title, item.description]
      .filter(Boolean)
      .join(" "),
  );
  return (
    searchable.includes("quinta") ||
    searchable.includes("grupo 1") ||
    searchable.includes("grupo 2") ||
    searchable.includes("filhos da corrente grupo")
  );
}

export default function FilhoDaCorrentePrimeiroAcessoPage() {
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupShowPassword, setSignupShowPassword] = useState(false);
  const [notes, setNotes] = useState("");

  const [functionSlugs, setFunctionSlugs] = useState<string[]>([]);
  const [functionOptions, setFunctionOptions] = useState<DraftItem[]>(
    filhoDaCorrenteFunctions.map((item) => ({
      slug: item.slug,
      label: item.label,
      description:
        "description" in item && typeof item.description === "string"
          ? item.description
          : "",
    })),
  );
  const [agendaSlugs, setAgendaSlugs] = useState<string[]>([]);
  const [agendaOptions, setAgendaOptions] = useState<AgendaOption[]>([
    ...fallbackFilhoDaCorrenteAgenda,
  ]);
  const [entityOptions, setEntityOptions] = useState<EntityOption[]>([]);
  const [cavalinhoEntityIds, setCavalinhoEntityIds] = useState<string[]>([]);
  const [cavalinhoConsulenteEntityId, setCavalinhoConsulenteEntityId] =
    useState("");
  const [cavalinhoConsulenteDefinitionCompleted, setCavalinhoConsulenteDefinitionCompleted] =
    useState(false);

  const [familyPeople, setFamilyPeople] = useState<FamilyPersonOption[]>([]);
  const [familyRelationships, setFamilyRelationships] = useState<
    FamilyRelationshipOption[]
  >([]);
  const [hasFamily, setHasFamily] = useState<"sim" | "nao" | "">("");
  const [familySearch, setFamilySearch] = useState("");
  const [familyPersonId, setFamilyPersonId] = useState("");
  const [familyRelationshipId, setFamilyRelationshipId] = useState("");
  const [familyLinks, setFamilyLinks] = useState<FamilyLinkDraft[]>([]);

  const [activeDialog, setActiveDialog] = useState<RegistrationDialog>(null);
  const [dataPage, setDataPage] = useState<1 | 2>(1);
  const [participationPage, setParticipationPage] =
    useState<ParticipationPage>(1);
  const [familyHelpOpen, setFamilyHelpOpen] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<RegistrationStepState>({
    dados: false,
    participacao: false,
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const timer = window.setTimeout(() => {
      void Promise.all([
        fetch("/api/organizacao-em-harmonia/site-tucxa/agenda-options"),
        fetch("/api/organizacao-em-harmonia/site-tucxa/cavalinho-entities"),
        fetch("/api/organizacao-em-harmonia/filhos-corrente/acesso", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "family-options" }),
        }),
      ])
        .then(async ([agendaResponse, entitiesResponse, familyResponse]) => {
          const agendaResult = (await agendaResponse.json().catch(() => ({}))) as {
            options?: Array<Partial<AgendaOption>>;
            entities?: Array<Partial<EntityOption>>;
          };
          const entitiesResult = (await entitiesResponse.json().catch(() => ({}))) as {
            entities?: Array<Partial<EntityOption>>;
          };
          const familyResult = (await familyResponse.json().catch(() => ({}))) as {
            people?: FamilyPersonOption[];
            relationshipTypes?: FamilyRelationshipOption[];
            functions?: DraftItem[];
          };

          if (!active) return;

          const options = (agendaResult.options ?? [])
            .map((item) => ({
              slug: String(item.slug || "").trim(),
              legacySlug:
                typeof item.legacySlug === "string"
                  ? item.legacySlug.trim()
                  : undefined,
              label: String(item.label || "").trim(),
              title:
                typeof item.title === "string" ? item.title.trim() : undefined,
              dateLabel:
                typeof item.dateLabel === "string"
                  ? item.dateLabel.trim()
                  : undefined,
              timeLabel:
                typeof item.timeLabel === "string"
                  ? item.timeLabel.trim()
                  : undefined,
              recurrenceLabel:
                typeof item.recurrenceLabel === "string"
                  ? item.recurrenceLabel.trim()
                  : undefined,
              locationLabel:
                typeof item.locationLabel === "string"
                  ? item.locationLabel.trim()
                  : undefined,
              description:
                typeof item.description === "string"
                  ? item.description.trim()
                  : undefined,
            }))
            .filter((item) => item.slug && item.label);

          if (agendaResponse.ok && options.length) setAgendaOptions(options);

          const sourceEntities =
            entitiesResponse.ok && entitiesResult.entities?.length
              ? entitiesResult.entities
              : agendaResult.entities ?? [];
          setEntityOptions(
            sourceEntities.flatMap((item) => {
              const id = typeof item.id === "string" ? item.id.trim() : "";
              const name = typeof item.name === "string" ? item.name.trim() : "";
              if (!id || !name) return [];
              return [
                {
                  id,
                  name,
                  line: typeof item.line === "string" ? item.line : "",
                  entityType:
                    typeof item.entityType === "string" ? item.entityType : "",
                  appointmentEnabled: item.appointmentEnabled !== false,
                },
              ];
            }),
          );

          if (familyResponse.ok) {
            setFamilyPeople(familyResult.people ?? []);
            setFamilyRelationships(familyResult.relationshipTypes ?? []);

            const dynamicFunctions = (familyResult.functions ?? []).filter(
              (item) =>
                item?.slug &&
                item?.label &&
                !isSementinhaSubfunctionSlug(item.slug),
            );
            if (dynamicFunctions.length > 0) {
              setFunctionOptions(dynamicFunctions);
            }
          }
        })
        .catch(() => undefined);
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("ajuste") !== "1") return;

      const raw = window.sessionStorage.getItem(FIRST_ACCESS_DRAFT_KEY);
      if (!raw) return;

      try {
        const draft = JSON.parse(raw) as Partial<FirstAccessDraft>;
        setFullName(typeof draft.fullName === "string" ? draft.fullName : "");
        setWhatsapp(typeof draft.whatsapp === "string" ? draft.whatsapp : "");
        setEmail(typeof draft.email === "string" ? draft.email : "");
        setSignupPassword(
          typeof draft.password === "string" ? draft.password : "",
        );
        setNotes(typeof draft.notes === "string" ? draft.notes : "");
        setFunctionSlugs(
          Array.isArray(draft.functionSlugs)
            ? draft.functionSlugs.filter(
                (item): item is string => typeof item === "string",
              )
            : [],
        );
        setAgendaSlugs(
          Array.isArray(draft.agendaSlugs)
            ? draft.agendaSlugs.filter(
                (item): item is string => typeof item === "string",
              )
            : [],
        );
        setCavalinhoEntityIds(
          Array.isArray(draft.cavalinhoEntityIds)
            ? draft.cavalinhoEntityIds.filter(
                (item): item is string => typeof item === "string",
              )
            : [],
        );
        setCavalinhoConsulenteEntityId(
          typeof draft.cavalinhoConsulenteEntityId === "string"
            ? draft.cavalinhoConsulenteEntityId
            : "",
        );
        setCavalinhoConsulenteDefinitionCompleted(
          draft.cavalinhoConsulenteDefinitionCompleted === true,
        );
        const restoredFamilyLinks = Array.isArray(draft.familyLinks)
          ? draft.familyLinks.filter(
              (item): item is FamilyLinkDraft =>
                Boolean(item?.personId && item?.relationshipTypeId),
            )
          : [];
        setFamilyLinks(restoredFamilyLinks);
        setHasFamily(restoredFamilyLinks.length ? "sim" : "nao");
        setCompletedSteps({ dados: true, participacao: true });
      } catch {
        window.sessionStorage.removeItem(FIRST_ACCESS_DRAFT_KEY);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (agendaOptions.length === 0) return;
    const timer = window.setTimeout(() => {
      setAgendaSlugs((current) => {
        const mapped = current.flatMap((slug) => {
          if (agendaOptions.some((option) => option.slug === slug)) return [slug];
          const legacyMatches = agendaOptions
            .filter((option) => option.legacySlug === slug)
            .map((option) => option.slug);
          return legacyMatches.length ? legacyMatches : [slug];
        });
        return Array.from(new Set(mapped));
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [agendaOptions]);

  const selectedFunctions = useMemo(
    () =>
      [...functionOptions, ...SEMENTINHA_SUBFUNCTIONS]
        .filter((item) => functionSlugs.includes(item.slug))
        .map((item) => ({ slug: item.slug, label: item.label })),
    [functionOptions, functionSlugs],
  );

  const selectedAgenda = useMemo(
    () =>
      agendaOptions
        .filter((item) => agendaSlugs.includes(item.slug))
        .map((item) => ({
          slug: item.slug,
          label: item.label,
          description:
            item.description ||
            [item.recurrenceLabel, item.dateLabel, item.timeLabel]
              .filter(Boolean)
              .join(" • ") +
              (item.locationLabel ? ` Local: ${item.locationLabel}` : ""),
        })),
    [agendaOptions, agendaSlugs],
  );

  const hasCavalinho = functionSlugs.includes("cavalinho");
  const hasSementinhaCoordinator = functionSlugs.includes(
    SEMENTINHA_COORDINATOR_SLUG,
  );
  const selectedSementinhaSubfunctionSlugs = useMemo(
    () => functionSlugs.filter(isSementinhaSubfunctionSlug),
    [functionSlugs],
  );
  const selectedEntities = useMemo(
    () =>
      entityOptions
        .filter((item) => cavalinhoEntityIds.includes(item.id))
        .map((item) => ({ id: item.id, name: item.name })),
    [cavalinhoEntityIds, entityOptions],
  );

  const filteredFamilyPeople = useMemo(() => {
    const query = normalizeSearch(familySearch);
    return familyPeople.filter((item) => {
      if (familyLinks.some((link) => link.personId === item.id)) return false;
      return !query || normalizeSearch(item.fullName).includes(query);
    });
  }, [familyLinks, familyPeople, familySearch]);

  const allStepsCompleted = completedSteps.dados && completedSteps.participacao;
  const hasThursdayGroup = agendaOptions.some(
    (item) => agendaSlugs.includes(item.slug) && isThursdayGroup(item),
  );
  const functionPageSize = Math.max(
    1,
    Math.ceil(functionOptions.length / 2),
  );
  const agendaPageSize = Math.max(1, Math.ceil(agendaOptions.length / 2));
  const visibleFunctions =
    participationPage === 1
      ? functionOptions.slice(0, functionPageSize)
      : functionOptions.slice(functionPageSize);
  const visibleAgenda =
    participationPage === 3
      ? agendaOptions.slice(0, agendaPageSize)
      : agendaOptions.slice(agendaPageSize);
  const participationTitle =
    participationPage <= 2
      ? `Funções adicionais · ${participationPage} de 2`
      : `Agenda · ${participationPage - 2} de 2`;

  function invalidateStep(step: RegistrationStep) {
    setCompletedSteps((current) => ({ ...current, [step]: false }));
  }

  function validateContactData() {
    if (!fullName.trim()) return "Informe seu nome completo.";
    if (onlyDigits(whatsapp).length < 10) {
      return "Informe seu WhatsApp com DDD. Este é o principal canal de orientação do Tucxa.";
    }
    if (signupPassword.length < 8) {
      return "Crie uma senha com pelo menos 8 caracteres para os próximos acessos.";
    }
    if (email && !email.includes("@")) {
      return "Confira o e-mail informado ou deixe o campo em branco.";
    }
    return "";
  }

  function continueData() {
    const validationError = validateContactData();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setDataPage(2);
  }

  function confirmDataStep() {
    if (!hasFamily) {
      setError("Informe se você possui familiar que também é Filho da Corrente.");
      return;
    }
    setError("");
    setCompletedSteps((current) => ({ ...current, dados: true }));
    if (!completedSteps.participacao) setParticipationPage(1);
    setActiveDialog(completedSteps.participacao ? null : "participacao");
  }

  function addFamilyLink() {
    const selectedPerson = familyPeople.find((item) => item.id === familyPersonId);
    const selectedRelationship = familyRelationships.find(
      (item) => item.id === familyRelationshipId,
    );
    if (!selectedPerson || !selectedRelationship) {
      setError("Selecione o familiar e o grau de parentesco.");
      return;
    }

    setFamilyLinks((current) => [
      ...current,
      {
        personId: selectedPerson.id,
        personName: selectedPerson.fullName,
        relationshipTypeId: selectedRelationship.id,
        relationshipLabel: selectedRelationship.label,
      },
    ]);
    setFamilyPersonId("");
    setFamilyRelationshipId("");
    setFamilySearch("");
    setHasFamily("sim");
    invalidateStep("dados");
    setError("");
  }

  function toggleFunction(slug: string) {
    const selected = functionSlugs.includes(slug);

    setFunctionSlugs((current) => {
      if (slug === SEMENTINHA_COORDINATOR_SLUG && selected) {
        return current.filter(
          (item) =>
            item !== SEMENTINHA_COORDINATOR_SLUG &&
            !isSementinhaSubfunctionSlug(item),
        );
      }

      return toggleValue(current, slug);
    });

    invalidateStep("participacao");

    if (slug === "cavalinho") {
      if (selected) {
        setCavalinhoEntityIds([]);
        setCavalinhoConsulenteEntityId("");
        setCavalinhoConsulenteDefinitionCompleted(false);
      } else {
        window.setTimeout(
          () =>
            document.getElementById("cavalinho-entity-selector-button")?.click(),
          0,
        );
      }
    }

    if (slug === SEMENTINHA_COORDINATOR_SLUG && !selected) {
      window.setTimeout(
        () =>
          document
            .getElementById("sementinha-subfunction-selector-button")
            ?.click(),
        0,
      );
    }
  }

  function confirmParticipationStep() {
    if (hasCavalinho && cavalinhoEntityIds.length === 0) {
      setError("Selecione pelo menos uma entidade que você recebe.");
      return;
    }
    if (hasCavalinho && !cavalinhoConsulenteDefinitionCompleted) {
      setError("Informe se alguma das entidades selecionadas atende Consulentes.");
      return;
    }
    if (
      hasCavalinho &&
      cavalinhoConsulenteEntityId &&
      !cavalinhoEntityIds.includes(cavalinhoConsulenteEntityId)
    ) {
      setError(
        "A entidade que atende Consulentes precisa estar entre as entidades que você recebe.",
      );
      return;
    }
    if (!hasThursdayGroup) {
      setError(
        "Selecione pelo menos um Grupo de quinta-feira para concluir o cadastro.",
      );
      return;
    }
    if (functionSlugs.length === 0) {
      const confirmed = window.confirm(
        "Você não marcou nenhuma função adicional. Confirma que atualmente é somente Filho da Corrente?",
      );
      if (!confirmed) return;
    }

    setError("");
    setCompletedSteps((current) => ({ ...current, participacao: true }));
    setActiveDialog(null);
  }

  function submitFirstAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!allStepsCompleted) {
      setError("Conclua e confirme as duas etapas antes de enviar.");
      return;
    }

    const validationError = validateContactData();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!hasThursdayGroup) {
      setError(
        "Selecione pelo menos um Grupo de quinta-feira antes de enviar para validação.",
      );
      return;
    }

    const draft: FirstAccessDraft = {
      fullName: fullName.trim(),
      whatsapp: whatsapp.trim(),
      email: email.trim(),
      password: signupPassword,
      notes: notes.trim(),
      functionSlugs,
      agendaSlugs,
      selectedFunctions,
      selectedAgenda,
      cavalinhoEntityIds: hasCavalinho ? cavalinhoEntityIds : [],
      cavalinhoConsulenteEntityId: hasCavalinho
        ? cavalinhoConsulenteEntityId
        : "",
      cavalinhoConsulenteDefinitionCompleted: hasCavalinho
        ? cavalinhoConsulenteDefinitionCompleted
        : false,
      selectedEntities: hasCavalinho ? selectedEntities : [],
      familyLinks: hasFamily === "sim" ? familyLinks : [],
      createdAt: new Date().toISOString(),
    };

    window.sessionStorage.setItem(FIRST_ACCESS_DRAFT_KEY, JSON.stringify(draft));
    window.location.href =
      "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/confirmar";
  }

  return (
    <main id="inicio" className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={[
          { label: "Início", href: "#inicio", variant: "primary" },
          {
            label: "Voltar",
            href: "/solucoes/organizacao-em-harmonia/tucxa?semPopup=1#corrente",
            variant: "secondary",
          },
          {
            label: "Acesso liberado",
            href: "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login",
            variant: "secondary",
          },
        ]}
        navLabel="Menu dos Filhos da Corrente do Tucxa"
      />

      <section className="mx-auto grid max-w-3xl gap-4 px-4 py-4 sm:px-6 lg:py-6">
        <div className="rounded-[1.75rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7]">
            Primeiro acesso
          </p>
          <h1 className="mt-2 text-2xl font-black">
            Cadastro simples em duas etapas.
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#EEF7EA]">
            Informe seus dados e, caso tenha e queira, inclua seus vínculos
            familiares; depois confira suas funções e agenda. Caso ainda não apareça
            seu familiar, você poderá atualizar depois que ele se cadastrar, na opção
            “Cadastro” que aparece após o acesso ao Sistema.
          </p>
        </div>

        <div
          id="primeiro-acesso"
          className="rounded-[1.75rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6"
        >
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => {
                setDataPage(1);
                setActiveDialog("dados");
              }}
              className={`rounded-2xl px-4 py-4 text-left ring-1 ${
                completedSteps.dados
                  ? "bg-emerald-50 ring-emerald-200"
                  : "bg-[#F7FAF2] ring-[#123D2C]/10"
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="font-black uppercase tracking-[0.12em] text-[#123D2C]">
                  {completedSteps.dados ? "✅ " : ""}1. Dados
                </span>
                <span className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">
                  {completedSteps.dados ? "Ajustar" : "Abrir"}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setParticipationPage(1);
                setActiveDialog("participacao");
              }}
              className={`rounded-2xl px-4 py-4 text-left ring-1 ${
                completedSteps.participacao
                  ? "bg-emerald-50 ring-emerald-200"
                  : "bg-[#F7FAF2] ring-[#123D2C]/10"
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="font-black uppercase tracking-[0.12em] text-[#123D2C]">
                  {completedSteps.participacao ? "✅ " : ""}2. Função e agenda
                </span>
                <span className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">
                  {completedSteps.participacao ? "Ajustar" : "Abrir"}
                </span>
              </span>
            </button>
          </div>

          <form onSubmit={submitFirstAccess} className="mt-3 grid gap-3">
            {error && (
              <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">
                {error}
              </p>
            )}
            {message && (
              <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
                {message}
              </p>
            )}
            {allStepsCompleted && (
              <button className="rounded-2xl bg-[#123D2C] px-5 py-4 text-base font-black text-white shadow-lg shadow-green-900/10">
                Enviar para validação
              </button>
            )}
          </form>
        </div>
      </section>

      {activeDialog === "dados" && (
        <RegistrationModal
          eyebrow={`Etapa 1 de 2 · tela ${dataPage} de 2`}
          title={dataPage === 1 ? "Dados de contato" : "Vínculos familiares"}
          onClose={() => setActiveDialog(null)}
          footer={
            dataPage === 1 ? (
              <button
                type="button"
                onClick={continueData}
                className="w-full rounded-2xl bg-[#123D2C] px-5 py-3.5 text-sm font-black text-white"
              >
                Continuar para família
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDataPage(1)}
                  className="rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/15"
                >
                  Voltar aos dados
                </button>
                <button
                  type="button"
                  onClick={confirmDataStep}
                  className="rounded-2xl bg-[#123D2C] px-5 py-3.5 text-sm font-black text-white"
                >
                  Confirmar etapa 1
                </button>
              </div>
            )
          }
        >
          {dataPage === 1 ? (
            <div className="grid gap-3">
              <p className="text-sm font-semibold leading-5 text-slate-600">
                Informe seus dados de contato e crie a senha usada nos próximos
                acessos.
              </p>
              <label className="grid gap-1">
                <span className="text-sm font-black text-[#123D2C]">
                  Nome completo *
                </span>
                <input
                  value={fullName}
                  onChange={(event) => {
                    setFullName(event.target.value);
                    invalidateStep("dados");
                  }}
                  className="rounded-2xl border border-[#123D2C]/15 p-3.5"
                  placeholder="Seu nome completo"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-black text-[#123D2C]">
                  Celular/WhatsApp *
                </span>
                <input
                  value={whatsapp}
                  onChange={(event) => {
                    setWhatsapp(event.target.value);
                    invalidateStep("dados");
                  }}
                  inputMode="tel"
                  className="rounded-2xl border border-[#123D2C]/15 p-3.5"
                  placeholder="(19) 99999-9999"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-black text-[#123D2C]">E-mail</span>
                <input
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    invalidateStep("dados");
                  }}
                  type="email"
                  className="rounded-2xl border border-[#123D2C]/15 p-3.5"
                  placeholder="Opcional, mas recomendado"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-black text-[#123D2C]">
                  Crie uma senha para os próximos acessos *
                </span>
                <div className="flex rounded-2xl border border-[#123D2C]/15 bg-white">
                  <input
                    value={signupPassword}
                    onChange={(event) => {
                      setSignupPassword(event.target.value);
                      invalidateStep("dados");
                    }}
                    type={signupShowPassword ? "text" : "password"}
                    className="min-w-0 flex-1 rounded-2xl bg-transparent p-3.5 outline-none"
                    placeholder="Mínimo 8 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setSignupShowPassword((value) => !value)}
                    className="shrink-0 px-4 text-sm font-black text-[#123D2C]"
                  >
                    {signupShowPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-black text-[#123D2C]">
                  Observação para facilitar a validação
                </span>
                <textarea
                  value={notes}
                  onChange={(event) => {
                    setNotes(event.target.value);
                    invalidateStep("dados");
                  }}
                  className="min-h-16 rounded-2xl border border-[#123D2C]/15 p-3.5"
                  placeholder="Ex.: meu nome está abreviado no WhatsApp..."
                />
              </label>
            </div>
          ) : (
            <div className="grid gap-3">
              <p className="text-sm font-semibold leading-5 text-slate-600">
                Você possui Pai, Mãe, Marido, Esposa, Filho ou Filha que também é
                Filho da Corrente?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(["sim", "nao"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setHasFamily(option);
                      if (option === "sim") setFamilyHelpOpen(true);
                      if (option === "nao") setFamilyLinks([]);
                      invalidateStep("dados");
                    }}
                    className={`rounded-2xl border-2 px-4 py-3 font-black shadow-md transition ${
                      hasFamily === option
                        ? "border-[#123D2C] bg-[#123D2C] text-white ring-4 ring-[#123D2C]/15"
                        : "border-[#123D2C]/35 bg-white text-[#123D2C] hover:border-[#123D2C] hover:bg-emerald-50"
                    }`}
                  >
                    <span className="block text-base">
                      {option === "sim" ? "Sim" : "Não"}
                    </span>
                    <span className={`mt-0.5 block text-[10px] font-bold uppercase tracking-[0.08em] ${
                      hasFamily === option ? "text-white/80" : "text-[#2F6B43]"
                    }`}>
                      Toque para selecionar
                    </span>
                  </button>
                ))}
              </div>

              {hasFamily === "sim" && (
                <>
                  <div className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                    <label className="grid gap-1">
                      <span className="text-sm font-black text-[#123D2C]">
                        Digite o nome para localizar
                      </span>
                      <input
                        value={familySearch}
                        onChange={(event) => setFamilySearch(event.target.value)}
                        className="rounded-2xl border border-slate-200 bg-white p-3"
                        placeholder="Nome do familiar"
                      />
                    </label>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <select
                        value={familyPersonId}
                        onChange={(event) => setFamilyPersonId(event.target.value)}
                        className="rounded-2xl border border-slate-200 bg-white p-3"
                      >
                        <option value="">Selecionar o familiar</option>
                        {filteredFamilyPeople.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.fullName}
                          </option>
                        ))}
                      </select>
                      <select
                        value={familyRelationshipId}
                        onChange={(event) =>
                          setFamilyRelationshipId(event.target.value)
                        }
                        className="rounded-2xl border border-slate-200 bg-white p-3"
                      >
                        <option value="">Grau de parentesco</option>
                        {familyRelationships.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={addFamilyLink}
                      disabled={!familyPersonId || !familyRelationshipId}
                      className="mt-2 w-full rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Incluir familiar
                    </button>
                  </div>

                  <div className="grid gap-2">
                    {familyLinks.map((link) => (
                      <div
                        key={link.personId}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-[#E9F2E7] p-3"
                      >
                        <span>
                          <strong className="block text-[#123D2C]">
                            {firstName(link.personName)}
                          </strong>
                          <span className="text-sm text-slate-600">
                            {link.relationshipLabel}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setFamilyLinks((current) =>
                              current.filter(
                                (item) => item.personId !== link.personId,
                              ),
                            );
                            invalidateStep("dados");
                          }}
                          className="rounded-xl bg-white px-3 py-2 text-sm font-black text-red-700"
                        >
                          Retirar
                        </button>
                      </div>
                    ))}
                  </div>


                </>
              )}
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">
              {error}
            </p>
          )}
        </RegistrationModal>
      )}

      {activeDialog === "participacao" && (
        <RegistrationModal
          eyebrow={`Etapa 2 de 2 · tela ${participationPage} de 4`}
          title={participationTitle}
          onClose={() => setActiveDialog(null)}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (participationPage === 1) {
                    setActiveDialog(null);
                    return;
                  }
                  setParticipationPage(
                    (participationPage - 1) as ParticipationPage,
                  );
                  setError("");
                }}
                className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/15"
              >
                {participationPage === 1 ? "Fechar" : "Voltar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (participationPage < 4) {
                    setParticipationPage(
                      (participationPage + 1) as ParticipationPage,
                    );
                    setError("");
                    return;
                  }
                  confirmParticipationStep();
                }}
                className="rounded-2xl bg-[#123D2C] px-4 py-3 text-sm font-black text-white"
              >
                {participationPage === 4
                  ? "Confirmar etapa 2"
                  : participationPage === 2
                    ? "Continuar para agenda"
                    : "Continuar"}
              </button>
            </div>
          }
        >
          {participationPage <= 2 ? (
            <section>
              <p className="text-sm font-semibold leading-5 text-slate-600">
                O vínculo de Filho da Corrente já é registrado automaticamente.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {visibleFunctions.map((item) => (
                  <label
                    key={item.slug}
                    className="flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10"
                  >
                    <input
                      type="checkbox"
                      checked={functionSlugs.includes(item.slug)}
                      onChange={() => toggleFunction(item.slug)}
                      className="mt-0.5 h-5 w-5"
                    />
                    <span className="text-sm font-bold text-[#123D2C]">
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
              {hasCavalinho &&
                visibleFunctions.some((item) => item.slug === "cavalinho") && (
                  <CavalinhoEntitySelector
                    entities={entityOptions}
                    selectedEntityIds={cavalinhoEntityIds}
                    consulenteEntityId={cavalinhoConsulenteEntityId}
                    consulenteDefinitionCompleted={
                      cavalinhoConsulenteDefinitionCompleted
                    }
                    onChange={(value) => {
                      invalidateStep("participacao");
                      setCavalinhoEntityIds(value.selectedEntityIds);
                      setCavalinhoConsulenteEntityId(value.consulenteEntityId);
                      setCavalinhoConsulenteDefinitionCompleted(
                        value.consulenteDefinitionCompleted,
                      );
                    }}
                  />
                )}
              {hasSementinhaCoordinator && (
                <SementinhaSubfunctionSelector
                  selectedSlugs={selectedSementinhaSubfunctionSlugs}
                  onChange={(selectedSlugs) => {
                    invalidateStep("participacao");
                    setFunctionSlugs((current) => [
                      ...current.filter(
                        (item) => !isSementinhaSubfunctionSlug(item),
                      ),
                      ...selectedSlugs,
                    ]);
                  }}
                />
              )}
            </section>
          ) : (
            <section>
              <p className="text-sm font-semibold leading-5 text-slate-600">
                Marque atendimentos, grupos, estudos e ações em que participa.
              </p>
              {participationPage === 3 && !hasThursdayGroup && (
                <p className="mt-3 rounded-2xl border-2 border-red-200 bg-red-50 p-3 text-sm font-black text-red-700">
                  Selecione pelo menos um Grupo de quinta-feira para concluir o cadastro.
                </p>
              )}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {visibleAgenda.map((item, index) => (
                  <label
                    key={`${item.slug}-${index}`}
                    className="flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10"
                  >
                    <input
                      type="checkbox"
                      checked={agendaSlugs.includes(item.slug)}
                      onChange={() => {
                        invalidateStep("participacao");
                        setAgendaSlugs((current) =>
                          toggleValue(current, item.slug),
                        );
                      }}
                      className="mt-0.5 h-5 w-5"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-[#123D2C]">
                        {item.label}
                      </span>
                      {(item.description || item.recurrenceLabel) && (
                        <span className="mt-0.5 block text-xs font-semibold leading-4 text-slate-600">
                          {item.description || item.recurrenceLabel}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          )}

          {error && (
            <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">
              {error}
            </p>
          )}
        </RegistrationModal>
      )}

      {familyHelpOpen && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-[#10251C]/65 p-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-label="Orientação sobre familiar não localizado"
        >
          <section className="w-full max-w-md rounded-[1.75rem] bg-white p-5 shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">
              Vínculos familiares
            </p>
            <h3 className="mt-2 text-xl font-black text-[#123D2C]">
              Familiar não localizado?
            </h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">
              Oriente-o a realizar o Primeiro Acesso. Você pode concluir seu
              cadastro agora e informar o vínculo depois em{" "}
              <strong>Cadastro</strong> após fazer o login.
            </p>
            <button
              type="button"
              onClick={() => setFamilyHelpOpen(false)}
              className="mt-5 w-full rounded-2xl bg-[#123D2C] px-5 py-3 font-black text-white"
            >
              Entendi
            </button>
          </section>
        </div>
      )}

    </main>
  );
}

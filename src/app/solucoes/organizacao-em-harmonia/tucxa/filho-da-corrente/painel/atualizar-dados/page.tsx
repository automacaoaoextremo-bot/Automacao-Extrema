"use client";

import Link from "next/link";
import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CavalinhoEntitySelector } from "@/components/organizacao-em-harmonia/cavalinho-entity-selector";
import { SementinhaSubfunctionSelector } from "@/components/organizacao-em-harmonia/sementinha-subfunction-selector";
import {
  FilhoCorrentePanelHeader,
  filhoPanelBase,
  filhoSignOutAction,
  filhoSupportAction,
  type PanelHeaderAction,
} from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";
import {
  SEMENTINHA_COORDINATOR_SLUG,
  SEMENTINHA_SUBFUNCTIONS,
  isSementinhaSubfunctionSlug,
} from "@/lib/organizacao-em-harmonia/sementinha-functions";
import { filhoDaCorrenteFunctions } from "../../../tucxa-content";

type DraftItem = {
  slug: string;
  label: string;
  description?: string;
};

type EntityOption = {
  id: string;
  name: string;
  line?: string;
  entityType?: string;
  attendsConsulentes?: boolean;
  appointmentEnabled?: boolean;
};

type AgendaOption = {
  slug: string;
  legacySlug?: string;
  label: string;
  description?: string;
  dateLabel?: string;
  timeLabel?: string;
  recurrenceLabel?: string;
  locationLabel?: string;
};

type FamilyPersonOption = { id: string; fullName: string };
type FamilyRelationshipOption = { id: string; slug: string; label: string };
type FamilyLinkDraft = {
  personId: string;
  personName: string;
  relationshipTypeId: string;
  relationshipLabel: string;
  source?: string;
  reciprocal?: boolean;
};

type ProfilePayload = {
  ok?: boolean;
  person?: {
    fullName?: string;
    whatsapp?: string;
    email?: string;
    notes?: string;
  };
  functionSlugs?: string[];
  agendaSlugs?: string[];
  profileUpdateStatus?: string;
  selectedEntityIds?: string[];
  cavalinhoConsulenteEntityId?: string;
  cavalinhoConsulenteDefinitionCompleted?: boolean;
  availableEntities?: EntityOption[];
  familyPeople?: FamilyPersonOption[];
  familyRelationships?: FamilyRelationshipOption[];
  familyLinks?: FamilyLinkDraft[];
  error?: string;
};

type AgendaOptionsPayload = {
  options?: AgendaOption[];
  entities?: EntityOption[];
};

type CavalinhoEntitiesPayload = {
  entities?: EntityOption[];
};

type SubmitResponse = {
  ok?: boolean;
  message?: string;
  statusUrl?: string;
  whatsappUrl?: string;
  requestId?: string;
  error?: string;
};

type DialogName = "dados" | "participacao" | null;
type ParticipationPage = 1 | 2 | 3 | 4;

type UpdateModalProps = {
  eyebrow: string;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
};

function UpdateModal({
  eyebrow,
  title,
  children,
  footer,
  onClose,
}: UpdateModalProps) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#10251C]/75 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <section className="flex max-h-[calc(100dvh-1rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-[2rem]">
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
              className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl bg-[#123D2C] px-3 py-2 text-sm font-black text-white sm:px-4"
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

function loginUrl() {
  if (typeof window === "undefined") {
    return "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login";
  }
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return `/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login?returnTo=${encodeURIComponent(returnTo)}`;
}

function normalizeOption(option: Partial<AgendaOption>): AgendaOption | null {
  const slug = typeof option.slug === "string" ? option.slug.trim() : "";
  const label = typeof option.label === "string" ? option.label.trim() : "";
  if (!slug || !label) return null;
  return {
    slug,
    legacySlug:
      typeof option.legacySlug === "string" ? option.legacySlug.trim() : undefined,
    label,
    description:
      typeof option.description === "string" ? option.description.trim() : "",
    dateLabel:
      typeof option.dateLabel === "string" ? option.dateLabel.trim() : "",
    timeLabel:
      typeof option.timeLabel === "string" ? option.timeLabel.trim() : "",
    recurrenceLabel:
      typeof option.recurrenceLabel === "string"
        ? option.recurrenceLabel.trim()
        : "",
    locationLabel:
      typeof option.locationLabel === "string" ? option.locationLabel.trim() : "",
  };
}

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function descriptionForAgenda(option: AgendaOption) {
  return (
    option.description ||
    [option.recurrenceLabel, option.dateLabel, option.timeLabel]
      .filter(Boolean)
      .join(" • ") +
      (option.locationLabel ? ` Local: ${option.locationLabel}` : "")
  );
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function firstNameOnly(value: string) {
  return value.trim().split(/\s+/)[0] || "Familiar";
}

function sortedStringKey(values: string[]) {
  return [...values].sort().join("|");
}

function familyLinksKey(values: FamilyLinkDraft[]) {
  return values
    .map((item) => `${item.personId}:${item.relationshipTypeId}`)
    .sort()
    .join("|");
}

function isThursdayGroup(item: AgendaOption) {
  const searchable = normalizeSearch(
    [item.slug, item.legacySlug, item.label, item.description]
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

const headerActions: PanelHeaderAction[] = [
  { label: "Início", href: "#inicio", variant: "primary" },
  { label: "Voltar", href: filhoPanelBase, variant: "secondary" },
  filhoSignOutAction,
  filhoSupportAction,
];

export default function AtualizarDadosFilhoDaCorrentePage() {
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [originalFullName, setOriginalFullName] = useState("");
  const [originalWhatsapp, setOriginalWhatsapp] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [originalNotes, setOriginalNotes] = useState("");
  const [functionSlugs, setFunctionSlugs] = useState<string[]>([]);
  const [agendaSlugs, setAgendaSlugs] = useState<string[]>([]);
  const [originalFunctionSlugs, setOriginalFunctionSlugs] = useState<string[]>([]);
  const [originalAgendaSlugs, setOriginalAgendaSlugs] = useState<string[]>([]);
  const [agendaOptions, setAgendaOptions] = useState<AgendaOption[]>([]);
  const [entityOptions, setEntityOptions] = useState<EntityOption[]>([]);
  const [cavalinhoEntityIds, setCavalinhoEntityIds] = useState<string[]>([]);
  const [cavalinhoConsulenteEntityId, setCavalinhoConsulenteEntityId] =
    useState("");
  const [cavalinhoConsulenteDefinitionCompleted, setCavalinhoConsulenteDefinitionCompleted] =
    useState(false);
  const [originalCavalinhoEntityIds, setOriginalCavalinhoEntityIds] =
    useState<string[]>([]);
  const [originalCavalinhoConsulenteEntityId, setOriginalCavalinhoConsulenteEntityId] =
    useState("");
  const [originalCavalinhoConsulenteDefinitionCompleted, setOriginalCavalinhoConsulenteDefinitionCompleted] =
    useState(false);

  const [familyPeople, setFamilyPeople] = useState<FamilyPersonOption[]>([]);
  const [familyRelationships, setFamilyRelationships] = useState<
    FamilyRelationshipOption[]
  >([]);
  const [familyLinks, setFamilyLinks] = useState<FamilyLinkDraft[]>([]);
  const [originalFamilyLinks, setOriginalFamilyLinks] = useState<FamilyLinkDraft[]>([]);
  const [hasFamily, setHasFamily] = useState<"sim" | "nao">("nao");
  const [familySearch, setFamilySearch] = useState("");
  const [familyPersonId, setFamilyPersonId] = useState("");
  const [familyRelationshipId, setFamilyRelationshipId] = useState("");

  const [activeDialog, setActiveDialog] = useState<DialogName>(null);
  const [dataPage, setDataPage] = useState<1 | 2>(1);
  const [participationPage, setParticipationPage] =
    useState<ParticipationPage>(1);
  const [familyHelpOpen, setFamilyHelpOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [statusUrl, setStatusUrl] = useState("");
  const [pendingWhatsappUrl, setPendingWhatsappUrl] = useState("");
  const [requestId, setRequestId] = useState("");
  const [profileUpdateStatus, setProfileUpdateStatus] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      window.location.replace(loginUrl());
      return;
    }

    const [profileResponse, optionsResponse, entitiesResponse] = await Promise.all([
      fetch("/api/organizacao-em-harmonia/filhos-corrente/perfil", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/organizacao-em-harmonia/site-tucxa/agenda-options"),
      fetch("/api/organizacao-em-harmonia/site-tucxa/cavalinho-entities"),
    ]);

    const profile = (await profileResponse.json()) as ProfilePayload;
    if (!profileResponse.ok) {
      throw new Error(profile.error || "Não foi possível carregar seus dados.");
    }

    const agenda = (await optionsResponse
      .json()
      .catch(() => ({}))) as AgendaOptionsPayload;
    const cavalinhoEntities = (await entitiesResponse
      .json()
      .catch(() => ({}))) as CavalinhoEntitiesPayload;
    const options = (agenda.options ?? [])
      .map(normalizeOption)
      .filter((item): item is AgendaOption => Boolean(item));

    const storedAgendaSlugs = profile.agendaSlugs ?? [];
    const resolvedAgendaSlugs = Array.from(
      new Set(
        storedAgendaSlugs.flatMap((slug) => {
          if (options.some((option) => option.slug === slug)) return [slug];
          const legacyMatches = options
            .filter((option) => option.legacySlug === slug)
            .map((option) => option.slug);
          return legacyMatches.length ? legacyMatches : [slug];
        }),
      ),
    );

    const loadedFullName = profile.person?.fullName || "";
    const loadedWhatsapp = profile.person?.whatsapp || "";
    const loadedEmail = profile.person?.email || "";
    const loadedNotes = profile.person?.notes || "";
    setFullName(loadedFullName);
    setWhatsapp(loadedWhatsapp);
    setEmail(loadedEmail);
    setNotes(loadedNotes);
    setOriginalFullName(loadedFullName);
    setOriginalWhatsapp(loadedWhatsapp);
    setOriginalEmail(loadedEmail);
    setOriginalNotes(loadedNotes);
    setFunctionSlugs(profile.functionSlugs ?? []);
    setAgendaSlugs(resolvedAgendaSlugs);
    setOriginalFunctionSlugs(profile.functionSlugs ?? []);
    setOriginalAgendaSlugs(resolvedAgendaSlugs);
    setProfileUpdateStatus(profile.profileUpdateStatus || "");
    setAgendaOptions(options);

    const fallbackEntities = profile.availableEntities?.length
      ? profile.availableEntities
      : agenda.entities ?? [];
    const sourceEntities =
      entitiesResponse.ok && cavalinhoEntities.entities?.length
        ? cavalinhoEntities.entities
        : fallbackEntities;
    setEntityOptions(sourceEntities.filter((item) => item.id && item.name));
    const loadedEntityIds = profile.selectedEntityIds ?? [];
    const loadedConsulenteEntityId = profile.cavalinhoConsulenteEntityId || "";
    const loadedConsulenteCompleted =
      profile.cavalinhoConsulenteDefinitionCompleted === true;
    setCavalinhoEntityIds(loadedEntityIds);
    setCavalinhoConsulenteEntityId(loadedConsulenteEntityId);
    setCavalinhoConsulenteDefinitionCompleted(loadedConsulenteCompleted);
    setOriginalCavalinhoEntityIds(loadedEntityIds);
    setOriginalCavalinhoConsulenteEntityId(loadedConsulenteEntityId);
    setOriginalCavalinhoConsulenteDefinitionCompleted(loadedConsulenteCompleted);

    const currentFamilyLinks = profile.familyLinks ?? [];
    setFamilyPeople(profile.familyPeople ?? []);
    setFamilyRelationships(profile.familyRelationships ?? []);
    setFamilyLinks(currentFamilyLinks);
    setOriginalFamilyLinks(currentFamilyLinks);
    setHasFamily(currentFamilyLinks.length ? "sim" : "nao");
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      load()
        .catch((reason) => {
          if (active) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Erro ao carregar seus dados.",
            );
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [load]);

  const functionOptions = useMemo<DraftItem[]>(
    () =>
      filhoDaCorrenteFunctions.map((item) => ({
        slug: item.slug,
        label: item.label,
        description:
          "description" in item && typeof item.description === "string"
            ? item.description
            : "",
      })),
    [],
  );

  const allFunctionOptions = useMemo<DraftItem[]>(
    () => [
      ...functionOptions,
      ...SEMENTINHA_SUBFUNCTIONS.map((item) => ({
        slug: item.slug,
        label: item.label,
        description: item.description,
      })),
    ],
    [functionOptions],
  );

  const agendaDraftItems = useMemo<DraftItem[]>(
    () =>
      agendaOptions.map((item) => ({
        slug: item.slug,
        label: item.label,
        description: descriptionForAgenda(item),
      })),
    [agendaOptions],
  );

  const selectedFunctions = useMemo(
    () =>
      allFunctionOptions.filter((item) => functionSlugs.includes(item.slug)),
    [allFunctionOptions, functionSlugs],
  );
  const selectedAgenda = useMemo(
    () => agendaDraftItems.filter((item) => agendaSlugs.includes(item.slug)),
    [agendaDraftItems, agendaSlugs],
  );
  const hasThursdayGroup = agendaOptions.some(
    (item) => agendaSlugs.includes(item.slug) && isThursdayGroup(item),
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

  const functionPageSize = Math.max(1, Math.ceil(functionOptions.length / 2));
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

  const changesSummary = useMemo(() => {
    const addedFunctions = functionSlugs.filter(
      (item) => !originalFunctionSlugs.includes(item),
    ).length;
    const removedFunctions = originalFunctionSlugs.filter(
      (item) => !functionSlugs.includes(item),
    ).length;
    const addedAgenda = agendaSlugs.filter(
      (item) => !originalAgendaSlugs.includes(item),
    ).length;
    const removedAgenda = originalAgendaSlugs.filter(
      (item) => !agendaSlugs.includes(item),
    ).length;
    return { addedFunctions, removedFunctions, addedAgenda, removedAgenda };
  }, [agendaSlugs, functionSlugs, originalAgendaSlugs, originalFunctionSlugs]);

  const hasProfileChanges = useMemo(
    () =>
      fullName.trim() !== originalFullName.trim() ||
      whatsapp.replace(/\D/g, "") !== originalWhatsapp.replace(/\D/g, "") ||
      email.trim().toLowerCase() !== originalEmail.trim().toLowerCase() ||
      notes.trim() !== originalNotes.trim() ||
      sortedStringKey(functionSlugs) !== sortedStringKey(originalFunctionSlugs) ||
      sortedStringKey(agendaSlugs) !== sortedStringKey(originalAgendaSlugs) ||
      sortedStringKey(hasCavalinho ? cavalinhoEntityIds : []) !==
        sortedStringKey(originalFunctionSlugs.includes("cavalinho") ? originalCavalinhoEntityIds : []) ||
      (hasCavalinho ? cavalinhoConsulenteEntityId : "") !==
        (originalFunctionSlugs.includes("cavalinho")
          ? originalCavalinhoConsulenteEntityId
          : "") ||
      (hasCavalinho ? cavalinhoConsulenteDefinitionCompleted : false) !==
        (originalFunctionSlugs.includes("cavalinho")
          ? originalCavalinhoConsulenteDefinitionCompleted
          : false) ||
      familyLinksKey(hasFamily === "sim" ? familyLinks : []) !==
        familyLinksKey(originalFamilyLinks),
    [
      agendaSlugs,
      cavalinhoConsulenteDefinitionCompleted,
      cavalinhoConsulenteEntityId,
      cavalinhoEntityIds,
      email,
      familyLinks,
      fullName,
      functionSlugs,
      hasCavalinho,
      hasFamily,
      notes,
      originalAgendaSlugs,
      originalCavalinhoConsulenteDefinitionCompleted,
      originalCavalinhoConsulenteEntityId,
      originalCavalinhoEntityIds,
      originalEmail,
      originalFamilyLinks,
      originalFullName,
      originalFunctionSlugs,
      originalNotes,
      originalWhatsapp,
      whatsapp,
    ],
  );

  function addFamilyLink() {
    const person = familyPeople.find((item) => item.id === familyPersonId);
    const relationship = familyRelationships.find(
      (item) => item.id === familyRelationshipId,
    );
    if (!person || !relationship) {
      setError("Selecione o familiar e o grau de parentesco.");
      return;
    }
    setFamilyLinks((current) => [
      ...current,
      {
        personId: person.id,
        personName: person.fullName,
        relationshipTypeId: relationship.id,
        relationshipLabel: relationship.label,
      },
    ]);
    setHasFamily("sim");
    setFamilyPersonId("");
    setFamilyRelationshipId("");
    setFamilySearch("");
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

  function validateContactData() {
    if (!fullName.trim()) return "Informe seu nome completo.";
    if (whatsapp.replace(/\D/g, "").length < 10) {
      return "Informe seu WhatsApp com DDD.";
    }
    if (email && !email.includes("@")) return "Confira o e-mail informado.";
    return "";
  }

  function continueToFamily() {
    const validationError = validateContactData();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setDataPage(2);
  }

  function confirmParticipationUpdate() {
    if (!hasThursdayGroup) {
      setError(
        "Selecione pelo menos um Grupo de quinta-feira para salvar a participação.",
      );
      return;
    }
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
    setError("");
    setActiveDialog(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setStatusUrl("");
    setPendingWhatsappUrl("");
    setRequestId("");

    if (!hasProfileChanges) {
      setError("Altere pelo menos uma informação antes de enviar para validação.");
      return;
    }

    const contactError = validateContactData();
    if (contactError) {
      setError(contactError);
      return;
    }
    if (!hasThursdayGroup) {
      setError(
        "Selecione pelo menos um Grupo de quinta-feira antes de enviar a atualização.",
      );
      return;
    }
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

    const candidateWindow = window.open("", "_blank");
    const whatsappWindow =
      candidateWindow && candidateWindow !== window ? candidateWindow : null;
    if (whatsappWindow) {
      try {
        whatsappWindow.opener = null;
      } catch {
        // Alguns navegadores não permitem alterar opener.
      }
      whatsappWindow.document.title = "Abrindo WhatsApp";
      whatsappWindow.document.body.innerHTML =
        '<p style="font-family:Arial,sans-serif;padding:24px">Preparando a atualização para o WhatsApp...</p>';
    }

    setSaving(true);
    try {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sessão expirada. Entre novamente.");

      const response = await fetch(
        "/api/organizacao-em-harmonia/filhos-corrente/perfil",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fullName,
            whatsapp,
            email,
            notes,
            functionSlugs,
            agendaSlugs,
            selectedFunctions,
            selectedAgenda,
            familyLinks: hasFamily === "sim" ? familyLinks : [],
            cavalinhoEntityIds: hasCavalinho ? cavalinhoEntityIds : [],
            cavalinhoConsulenteEntityId: hasCavalinho
              ? cavalinhoConsulenteEntityId
              : "",
            cavalinhoConsulenteDefinitionCompleted: hasCavalinho
              ? cavalinhoConsulenteDefinitionCompleted
              : false,
            selectedEntities: hasCavalinho ? selectedEntities : [],
          }),
        },
      );
      const result = (await response.json()) as SubmitResponse;
      if (!response.ok) {
        const failure = new Error(
          result.error || "Não foi possível enviar a atualização.",
        ) as Error & { requestId?: string };
        failure.requestId = result.requestId;
        throw failure;
      }

      setMessage(result.message || "Atualização enviada para validação do TUCXA.");
      setStatusUrl(result.statusUrl || "");
      setRequestId(result.requestId || "");
      setProfileUpdateStatus("pendente_validacao");
      setActiveDialog(null);

      if (result.whatsappUrl) {
        if (whatsappWindow) {
          whatsappWindow.location.replace(result.whatsappUrl);
        } else {
          setPendingWhatsappUrl(result.whatsappUrl);
        }
      } else {
        whatsappWindow?.close();
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (reason) {
      whatsappWindow?.close();
      setRequestId((reason as { requestId?: string })?.requestId || "");
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao enviar atualização.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main id="inicio" className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader
        navLabel="Atualização de dados do Filho da Corrente"
        actions={headerActions}
        mobileActionColumns={4}
      />

      <section className="mx-auto max-w-4xl px-3 py-2 sm:px-6 sm:py-5 lg:px-8">
        <div className="rounded-[1.5rem] bg-white p-4 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:rounded-[2rem] sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">
            Atualização dos dados
          </p>
          <h1 className="mt-1.5 text-2xl font-black leading-tight text-[#123D2C] sm:mt-2 sm:text-3xl">
            Atualize seu cadastro em duas etapas.
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-5 text-slate-700 sm:mt-3 sm:text-base sm:leading-7">
            Abra cada tela, confira seus dados, vínculos familiares, funções e agenda;
            depois envie tudo para validação do Tucxa.
          </p>

          {profileUpdateStatus === "pendente_validacao" && !message && (
            <div className="mt-5 rounded-3xl bg-blue-50 p-4 text-blue-950 ring-1 ring-blue-100">
              <p className="font-black">Atualização aguardando validação.</p>
              <p className="mt-1 text-sm font-semibold leading-6">
                Seu cadastro anteriormente aprovado continua ativo até a análise.
              </p>
            </div>
          )}

          {profileUpdateStatus === "ajuste_solicitado" && !message && (
            <div className="mt-5 rounded-3xl bg-amber-50 p-4 text-amber-950 ring-1 ring-amber-100">
              <p className="font-black">A atualização anterior precisa de ajustes.</p>
              <p className="mt-1 text-sm font-semibold leading-6">
                Revise as informações e envie uma nova solicitação.
              </p>
            </div>
          )}

          {loading && (
            <p className="mt-5 rounded-3xl bg-[#E9F2E7] p-4 font-bold text-[#123D2C]">
              Carregando dados...
            </p>
          )}
          {error && (
            <div className="mt-5 rounded-3xl bg-red-50 p-4 font-bold text-red-700 ring-1 ring-red-100">
              <p>{error}</p>
              {requestId && (
                <p className="mt-1 text-xs">Código para suporte: {requestId}</p>
              )}
            </div>
          )}
          {message && (
            <div className="mt-5 rounded-[1.75rem] bg-emerald-50 p-5 text-emerald-900 ring-1 ring-emerald-100">
              <p className="text-xs font-black uppercase tracking-[0.2em]">
                Atualização enviada
              </p>
              <h2 className="mt-2 text-2xl font-black">Obrigado!</h2>
              <p className="mt-2 font-bold">{message}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {statusUrl && (
                  <Link
                    href={statusUrl}
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#123D2C] px-5 py-3 text-center font-black text-white"
                  >
                    Acompanhar validação
                  </Link>
                )}
                {pendingWhatsappUrl && (
                  <a
                    href={pendingWhatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#25D366] px-5 py-3 text-center font-black text-[#073B1D]"
                  >
                    Abrir mensagem no WhatsApp
                  </a>
                )}
                <Link
                  href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel"
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-5 py-3 text-center font-black text-[#123D2C] ring-1 ring-[#123D2C]/10"
                >
                  Voltar ao painel
                </Link>
              </div>
            </div>
          )}

          {!loading && !message && (
            <form onSubmit={submit} className="mt-3 grid gap-2.5 sm:mt-6 sm:gap-4">
              <button
                type="button"
                onClick={() => {
                  setDataPage(1);
                  setActiveDialog("dados");
                }}
                className="rounded-2xl bg-[#F7FAF2] p-3.5 text-left ring-1 ring-[#123D2C]/10 sm:p-5"
              >
                <span className="flex items-center justify-between gap-3">
                  <span>
                    <span className="block text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
                      Etapa 1 de 2
                    </span>
                    <span className="mt-1 block text-lg font-black text-[#123D2C]">
                      Dados
                    </span>
                  </span>
                  <span className="rounded-xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white">
                    Atualizar
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setParticipationPage(1);
                  setActiveDialog("participacao");
                }}
                className="rounded-2xl bg-[#F7FAF2] p-3.5 text-left ring-1 ring-[#123D2C]/10 sm:p-5"
              >
                <span className="flex items-center justify-between gap-3">
                  <span>
                    <span className="block text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
                      Etapa 2 de 2
                    </span>
                    <span className="mt-1 block text-lg font-black text-[#123D2C]">
                      Função e agenda
                    </span>
                  </span>
                  <span className="rounded-xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white">
                    Atualizar
                  </span>
                </span>
              </button>

              <div className="rounded-2xl bg-[#EEF5EA] p-4 text-sm font-semibold text-slate-700">
                Alterações atuais: +{changesSummary.addedFunctions} / -
                {changesSummary.removedFunctions} funções e +
                {changesSummary.addedAgenda} / -{changesSummary.removedAgenda} agendas.
                Familiares vinculados: {hasFamily === "sim" ? familyLinks.length : 0}.
              </div>

              {hasProfileChanges ? (
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white shadow-lg shadow-green-900/10 disabled:opacity-60"
                >
                  {saving ? "Enviando..." : "Enviar atualização para validação"}
                </button>
              ) : (
                <p className="rounded-2xl bg-white p-3 text-center text-sm font-bold text-slate-500 ring-1 ring-[#123D2C]/10">
                  O botão de envio aparecerá depois que alguma informação for alterada.
                </p>
              )}
              <Link
                href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel"
                className="rounded-2xl bg-white px-5 py-4 text-center font-black text-[#123D2C] ring-1 ring-[#123D2C]/10"
              >
                Voltar ao painel
              </Link>
            </form>
          )}
        </div>
      </section>

      {activeDialog === "dados" && (
        <UpdateModal
          eyebrow={`Etapa 1 de 2 · tela ${dataPage} de 2`}
          title={dataPage === 1 ? "Dados de contato" : "Vínculos familiares"}
          onClose={() => setActiveDialog(null)}
          footer={
            dataPage === 1 ? (
              <button
                type="button"
                onClick={continueToFamily}
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
                  onClick={() => {
                    setError("");
                    setActiveDialog(null);
                  }}
                  className="rounded-2xl bg-[#123D2C] px-5 py-3.5 text-sm font-black text-white"
                >
                  Confirmar etapa 1
                </button>
              </div>
            )
          }
        >
          {dataPage === 1 ? (
            <div className="grid gap-4">
              <label className="grid gap-1">
                <span className="text-sm font-black text-[#123D2C]">
                  Nome completo *
                </span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="rounded-2xl border border-[#123D2C]/15 p-3.5"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-black text-[#123D2C]">
                  Celular/WhatsApp *
                </span>
                <input
                  value={whatsapp}
                  onChange={(event) => setWhatsapp(event.target.value)}
                  inputMode="tel"
                  className="rounded-2xl border border-[#123D2C]/15 p-3.5"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-black text-[#123D2C]">E-mail</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  className="rounded-2xl border border-[#123D2C]/15 p-3.5"
                  placeholder="Opcional, mas recomendado"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-black text-[#123D2C]">
                  Observação
                </span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="min-h-16 rounded-2xl border border-[#123D2C]/15 p-3.5"
                  placeholder="Opcional"
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
                    }}
                    className={`rounded-2xl px-4 py-3 font-black ring-1 ${
                      hasFamily === option
                        ? "bg-[#123D2C] text-white ring-[#123D2C]"
                        : "bg-white text-[#123D2C] ring-[#123D2C]/15"
                    }`}
                  >
                    {option === "sim" ? "Sim" : "Não"}
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
                      className="mt-2 w-full rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
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
                            {firstNameOnly(link.personName)}
                          </strong>
                          <span className="text-sm text-slate-600">
                            {link.relationshipLabel}
                          </span>
                        </span>
                        {link.reciprocal || link.source?.startsWith("reciprocal:") ? (
                          <span className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#2F6B43]">
                            Informado pelo familiar
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setFamilyLinks((current) =>
                                current.filter(
                                  (item) => item.personId !== link.personId,
                                ),
                              )
                            }
                            className="rounded-xl bg-white px-3 py-2 text-sm font-black text-red-700"
                          >
                            Retirar
                          </button>
                        )}
                      </div>
                    ))}
                  </div>


                </>
              )}
            </div>
          )}
        </UpdateModal>
      )}

      {activeDialog === "participacao" && (
        <UpdateModal
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
                {participationPage === 1 ? "Voltar ao cadastro" : "Voltar"}
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
                  confirmParticipationUpdate();
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
                O vínculo de Filho da Corrente já está registrado. Marque somente
                as funções adicionais.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {visibleFunctions.map((item) => {
                  const checked = functionSlugs.includes(item.slug);
                  const wasChecked = originalFunctionSlugs.includes(item.slug);
                  return (
                    <label
                      key={item.slug}
                      className={`flex items-start gap-3 rounded-2xl p-3 ring-1 ${
                        checked
                          ? "bg-emerald-50 ring-emerald-100"
                          : "bg-white ring-[#123D2C]/10"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFunction(item.slug)}
                        className="mt-0.5 h-5 w-5"
                      />
                      <span className="text-sm font-bold text-[#123D2C]">
                        {item.label}
                        {wasChecked && (
                          <span className="ml-2 rounded-full bg-[#123D2C] px-2 py-0.5 text-[10px] text-white">
                            já selecionado
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
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
                  Selecione pelo menos um Grupo de quinta-feira para concluir a atualização.
                </p>
              )}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {visibleAgenda.map((item) => {
                  const checked = agendaSlugs.includes(item.slug);
                  const wasChecked = originalAgendaSlugs.includes(item.slug);
                  return (
                    <label
                      key={item.slug}
                      className={`flex items-start gap-3 rounded-2xl p-3 ring-1 ${
                        checked
                          ? "bg-emerald-50 ring-emerald-100"
                          : wasChecked
                            ? "bg-white ring-[#123D2C]/10"
                            : "bg-amber-50 ring-amber-100"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setAgendaSlugs((current) =>
                            toggleValue(current, item.slug),
                          )
                        }
                        className="mt-0.5 h-5 w-5"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-[#123D2C]">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-xs font-semibold leading-4 text-slate-600">
                          {descriptionForAgenda(item)}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          )}

          {error && (
            <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">
              {error}
            </p>
          )}
        </UpdateModal>
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

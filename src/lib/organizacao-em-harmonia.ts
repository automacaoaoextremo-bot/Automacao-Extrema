export type OrganizacaoModulo =
  | "organizacao-em-harmonia"
  | "atendimento-em-harmonia"
  | "agenda-viva"
  | "corrente-em-dia"
  | "pacote-completo";

export type OrganizacaoLeadPayload = {
  source?: unknown;
  modulo?: unknown;
  module?: unknown;
  interestModule?: unknown;
  interest_module?: unknown;
  contactName?: unknown;
  contact_name?: unknown;
  responsibleName?: unknown;
  responsible_name?: unknown;
  email?: unknown;
  whatsapp?: unknown;
  organizationName?: unknown;
  organization_name?: unknown;
  organizationType?: unknown;
  organization_type?: unknown;
  priorityModule?: unknown;
  priority_module?: unknown;
  enabledModules?: unknown;
  enabled_modules?: unknown;
  observations?: unknown;
  notes?: unknown;
  founderTermsAccepted?: unknown;
  founder_terms_accepted?: unknown;
  testimonialPermission?: unknown;
  testimonial_permission?: unknown;
  lgpdContactConsent?: unknown;
  lgpd_contact_consent?: unknown;
};

export type OrganizacaoLead = {
  id: string;
  source: string;
  interest_module: OrganizacaoModulo;
  contact_name: string;
  email: string | null;
  whatsapp: string | null;
  organization_name: string | null;
  organization_type: string | null;
  status: string;
  founder_terms_accepted: boolean;
  testimonial_permission: boolean;
  lgpd_contact_consent: boolean;
  created_at: string;
  updated_at: string;
};


export type OrganizacaoClientNavItem = {
  href: string;
  label: string;
  description: string;
};

export const ORGANIZACAO_CLIENT_NAV_ITEMS: OrganizacaoClientNavItem[] = [
  {
    href: "/solucoes/organizacao-em-harmonia/cliente",
    label: "Painel",
    description: "Visão inicial, checklist e próximos passos.",
  },
  {
    href: "/solucoes/organizacao-em-harmonia/cliente/base-unica",
    label: "Base Única",
    description: "Pessoas, funções, permissões e módulos habilitados.",
  },
  {
    href: "/solucoes/organizacao-em-harmonia/cliente/agenda-viva",
    label: "Agenda Viva",
    description: "Calendário anual, atividades, eventos, recorrências e aprovações.",
  },
  {
    href: "/solucoes/organizacao-em-harmonia/cliente/modulos",
    label: "Módulos",
    description: "Corrente em Dia, Atendimento em Harmonia e Agenda Viva.",
  },
  {
    href: "/solucoes/organizacao-em-harmonia/cliente/configuracoes",
    label: "Configurações",
    description: "Regras, aprovações, LGPD, permissões e preferências.",
  },
  {
    href: "/solucoes/organizacao-em-harmonia/cliente/relatorios",
    label: "Relatórios",
    description: "Indicadores e acompanhamento da validação.",
  },
];

export const ORGANIZACAO_MODULOS: Array<{
  slug: Exclude<OrganizacaoModulo, "pacote-completo">;
  name: string;
  shortName: string;
  headline: string;
  description: string;
  href: string;
  logoSrc: string;
}> = [
  {
    slug: "organizacao-em-harmonia",
    name: "Organização em Harmonia",
    shortName: "Solução completa",
    headline: "Uma base única para pessoas, funções, permissões, agenda, atendimentos e contribuições.",
    description:
      "Suíte modular da Automação Extrema para organizações que precisam reduzir desencontros, retrabalho e decisões soltas sem perder o jeito humano de funcionar.",
    href: "/solucoes/organizacao-em-harmonia",
    logoSrc: "/organizacao-em-harmonia-logo.svg",
  },
  {
    slug: "atendimento-em-harmonia",
    name: "Atendimento em Harmonia",
    shortName: "Atendimento",
    headline: "Recepção, agenda, fila, retornos e cambonos organizados sem levar eletrônicos para o atendimento.",
    description:
      "Criado para organizar a recepção com critérios únicos entre presencial e WhatsApp, registrar retornos, prever capacidade e reduzir tensão operacional.",
    href: "/solucoes/atendimento-em-harmonia",
    logoSrc: "/atendimento-em-harmonia-logo.svg",
  },
  {
    slug: "agenda-viva",
    name: "Agenda Viva",
    shortName: "Agenda",
    headline: "Calendário único com responsáveis, recorrências, aprovações, conflitos e comunicação.",
    description:
      "Para transformar atividades, grupos, mutirões, férias, reuniões, eventos e trabalhos recorrentes em uma agenda viva, clara e aprovada.",
    href: "/solucoes/agenda-viva",
    logoSrc: "/agenda-viva-logo.svg",
  },
  {
    slug: "corrente-em-dia",
    name: "Corrente em Dia",
    shortName: "Contribuições",
    headline: "Contribuições, Pix, comprovantes, aprovações e lembretes organizados com respeito.",
    description:
      "Módulo financeiro-operacional para reduzir comprovantes espalhados, cobrança constrangedora e fechamento manual.",
    href: "/solucoes/corrente-em-dia",
    logoSrc: "/corrente-em-dia-logo.svg",
  },
];

export const ORGANIZACAO_MODULOS_COMERCIAIS = ORGANIZACAO_MODULOS.filter(
  (item) => item.slug !== "organizacao-em-harmonia",
);

export const ORGANIZACAO_INTEREST_OPTIONS: Array<{
  slug: Exclude<OrganizacaoModulo, "pacote-completo">;
  label: string;
  description: string;
}> = [
  {
    slug: "organizacao-em-harmonia",
    label: "Organização em Harmonia — solução completa",
    description: "Base Única + Corrente em Dia + Atendimento em Harmonia + Agenda Viva.",
  },
  {
    slug: "corrente-em-dia",
    label: "Corrente em Dia",
    description: "Contribuições, Pix, comprovantes, lembretes e aprovações.",
  },
  {
    slug: "atendimento-em-harmonia",
    label: "Atendimento em Harmonia",
    description: "Recepção, agenda, fila, retornos, check-in e apoio dos cambonos.",
  },
  {
    slug: "agenda-viva",
    label: "Agenda Viva",
    description: "Calendário único, atividades, responsáveis, aprovações e conflitos.",
  },
];


export const ORGANIZACAO_FOUNDER_TRIAL_DAYS = 30;
export const ORGANIZACAO_IMPLANTATION_DUE_DAYS = 30;
export const ORGANIZACAO_DEFAULT_REMINDER_HOURS_BEFORE_DUE = 48;

export const AGENDA_VIVA_TUCXA_EVENT_TYPES = [
  "Atendimento filhos de fora",
  "Atendimento filhos da corrente",
  "Tratamento espiritual / transformação",
  "Grupo segunda-feira",
  "Grupo terça-feira",
  "Grupo 1",
  "Grupo 2",
  "Mutirão de limpeza",
  "Férias",
  "Encerramento",
  "Clube do Livro",
  "Grupo de Estudos",
  "Bazar",
  "Bingo",
  "Venda de pizzas",
  "Ação beneficente",
  "Feijoada",
  "Festa Junina",
  "Rifa",
  "Vaquinha",
  "Reunião de diretoria",
  "Trabalho especial",
  "Casamento",
  "Batizado",
] as const;

export const AGENDA_VIVA_TUCXA_INITIAL_RULES = [
  "Segundas e terças: trabalhos voltados aos filhos de fora/consulentes, conforme calendário anual da casa.",
  "Quartas: transformação/tratamento espiritual apenas para pessoas encaminhadas e agendadas pela coordenação.",
  "Quintas: desenvolvimento dos filhos da corrente, com Grupo I na 1ª e 3ª quinta e Grupo II na 2ª e 4ª quinta.",
  "Eventos, campanhas e ações beneficentes devem permitir criação por responsáveis e aprovação por diretoria/presidência.",
  "Períodos de férias, mutirões e encerramentos devem bloquear ou alertar conflitos no calendário.",
] as const;

export function numberFromEnv(name: string, fallback: number) {
  const raw = process.env[name];
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addHours(date: Date, hours: number) {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
}

export function subtractHours(date: Date, hours: number) {
  const next = new Date(date);
  next.setHours(next.getHours() - hours);
  return next;
}

export function founderTimelineFrom(now = new Date()) {
  const implantationDueDays = numberFromEnv("OH_IMPLANTATION_DUE_DAYS", ORGANIZACAO_IMPLANTATION_DUE_DAYS);
  const founderEvaluationDays = numberFromEnv("OH_FOUNDER_EVALUATION_DAYS", ORGANIZACAO_FOUNDER_TRIAL_DAYS);
  const reminderHoursBeforeDue = numberFromEnv(
    "OH_REMINDER_HOURS_BEFORE_IMPLANTATION_DUE",
    ORGANIZACAO_DEFAULT_REMINDER_HOURS_BEFORE_DUE,
  );
  const implantationStartedAt = now;
  const implantationDueAt = addDays(now, implantationDueDays);
  const nextReminderAt = subtractHours(implantationDueAt, reminderHoursBeforeDue);

  return {
    implantationDueDays,
    founderEvaluationDays,
    reminderHoursBeforeDue,
    implantationStartedAt: implantationStartedAt.toISOString(),
    implantationDueAt: implantationDueAt.toISOString(),
    nextReminderAt: nextReminderAt.toISOString(),
  };
}

export function normalizeOrganizacaoModulo(value: unknown): OrganizacaoModulo {
  const text = String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/_/g, "-");

  if (["atendimento", "atendimento-em-harmonia", "recepcao", "fila"].includes(text)) {
    return "atendimento-em-harmonia";
  }

  if (["agenda", "agenda-viva", "calendario", "calendario-unico"].includes(text)) {
    return "agenda-viva";
  }

  if (["corrente", "corrente-em-dia", "contribuicoes", "contribuicao"].includes(text)) {
    return "corrente-em-dia";
  }

  if (["pacote", "pacote-completo", "todos", "todas", "suite", "suíte", "completo"].includes(text)) {
    return "organizacao-em-harmonia";
  }

  return "organizacao-em-harmonia";
}

export function moduleInfo(slug: OrganizacaoModulo) {
  const normalizedSlug = slug === "pacote-completo" ? "organizacao-em-harmonia" : slug;
  return ORGANIZACAO_MODULOS.find((item) => item.slug === normalizedSlug) ?? ORGANIZACAO_MODULOS[0];
}

export function moduleLabel(slug: OrganizacaoModulo) {
  return moduleInfo(slug).name;
}

export function normalizeWhatsapp(value: string) {
  return value.replace(/\D/g, "");
}

export function interesseQuery(slug: OrganizacaoModulo) {
  const normalizedSlug = normalizeOrganizacaoModulo(slug);
  return normalizedSlug === "organizacao-em-harmonia" ? "" : `?modulo=${normalizedSlug}`;
}

export function organizacaoWhatsappMessage(input: {
  module: OrganizacaoModulo;
  contactName: string;
  email: string;
  whatsapp: string;
  leadId?: string | null;
}) {
  const info = moduleInfo(input.module);
  return [
    `Olá! Preenchi o Quero Conhecer da ${info.name} e quero continuar pelo WhatsApp.`,
    "",
    `Nome do contato: ${input.contactName}`,
    `E-mail: ${input.email}`,
    `WhatsApp: ${input.whatsapp}`,
    input.leadId ? `Código do lead: ${input.leadId}` : "",
    `Interesse: ${info.name}`,
    "",
    "Quero receber as orientações e seguir com a validação como Cliente Fundador.",
  ]
    .filter(Boolean)
    .join("\n");
}

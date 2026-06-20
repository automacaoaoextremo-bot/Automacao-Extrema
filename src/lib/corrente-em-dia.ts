export type CorrenteOrganizationType = "federacao" | "associacao" | "terreiro";

export type CorrenteDashboardItem = {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  organization_type: CorrenteOrganizationType;
  reference_month: string | null;
  total_contributions: number;
  approved_count: number;
  pending_count: number;
  divergent_count: number;
  review_count: number;
  approved_amount: number;
  pending_amount: number;
  expected_amount: number;
};

export type CorrenteOrganization = {
  id: string;
  organization_type: CorrenteOrganizationType;
  name: string;
  slug: string;
  email: string | null;
  whatsapp: string | null;
  city: string | null;
  state: string | null;
  pix_key: string | null;
  pix_receiver_name: string | null;
  default_individual_amount: number | null;
  default_family_amount: number | null;
  contribution_due_day: number | null;
  contribution_due_mode: string;
  public_headline: string | null;
  deep_dive_text: string | null;
  public_status: string;
  is_demo: boolean;
};


export type CorrentePerson = {
  id: string;
  auth_user_id?: string | null;
  full_name: string;
  email: string | null;
  whatsapp?: string | null;
  document?: string | null;
  status?: string | null;
};

export type CorrenteRole = {
  id: string;
  name: string;
  slug: string;
  is_manager: boolean;
  is_financial_role: boolean;
};

export type CorrentePersonOrganizationLink = {
  id: string;
  is_manager: boolean;
  is_financial_responsible: boolean;
  contribution_enabled: boolean;
  role: CorrenteRole | null;
  organization: CorrenteOrganization | null;
};

export type CorrenteContribution = {
  id: string;
  organization_id: string;
  person_id: string | null;
  family_id: string | null;
  reference_month: string;
  expected_amount: number | null;
  due_date: string | null;
  pix_key_expected: string | null;
  pix_receiver_expected: string | null;
  pix_payload: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  person: Pick<CorrentePerson, "full_name" | "email"> | null;
  family: { name: string } | null;
};

export type CorrentePaymentReceipt = {
  id: string;
  contribution_id: string;
  file_name: string | null;
  informed_amount: number | null;
  ocr_amount: number | null;
  ocr_pix_key: string | null;
  validation_status: string;
  validation_notes: string | null;
  created_at: string;
};

export type CorrenteSplitEstimate = {
  organization_id: string;
  organization_name?: string | null;
  reference_month: string | null;
  total_amount?: number | null;
  operational_fee_amount?: number | null;
  federation_amount?: number | null;
  ae_amount?: number | null;
  partner_amount?: number | null;
};

export type CorrenteClientTermDashboard = CorrenteClientTerm & {
  organization_name?: string | null;
  organization_type?: CorrenteOrganizationType | null;
};

export type CorrenteClientDashboardPayload = {
  user?: { id: string; email?: string | null };
  person: CorrentePerson;
  organizations: CorrenteOrganization[];
  links: CorrentePersonOrganizationLink[];
  is_manager: boolean;
  dashboard: CorrenteDashboardItem[];
  contributions: CorrenteContribution[];
  receipts: CorrentePaymentReceipt[];
  splitEstimates: CorrenteSplitEstimate[];
  clientTerms: CorrenteClientTerm[];
  termsError?: string | null;
};

export function currencyBR(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function organizationTypeLabel(type: string) {
  const labels: Record<string, string> = {
    federacao: "Federação",
    associacao: "Associação",
    terreiro: "Terreiro",
  };
  return labels[type] ?? "Entidade";
}

export function contributionModeLabel(mode: string) {
  const labels: Record<string, string> = {
    fixed_day: "no dia definido",
    until_day: "até o dia definido",
    free_month: "livre dentro do mês",
  };
  return labels[mode] ?? mode;
}

export type CorrenteClientTerm = {
  id: string;
  organization_id: string;
  condition_label: string;
  contract_status: string;
  fee_status: string;
  setup_fee: number | null;
  monthly_fee: number | null;
  operational_fee_percentage: number | null;
  federation_percentage: number | null;
  ae_percentage: number | null;
  partner_percentage: number | null;
  unlinked_reserve_percentage: number | null;
  pilot_days: number | null;
  allow_testimonial: boolean;
  allow_logo_use: boolean;
  terms_accepted: boolean;
  accepted_at: string | null;
  notes: string | null;
};

export function formatPercent(value: number | null | undefined) {
  return `${Number(value ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

export function contributionStatusLabel(status: string) {
  const labels: Record<string, string> = {
    em_aberto: "Em aberto",
    comprovante_enviado: "Comprovante enviado",
    pre_validado: "Pré-validado",
    divergente: "Divergente",
    aprovado: "Aprovado",
    reprovado: "Reprovado",
    cancelado: "Cancelado",
  };
  return labels[status] ?? status;
}


export type CorrenteLeadStatus =
  | "novo_whatsapp"
  | "email_acesso_enviado"
  | "aguardando_primeiro_acesso"
  | "em_configuracao"
  | "avaliacao_30_dias"
  | "followup_7d"
  | "followup_15d"
  | "followup_25d"
  | "depoimento_solicitado"
  | "cliente_ativo"
  | "sem_resposta"
  | "encerrado";

export type CorrenteLead = {
  id: string;
  source: string;
  organization_type: CorrenteOrganizationType;
  organization_name: string;
  organization_slug: string | null;
  responsible_name: string;
  email: string | null;
  whatsapp: string | null;
  state: string | null;
  city: string | null;
  contributors_estimate: number | null;
  observations: string | null;
  status: CorrenteLeadStatus;
  founder_terms_accepted: boolean;
  testimonial_permission: boolean;
  lgpd_contact_consent: boolean;
  access_user_email: string | null;
  access_sent_at: string | null;
  access_due_at: string | null;
  internal_alert_at: string | null;
  internal_alert_sent_at: string | null;
  trial_days: number;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  ae_client_id: string | null;
  organization_id: string | null;
  responsible_person_id: string | null;
  auth_user_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CorrenteLeadPayload = {
  source?: string;
  contactName?: string;
  contact_name?: string;
  organizationType?: CorrenteOrganizationType | string;
  organization_type?: CorrenteOrganizationType | string;
  organizationName?: string;
  organization_name?: string;
  responsibleName?: string;
  responsible_name?: string;
  email?: string;
  whatsapp?: string;
  state?: string;
  uf?: string;
  city?: string;
  contributorsEstimate?: string | number;
  contributors_estimate?: string | number;
  observations?: string;
  notes?: string;
  founderTermsAccepted?: boolean;
  founder_terms_accepted?: boolean;
  testimonialPermission?: boolean;
  testimonial_permission?: boolean;
  lgpdContactConsent?: boolean;
  lgpd_contact_consent?: boolean;
};

export const CORRENTE_LEAD_STATUS_LABELS: Record<CorrenteLeadStatus, string> = {
  novo_whatsapp: "Lead recebido",
  email_acesso_enviado: "Acesso enviado",
  aguardando_primeiro_acesso: "Aguardando primeiro acesso",
  em_configuracao: "Em configuração",
  avaliacao_30_dias: "Avaliação 30 dias",
  followup_7d: "Follow-up 7 dias",
  followup_15d: "Follow-up 15 dias",
  followup_25d: "Follow-up 25 dias",
  depoimento_solicitado: "Depoimento solicitado",
  cliente_ativo: "Cliente ativo",
  sem_resposta: "Sem resposta",
  encerrado: "Encerrado",
};

export function normalizeCorrenteOrganizationType(value: unknown): CorrenteOrganizationType {
  const normalized = String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("fed")) return "federacao";
  if (normalized.includes("assoc")) return "associacao";
  return "terreiro";
}

export function formatCorrenteOrganizationType(value: CorrenteOrganizationType) {
  if (value === "federacao") return "Federação";
  if (value === "associacao") return "Associação";
  return "Terreiro";
}

export type CorrentePermissionKey =
  | "cadastro.view"
  | "cadastro.edit"
  | "configuracoes.view"
  | "configuracoes.edit"
  | "contribuintes.view"
  | "contribuintes.edit"
  | "contribuintes.import"
  | "contribuir.view"
  | "contribuir.upload_receipt"
  | "aprovacoes.view"
  | "aprovacoes.review"
  | "aprovacoes.send_reminders";

export const CORRENTE_PERMISSION_LABELS: Record<CorrentePermissionKey, string> = {
  "cadastro.view": "Ver cadastro da organização",
  "cadastro.edit": "Editar cadastro da organização",
  "configuracoes.view": "Ver configurações",
  "configuracoes.edit": "Editar funções e permissões",
  "contribuintes.view": "Ver contribuintes",
  "contribuintes.edit": "Incluir e editar contribuintes",
  "contribuintes.import": "Importar contribuintes por planilha",
  "contribuir.view": "Acessar contribuição",
  "contribuir.upload_receipt": "Enviar comprovante",
  "aprovacoes.view": "Ver aprovações",
  "aprovacoes.review": "Aprovar, reprovar ou pedir correção",
  "aprovacoes.send_reminders": "Enviar lembretes",
};

export const CORRENTE_DEFAULT_PERMISSIONS: CorrentePermissionKey[] = [
  "cadastro.view",
  "cadastro.edit",
  "configuracoes.view",
  "configuracoes.edit",
  "contribuintes.view",
  "contribuintes.edit",
  "contribuintes.import",
  "contribuir.view",
  "contribuir.upload_receipt",
  "aprovacoes.view",
  "aprovacoes.review",
  "aprovacoes.send_reminders",
];

export type CorrenteRolePermission = {
  id: string;
  role_id: string;
  permission_key: CorrentePermissionKey;
  enabled: boolean;
};

export type CorrenteContributionOption = {
  id: string;
  organization_id: string;
  description: string;
  amount: number | null;
  is_default: boolean;
  is_active: boolean;
};

export type CorrenteOrganizationSettings = CorrenteOrganization & {
  contact_name?: string | null;
  contact_email?: string | null;
  responsible_manager_name?: string | null;
  postal_code?: string | null;
  address_number?: string | null;
  address_complement?: string | null;
  reminder_before_due_enabled?: boolean | null;
  reminder_due_day_enabled?: boolean | null;
  reminder_after_due_enabled?: boolean | null;
  reminder_five_days_after_enabled?: boolean | null;
};

export type CorrenteContributor = {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp: string | null;
  person_type: string;
  status: string | null;
  auth_user_id: string | null;
  role_id: string | null;
  role_name: string | null;
  contribution_rule_id: string | null;
  contribution_amount: number | null;
  contribution_due_day: number | null;
  contribution_due_mode: string | null;
  contribution_rule_type: string | null;
};

export type CorrenteOnboardingStepKey =
  | "organizacao"
  | "pix"
  | "valor_padrao"
  | "dia_contribuicao"
  | "funcoes"
  | "contribuintes"
  | "acessos"
  | "teste_contribuicao"
  | "aprovacao_teste";

export type CorrenteOnboardingStep = {
  key: CorrenteOnboardingStepKey;
  title: string;
  description: string;
  why: string;
  href: string;
  done: boolean;
  required: boolean;
  sortOrder: number;
};

export type CorrenteOnboardingInput = {
  organization?: Partial<CorrenteOrganizationSettings> | null;
  roleCount?: number | null;
  permissionCount?: number | null;
  contributorCount?: number | null;
  contributorWithLoginCount?: number | null;
  contributionCount?: number | null;
  receiptCount?: number | null;
  approvedContributionCount?: number | null;
};

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasPositiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function buildCorrenteOnboardingSteps(input: CorrenteOnboardingInput): CorrenteOnboardingStep[] {
  const organization = input.organization ?? {};
  const hasOrganizationData =
    hasText(organization.name) &&
    hasText(organization.organization_type) &&
    (hasText(organization.contact_name) || hasText(organization.responsible_manager_name)) &&
    hasText(organization.contact_email ?? organization.email) &&
    hasText(organization.whatsapp);

  const steps: CorrenteOnboardingStep[] = [
    {
      key: "organizacao",
      title: "Completar dados da organização",
      description: "Confirme nome, tipo, contato responsável, e-mail, WhatsApp e endereço básico.",
      why: "Isso evita dúvida na comunicação e deixa claro quem responde pela configuração inicial.",
      href: "/solucoes/corrente-em-dia/cliente/cadastro",
      done: hasOrganizationData,
      required: true,
      sortOrder: 1,
    },
    {
      key: "pix",
      title: "Informar chave Pix",
      description: "Cadastre a chave Pix oficial e o nome do recebedor que aparecerá para os contribuintes.",
      why: "Quando a chave está clara, a pessoa contribui com segurança e a gestão reduz conferência manual.",
      href: "/solucoes/corrente-em-dia/cliente/cadastro",
      done: hasText(organization.pix_key) && hasText(organization.pix_receiver_name),
      required: true,
      sortOrder: 2,
    },
    {
      key: "valor_padrao",
      title: "Definir valor padrão",
      description: "Informe o valor individual padrão e, se necessário, crie outras formas de contribuição.",
      why: "Um valor padrão reduz perguntas repetidas e deixa a rotina mais previsível para a casa.",
      href: "/solucoes/corrente-em-dia/cliente/cadastro",
      done: hasPositiveNumber(organization.default_individual_amount),
      required: true,
      sortOrder: 3,
    },
    {
      key: "dia_contribuicao",
      title: "Definir dia de contribuição",
      description: "Escolha dia fixo, até um dia do mês ou contribuição em qualquer dia.",
      why: "Uma regra simples ajuda as pessoas a se organizarem sem cobrança constrangedora.",
      href: "/solucoes/corrente-em-dia/cliente/cadastro",
      done: organization.contribution_due_mode === "free_month" || Boolean(organization.contribution_due_day),
      required: true,
      sortOrder: 4,
    },
    {
      key: "funcoes",
      title: "Revisar funções e permissões",
      description: "Confira quem pode ver cadastro, editar contribuintes, enviar comprovantes e aprovar pagamentos.",
      why: "Cada pessoa vê apenas o necessário, o que traz mais segurança e evita alterações indevidas.",
      href: "/solucoes/corrente-em-dia/cliente/configuracoes",
      done: Number(input.roleCount ?? 0) > 0 && Number(input.permissionCount ?? 0) > 0,
      required: true,
      sortOrder: 5,
    },
    {
      key: "contribuintes",
      title: "Cadastrar ou importar contribuintes",
      description: "Inclua as pessoas, funções, valor de contribuição, dia combinado, e-mail e WhatsApp.",
      why: "A lista organizada tira a rotina dos grupos, planilhas soltas e memória da equipe.",
      href: "/solucoes/corrente-em-dia/cliente/contribuintes",
      done: Number(input.contributorCount ?? 0) > 0,
      required: true,
      sortOrder: 6,
    },
    {
      key: "acessos",
      title: "Criar acessos dos contribuintes",
      description: "Gere login quando necessário e envie as orientações por e-mail ou WhatsApp.",
      why: "Quando cada pessoa tem seu caminho claro, a gestão deixa de explicar tudo manualmente.",
      href: "/solucoes/corrente-em-dia/cliente/contribuintes",
      done: Number(input.contributorWithLoginCount ?? 0) > 0,
      required: false,
      sortOrder: 7,
    },
    {
      key: "teste_contribuicao",
      title: "Fazer uma contribuição de teste",
      description: "Abra a tela Contribuir, copie o Pix, registre um comprovante de teste e confira o status.",
      why: "Testar antes do uso real dá tranquilidade para orientar todos os envolvidos.",
      href: "/solucoes/corrente-em-dia/cliente/contribuir",
      done: Number(input.receiptCount ?? 0) > 0 || Number(input.contributionCount ?? 0) > 0,
      required: true,
      sortOrder: 8,
    },
    {
      key: "aprovacao_teste",
      title: "Aprovar um comprovante de teste",
      description: "Revise o comprovante, aprove, peça correção ou registre uma observação.",
      why: "A aprovação fecha o ciclo e mostra que a organização conseguirá acompanhar pendências sem constranger ninguém.",
      href: "/solucoes/corrente-em-dia/cliente/aprovacoes",
      done: Number(input.approvedContributionCount ?? 0) > 0,
      required: true,
      sortOrder: 9,
    },
  ];

  return steps.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function correnteOnboardingProgress(steps: CorrenteOnboardingStep[]) {
  const total = steps.length || 1;
  const completed = steps.filter((step) => step.done).length;
  return {
    total,
    completed,
    percentage: Math.round((completed / total) * 100),
    nextStep: steps.find((step) => !step.done) ?? null,
  };
}

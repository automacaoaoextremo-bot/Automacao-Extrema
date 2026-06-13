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

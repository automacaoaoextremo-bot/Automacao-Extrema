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

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

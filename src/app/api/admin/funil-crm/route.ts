import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type CrmSourceTable = "ced_leads" | "oh_leads" | "ae_leads";

type CrmStage =
  | "lead_recebido"
  | "acesso_enviado"
  | "em_configuracao"
  | "configuracao_concluida"
  | "treinamento_concluido"
  | "avaliacao_30_dias"
  | "followup_morno"
  | "lead_esfriando"
  | "cliente_ativo"
  | "nao_convertido";

type RawRow = Record<string, unknown>;

type CrmLead = {
  id: string;
  sourceTable: CrmSourceTable;
  solutionSlug: string;
  solutionName: string;
  moduleSlug: string | null;
  moduleName: string | null;
  contactName: string;
  organizationName: string | null;
  email: string | null;
  whatsapp: string | null;
  source: string | null;
  status: string;
  stage: CrmStage;
  createdAt: string;
  accessSentAt: string | null;
  configurationDueAt: string | null;
  configurationCompletedAt: string | null;
  trainingCompletedAt: string | null;
  evaluationStartsAt: string | null;
  evaluationEndsAt: string | null;
  nextReminderAt: string | null;
  founderAccepted: boolean;
  isOverdue: boolean;
  isDueSoon: boolean;
  notes: string | null;
};

type UpdateBody = {
  id?: string;
  sourceTable?: CrmSourceTable;
  stage?: CrmStage;
  status?: string;
};

type DeleteBody = {
  id?: string;
  sourceTable?: CrmSourceTable;
  hardDelete?: boolean;
};

const STAGE_STATUS_BY_TABLE: Record<CrmSourceTable, Partial<Record<CrmStage, string>>> = {
  ced_leads: {
    lead_recebido: "novo_whatsapp",
    acesso_enviado: "email_acesso_enviado",
    em_configuracao: "em_configuracao",
    configuracao_concluida: "em_configuracao",
    treinamento_concluido: "em_configuracao",
    avaliacao_30_dias: "avaliacao_30_dias",
    followup_morno: "followup_7d",
    lead_esfriando: "sem_resposta",
    cliente_ativo: "cliente_ativo",
    nao_convertido: "encerrado",
  },
  oh_leads: {
    lead_recebido: "interesse_recebido",
    acesso_enviado: "acesso_enviado",
    em_configuracao: "em_configuracao",
    configuracao_concluida: "configuracao_concluida",
    treinamento_concluido: "treinamento_concluido",
    avaliacao_30_dias: "avaliacao_30_dias",
    followup_morno: "followup_morno",
    lead_esfriando: "lead_esfriando",
    cliente_ativo: "cliente_ativo",
    nao_convertido: "nao_convertido",
  },
  ae_leads: {
    lead_recebido: "novo",
    followup_morno: "followup_morno",
    lead_esfriando: "lead_esfriando",
    cliente_ativo: "cliente_ativo",
    nao_convertido: "nao_convertido",
  },
};

const SOLUTION_LABELS: Record<string, string> = {
  "corrente-em-dia": "Corrente em Dia",
  "organizacao-em-harmonia": "Organização em Harmonia",
  "agenda-viva": "Agenda Viva",
  "atendimento-em-harmonia": "Atendimento em Harmonia",
  "diagnostico-ae": "Diagnóstico AE",
};

const MODULE_LABELS: Record<string, string> = {
  "organizacao-em-harmonia": "Organização em Harmonia",
  "agenda-viva": "Agenda Viva",
  "atendimento-em-harmonia": "Atendimento em Harmonia",
  "corrente-em-dia": "Corrente em Dia",
};

export async function GET(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const [cedResult, ohResult, aeResult] = await Promise.allSettled([
    supabaseAdmin.from("ced_leads").select("*").order("created_at", { ascending: false }).limit(200),
    supabaseAdmin.from("oh_leads").select("*").order("created_at", { ascending: false }).limit(200),
    supabaseAdmin
      .from("ae_leads")
      .select("id, full_name, whatsapp, email, main_area, main_pain, urgency, diagnostic_score, status, created_at, ae_solutions(name, slug)")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const warnings: string[] = [];
  const leads: CrmLead[] = [];

  if (cedResult.status === "fulfilled") {
    if (cedResult.value.error) warnings.push(`Corrente em Dia: ${cedResult.value.error.message}`);
    leads.push(...((cedResult.value.data ?? []) as RawRow[]).map(mapCorrenteLead));
  } else {
    warnings.push("Não foi possível consultar ced_leads.");
  }

  if (ohResult.status === "fulfilled") {
    if (ohResult.value.error) warnings.push(`Organização em Harmonia: ${ohResult.value.error.message}`);
    leads.push(...((ohResult.value.data ?? []) as RawRow[]).map(mapOrganizacaoLead));
  } else {
    warnings.push("Não foi possível consultar oh_leads.");
  }

  if (aeResult.status === "fulfilled") {
    if (aeResult.value.error) warnings.push(`Diagnóstico AE: ${aeResult.value.error.message}`);
    leads.push(...((aeResult.value.data ?? []) as RawRow[]).map(mapDiagnosticLead));
  } else {
    warnings.push("Não foi possível consultar ae_leads.");
  }

  const sorted = leads.sort(compareCrmLeads);
  return NextResponse.json({ leads: sorted, metrics: buildMetrics(sorted), warnings });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => ({}))) as UpdateBody;
  if (!body.id || !body.sourceTable || !body.stage) {
    return NextResponse.json({ error: "Informe id, sourceTable e stage." }, { status: 400 });
  }

  if (!isSupportedPatchTable(body.sourceTable)) {
    return NextResponse.json({ error: "Esta origem ainda não permite atualização pelo CRM." }, { status: 400 });
  }

  const status = STAGE_STATUS_BY_TABLE[body.sourceTable][body.stage] ?? body.status ?? body.stage;
  const payload = buildUpdatePayload(body.sourceTable, body.stage, status);

  const { data, error } = await supabaseAdmin
    .from(body.sourceTable)
    .update(payload)
    .eq("id", body.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const lead = body.sourceTable === "ced_leads" ? mapCorrenteLead(data as RawRow) : mapOrganizacaoLead(data as RawRow);
  return NextResponse.json({ lead });
}

export async function DELETE(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => ({}))) as DeleteBody;
  if (!body.id || !body.sourceTable) {
    return NextResponse.json({ error: "Informe id e sourceTable." }, { status: 400 });
  }

  if (body.sourceTable === "ae_leads") {
    return NextResponse.json({ error: "Leads gerais da AE devem ser tratados pela tela de Diagnóstico/Leads." }, { status: 400 });
  }

  if (body.hardDelete) {
    const { error } = await supabaseAdmin.from(body.sourceTable).delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, deleted: true });
  }

  const archivedStatus = body.sourceTable === "ced_leads" ? "encerrado" : "nao_convertido";
  const { data, error } = await supabaseAdmin
    .from(body.sourceTable)
    .update({ status: archivedStatus, updated_at: new Date().toISOString() })
    .eq("id", body.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const lead = body.sourceTable === "ced_leads" ? mapCorrenteLead(data as RawRow) : mapOrganizacaoLead(data as RawRow);
  return NextResponse.json({ ok: true, archived: true, lead });
}

function isSupportedPatchTable(value: CrmSourceTable): value is "ced_leads" | "oh_leads" {
  return value === "ced_leads" || value === "oh_leads";
}

function buildUpdatePayload(table: "ced_leads" | "oh_leads", stage: CrmStage, status: string) {
  const now = new Date();
  const payload: Record<string, string | null> = { status };

  if (table === "ced_leads") {
    if (stage === "acesso_enviado") payload.access_sent_at = now.toISOString();
    if (stage === "avaliacao_30_dias") {
      payload.trial_started_at = now.toISOString();
      payload.trial_ends_at = addDays(now, 30).toISOString();
    }
    return payload;
  }

  if (stage === "acesso_enviado") payload.email_sent_at = now.toISOString();
  if (stage === "configuracao_concluida") payload.implantation_completed_at = now.toISOString();
  if (stage === "treinamento_concluido") payload.training_completed_at = now.toISOString();
  if (stage === "avaliacao_30_dias") {
    payload.trial_starts_at = now.toISOString();
    payload.trial_ends_at = addDays(now, 30).toISOString();
  }

  return payload;
}

function mapCorrenteLead(row: RawRow): CrmLead {
  const status = stringValue(row.status) ?? "novo_whatsapp";
  const createdAt = stringValue(row.created_at) ?? new Date().toISOString();
  const accessSentAt = stringValue(row.access_sent_at);
  const configurationDueAt = stringValue(row.access_due_at);
  const stage = deriveCorrenteStage(status, row);

  return {
    id: stringValue(row.id) ?? "",
    sourceTable: "ced_leads",
    solutionSlug: "corrente-em-dia",
    solutionName: "Corrente em Dia",
    moduleSlug: "corrente-em-dia",
    moduleName: "Corrente em Dia",
    contactName: stringValue(row.responsible_name) ?? stringValue(row.organization_name) ?? "Lead Corrente em Dia",
    organizationName: stringValue(row.organization_name),
    email: stringValue(row.email),
    whatsapp: stringValue(row.whatsapp),
    source: stringValue(row.source),
    status,
    stage,
    createdAt,
    accessSentAt,
    configurationDueAt,
    configurationCompletedAt: null,
    trainingCompletedAt: null,
    evaluationStartsAt: stringValue(row.trial_started_at),
    evaluationEndsAt: stringValue(row.trial_ends_at),
    nextReminderAt: stringValue(row.internal_alert_at),
    founderAccepted: booleanValue(row.founder_terms_accepted),
    isOverdue: isPast(configurationDueAt) && !accessSentAt,
    isDueSoon: isDueSoon(configurationDueAt) && !accessSentAt,
    notes: stringValue(row.observations) ?? stringValue(row.notes),
  };
}

function mapOrganizacaoLead(row: RawRow): CrmLead {
  const status = stringValue(row.status) ?? "interesse_recebido";
  const createdAt = stringValue(row.created_at) ?? new Date().toISOString();
  const moduleSlug = stringValue(row.priority_module) ?? stringValue(row.interest_module) ?? "agenda-viva";
  const emailSentAt = stringValue(row.email_sent_at);
  const configurationDueAt = stringValue(row.implantation_due_at);
  const stage = deriveOrganizacaoStage(status, row);

  return {
    id: stringValue(row.id) ?? "",
    sourceTable: "oh_leads",
    solutionSlug: "organizacao-em-harmonia",
    solutionName: "Organização em Harmonia",
    moduleSlug,
    moduleName: MODULE_LABELS[moduleSlug] ?? moduleSlug,
    contactName: stringValue(row.contact_name) ?? stringValue(row.organization_name) ?? "Lead Organização em Harmonia",
    organizationName: stringValue(row.organization_name),
    email: stringValue(row.email),
    whatsapp: stringValue(row.whatsapp),
    source: stringValue(row.source),
    status,
    stage,
    createdAt,
    accessSentAt: emailSentAt,
    configurationDueAt,
    configurationCompletedAt: stringValue(row.implantation_completed_at),
    trainingCompletedAt: stringValue(row.training_completed_at),
    evaluationStartsAt: stringValue(row.trial_starts_at),
    evaluationEndsAt: stringValue(row.trial_ends_at),
    nextReminderAt: stringValue(row.next_reminder_at),
    founderAccepted: booleanValue(row.founder_terms_accepted),
    isOverdue: isPast(configurationDueAt) && !stringValue(row.implantation_completed_at),
    isDueSoon: isDueSoon(configurationDueAt) && !stringValue(row.implantation_completed_at),
    notes: stringValue(row.observations),
  };
}

function mapDiagnosticLead(row: RawRow): CrmLead {
  const solution = nestedRecord(row.ae_solutions);
  const solutionSlug = stringValue(solution?.slug) ?? "diagnostico-ae";
  const solutionName = stringValue(solution?.name) ?? SOLUTION_LABELS[solutionSlug] ?? "Diagnóstico AE";
  const createdAt = stringValue(row.created_at) ?? new Date().toISOString();

  return {
    id: stringValue(row.id) ?? "",
    sourceTable: "ae_leads",
    solutionSlug,
    solutionName,
    moduleSlug: null,
    moduleName: null,
    contactName: stringValue(row.full_name) ?? "Lead sem nome",
    organizationName: stringValue(row.main_area),
    email: stringValue(row.email),
    whatsapp: stringValue(row.whatsapp),
    source: "diagnostico_ae",
    status: stringValue(row.status) ?? "novo",
    stage: "lead_recebido",
    createdAt,
    accessSentAt: null,
    configurationDueAt: null,
    configurationCompletedAt: null,
    trainingCompletedAt: null,
    evaluationStartsAt: null,
    evaluationEndsAt: null,
    nextReminderAt: null,
    founderAccepted: false,
    isOverdue: false,
    isDueSoon: false,
    notes: [stringValue(row.main_pain), stringValue(row.urgency)].filter(Boolean).join(" · ") || null,
  };
}

function deriveCorrenteStage(status: string, row: RawRow): CrmStage {
  if (status === "cliente_ativo") return "cliente_ativo";
  if (status === "encerrado") return "nao_convertido";
  if (status === "sem_resposta" || status === "followup_25d") return "lead_esfriando";
  if (status === "followup_7d" || status === "followup_15d") return "followup_morno";
  if (status === "avaliacao_30_dias" || stringValue(row.trial_started_at)) return "avaliacao_30_dias";
  if (status === "em_configuracao") return "em_configuracao";
  if (status === "email_acesso_enviado" || status === "aguardando_primeiro_acesso" || stringValue(row.access_sent_at)) return "acesso_enviado";
  return "lead_recebido";
}

function deriveOrganizacaoStage(status: string, row: RawRow): CrmStage {
  if (status === "cliente_ativo") return "cliente_ativo";
  if (status === "nao_convertido" || status === "encerrado") return "nao_convertido";
  if (status === "lead_esfriando") return "lead_esfriando";
  if (status === "followup_morno") return "followup_morno";
  if (status === "avaliacao_30_dias" || stringValue(row.trial_starts_at)) return "avaliacao_30_dias";
  if (status === "treinamento_concluido" || stringValue(row.training_completed_at)) return "treinamento_concluido";
  if (status === "configuracao_concluida" || stringValue(row.implantation_completed_at)) return "configuracao_concluida";
  if (status === "em_configuracao") return "em_configuracao";
  if (status === "acesso_enviado" || stringValue(row.email_sent_at)) return "acesso_enviado";
  return "lead_recebido";
}

function compareCrmLeads(a: CrmLead, b: CrmLead) {
  if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
  if (a.isDueSoon !== b.isDueSoon) return a.isDueSoon ? -1 : 1;
  const aNext = dateTime(a.nextReminderAt ?? a.configurationDueAt ?? a.createdAt);
  const bNext = dateTime(b.nextReminderAt ?? b.configurationDueAt ?? b.createdAt);
  return aNext - bNext;
}

function buildMetrics(leads: CrmLead[]) {
  return {
    total: leads.length,
    overdue: leads.filter((lead) => lead.isOverdue).length,
    dueSoon: leads.filter((lead) => lead.isDueSoon).length,
    founder: leads.filter((lead) => lead.founderAccepted).length,
    bySolution: leads.reduce<Record<string, number>>((acc, lead) => {
      acc[lead.solutionSlug] = (acc[lead.solutionSlug] ?? 0) + 1;
      return acc;
    }, {}),
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

function nestedRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function isPast(value: string | null) {
  if (!value) return false;
  return dateTime(value) < Date.now();
}

function isDueSoon(value: string | null) {
  if (!value) return false;
  const time = dateTime(value);
  const now = Date.now();
  return time >= now && time <= now + 72 * 60 * 60 * 1000;
}

function dateTime(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : Date.now();
}

function addDays(value: Date, days: number) {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
}

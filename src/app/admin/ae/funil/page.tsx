"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPageShell } from "@/components/admin-page-shell";
import { adminFetch } from "@/lib/admin-fetch";

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

type CrmPayload = {
  leads: CrmLead[];
  warnings?: string[];
  metrics?: {
    total: number;
    overdue: number;
    dueSoon: number;
    founder: number;
    bySolution: Record<string, number>;
  };
};

const SOLUTION_OPTIONS = [
  { value: "todas", label: "Todas" },
  { value: "organizacao-em-harmonia", label: "Organização em Harmonia" },
  { value: "agenda-viva", label: "Agenda Viva" },
  { value: "atendimento-em-harmonia", label: "Atendimento em Harmonia" },
  { value: "corrente-em-dia", label: "Corrente em Dia" },
  { value: "diagnostico-ae", label: "Diagnóstico AE" },
] as const;

const STAGE_OPTIONS: Array<{ value: "todos" | CrmStage | "atrasados" | "vence_em_breve"; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "atrasados", label: "Atrasados" },
  { value: "vence_em_breve", label: "Vencendo" },
  { value: "lead_recebido", label: "Lead recebido" },
  { value: "acesso_enviado", label: "Acesso enviado" },
  { value: "em_configuracao", label: "Em configuração" },
  { value: "configuracao_concluida", label: "Configuração concluída" },
  { value: "treinamento_concluido", label: "Treinamento concluído" },
  { value: "avaliacao_30_dias", label: "Avaliação 30 dias" },
  { value: "followup_morno", label: "Follow-up morno" },
  { value: "lead_esfriando", label: "Lead esfriando" },
  { value: "cliente_ativo", label: "Cliente ativo" },
  { value: "nao_convertido", label: "Não convertido" },
];

const STAGE_LABELS: Record<CrmStage, string> = {
  lead_recebido: "Lead recebido",
  acesso_enviado: "Acesso enviado",
  em_configuracao: "Em configuração",
  configuracao_concluida: "Configuração concluída",
  treinamento_concluido: "Treinamento concluído",
  avaliacao_30_dias: "Avaliação 30 dias",
  followup_morno: "Follow-up morno",
  lead_esfriando: "Lead esfriando",
  cliente_ativo: "Cliente ativo",
  nao_convertido: "Não convertido",
};

const STAGE_HELP: Record<CrmStage, string> = {
  lead_recebido: "Entrada recebida pelo site, WhatsApp ou diagnóstico.",
  acesso_enviado: "Acesso inicial enviado por e-mail/WhatsApp.",
  em_configuracao: "Cliente iniciou ou deve iniciar a configuração assistida.",
  configuracao_concluida: "Dados mínimos configurados para operar com segurança.",
  treinamento_concluido: "Envolvidos principais treinados para uso inicial.",
  avaliacao_30_dias: "Avaliação de Cliente Fundador em andamento.",
  followup_morno: "Lead demonstrou interesse, mas precisa de acompanhamento leve.",
  lead_esfriando: "Lead sem evolução recente; retomar sem pressão.",
  cliente_ativo: "Cliente convertido ou em uso ativo.",
  nao_convertido: "Lead encerrado, perdido ou sem continuidade no momento.",
};

function initialSolutionFilter() {
  if (typeof window === "undefined") return "todas";
  const params = new URLSearchParams(window.location.search);
  return params.get("solution") ?? params.get("solucao") ?? "todas";
}

export default function FunilCrmPage() {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [solutionFilter, setSolutionFilter] = useState(initialSolutionFilter);
  const [stageFilter, setStageFilter] = useState<(typeof STAGE_OPTIONS)[number]["value"]>("todos");
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    adminFetch<CrmPayload>("/api/admin/funil-crm")
      .then((payload) => {
        setLeads(payload.leads ?? []);
        setWarnings(payload.warnings ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar Funil / CRM."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    let active = true;

    adminFetch<CrmPayload>("/api/admin/funil-crm")
      .then((payload) => {
        if (!active) return;
        setLeads(payload.leads ?? []);
        setWarnings(payload.warnings ?? []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar Funil / CRM.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

  

  return () => {
      active = false;
    };
  }, []);

  const availableSolutions = useMemo(() => {
    const values = new Set(leads.flatMap((lead) => [lead.solutionSlug, lead.moduleSlug].filter(Boolean) as string[]));
    return SOLUTION_OPTIONS.filter((option) => option.value === "todas" || values.has(option.value));
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSolution =
        solutionFilter === "todas" || lead.solutionSlug === solutionFilter || lead.moduleSlug === solutionFilter;
      const matchesStage =
        stageFilter === "todos" ||
        (stageFilter === "atrasados" && lead.isOverdue) ||
        (stageFilter === "vence_em_breve" && lead.isDueSoon) ||
        lead.stage === stageFilter;
      return matchesSolution && matchesStage;
    });
  }, [leads, solutionFilter, stageFilter]);

  const metrics = useMemo(() => {
    return {
      total: filteredLeads.length,
      overdue: filteredLeads.filter((lead) => lead.isOverdue).length,
      dueSoon: filteredLeads.filter((lead) => lead.isDueSoon).length,
      founder: filteredLeads.filter((lead) => lead.founderAccepted).length,
      configuration: filteredLeads.filter((lead) => lead.stage === "em_configuracao").length,
    };
  }, [filteredLeads]);

  async function updateLead(lead: CrmLead, stage: CrmStage) {
    setUpdatingId(lead.id);
    setError("");
    try {
      const result = await adminFetch<{ lead: CrmLead }>("/api/admin/funil-crm", {
        method: "PATCH",
        body: JSON.stringify({ id: lead.id, sourceTable: lead.sourceTable, stage }),
      });
      setLeads((current) => current.map((item) => (item.id === lead.id && item.sourceTable === lead.sourceTable ? result.lead : item)));
      setSelectedLead((current) => (current?.id === lead.id && current.sourceTable === lead.sourceTable ? result.lead : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar lead.");
    } finally {
      setUpdatingId(null);
    }
  }


  async function removeLead(lead: CrmLead, hardDelete = false) {
    const actionText = hardDelete ? "excluir definitivamente" : "arquivar/descartar";
    if (!window.confirm(`Confirma ${actionText} o lead ${lead.contactName}?`)) return;
    setDeletingId(lead.id);
    setError("");
    try {
      await adminFetch<{ ok: boolean; lead?: CrmLead }>("/api/admin/funil-crm", {
        method: "DELETE",
        body: JSON.stringify({ id: lead.id, sourceTable: lead.sourceTable, hardDelete }),
      });
      setSelectedLead((current) => (current?.id === lead.id && current.sourceTable === lead.sourceTable ? null : current));
      if (hardDelete) {
        setLeads((current) => current.filter((item) => !(item.id === lead.id && item.sourceTable === lead.sourceTable)));
      } else {
        load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover lead.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AdminPageShell
      title="Funil / CRM"
      description="CRM unificado das soluções da Automação Extrema: Corrente em Dia, Organização em Harmonia, Agenda Viva, Atendimento em Harmonia e diagnósticos gerais."
      actions={
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:border-[#00A8CC] disabled:opacity-60"
        >
          Atualizar
        </button>
      }
    >
      {error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
      {warnings.length > 0 && (
        <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-bold">Avisos de integração</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-5">
        <Metric label="Leads" value={metrics.total} />
        <Metric label="Atrasados" value={metrics.overdue} tone="danger" />
        <Metric label="Vencendo" value={metrics.dueSoon} tone="warning" />
        <Metric label="Em configuração" value={metrics.configuration} />
        <Metric label="Cliente Fundador" value={metrics.founder} tone="success" />
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div>
            <label className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Solução / módulo</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {availableSolutions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSolutionFilter(option.value)}
                  className={`rounded-full px-4 py-2 text-sm font-black ${
                    solutionFilter === option.value ? "bg-[#00334E] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Etapa</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {STAGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStageFilter(option.value)}
                  className={`rounded-full px-4 py-2 text-sm font-black ${
                    stageFilter === option.value ? "bg-[#31C16B] text-[#00334E]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {loading && <div className="rounded-2xl bg-white p-5 text-sm text-slate-600 shadow">Carregando leads...</div>}
      {!loading && filteredLeads.length === 0 && (
        <div className="rounded-2xl bg-white p-5 text-sm text-slate-600 shadow">
          Nenhum lead encontrado para os filtros selecionados.
        </div>
      )}

      <section className="space-y-4">
        {filteredLeads.map((lead) => (
          <LeadCard
            key={`${lead.sourceTable}-${lead.id}`}
            lead={lead}
            updating={updatingId === lead.id}
            onSelect={() => setSelectedLead(lead)}
            onUpdate={(stage) => updateLead(lead, stage)}
            onRemove={(hardDelete) => removeLead(lead, hardDelete)}
            deleting={deletingId === lead.id}
          />
        ))}
      </section>

      {selectedLead && (
        <LeadDetailsModal
          lead={selectedLead}
          updating={updatingId === selectedLead.id}
          onClose={() => setSelectedLead(null)}
          onUpdate={(stage) => updateLead(selectedLead, stage)}
        />
      )}
    </AdminPageShell>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "danger" | "warning" | "success" }) {
  const valueClass = {
    default: "text-[#00334E]",
    danger: "text-red-700",
    warning: "text-amber-700",
    success: "text-[#2F6B43]",
  }[tone];

  return (
    <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-black ${valueClass}`}>{value}</p>
    </article>
  );
}

function LeadCard({
  lead,
  updating,
  onSelect,
  onUpdate,
  onRemove,
  deleting,
}: {
  lead: CrmLead;
  updating: boolean;
  onSelect: () => void;
  onUpdate: (stage: CrmStage) => void;
  onRemove: (hardDelete: boolean) => void;
  deleting: boolean;
}) {
  const mornoMessage = buildFollowupMessage(lead, "followup_morno");
  const esfriandoMessage = buildFollowupMessage(lead, "lead_esfriando");

  return (
    <article className={`rounded-3xl bg-white p-5 shadow-sm ring-1 ${lead.isOverdue ? "ring-red-300" : lead.isDueSoon ? "ring-amber-300" : "ring-slate-200"}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge>{lead.solutionName}</Badge>
            {lead.moduleName && <Badge tone="blue">{lead.moduleName}</Badge>}
            <Badge tone={lead.isOverdue ? "red" : lead.isDueSoon ? "amber" : "slate"}>{lead.isOverdue ? "Atrasado" : lead.isDueSoon ? "Vencendo" : STAGE_LABELS[lead.stage]}</Badge>
            {lead.founderAccepted && <Badge tone="green">Cliente Fundador</Badge>}
          </div>
          <h2 className="mt-3 break-words text-2xl font-black text-[#00334E]">{lead.organizationName || lead.contactName}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Contato: <strong>{lead.contactName}</strong> · WhatsApp: {lead.whatsapp || "não informado"} · E-mail: {lead.email || "não informado"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Origem: {lead.source || lead.sourceTable} · Recebido: {formatDate(lead.createdAt)} · Etapa: {STAGE_LABELS[lead.stage]}
          </p>
          {lead.notes && <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">{lead.notes}</p>}
        </div>

        <div className="grid gap-2 text-sm lg:min-w-80">
          <InfoLine label="Acesso" value={formatDate(lead.accessSentAt)} />
          <InfoLine label="Configuração até" value={formatDate(lead.configurationDueAt)} highlight={lead.isOverdue ? "red" : lead.isDueSoon ? "amber" : undefined} />
          <InfoLine label="Avaliação" value={formatDateRange(lead.evaluationStartsAt, lead.evaluationEndsAt)} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <ActionButton disabled={updating || lead.sourceTable === "ae_leads"} onClick={() => onUpdate("acesso_enviado")}>
          Marcar acesso enviado
        </ActionButton>
        <ActionButton disabled={updating || lead.sourceTable === "ae_leads"} onClick={() => onUpdate("em_configuracao")} variant="secondary">
          Em configuração
        </ActionButton>
        <ActionButton disabled={updating || lead.sourceTable === "ae_leads"} onClick={() => onUpdate("configuracao_concluida")} variant="secondary">
          Configuração concluída
        </ActionButton>
        <ActionButton disabled={updating || lead.sourceTable === "ae_leads"} onClick={() => onUpdate("treinamento_concluido")} variant="secondary">
          Treinamento concluído
        </ActionButton>
        <ActionButton disabled={updating || lead.sourceTable === "ae_leads"} onClick={() => onUpdate("avaliacao_30_dias")} variant="secondary">
          Avaliação 30 dias
        </ActionButton>
        <WhatsAppAction lead={lead} message={mornoMessage} label="Follow-up morno" />
        <WhatsAppAction lead={lead} message={esfriandoMessage} label="Lead esfriando" />
        <button type="button" onClick={onSelect} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-black text-[#00334E]">
          Ver detalhes
        </button>
        <button type="button" onClick={() => onRemove(false)} disabled={deleting || lead.sourceTable === "ae_leads"} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800 disabled:opacity-60">
          Arquivar
        </button>
        <button type="button" onClick={() => onRemove(true)} disabled={deleting || lead.sourceTable === "ae_leads"} className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 disabled:opacity-60">
          Excluir
        </button>
      </div>
    </article>
  );
}

function LeadDetailsModal({
  lead,
  updating,
  onClose,
  onUpdate,
}: {
  lead: CrmLead;
  updating: boolean;
  onClose: () => void;
  onUpdate: (stage: CrmStage) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/60 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <section className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:mx-auto sm:max-w-4xl sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <button type="button" onClick={onClose} className="text-sm font-bold text-[#00A8CC]">← Voltar</button>
            <h2 className="mt-3 text-2xl font-black text-[#00334E]">{lead.organizationName || lead.contactName}</h2>
            <p className="mt-1 text-sm text-slate-600">{lead.solutionName} {lead.moduleName ? `· ${lead.moduleName}` : ""}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">Fechar</button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Detail label="Contato" value={lead.contactName} />
          <Detail label="E-mail" value={lead.email || "não informado"} />
          <Detail label="WhatsApp" value={lead.whatsapp || "não informado"} />
          <Detail label="Etapa" value={STAGE_LABELS[lead.stage]} />
          <Detail label="Status técnico" value={lead.status} />
          <Detail label="Recebido" value={formatDate(lead.createdAt)} />
          <Detail label="Acesso enviado" value={formatDate(lead.accessSentAt)} />
          <Detail label="Prazo de configuração" value={formatDate(lead.configurationDueAt)} />
          <Detail label="Configuração concluída" value={formatDate(lead.configurationCompletedAt)} />
          <Detail label="Treinamento concluído" value={formatDate(lead.trainingCompletedAt)} />
          <Detail label="Avaliação" value={formatDateRange(lead.evaluationStartsAt, lead.evaluationEndsAt)} />
          <Detail label="Próximo lembrete" value={formatDate(lead.nextReminderAt)} />
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          <p className="font-black text-[#00334E]">Orientação da etapa atual</p>
          <p className="mt-1">{STAGE_HELP[lead.stage]}</p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {(["acesso_enviado", "em_configuracao", "configuracao_concluida", "treinamento_concluido", "avaliacao_30_dias", "cliente_ativo", "nao_convertido"] as CrmStage[]).map((stage) => (
            <ActionButton key={stage} disabled={updating || lead.sourceTable === "ae_leads"} onClick={() => onUpdate(stage)} variant={stage === "acesso_enviado" ? "primary" : "secondary"}>
              {STAGE_LABELS[stage]}
            </ActionButton>
          ))}
        </div>
      </section>
    </div>
  );
}

function Badge({ children, tone = "green" }: { children: React.ReactNode; tone?: "green" | "blue" | "red" | "amber" | "slate" }) {
  const classes = {
    green: "bg-emerald-50 text-emerald-900",
    blue: "bg-sky-50 text-sky-900",
    red: "bg-red-50 text-red-800",
    amber: "bg-amber-50 text-amber-800",
    slate: "bg-slate-100 text-slate-700",
  }[tone];

  return <span className={`rounded-full px-3 py-1 text-xs font-black ${classes}`}>{children}</span>;
}

function InfoLine({ label, value, highlight }: { label: string; value: string; highlight?: "red" | "amber" }) {
  const className = highlight === "red" ? "bg-red-50 text-red-800" : highlight === "amber" ? "bg-amber-50 text-amber-800" : "bg-slate-50 text-slate-700";
  return (
    <p className={`rounded-2xl p-3 ${className}`}>
      <strong>{label}:</strong> {value}
    </p>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

function ActionButton({
  children,
  disabled,
  onClick,
  variant = "primary",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50 ${
        variant === "primary" ? "bg-[#31C16B] text-[#00334E]" : "bg-slate-100 text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function WhatsAppAction({ lead, message, label }: { lead: CrmLead; message: string; label: string }) {
  const link = buildWhatsAppLink(lead.whatsapp, message);
  if (!link) return null;
  return (
    <a href={link} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-black text-[#00334E]">
      {label}
    </a>
  );
}

function buildFollowupMessage(lead: CrmLead, kind: "followup_morno" | "lead_esfriando") {
  const name = lead.contactName || "tudo bem";
  const organization = lead.organizationName || "sua organização";

  if (lead.solutionSlug === "corrente-em-dia") {
    if (kind === "followup_morno") {
      return `Oi, ${name}. Passando para confirmar se você conseguiu acessar o painel do Corrente em Dia. A primeira configuração é simples e já ajuda a visualizar como ${organization} pode organizar contribuições, comprovantes e pendências com mais clareza. Quer que eu te acompanhe nesse primeiro acesso?`;
    }
    return `Oi, ${name}. Sei que a rotina da casa é corrida. Deixo um lembrete respeitoso: a fase de Cliente Fundador é para validar o Corrente em Dia com acompanhamento próximo, reduzindo conferência manual e insegurança sobre comprovantes. Quer que eu mantenha ${organization} nessa fase ou prefere que eu retome em outro momento?`;
  }

  if (kind === "followup_morno") {
    return `Oi, ${name}. Passando para confirmar se você conseguiu acessar a Organização em Harmonia. O próximo passo é completar a configuração inicial, priorizando ${lead.moduleName || "o módulo escolhido"}, para reduzir retrabalho e deixar pessoas, funções, permissões e agenda mais claros. Quer que eu te acompanhe nesse primeiro ajuste?`;
  }

  return `Oi, ${name}. Sei que a rotina da organização é corrida. A ideia da Organização em Harmonia não é criar mais uma tarefa, mas tirar decisões, agenda e responsabilidades da memória e das conversas soltas. Quer que eu mantenha ${organization} na validação como Cliente Fundador ou prefere que eu retome em outro momento?`;
}

function buildWhatsAppLink(whatsapp: string | null, message: string) {
  const digits = whatsapp?.replace(/\D/g, "") ?? "";
  if (!digits) return "";
  const phone = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return "-";
  if (start && end) return `${formatDate(start)} até ${formatDate(end)}`;
  return formatDate(start ?? end);
}

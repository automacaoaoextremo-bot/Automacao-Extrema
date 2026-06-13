"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminGuard } from "@/components/admin-guard";
import { AdminPageShell } from "@/components/admin-page-shell";
import { CORRENTE_EM_DIA_FUNIL_COPIES } from "@/lib/followups";
import { CORRENTE_LEAD_STATUS_LABELS, CorrenteLead, CorrenteLeadStatus, formatCorrenteOrganizationType } from "@/lib/corrente-em-dia";
import { adminFetch } from "@/lib/admin-fetch";

type FunnelLead = CorrenteLead & {
  is_access_overdue?: boolean;
  needs_internal_alert?: boolean;
};

type FunnelResponse = {
  leads: FunnelLead[];
};

const templates = [
  {
    key: "primeiro_contato",
    title: "Resposta imediata / pós-webhook",
    context: "Use quando o lead chegar por WhatsApp ou formulário e precisar confirmar que o acesso foi preparado.",
    message: CORRENTE_EM_DIA_FUNIL_COPIES.primeiro_contato,
  },
  {
    key: "lead_morno",
    title: "Lead morno",
    context: "Use quando a conversa começou, mas o responsável ainda não acessou ou não configurou a organização.",
    message: CORRENTE_EM_DIA_FUNIL_COPIES.lead_morno,
  },
  {
    key: "lead_esfriando",
    title: "Lead esfriando",
    context: "Use quando o lead não respondeu ou não iniciou a configuração após alguns dias.",
    message: CORRENTE_EM_DIA_FUNIL_COPIES.lead_esfriando,
  },
  {
    key: "cliente_fundador_curto",
    title: "Microcopy Cliente Fundador",
    context: "Use como reforço curto no WhatsApp, e-mail ou proposta.",
    message: CORRENTE_EM_DIA_FUNIL_COPIES.cliente_fundador_curto,
  },
];

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function leadAge(value: string) {
  const hours = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / (1000 * 60 * 60)));
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function buildWhatsAppLink(whatsapp: string | null, message: string) {
  const digits = whatsapp?.replace(/\D/g, "") ?? "";
  if (!digits) return "";
  const phone = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function fillTemplate(template: string, lead: FunnelLead) {
  return template
    .replaceAll("[nome]", lead.responsible_name || "tudo bem")
    .replaceAll("[nome_organizacao]", lead.organization_name || "sua organização");
}

export default function CorrenteEmDiaFunilPage() {
  const [leads, setLeads] = useState<FunnelLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    adminFetch<FunnelResponse>("/api/admin/corrente-em-dia/funil")
      .then((data) => setLeads(data.leads ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar funil."))
      .finally(() => setLoading(false));
  }, []);

  const metrics = useMemo(() => {
    return {
      total: leads.length,
      pendingAccess: leads.filter((lead) => !lead.access_sent_at).length,
      overdue: leads.filter((lead) => lead.is_access_overdue).length,
      founderAccepted: leads.filter((lead) => lead.founder_terms_accepted).length,
    };
  }, [leads]);

  async function copyTemplate(key: string, message: string) {
    await navigator.clipboard.writeText(message);
    setCopiedKey(key);
  }

  async function updateLead(id: string, status: CorrenteLeadStatus, accessSent = false) {
    setUpdatingId(id);
    try {
      const result = await adminFetch<{ lead: FunnelLead }>("/api/admin/corrente-em-dia/funil", {
        method: "PATCH",
        body: JSON.stringify({ id, status, accessSent }),
      });
      setLeads((current) => current.map((item) => (item.id === id ? result.lead : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar lead.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <AdminGuard>
      <AdminPageShell
        title="Funil Corrente em Dia"
        description="Gestão dos leads do Corrente em Dia: entrada por WhatsApp/formulário, acesso inicial, avaliação de 30 dias, follow-ups e Cliente Fundador."
      >
        <section className="grid gap-4 md:grid-cols-4">
          <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Leads</p>
            <p className="mt-2 text-3xl font-black text-[#00334E]">{metrics.total}</p>
          </article>
          <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Acesso pendente</p>
            <p className="mt-2 text-3xl font-black text-[#00334E]">{metrics.pendingAccess}</p>
          </article>
          <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Atrasados</p>
            <p className="mt-2 text-3xl font-black text-red-700">{metrics.overdue}</p>
          </article>
          <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Cliente Fundador</p>
            <p className="mt-2 text-3xl font-black text-[#2F6B43]">{metrics.founderAccepted}</p>
          </article>
        </section>

        {error && <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}
        {loading && <p className="rounded-2xl bg-white p-4 text-sm text-slate-600">Carregando funil...</p>}

        <section className="space-y-4">
          {leads.map((lead) => {
            const mornoMessage = fillTemplate(CORRENTE_EM_DIA_FUNIL_COPIES.lead_morno, lead);
            const esfriandoMessage = fillTemplate(CORRENTE_EM_DIA_FUNIL_COPIES.lead_esfriando, lead);
            const waMorno = buildWhatsAppLink(lead.whatsapp, mornoMessage);
            const waEsfriando = buildWhatsAppLink(lead.whatsapp, esfriandoMessage);
            return (
              <article key={lead.id} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-900">{formatCorrenteOrganizationType(lead.organization_type)}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{CORRENTE_LEAD_STATUS_LABELS[lead.status] ?? lead.status}</span>
                      {lead.is_access_overdue && <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">Acesso atrasado</span>}
                      {lead.needs_internal_alert && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">Alerta 12h</span>}
                    </div>
                    <h2 className="mt-3 text-2xl font-black text-[#00334E]">{lead.organization_name}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Responsável: <strong>{lead.responsible_name}</strong> · {lead.city}/{lead.state} · {lead.contributors_estimate ?? "?"} contribuintes estimados
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      WhatsApp: {lead.whatsapp || "não informado"} · E-mail: {lead.email || "não informado"} · Origem: {lead.source}
                    </p>
                    {lead.observations && <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">{lead.observations}</p>}
                  </div>

                  <div className="grid gap-2 text-sm lg:min-w-72">
                    <p className="rounded-2xl bg-slate-50 p-3"><strong>Recebido:</strong> {formatDate(lead.created_at)} ({leadAge(lead.created_at)})</p>
                    <p className="rounded-2xl bg-slate-50 p-3"><strong>Acesso:</strong> {lead.access_sent_at ? formatDate(lead.access_sent_at) : "pendente"}</p>
                    <p className="rounded-2xl bg-slate-50 p-3"><strong>Avaliação:</strong> até {formatDate(lead.trial_ends_at)}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateLead(lead.id, "email_acesso_enviado", true)}
                    disabled={updatingId === lead.id}
                    className="rounded-2xl bg-[#31C16B] px-4 py-3 text-sm font-black text-[#00334E] disabled:opacity-60"
                  >
                    Marcar acesso enviado
                  </button>
                  <button
                    type="button"
                    onClick={() => updateLead(lead.id, "em_configuracao")}
                    disabled={updatingId === lead.id}
                    className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 disabled:opacity-60"
                  >
                    Em configuração
                  </button>
                  <button
                    type="button"
                    onClick={() => updateLead(lead.id, "avaliacao_30_dias")}
                    disabled={updatingId === lead.id}
                    className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 disabled:opacity-60"
                  >
                    Avaliação 30 dias
                  </button>
                  {waMorno && <a href={waMorno} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-black text-[#00334E]">Follow-up morno</a>}
                  {waEsfriando && <a href={waEsfriando} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-black text-[#00334E]">Lead esfriando</a>}
                </div>
              </article>
            );
          })}
          {!loading && leads.length === 0 && <p className="rounded-2xl bg-white p-4 text-sm text-slate-600">Nenhum lead do Corrente em Dia cadastrado ainda.</p>}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <article key={template.key} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43]">{template.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{template.context}</p>
              <div className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-800">
                {template.message}
              </div>
              <button
                type="button"
                onClick={() => copyTemplate(template.key, template.message)}
                className="mt-4 rounded-2xl bg-[#31C16B] px-4 py-3 text-sm font-black text-[#00334E] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#43db7c]"
              >
                {copiedKey === template.key ? "Copiado" : "Copiar texto"}
              </button>
            </article>
          ))}
        </section>
      </AdminPageShell>
    </AdminGuard>
  );
}

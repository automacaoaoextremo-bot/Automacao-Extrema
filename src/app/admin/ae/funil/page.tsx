"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { buildFollowupMessage, FOLLOWUP_LABELS, FollowupKind } from "@/lib/followups";

type Followup = {
  id: string;
  kind: FollowupKind;
  channel: string;
  status: string;
  scheduled_at: string;
  lead_id: string;
  ae_leads?: {
    full_name: string | null;
    whatsapp: string | null;
    email: string | null;
    diagnostic_score: number;
    ae_solutions?: { name: string } | null;
  } | null;
};

type ReportsPayload = {
  leads: unknown[];
  matches: unknown[];
  followups: Followup[];
};

type GroupedLead = {
  leadId: string;
  leadName: string;
  leadWhatsapp: string;
  leadEmail: string;
  diagnosticScore: number;
  solutionName: string | null;
  followups: Followup[];
  hasOverdue: boolean;
  hasDueSoon: boolean;
  nextAt: number;
  nextFollowup: Followup | null;
};

export default function FunilPage() {
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [filter, setFilter] = useState("pendente");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const result = await adminFetch<ReportsPayload>("/api/admin/reports");
      setFollowups(result.followups);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar funil.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const visible = useMemo(() => {
    if (filter === "todos") return followups;
    if (filter === "atrasado") return followups.filter((item) => isOverdue(item));
    return followups.filter((item) => item.status === filter);
  }, [filter, followups]);

  const grouped = useMemo(() => groupFollowupsByLead(visible), [visible]);
  const selectedGroup = grouped.find((group) => group.leadId === selectedLeadId) ?? null;

  async function mark(followup: Followup, status: string) {
    await adminFetch(`/api/admin/followups/${followup.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await load();
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 pb-28 sm:p-6">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/admin/ae" className="text-sm font-bold text-[#00A8CC]">
              ← Voltar para Gestão
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-[#00334E]">Funil de aquisição</h1>
            <p className="text-slate-600">
              Leads em ordem de prioridade: primeiro os atrasados, depois os próximos follow-ups a vencer.
            </p>
          </div>
        </div>

        {error && <div className="rounded-2xl bg-red-50 p-4 text-red-700">{error}</div>}

        <div className="flex flex-wrap gap-2">
          {[
            ["pendente", "pendentes"],
            ["atrasado", "atrasados"],
            ["enviado", "enviados"],
            ["todos", "todos"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => {
                setFilter(value);
                setSelectedLeadId(null);
              }}
              className={`rounded-full px-4 py-2 text-sm font-bold ${filter === value ? "bg-[#00334E] text-white" : "bg-white text-slate-700"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {grouped.length === 0 && (
          <div className="rounded-2xl bg-white p-6 text-slate-600 shadow">Nenhum lead encontrado para este filtro.</div>
        )}

        <div className="space-y-3">
          {grouped.map((group, index) => (
            <button
              key={group.leadId}
              type="button"
              onClick={() => setSelectedLeadId(group.leadId)}
              className={`w-full rounded-3xl bg-white p-5 text-left shadow transition hover:-translate-y-0.5 hover:shadow-lg ${group.hasOverdue ? "ring-2 ring-red-300" : group.hasDueSoon ? "ring-2 ring-amber-200" : ""}`}
            >
              <div className="flex items-start gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00334E] text-sm font-black text-white">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words text-xl font-bold text-[#00334E]">{group.leadName}</h2>
                    <LeadBadge group={group} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Score {group.diagnosticScore} · {group.solutionName ?? "sem solução sugerida"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {group.leadWhatsapp || "WhatsApp não informado"} {group.leadEmail ? `· ${group.leadEmail}` : ""}
                  </p>
                  {group.nextFollowup && (
                    <p className={`mt-2 text-sm ${isOverdue(group.nextFollowup) ? "font-bold text-red-700" : "text-slate-600"}`}>
                      Próxima ação: {FOLLOWUP_LABELS[group.nextFollowup.kind] ?? group.nextFollowup.kind} · {formatDate(group.nextFollowup.scheduled_at)}
                    </p>
                  )}
                </div>
                <span className="hidden rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 sm:inline-flex">
                  Ver detalhes
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {selectedGroup && (
        <LeadFollowupModal
          group={selectedGroup}
          onClose={() => setSelectedLeadId(null)}
          onMark={mark}
        />
      )}
    </main>
  );
}

function LeadFollowupModal({
  group,
  onClose,
  onMark,
}: {
  group: GroupedLead;
  onClose: () => void;
  onMark: (followup: Followup, status: string) => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/60 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <section className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:mx-auto sm:max-w-4xl sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <button onClick={onClose} className="text-sm font-bold text-[#00A8CC]">← Voltar para lista</button>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-black text-[#00334E]">{group.leadName}</h2>
              <LeadBadge group={group} />
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Score {group.diagnosticScore} · {group.solutionName ?? "sem solução sugerida"}
            </p>
            <p className="text-xs text-slate-500">
              {group.leadWhatsapp || "WhatsApp não informado"} {group.leadEmail ? `· ${group.leadEmail}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/ae/leads/${group.leadId}`} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold hover:border-[#00A8CC]">
              Abrir ficha completa
            </Link>
            <button onClick={onClose} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
              Fechar
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {group.followups.map((followup) => (
            <FollowupCard key={followup.id} followup={followup} onMark={onMark} />
          ))}
        </div>
      </section>
    </div>
  );
}

function FollowupCard({ followup, onMark }: { followup: Followup; onMark: (followup: Followup, status: string) => Promise<void> }) {
  const lead = followup.ae_leads;
  const solution = lead?.ae_solutions?.name ?? null;
  const message = buildFollowupMessage(followup.kind, lead?.full_name ?? null, solution);
  const whatsapp = lead?.whatsapp?.replace(/\D/g, "") ?? "";
  const link = whatsapp ? `https://wa.me/${whatsapp.startsWith("55") ? whatsapp : `55${whatsapp}`}?text=${encodeURIComponent(message)}` : "";
  const overdue = isOverdue(followup);
  const dueSoon = isDueSoon(followup);

  return (
    <div className={`rounded-2xl border p-4 ${overdue ? "border-red-300 bg-red-50" : dueSoon ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-[#00334E]">{FOLLOWUP_LABELS[followup.kind] ?? followup.kind}</h3>
          <p className={`text-xs ${overdue ? "font-bold text-red-700" : dueSoon ? "font-bold text-amber-700" : "text-slate-500"}`}>
            Agendado: {formatDate(followup.scheduled_at)}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${overdue ? "bg-red-200 text-red-800" : dueSoon ? "bg-amber-200 text-amber-800" : "bg-white text-slate-700"}`}>
          {overdue ? "atrasado" : dueSoon ? "vence em breve" : followup.status}
        </span>
      </div>

      {followup.channel === "whatsapp" ? (
        <>
          <textarea readOnly value={message} rows={4} className="mt-4 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm" />
          <div className="mt-3 flex flex-wrap gap-2">
            {link && <a href={link} target="_blank" className="rounded-xl bg-[#31C16B] px-3 py-2 text-sm font-bold text-[#00334E]">Abrir WhatsApp</a>}
            <button onClick={() => navigator.clipboard.writeText(message)} className="rounded-xl bg-white px-3 py-2 text-sm font-bold">Copiar</button>
            {followup.status !== "enviado" && (
              <button onClick={() => onMark(followup, "enviado")} className="rounded-xl bg-[#00A8CC] px-3 py-2 text-sm font-bold text-white">Marcar enviado</button>
            )}
          </div>
        </>
      ) : (
        <p className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-600">Ação de e-mail registrada no funil.</p>
      )}
    </div>
  );
}

function LeadBadge({ group }: { group: GroupedLead }) {
  if (group.hasOverdue) {
    return <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">Atrasado</span>;
  }

  if (group.hasDueSoon) {
    return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">Vence em breve</span>;
  }

  return <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Em dia</span>;
}

function isOverdue(followup: Followup) {
  return followup.status === "pendente" && new Date(followup.scheduled_at).getTime() < Date.now();
}

function isDueSoon(followup: Followup) {
  const scheduledAt = new Date(followup.scheduled_at).getTime();
  const now = Date.now();
  return followup.status === "pendente" && scheduledAt >= now && scheduledAt <= now + 60 * 60 * 1000;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function nextRelevantFollowup(followups: Followup[]) {
  const pending = followups.filter((item) => item.status === "pendente");
  if (pending.length === 0) return followups[0] ?? null;
  return pending.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0] ?? null;
}

function groupFollowupsByLead(items: Followup[]): GroupedLead[] {
  const map = new Map<string, GroupedLead>();

  for (const item of items) {
    const lead = item.ae_leads;
    const leadId = item.lead_id;
    const existing = map.get(leadId);

    if (!existing) {
      const nextFollowup = nextRelevantFollowup([item]);
      map.set(leadId, {
        leadId,
        leadName: lead?.full_name || "Sem nome",
        leadWhatsapp: lead?.whatsapp || "",
        leadEmail: lead?.email || "",
        diagnosticScore: lead?.diagnostic_score ?? 0,
        solutionName: lead?.ae_solutions?.name ?? null,
        followups: [item],
        hasOverdue: isOverdue(item),
        hasDueSoon: isDueSoon(item),
        nextAt: new Date(item.scheduled_at).getTime(),
        nextFollowup,
      });
    } else {
      existing.followups.push(item);
      existing.hasOverdue = existing.hasOverdue || isOverdue(item);
      existing.hasDueSoon = existing.hasDueSoon || isDueSoon(item);
      existing.nextAt = Math.min(existing.nextAt, new Date(item.scheduled_at).getTime());
      existing.nextFollowup = nextRelevantFollowup(existing.followups);
    }
  }

  return Array.from(map.values())
    .map((group) => {
      const sortedFollowups = group.followups.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
      const nextFollowup = nextRelevantFollowup(sortedFollowups);
      return {
        ...group,
        followups: sortedFollowups,
        nextFollowup,
        nextAt: nextFollowup ? new Date(nextFollowup.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER,
      };
    })
    .sort((a, b) => {
      const aPriority = a.hasOverdue ? 0 : a.hasDueSoon ? 1 : 2;
      const bPriority = b.hasOverdue ? 0 : b.hasDueSoon ? 1 : 2;
      return aPriority - bPriority || a.nextAt - b.nextAt || b.diagnosticScore - a.diagnosticScore;
    });
}

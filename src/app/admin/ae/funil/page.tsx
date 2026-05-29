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
  nextAt: number;
};

export default function FunilPage() {
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [filter, setFilter] = useState("pendente");
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

  async function mark(followup: Followup, status: string) {
    await adminFetch(`/api/admin/followups/${followup.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await load();
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/admin/ae" className="text-sm font-bold text-[#00A8CC]">← Voltar para Gestão</Link>
            <h1 className="mt-2 text-3xl font-bold text-[#00334E]">Funil de aquisição</h1>
            <p className="text-slate-600">Ações agrupadas por lead, com mensagens prontas para WhatsApp e sinalização de atrasos.</p>
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
              onClick={() => setFilter(value)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${filter === value ? "bg-[#00334E] text-white" : "bg-white text-slate-700"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {grouped.length === 0 && (
          <div className="rounded-2xl bg-white p-6 text-slate-600 shadow">Nenhuma ação encontrada para este filtro.</div>
        )}

        <div className="space-y-5">
          {grouped.map((group) => (
            <section key={group.leadId} className={`rounded-3xl bg-white p-5 shadow ${group.hasOverdue ? "ring-2 ring-red-300" : ""}`}>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-[#00334E]">{group.leadName}</h2>
                    {group.hasOverdue && <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">Atrasado</span>}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Score {group.diagnosticScore} · {group.solutionName ?? "sem solução sugerida"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {group.leadWhatsapp || "WhatsApp não informado"} {group.leadEmail ? `· ${group.leadEmail}` : ""}
                  </p>
                </div>
                <Link href={`/admin/ae/leads/${group.leadId}`} className="inline-flex justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold hover:border-[#00A8CC]">
                  Abrir lead
                </Link>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {group.followups.map((followup) => {
                  const lead = followup.ae_leads;
                  const solution = lead?.ae_solutions?.name ?? null;
                  const message = buildFollowupMessage(followup.kind, lead?.full_name ?? null, solution);
                  const whatsapp = lead?.whatsapp?.replace(/\D/g, "") ?? "";
                  const link = whatsapp ? `https://wa.me/${whatsapp.startsWith("55") ? whatsapp : `55${whatsapp}`}?text=${encodeURIComponent(message)}` : "";
                  const overdue = isOverdue(followup);

                  return (
                    <div key={followup.id} className={`rounded-2xl border p-4 ${overdue ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-[#00334E]">{FOLLOWUP_LABELS[followup.kind] ?? followup.kind}</h3>
                          <p className={`text-xs ${overdue ? "font-bold text-red-700" : "text-slate-500"}`}>
                            Agendado: {new Date(followup.scheduled_at).toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${overdue ? "bg-red-200 text-red-800" : "bg-white text-slate-700"}`}>
                          {overdue ? "atrasado" : followup.status}
                        </span>
                      </div>

                      {followup.channel === "whatsapp" ? (
                        <>
                          <textarea readOnly value={message} rows={4} className="mt-4 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm" />
                          <div className="mt-3 flex flex-wrap gap-2">
                            {link && <a href={link} target="_blank" className="rounded-xl bg-[#31C16B] px-3 py-2 text-sm font-bold text-[#00334E]">Abrir WhatsApp</a>}
                            <button onClick={() => navigator.clipboard.writeText(message)} className="rounded-xl bg-white px-3 py-2 text-sm font-bold">Copiar</button>
                            <button onClick={() => mark(followup, "enviado")} className="rounded-xl bg-[#00A8CC] px-3 py-2 text-sm font-bold text-white">Marcar enviado</button>
                          </div>
                        </>
                      ) : (
                        <p className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-600">Ação de e-mail registrada no funil.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}

function isOverdue(followup: Followup) {
  return followup.status === "pendente" && new Date(followup.scheduled_at).getTime() < Date.now();
}

function groupFollowupsByLead(items: Followup[]): GroupedLead[] {
  const map = new Map<string, GroupedLead>();

  for (const item of items) {
    const lead = item.ae_leads;
    const leadId = item.lead_id;
    const existing = map.get(leadId);

    if (!existing) {
      map.set(leadId, {
        leadId,
        leadName: lead?.full_name || "Sem nome",
        leadWhatsapp: lead?.whatsapp || "",
        leadEmail: lead?.email || "",
        diagnosticScore: lead?.diagnostic_score ?? 0,
        solutionName: lead?.ae_solutions?.name ?? null,
        followups: [item],
        hasOverdue: isOverdue(item),
        nextAt: new Date(item.scheduled_at).getTime(),
      });
    } else {
      existing.followups.push(item);
      existing.hasOverdue = existing.hasOverdue || isOverdue(item);
      existing.nextAt = Math.min(existing.nextAt, new Date(item.scheduled_at).getTime());
    }
  }

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      followups: group.followups.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()),
    }))
    .sort((a, b) => Number(b.hasOverdue) - Number(a.hasOverdue) || a.nextAt - b.nextAt);
}

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
    return followups.filter((item) => item.status === filter);
  }, [filter, followups]);

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
        <div>
          <h1 className="text-3xl font-bold text-[#00334E]">Funil de aquisição</h1>
          <p className="text-slate-600">Próximos contatos prontos para copiar, abrir no WhatsApp e marcar como enviados.</p>
        </div>

        {error && <div className="rounded-2xl bg-red-50 p-4 text-red-700">{error}</div>}

        <div className="flex flex-wrap gap-2">
          {["pendente", "enviado", "todos"].map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${filter === item ? "bg-[#00334E] text-white" : "bg-white text-slate-700"}`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((followup) => {
            const lead = followup.ae_leads;
            const solution = lead?.ae_solutions?.name ?? null;
            const message = buildFollowupMessage(followup.kind, lead?.full_name ?? null, solution);
            const whatsapp = lead?.whatsapp?.replace(/\D/g, "") ?? "";
            const link = whatsapp ? `https://wa.me/55${whatsapp}?text=${encodeURIComponent(message)}` : "";

            return (
              <div key={followup.id} className="rounded-2xl bg-white p-5 shadow">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-[#00334E]">{FOLLOWUP_LABELS[followup.kind] ?? followup.kind}</h2>
                    <p className="mt-1 text-sm text-slate-600">{lead?.full_name || "Sem nome"} · score {lead?.diagnostic_score ?? 0}</p>
                    <p className="text-xs text-slate-500">Agendado: {new Date(followup.scheduled_at).toLocaleString("pt-BR")}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{followup.status}</span>
                </div>

                <textarea readOnly value={message} rows={4} className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm" />

                <div className="mt-3 flex flex-wrap gap-2">
                  {link && <a href={link} target="_blank" className="rounded-xl bg-[#31C16B] px-3 py-2 text-sm font-bold text-[#00334E]">Abrir WhatsApp</a>}
                  <button onClick={() => navigator.clipboard.writeText(message)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold">Copiar</button>
                  <button onClick={() => mark(followup, "enviado")} className="rounded-xl bg-[#00A8CC] px-3 py-2 text-sm font-bold text-white">Marcar enviado</button>
                  <Link href={`/admin/ae/leads/${followup.lead_id}`} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">Abrir lead</Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

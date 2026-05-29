"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { adminFetch } from "@/lib/admin-fetch";
import { buildFollowupMessage, FOLLOWUP_LABELS, FollowupKind } from "@/lib/followups";

type Lead = {
  id: string;
  full_name: string | null;
  whatsapp: string | null;
  email: string | null;
  main_area: string | null;
  main_pain: string | null;
  urgency: string | null;
  idea_description: string | null;
  diagnostic_score: number;
  status: string;
  notes: string | null;
  created_at: string;
  ae_solutions?: { name: string; slug: string } | null;
};

type Answer = { id: string; question_text: string; answer: string };
type Match = { id: string; score: number; reason: string; ae_solutions?: { name: string; slug: string } | null };
type Followup = { id: string; kind: FollowupKind; channel: string; status: string; scheduled_at: string; sent_at: string | null; notes: string | null };

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const result = await adminFetch<{ lead: Lead; answers: Answer[]; matches: Match[]; followups: Followup[] }>(`/api/admin/leads/${params.id}`);
      setLead(result.lead);
      setAnswers(result.answers);
      setMatches(result.matches);
      setFollowups(result.followups);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar lead.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const whatsappLink = lead?.whatsapp ? `https://wa.me/55${lead.whatsapp.replace(/\D/g, "")}` : "";

  async function markFollowup(followup: Followup, status: string) {
    await adminFetch(`/api/admin/followups/${followup.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await load();
  }

  if (!lead) {
    return <main className="min-h-screen bg-slate-100 p-6"><section className="mx-auto max-w-5xl rounded-2xl bg-white p-5 shadow">{error || "Carregando..."}</section></main>;
  }

  const solutionName = lead.ae_solutions?.name ?? matches[0]?.ae_solutions?.name ?? "oportunidade de melhoria";

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl bg-white p-5 shadow">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#00A8CC]">Detalhe do lead</p>
              <h1 className="mt-1 text-3xl font-bold text-[#00334E]">{lead.full_name || "Sem nome"}</h1>
              <p className="mt-2 text-slate-600">{lead.email} · {lead.whatsapp}</p>
              <p className="mt-1 text-sm text-slate-500">Recebido em {new Date(lead.created_at).toLocaleString("pt-BR")}</p>
            </div>
            <div className="rounded-2xl bg-[#31C16B]/20 p-4 text-center text-[#00334E]">
              <p className="text-sm font-bold">Score</p>
              <p className="text-4xl font-black">{lead.diagnostic_score}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-6">
            <Card title="Resumo da dor">
              <dl className="grid gap-3 text-sm md:grid-cols-2">
                <Info label="Área" value={lead.main_area} />
                <Info label="Dor" value={lead.main_pain} />
                <Info label="Urgência" value={lead.urgency} />
                <Info label="Solução sugerida" value={solutionName} />
              </dl>
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-bold text-slate-900">Descrição livre</p>
                <p className="mt-2 whitespace-pre-wrap">{lead.idea_description}</p>
              </div>
            </Card>

            <Card title="Respostas completas">
              <div className="space-y-3">
                {answers.map((answer) => (
                  <div key={answer.id} className="rounded-2xl border border-slate-200 p-3">
                    <p className="text-sm font-bold text-slate-800">{answer.question_text}</p>
                    <p className="mt-1 text-sm text-slate-600">{answer.answer}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Soluções recomendadas">
              <div className="space-y-3">
                {matches.map((match) => (
                  <div key={match.id} className="rounded-2xl border border-slate-200 p-3">
                    <div className="flex justify-between gap-3">
                      <p className="font-bold text-[#00334E]">{match.ae_solutions?.name}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{match.score}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{match.reason}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Funil e próximos contatos">
              <div className="space-y-3">
                {followups.map((followup) => {
                  const message = buildFollowupMessage(followup.kind, lead.full_name, solutionName);
                  const link = whatsappLink ? `${whatsappLink}?text=${encodeURIComponent(message)}` : "";
                  return (
                    <div key={followup.id} className="rounded-2xl border border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-[#00334E]">{FOLLOWUP_LABELS[followup.kind] ?? followup.kind}</p>
                          <p className="text-xs text-slate-500">{followup.channel} · {new Date(followup.scheduled_at).toLocaleString("pt-BR")}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-600">Status: {followup.status}</p>
                        </div>
                      </div>
                      {followup.channel === "whatsapp" && (
                        <div className="mt-3 space-y-2">
                          <textarea readOnly value={message} rows={4} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm" />
                          <div className="flex flex-wrap gap-2">
                            {link && <a href={link} target="_blank" className="rounded-xl bg-[#31C16B] px-3 py-2 text-sm font-bold text-[#00334E]">Abrir WhatsApp</a>}
                            <button onClick={() => navigator.clipboard.writeText(message)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold">Copiar texto</button>
                            <button onClick={() => markFollowup(followup, "enviado")} className="rounded-xl bg-[#00A8CC] px-3 py-2 text-sm font-bold text-white">Marcar enviado</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow">
      <h2 className="text-xl font-bold text-[#00334E]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-800">{value || "Não informado"}</dd>
    </div>
  );
}

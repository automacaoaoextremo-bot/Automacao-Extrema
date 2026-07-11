"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Person = {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp: string | null;
  active: boolean;
};

type Membership = {
  id: string;
  person_id: string;
  status: string | null;
  active: boolean | null;
  agenda_viva_profile: Record<string, unknown> | null;
};

type Payload = {
  people: Person[];
  memberships: Membership[];
  error?: string;
};

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function selectedLabels(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const label = (item as { label?: unknown }).label;
      return typeof label === "string" ? label : "";
    })
    .filter(Boolean);
}

export default function ValidacoesPrimeiroAcessoPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      router.replace("/solucoes/organizacao-em-harmonia/login");
      return;
    }

    const response = await fetch("/api/organizacao-em-harmonia/cliente/base-unica", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = (await response.json()) as Payload;
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar validações.");
    setPayload(result);
  }, [router]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      load()
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : "Erro ao carregar validações.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [load]);

  const pending = useMemo(() => {
    const people = payload?.people ?? [];
    return (payload?.memberships ?? [])
      .filter((membership) => membership.status === "pendente_validacao" || membership.active === false)
      .map((membership) => ({ membership, person: people.find((person) => person.id === membership.person_id) ?? null }))
      .filter((item) => item.person);
  }, [payload?.memberships, payload?.people]);

  async function decide(personId: string, action: "approveAccess" | "requestAccessAdjustment") {
    const reviewNotes = action === "requestAccessAdjustment" ? window.prompt("Informe o ajuste solicitado ao Filho da Corrente:") || "" : "";
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sessão expirada.");
      const response = await fetch("/api/organizacao-em-harmonia/cliente/base-unica", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, personId, reviewNotes }),
      });
      const result = (await response.json()) as Payload & { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível atualizar a validação.");
      setPayload(result);
      setMessage(action === "approveAccess" ? "Acesso liberado." : "Ajuste solicitado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar validação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <OrganizacaoClientShell title="Validações do Primeiro Acesso" description="Aprove cadastros de Filhos da Corrente, solicite ajustes e simule o acesso antes de liberar o uso real.">
      {loading && <p className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">Carregando validações...</p>}
      {error && <p className="rounded-3xl bg-red-50 p-5 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
      {message && <p className="rounded-3xl bg-emerald-50 p-5 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}

      {!loading && (
        <section className="grid gap-4">
          {pending.map(({ membership, person }) => {
            const profile = membership.agenda_viva_profile ?? {};
            const functionLabels = selectedLabels(profile.selectedFunctions);
            const agendaLabels = selectedLabels(profile.selectedAgenda);
            return (
              <article key={membership.id} className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Aguardando validação</p>
                    <h2 className="mt-1 text-2xl font-black text-[#00334E]">{person?.full_name}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{person?.whatsapp || "WhatsApp não informado"} · {person?.email || "E-mail não informado"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/solucoes/organizacao-em-harmonia/cliente/simular-acesso/${person?.id}`} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-[#00334E]">Simular acesso</Link>
                    <button disabled={saving} type="button" onClick={() => person?.id && decide(person.id, "approveAccess")} className="rounded-xl bg-[#31C16B] px-4 py-2 text-sm font-black text-[#00334E] disabled:opacity-60">Aprovar</button>
                    <button disabled={saving} type="button" onClick={() => person?.id && decide(person.id, "requestAccessAdjustment")} className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-black text-amber-900 disabled:opacity-60">Pedir ajuste</button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                    <p className="font-black text-[#00334E]">Funções</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{functionLabels.length ? functionLabels.join(" • ") : "Somente Filho da Corrente"}</p>
                  </div>
                  <div className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                    <p className="font-black text-[#00334E]">Agenda</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{agendaLabels.length ? agendaLabels.join(" • ") : "Sem agenda selecionada"}</p>
                  </div>
                </div>
                {asText(profile.submittedAt) && <p className="mt-3 text-xs font-semibold text-slate-500">Enviado em: {new Date(asText(profile.submittedAt)).toLocaleString("pt-BR")}</p>}
              </article>
            );
          })}
          {pending.length === 0 && <p className="rounded-3xl bg-white p-5 font-bold text-slate-500 shadow ring-1 ring-slate-100">Nenhuma validação pendente no momento.</p>}
        </section>
      )}
    </OrganizacaoClientShell>
  );
}

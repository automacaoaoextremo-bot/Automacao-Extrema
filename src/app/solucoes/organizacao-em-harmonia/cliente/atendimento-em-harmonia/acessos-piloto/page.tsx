"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { pilotFilhoMembershipsByPerson } from "@/lib/organizacao-em-harmonia/tucxa-pilot-membership";

type Person = {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp: string | null;
  active: boolean;
  auth_user_id?: string | null;
};

type Role = { id: string; name: string; slug?: string | null; active: boolean };
type Profile = {
  supportsReception?: boolean;
  isCavalinho?: boolean;
  isCambono?: boolean;
  pilotAccessKind?: string;
  pilotFirstAccessRequired?: boolean;
  pilotOnboardingCompletedAt?: string;
};
type Membership = {
  id: string;
  person_id: string;
  role_id: string | null;
  active: boolean;
  status?: string | null;
  agenda_viva_profile?: Profile | null;
};
type Payload = { people: Person[]; roles: Role[]; memberships: Membership[] };

const API = "/api/organizacao-em-harmonia/cliente/base-unica";

function phone(value: string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return value || "Sem WhatsApp";
}

function profileLabels(profile: Profile | null | undefined) {
  const labels: string[] = [];
  if (profile?.supportsReception || profile?.pilotAccessKind === "recepcao") labels.push("Recepção");
  if (profile?.isCavalinho || profile?.pilotAccessKind === "cavalinho") labels.push("Cavalinho");
  if (profile?.isCambono) labels.push("Cambono");
  return labels.length ? labels.join(" · ") : "Filho da Corrente";
}

export default function AcessosPilotoPage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        window.location.replace("/solucoes/organizacao-em-harmonia/login");
        return;
      }
      const response = await fetch(API, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const result = (await response.json().catch(() => ({}))) as Payload & { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível carregar os acessos.");
      setPayload(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os acessos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const rows = useMemo(() => {
    if (!payload) return [];

    const memberships = pilotFilhoMembershipsByPerson(payload.memberships, payload.roles);

    return payload.people
      .filter((person) => memberships.has(person.id))
      .map((person) => ({ person, membership: memberships.get(person.id)! }))
      .sort((a, b) => a.person.full_name.localeCompare(b.person.full_name, "pt-BR"));
  }, [payload]);

  async function resetAccess(person: Person) {
    const confirmed = window.confirm(
      `Excluir somente o login de ${person.full_name}?\n\nO cadastro, funções e vínculos serão preservados. Depois, o provisionamento poderá criar um novo login para que a pessoa faça o primeiro acesso novamente.`,
    );
    if (!confirmed) return;

    setSavingId(person.id);
    setError("");
    setMessage("");
    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sessão expirada. Entre novamente.");
      const response = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "resetPilotAccess", personId: person.id }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível excluir o acesso.");
      setMessage(`Login de ${person.full_name} excluído. O cadastro foi preservado para novo provisionamento.`);
      await load();
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Não foi possível excluir o acesso.");
    } finally {
      setSavingId("");
    }
  }

  return (
    <OrganizacaoClientShell
      title="Acessos do piloto"
      description="Valide os logins dos Filhos da Corrente antes da liberação real do Agendamento. Excluir acesso remove somente o login, preservando cadastro e vínculos."
    >
      <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43]">Agendamento · fase de testes</p>
        <h2 className="mt-2 text-2xl font-black text-[#00334E]">Todos os Filhos da Corrente em uma única lista.</h2>
        <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">
          Use esta tela para testar cada acesso. Depois da validação, exclua apenas o login e execute novamente o provisionamento para gerar a senha temporária e o primeiro acesso real, sem apagar o cadastro da pessoa.
        </p>
      </section>

      {loading && <p className="rounded-3xl bg-white p-5 font-bold text-slate-600 shadow ring-1 ring-slate-100">Carregando Filhos da Corrente...</p>}
      {error && <p className="rounded-3xl bg-red-50 p-4 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
      {message && <p className="rounded-3xl bg-emerald-50 p-4 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}

      {!loading && !error && (
        <section className="grid gap-2">
          {rows.map(({ person, membership }) => {
            const profile = membership.agenda_viva_profile;
            const hasLogin = Boolean(person.auth_user_id);
            const firstAccessPending = profile?.pilotFirstAccessRequired === true && !profile?.pilotOnboardingCompletedAt;
            return (
              <article key={person.id} className="grid gap-3 rounded-2xl bg-white p-4 shadow ring-1 ring-slate-100 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-[#00334E]">{person.full_name}</h3>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[0.65rem] font-black text-emerald-800 ring-1 ring-emerald-100">{profileLabels(profile)}</span>
                    <span className={`rounded-full px-2 py-1 text-[0.65rem] font-black ring-1 ${hasLogin ? "bg-blue-50 text-blue-800 ring-blue-100" : "bg-slate-50 text-slate-600 ring-slate-200"}`}>
                      {hasLogin ? "Login criado" : "Sem login"}
                    </span>
                    {hasLogin && firstAccessPending && <span className="rounded-full bg-amber-50 px-2 py-1 text-[0.65rem] font-black text-amber-900 ring-1 ring-amber-100">Primeiro acesso pendente</span>}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{phone(person.whatsapp)}{person.email ? ` · ${person.email}` : ""}</p>
                </div>
                <button
                  type="button"
                  disabled={!hasLogin || savingId === person.id}
                  onClick={() => void resetAccess(person)}
                  className="rounded-xl bg-red-50 px-4 py-2 text-sm font-black text-red-700 ring-1 ring-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {savingId === person.id ? "Excluindo..." : "Excluir acesso"}
                </button>
              </article>
            );
          })}
          {!rows.length && <p className="rounded-3xl bg-white p-5 font-bold text-slate-500 shadow ring-1 ring-slate-100">Nenhum Filho da Corrente encontrado.</p>}
        </section>
      )}
    </OrganizacaoClientShell>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

type ValidationRequest = {
  id: string;
  person_id: string;
  status: string | null;
  summary: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Payload = {
  people: Person[];
  memberships: Membership[];
  validationRequests?: ValidationRequest[];
  error?: string;
  whatsappUrl?: string;
};

type ValidationItem = {
  membership: Membership & { status: string };
  request: ValidationRequest | null;
  person: Person;
};

type DraftItem = {
  slug: string;
  label: string;
};

type EntityItem = {
  id: string;
  name: string;
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asTextList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(asText).filter(Boolean);
}

function draftItems(value: unknown): DraftItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const record = asRecord(item);
    const slug = asText(record.slug);
    const label = asText(record.label);
    return slug && label ? [{ slug, label }] : [];
  });
}



function entityItems(value: unknown): EntityItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const record = asRecord(item);
    const id = asText(record.id);
    const name = asText(record.name);
    return id && name ? [{ id, name }] : [];
  });
}

function entityLabel(id: string, ...collections: EntityItem[][]) {
  for (const collection of collections) {
    const match = collection.find((item) => item.id === id);
    if (match) return match.name;
  }
  return id;
}

function selectedLabels(value: unknown) {
  return draftItems(value).map((item) => item.label);
}

function labelForSlug(slug: string, ...collections: DraftItem[][]) {
  for (const collection of collections) {
    const match = collection.find((item) => item.slug === slug);
    if (match) return match.label;
  }
  return slug;
}

function requestType(request: ValidationRequest | null) {
  return asText(asRecord(request?.summary).requestType);
}

function clientLoginUrl() {
  if (typeof window === "undefined") return "/solucoes/organizacao-em-harmonia/login";
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return `/solucoes/organizacao-em-harmonia/login?returnTo=${encodeURIComponent(returnTo)}`;
}

function ChangeList({ title, values, tone = "neutral" }: { title: string; values: string[]; tone?: "added" | "removed" | "neutral" }) {
  const toneClasses = tone === "added"
    ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
    : tone === "removed"
      ? "bg-amber-50 text-amber-950 ring-amber-100"
      : "bg-[#F7FAF2] text-[#123D2C] ring-[#123D2C]/10";

  return (
    <div className={`rounded-2xl p-4 ring-1 ${toneClasses}`}>
      <p className="font-black">{title}</p>
      {values.length ? (
        <div className="mt-2 grid gap-1 text-sm font-semibold">
          {values.map((value) => <p key={value}>• {value}</p>)}
        </div>
      ) : (
        <p className="mt-2 text-sm font-semibold opacity-70">Nenhuma alteração</p>
      )}
    </div>
  );
}

export default function ValidacoesPrimeiroAcessoPage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingWhatsappUrl, setPendingWhatsappUrl] = useState("");

  const load = useCallback(async () => {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      window.location.replace(clientLoginUrl());
      return;
    }

    const response = await fetch("/api/organizacao-em-harmonia/cliente/base-unica", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = (await response.json()) as Payload;
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar validações.");
    setPayload(result);
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      load()
        .catch((reason) => {
          if (active) setError(reason instanceof Error ? reason.message : "Erro ao carregar validações.");
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

  const validations = useMemo(() => {
    const people = payload?.people ?? [];
    const requests = payload?.validationRequests ?? [];
    const requestByPerson = new Map<string, ValidationRequest>();
    for (const request of requests) {
      const requestStatus = asText(request.status).toLowerCase();
      if (["aprovado", "ativo", "cancelado"].includes(requestStatus)) continue;
      if (!requestByPerson.has(request.person_id)) requestByPerson.set(request.person_id, request);
    }

    return (payload?.memberships ?? [])
      .flatMap<ValidationItem>((membership) => {
        const profile = membership.agenda_viva_profile ?? {};
        const request = requestByPerson.get(membership.person_id) ?? null;
        const cameFromFirstAccess =
          profile.source === "primeiro_acesso_filho_corrente" ||
          Boolean(profile.submittedAt) ||
          Boolean(profile.validationStatus) ||
          Boolean(request);
        if (!cameFromFirstAccess) return [];

        const person = people.find((item) => item.id === membership.person_id);
        if (!person) return [];

        const status = request?.status || asText(profile.validationStatus) || membership.status || "pendente_primeiro_acesso";
        return [{ membership: { ...membership, status }, request, person }];
      })
      .sort((left, right) => {
        const order: Record<string, number> = {
          pendente_validacao: 0,
          pendente_primeiro_acesso: 1,
          ajuste_solicitado: 2,
          ativo: 3,
          inativo: 4,
        };
        return (order[left.membership.status] ?? 9) - (order[right.membership.status] ?? 9);
      });
  }, [payload?.memberships, payload?.people, payload?.validationRequests]);

  async function decide(personId: string, action: "approveAccess" | "requestAccessAdjustment" | "deleteAccessValidation", isProfileUpdate: boolean) {
    if (action === "deleteAccessValidation") {
      const text = isProfileUpdate
        ? "Excluir esta solicitação de atualização? O acesso e o perfil já aprovados serão preservados."
        : "Excluir este pedido de validação? Isso remove o cadastro pendente para que o teste possa ser repetido.";
      if (!window.confirm(text)) return;
    }

    const reviewNotes = action === "requestAccessAdjustment"
      ? window.prompt(isProfileUpdate ? "Informe por que a alteração precisa de ajuste:" : "Informe o ajuste ao Filho da Corrente:") || ""
      : "";

    const candidateWindow = action === "deleteAccessValidation" ? null : window.open("", "_blank");
    const whatsappWindow = candidateWindow && candidateWindow !== window ? candidateWindow : null;
    if (whatsappWindow) {
      try {
        whatsappWindow.opener = null;
      } catch {
        // A aba atual permanece preservada mesmo quando o navegador não permite alterar opener.
      }
      whatsappWindow.document.title = "Abrindo WhatsApp";
      whatsappWindow.document.body.innerHTML = '<p style="font-family:Arial,sans-serif;padding:24px">Preparando a mensagem para o WhatsApp...</p>';
    }

    setSaving(true);
    setError("");
    setMessage("");
    setPendingWhatsappUrl("");

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

      if (result.whatsappUrl && action !== "deleteAccessValidation") {
        if (whatsappWindow) whatsappWindow.location.href = result.whatsappUrl;
        else setPendingWhatsappUrl(result.whatsappUrl);
      } else {
        whatsappWindow?.close();
      }

      setMessage(
        action === "approveAccess"
          ? isProfileUpdate
            ? "Atualização aprovada e aplicada. O acesso anterior permaneceu disponível durante a análise."
            : "Acesso liberado. A página de Validações permanece aberta."
          : action === "deleteAccessValidation"
            ? isProfileUpdate
              ? "Solicitação de atualização excluída. O perfil aprovado foi preservado."
              : "Pedido de validação excluído."
            : isProfileUpdate
              ? "A alteração não foi aplicada. O perfil aprovado anterior continua ativo e a orientação foi preparada."
              : "Ajuste solicitado. A página de Validações permanece aberta.",
      );
    } catch (reason) {
      whatsappWindow?.close();
      setError(reason instanceof Error ? reason.message : "Erro ao atualizar validação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <OrganizacaoClientShell title="Validações" description="Aprove o Primeiro Acesso e confira claramente as mudanças solicitadas por pessoas que já possuem acesso.">
      {loading && <p className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">Carregando validações...</p>}
      {error && <p className="rounded-3xl bg-red-50 p-5 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
      {message && <p className="rounded-3xl bg-emerald-50 p-5 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}
      {pendingWhatsappUrl && <a href={pendingWhatsappUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-2xl bg-[#25D366] px-5 py-3 font-black text-[#073B1D]">Abrir mensagem no WhatsApp</a>}

      {!loading && (
        <section className="grid gap-4">
          {validations.map(({ membership, request, person }) => {
            const profile = membership.agenda_viva_profile ?? {};
            const summary = asRecord(request?.summary);
            const isProfileUpdate = requestType(request) === "profile_update";
            const previousProfile = asRecord(summary.previousProfile);
            const requestedProfile = asRecord(summary.requestedProfile);
            const changes = asRecord(summary.changes);
            const previousFunctions = draftItems(previousProfile.selectedFunctions);
            const requestedFunctions = draftItems(requestedProfile.selectedFunctions).length
              ? draftItems(requestedProfile.selectedFunctions)
              : draftItems(summary.selectedFunctions);
            const previousAgenda = draftItems(previousProfile.selectedAgenda);
            const requestedAgenda = draftItems(requestedProfile.selectedAgenda).length
              ? draftItems(requestedProfile.selectedAgenda)
              : draftItems(summary.selectedAgenda);
            const previousFunctionSlugs = asTextList(previousProfile.functionSlugs).length
              ? asTextList(previousProfile.functionSlugs)
              : asTextList(summary.previousFunctionSlugs);
            const requestedFunctionSlugs = asTextList(requestedProfile.functionSlugs).length
              ? asTextList(requestedProfile.functionSlugs)
              : requestedFunctions.map((item) => item.slug);
            const previousAgendaSlugs = asTextList(previousProfile.agendaSlugs).length
              ? asTextList(previousProfile.agendaSlugs)
              : asTextList(summary.previousAgendaSlugs);
            const requestedAgendaSlugs = asTextList(requestedProfile.agendaSlugs).length
              ? asTextList(requestedProfile.agendaSlugs)
              : requestedAgenda.map((item) => item.slug);
            const functionsAddedSlugs = asTextList(changes.functionsAdded).length
              ? asTextList(changes.functionsAdded)
              : requestedFunctionSlugs.filter((slug) => !previousFunctionSlugs.includes(slug));
            const functionsRemovedSlugs = asTextList(changes.functionsRemoved).length
              ? asTextList(changes.functionsRemoved)
              : previousFunctionSlugs.filter((slug) => !requestedFunctionSlugs.includes(slug));
            const agendaAddedSlugs = asTextList(changes.agendaAdded).length
              ? asTextList(changes.agendaAdded)
              : requestedAgendaSlugs.filter((slug) => !previousAgendaSlugs.includes(slug));
            const agendaRemovedSlugs = asTextList(changes.agendaRemoved).length
              ? asTextList(changes.agendaRemoved)
              : previousAgendaSlugs.filter((slug) => !requestedAgendaSlugs.includes(slug));
            const functionsAdded = functionsAddedSlugs.map((slug) => labelForSlug(slug, requestedFunctions, previousFunctions));
            const functionsRemoved = functionsRemovedSlugs.map((slug) => labelForSlug(slug, previousFunctions, requestedFunctions));
            const agendaAdded = agendaAddedSlugs.map((slug) => labelForSlug(slug, requestedAgenda, previousAgenda));
            const agendaRemoved = agendaRemovedSlugs.map((slug) => labelForSlug(slug, previousAgenda, requestedAgenda));
            const personalData = asTextList(changes.personalData);
            const previousEntities = entityItems(previousProfile.selectedEntities);
            const requestedEntities = entityItems(requestedProfile.selectedEntities).length
              ? entityItems(requestedProfile.selectedEntities)
              : entityItems(summary.selectedEntities);
            const previousEntityIds = asTextList(previousProfile.selectedEntityIds);
            const requestedEntityIds = asTextList(requestedProfile.selectedEntityIds).length
              ? asTextList(requestedProfile.selectedEntityIds)
              : asTextList(summary.selectedEntityIds);
            const entitiesAddedIds = asTextList(changes.entitiesAdded).length
              ? asTextList(changes.entitiesAdded)
              : requestedEntityIds.filter((id) => !previousEntityIds.includes(id));
            const entitiesRemovedIds = asTextList(changes.entitiesRemoved).length
              ? asTextList(changes.entitiesRemoved)
              : previousEntityIds.filter((id) => !requestedEntityIds.includes(id));
            const entitiesAdded = entitiesAddedIds.map((id) => entityLabel(id, requestedEntities, previousEntities));
            const entitiesRemoved = entitiesRemovedIds.map((id) => entityLabel(id, previousEntities, requestedEntities));
            const functionLabels = selectedLabels(profile.selectedFunctions);
            const agendaLabels = selectedLabels(profile.selectedAgenda);
            const selectedEntityLabels = entityItems(summary.selectedEntities).map((item) => item.name);

            return (
              <article key={`${membership.id}-${request?.id ?? "membership"}`} className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
                      {isProfileUpdate ? "Atualização cadastral aguardando validação" : membership.status === "ativo" ? "Acesso aprovado" : membership.status === "ajuste_solicitado" ? "Ajuste solicitado" : membership.status === "pendente_primeiro_acesso" ? "Aguardando primeiro acesso" : "Aguardando validação"}
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-[#00334E]">{person.full_name}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{person.whatsapp || "WhatsApp não informado"} · {person.email || "E-mail não informado"}</p>
                    {isProfileUpdate && <p className="mt-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-900 ring-1 ring-blue-100">O acesso e o perfil anteriormente aprovados permanecem ativos até a decisão.</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/solucoes/organizacao-em-harmonia/cliente/simular-acesso/${person.id}`} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-[#00334E]">Simular acesso</Link>
                    {(isProfileUpdate || membership.status !== "ativo") && <button disabled={saving} type="button" onClick={() => void decide(person.id, "approveAccess", isProfileUpdate)} className="rounded-xl bg-[#31C16B] px-4 py-2 text-sm font-black text-[#00334E] disabled:opacity-60">{isProfileUpdate ? "Aprovar alterações" : "Aprovar"}</button>}
                    <button disabled={saving} type="button" onClick={() => void decide(person.id, "requestAccessAdjustment", isProfileUpdate)} className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-black text-amber-900 disabled:opacity-60">{isProfileUpdate ? "Reprovar alteração / pedir ajuste" : membership.status === "ativo" ? "Reprovar / voltar para ajuste" : "Pedir ajuste"}</button>
                    <button disabled={saving} type="button" onClick={() => void decide(person.id, "deleteAccessValidation", isProfileUpdate)} className="rounded-xl bg-red-50 px-4 py-2 text-sm font-black text-red-700 disabled:opacity-60">Excluir pedido</button>
                  </div>
                </div>

                {isProfileUpdate ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <ChangeList title="Funções incluídas" values={functionsAdded} tone="added" />
                    <ChangeList title="Funções retiradas" values={functionsRemoved} tone="removed" />
                    <ChangeList title="Agenda incluída" values={agendaAdded} tone="added" />
                    <ChangeList title="Agenda retirada" values={agendaRemoved} tone="removed" />
                    <ChangeList title="Entidades incluídas" values={entitiesAdded} tone="added" />
                    <ChangeList title="Entidades retiradas" values={entitiesRemoved} tone="removed" />
                    <ChangeList title="Dados pessoais alterados" values={personalData} />
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                      <p className="font-black text-[#00334E]">Funções</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{functionLabels.length ? functionLabels.join(" • ") : "Somente Filho da Corrente"}</p>
                    </div>
                    <div className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                      <p className="font-black text-[#00334E]">Agenda</p>
                      <div className="mt-2 grid gap-2 text-sm leading-6 text-slate-600">
                        {agendaLabels.length ? agendaLabels.map((label) => <p key={label} className="rounded-xl bg-white/70 p-2 ring-1 ring-[#123D2C]/10">{label}</p>) : <p>Sem agenda selecionada</p>}
                      </div>
                    </div>
                    {selectedEntityLabels.length > 0 && (
                      <div className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10 md:col-span-2">
                        <p className="font-black text-[#00334E]">Entidades que recebe para atendimento</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{selectedEntityLabels.join(" • ")}</p>
                      </div>
                    )}
                  </div>
                )}

                {(request?.created_at || request?.updated_at) && <p className="mt-3 text-xs font-semibold text-slate-500">Enviado em: {new Date(request.updated_at || request.created_at || "").toLocaleString("pt-BR")}</p>}
              </article>
            );
          })}
          {validations.length === 0 && <p className="rounded-3xl bg-white p-5 font-bold text-slate-500 shadow ring-1 ring-slate-100">Nenhum pedido de validação encontrado.</p>}
        </section>
      )}
    </OrganizacaoClientShell>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Person = {
  id: string;
  full_name: string;
};

type Membership = {
  id: string;
  person_id: string;
  status: string | null;
  agenda_viva_profile: Record<string, unknown> | null;
};

type ValidationRequest = {
  id: string;
  person_id: string;
  status: string | null;
  summary: Record<string, unknown> | null;
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

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asTextArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => asText(item)).filter(Boolean)
    : [];
}

function requestType(request: ValidationRequest | null) {
  return asText(asRecord(request?.summary).requestType);
}

function compactName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || "Sem nome";
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function clientLoginUrl() {
  if (typeof window === "undefined") {
    return "/solucoes/organizacao-em-harmonia/login";
  }
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return `/solucoes/organizacao-em-harmonia/login?returnTo=${encodeURIComponent(returnTo)}`;
}

function ChangeList({
  title,
  items,
  empty,
  prefix = "",
}: {
  title: string;
  items: string[];
  empty: string;
  prefix?: string;
}) {
  return (
    <section className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
      <h3 className="font-black text-[#00334E]">{title}</h3>
      <ul className="mt-2 grid gap-1 text-slate-700">
        {(items.length ? items : [empty]).map((item, index) => (
          <li key={`${title}-${index}`}>
            {items.length && prefix ? `${prefix} ` : ""}{item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ValidacoesPrimeiroAcessoPage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingWhatsappUrl, setPendingWhatsappUrl] = useState("");
  const [reviewItem, setReviewItem] = useState<ValidationItem | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const load = useCallback(async () => {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      window.location.replace(clientLoginUrl());
      return;
    }

    const response = await fetch(
      "/api/organizacao-em-harmonia/cliente/base-unica",
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const result = (await response.json()) as Payload;
    if (!response.ok) {
      throw new Error(result.error || "Não foi possível carregar validações.");
    }
    setPayload(result);
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      load()
        .catch((reason) => {
          if (active) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Erro ao carregar validações.",
            );
          }
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
      if (!requestByPerson.has(request.person_id)) {
        requestByPerson.set(request.person_id, request);
      }
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

        const status =
          request?.status ||
          asText(profile.validationStatus) ||
          membership.status ||
          "pendente_primeiro_acesso";
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
        return (
          (order[left.membership.status] ?? 9) -
          (order[right.membership.status] ?? 9)
        );
      });
  }, [payload?.memberships, payload?.people, payload?.validationRequests]);

  async function decide(
    personId: string,
    action:
      | "approveAccess"
      | "requestAccessAdjustment"
      | "deleteAccessValidation",
    isProfileUpdate: boolean,
    reviewNotesOverride = "",
  ) {
    if (action === "deleteAccessValidation") {
      const text = isProfileUpdate
        ? "Excluir esta solicitação de atualização? O acesso e o perfil já aprovados serão preservados."
        : "Excluir este pedido de validação? Isso remove o cadastro pendente para que o teste possa ser repetido.";
      if (!window.confirm(text)) return;
    }

    const reviewNotes =
      action === "requestAccessAdjustment" ? reviewNotesOverride.trim() : "";

    const candidateWindow =
      action === "deleteAccessValidation" ? null : window.open("", "_blank");
    const whatsappWindow =
      candidateWindow && candidateWindow !== window ? candidateWindow : null;
    if (whatsappWindow) {
      try {
        whatsappWindow.opener = null;
      } catch {
        // A aba atual permanece aberta.
      }
      whatsappWindow.document.title = "Abrindo WhatsApp";
      whatsappWindow.document.body.innerHTML =
        '<p style="font-family:Arial,sans-serif;padding:24px">Preparando a mensagem para o WhatsApp...</p>';
    }

    setSaving(true);
    setError("");
    setMessage("");
    setPendingWhatsappUrl("");

    try {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sessão expirada.");
      const response = await fetch(
        "/api/organizacao-em-harmonia/cliente/base-unica",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action, personId, reviewNotes }),
        },
      );
      const result = (await response.json()) as Payload & { error?: string };
      if (!response.ok) {
        throw new Error(
          result.error || "Não foi possível atualizar a validação.",
        );
      }
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
            ? "Atualização aprovada e aplicada."
            : "Acesso liberado."
          : action === "deleteAccessValidation"
            ? "Pedido de validação excluído."
            : isProfileUpdate
              ? "A alteração não foi aplicada e o perfil anterior foi preservado."
              : "Ajuste solicitado.",
      );
      if (action !== "deleteAccessValidation") {
        setReviewItem(null);
        setReviewNotes("");
      }
    } catch (reason) {
      whatsappWindow?.close();
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao atualizar validação.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <OrganizacaoClientShell
      title="Validações"
      description="Aprove, solicite ajustes ou exclua os pedidos recebidos."
    >
      {loading && (
        <p className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">
          Carregando validações...
        </p>
      )}
      {error && (
        <p className="rounded-3xl bg-red-50 p-5 font-bold text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-3xl bg-emerald-50 p-5 font-bold text-emerald-800 ring-1 ring-emerald-100">
          {message}
        </p>
      )}
      {pendingWhatsappUrl && (
        <a
          href={pendingWhatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-2xl bg-[#25D366] px-5 py-3 font-black text-[#073B1D]"
        >
          Abrir mensagem no WhatsApp
        </a>
      )}

      {!loading && payload && (
        <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-[0.18em] text-slate-400">
                  <th className="py-3">Nome</th>
                  <th className="py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {validations.map(({ membership, request, person }) => {
                  const isProfileUpdate = requestType(request) === "profile_update";
                  return (
                    <tr
                      key={`${membership.id}-${request?.id ?? "membership"}`}
                      className="border-b border-slate-50 align-top"
                    >
                      <td className="py-3 pr-4">
                        <p className="font-black text-[#00334E]">
                          {compactName(person.full_name)}
                        </p>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/solucoes/organizacao-em-harmonia/cliente/simular-acesso/${person.id}`}
                            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-[#00334E]"
                          >
                            Simular acesso
                          </Link>
                          {(isProfileUpdate || membership.status !== "ativo") && (
                            <button
                              disabled={saving}
                              type="button"
                              onClick={() => {
                                setReviewNotes("");
                                setReviewItem({ membership, request, person });
                              }}
                              className="rounded-xl bg-[#31C16B] px-4 py-2 text-sm font-black text-[#00334E] disabled:opacity-60"
                            >
                              {isProfileUpdate ? "Aprovar alterações" : "Aprovar"}
                            </button>
                          )}
                          <button
                            disabled={saving}
                            type="button"
                            onClick={() =>
                              void decide(
                                person.id,
                                "deleteAccessValidation",
                                isProfileUpdate,
                              )
                            }
                            className="rounded-xl bg-red-50 px-4 py-2 text-sm font-black text-red-700 disabled:opacity-60"
                          >
                            Excluir pedido
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {validations.length === 0 && (
                  <tr>
                    <td colSpan={2} className="py-5 font-bold text-slate-500">
                      Nenhum pedido de validação encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {reviewItem && (() => {
        const isProfileUpdate =
          requestType(reviewItem.request) === "profile_update";
        const summary = asRecord(reviewItem.request?.summary);
        const details = asRecord(summary.changeDetails);
        const current = asTextArray(details.current);
        const added = asTextArray(details.added);
        const removed = asTextArray(details.removed);
        const profile = reviewItem.membership.agenda_viva_profile ?? {};
        const selectedFunctions = Array.isArray(profile.selectedFunctions)
          ? profile.selectedFunctions
              .map((item) => asText(asRecord(item).label) || asText(asRecord(item).name))
              .filter(Boolean)
          : [];
        const selectedAgenda = Array.isArray(profile.selectedAgenda)
          ? profile.selectedAgenda
              .map((item) => asText(asRecord(item).label) || asText(asRecord(item).name))
              .filter(Boolean)
          : [];

        return (
          <div
            className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
              if (event.currentTarget === event.target && !saving) {
                setReviewItem(null);
                setReviewNotes("");
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="validation-review-title"
              className="max-h-[calc(100dvh-1rem)] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] bg-white p-4 shadow-2xl sm:rounded-[2rem] sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43] sm:text-xs">
                    Validação de acesso
                  </p>
                  <h2
                    id="validation-review-title"
                    className="mt-1 text-xl font-black leading-tight text-[#00334E] sm:text-2xl"
                  >
                    {compactName(reviewItem.person.full_name)}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    Confira o que será aprovado ou indique o que precisa de ajuste.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setReviewItem(null);
                    setReviewNotes("");
                  }}
                  className="shrink-0 rounded-xl bg-[#123D2C] px-3 py-2 text-sm font-black text-white disabled:opacity-50"
                >
                  Fechar
                </button>
              </div>

              {isProfileUpdate ? (
                <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                  <ChangeList
                    title="Cadastro atual"
                    items={current}
                    empty="Sem dados anteriores."
                  />
                  <ChangeList
                    title="Inclusões/alterações"
                    items={added}
                    empty="Nenhuma inclusão."
                    prefix="+"
                  />
                  <ChangeList
                    title="Retiradas"
                    items={removed}
                    empty="Nenhuma retirada."
                    prefix="−"
                  />
                </div>
              ) : (
                <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                  <ChangeList
                    title="Funções solicitadas"
                    items={selectedFunctions}
                    empty="Nenhuma função adicional informada."
                  />
                  <ChangeList
                    title="Agenda solicitada"
                    items={selectedAgenda}
                    empty="Nenhum evento informado."
                  />
                </div>
              )}

              <label className="mt-4 grid gap-1 text-sm font-black text-[#00334E]">
                Orientação para ajuste
                <textarea
                  value={reviewNotes}
                  onChange={(event) => setReviewNotes(event.target.value)}
                  className="min-h-24 rounded-2xl border border-slate-200 p-3 font-semibold outline-none focus:border-[#2F6B43]"
                  placeholder="Preencha somente se for pedir ajuste."
                />
              </label>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    void decide(
                      reviewItem.person.id,
                      "approveAccess",
                      isProfileUpdate,
                    )
                  }
                  className="rounded-xl bg-[#31C16B] px-4 py-3 font-black text-[#00334E] disabled:opacity-50"
                >
                  {isProfileUpdate ? "Aprovar alterações" : "Aprovar"}
                </button>
                <button
                  type="button"
                  disabled={saving || !reviewNotes.trim()}
                  onClick={() =>
                    void decide(
                      reviewItem.person.id,
                      "requestAccessAdjustment",
                      isProfileUpdate,
                      reviewNotes,
                    )
                  }
                  className="rounded-xl bg-amber-50 px-4 py-3 font-black text-amber-900 ring-1 ring-amber-200 disabled:opacity-40"
                >
                  Pedir ajuste
                </button>
              </div>
            </section>
          </div>
        );
      })()}
    </OrganizacaoClientShell>
  );
}

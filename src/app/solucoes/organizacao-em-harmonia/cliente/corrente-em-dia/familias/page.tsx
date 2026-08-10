"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Person = {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp: string | null;
};

type RelationshipType = {
  id: string;
  label: string;
  active: boolean;
};

type Group = {
  id: string;
  name: string;
  responsible_person_id: string | null;
  contribution_mode: string;
  status: string;
  notes: string | null;
  requested_amount: number | string | null;
  approved_amount: number | string | null;
  decision_notes: string | null;
  submitted_at: string | null;
  decided_at: string | null;
  approved_at: string | null;
  created_at: string;
};

type Member = {
  id: string;
  family_group_id: string;
  person_id: string;
  relationship_type_id: string | null;
  individual_amount: number | null;
  included_in_payment: boolean;
  member_confirmed_at: string | null;
  financial_approved_at: string | null;
  active: boolean;
};

type Payload = {
  people?: Person[];
  relationshipTypes?: RelationshipType[];
  groups?: Group[];
  members?: Member[];
  error?: string;
};

type DecisionDraft = {
  approvedAmount: string;
  notes: string;
};

const contributionModes: Record<string, string> = {
  consolidada: "Uma contribuição para toda a família",
  valores_individuais: "Uma cobrança com valores individuais",
  separada: "Contribuições separadas",
  parcial: "Responsável paga somente por alguns integrantes",
};

const statusLabels: Record<string, string> = {
  aguardando_aprovacao: "Aguardando aprovação",
  ativo: "Aprovada",
  rejeitado: "Não aprovada",
  substituido: "Substituída",
  cancelado: "Cancelada",
};

function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0);
}

function dateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function parseMoney(value: string) {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function statusClasses(status: string) {
  if (status === "ativo") return "bg-emerald-100 text-emerald-900";
  if (status === "aguardando_aprovacao") return "bg-amber-100 text-amber-900";
  if (status === "rejeitado") return "bg-red-100 text-red-800";
  return "bg-slate-100 text-slate-700";
}

export default function FamiliasPage() {
  const [payload, setPayload] = useState<Payload>({});
  const [groupName, setGroupName] = useState("");
  const [responsiblePersonId, setResponsiblePersonId] = useState("");
  const [contributionMode, setContributionMode] = useState("consolidada");
  const [manualApprovedAmount, setManualApprovedAmount] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [memberPersonId, setMemberPersonId] = useState("");
  const [relationshipTypeId, setRelationshipTypeId] = useState("");
  const [individualAmount, setIndividualAmount] = useState("");
  const [includedInPayment, setIncludedInPayment] = useState(true);
  const [decisionDrafts, setDecisionDrafts] = useState<
    Record<string, DecisionDraft>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const token = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    return data.session?.access_token ?? "";
  }, []);

  const load = useCallback(async () => {
    const accessToken = await token();
    const response = await fetch(
      "/api/organizacao-em-harmonia/cliente/corrente-em-dia/familias",
      {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
        cache: "no-store",
      },
    );
    const result = (await response.json()) as Payload;
    if (!response.ok) {
      throw new Error(result.error || "Não foi possível carregar as famílias.");
    }

    setPayload(result);
    setSelectedGroupId((current) => current || result.groups?.[0]?.id || "");
    setDecisionDrafts((current) => {
      const next = { ...current };
      for (const group of result.groups ?? []) {
        if (group.status !== "aguardando_aprovacao" || next[group.id]) continue;
        next[group.id] = {
          approvedAmount: String(group.requested_amount ?? "").replace(".", ","),
          notes: "",
        };
      }
      return next;
    });
  }, [token]);

  useEffect(() => {
    let active = true;
    const timerId = window.setTimeout(() => {
      void load()
        .catch((reason) => {
          if (active) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Erro ao carregar famílias.",
            );
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timerId);
    };
  }, [load]);

  const peopleMap = useMemo(
    () => new Map((payload.people ?? []).map((person) => [person.id, person])),
    [payload.people],
  );

  const relationshipMap = useMemo(
    () =>
      new Map(
        (payload.relationshipTypes ?? []).map((item) => [item.id, item.label]),
      ),
    [payload.relationshipTypes],
  );

  const activeRelationships = useMemo(
    () => (payload.relationshipTypes ?? []).filter((item) => item.active),
    [payload.relationshipTypes],
  );

  const membersByGroup = useMemo(() => {
    const map = new Map<string, Member[]>();
    for (const member of payload.members ?? []) {
      const list = map.get(member.family_group_id) ?? [];
      list.push(member);
      map.set(member.family_group_id, list);
    }
    return map;
  }, [payload.members]);

  const pendingGroups = useMemo(
    () =>
      (payload.groups ?? []).filter(
        (group) => group.status === "aguardando_aprovacao",
      ),
    [payload.groups],
  );

  const otherGroups = useMemo(
    () =>
      (payload.groups ?? []).filter(
        (group) => group.status !== "aguardando_aprovacao",
      ),
    [payload.groups],
  );

  async function post(body: Record<string, unknown>) {
    const accessToken = await token();
    const response = await fetch(
      "/api/organizacao-em-harmonia/cliente/corrente-em-dia/familias",
      {
        method: "POST",
        headers: {
          ...(accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      group?: Group;
    };
    if (!response.ok) {
      throw new Error(result.error || "Não foi possível salvar.");
    }
    return result;
  }

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving("create-group");
    setError("");
    setMessage("");
    try {
      const result = await post({
        action: "createGroup",
        name: groupName,
        responsiblePersonId,
        contributionMode,
        approvedAmount: parseMoney(manualApprovedAmount),
      });
      setGroupName("");
      setResponsiblePersonId("");
      setManualApprovedAmount("");
      setMessage(result.message || "Grupo familiar criado.");
      if (result.group?.id) setSelectedGroupId(result.group.id);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Erro ao criar família.",
      );
    } finally {
      setSaving("");
    }
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving("add-member");
    setError("");
    setMessage("");
    try {
      const result = await post({
        action: "addMember",
        familyGroupId: selectedGroupId,
        personId: memberPersonId,
        relationshipTypeId,
        individualAmount: individualAmount
          ? parseMoney(individualAmount)
          : null,
        includedInPayment,
      });
      setMemberPersonId("");
      setRelationshipTypeId("");
      setIndividualAmount("");
      setMessage(result.message || "Integrante incluído.");
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Erro ao incluir integrante.",
      );
    } finally {
      setSaving("");
    }
  }

  async function decideGroup(group: Group, decision: "approve" | "reject") {
    const draft = decisionDrafts[group.id] ?? {
      approvedAmount: String(group.requested_amount ?? "").replace(".", ","),
      notes: "",
    };
    const approvedAmount = parseMoney(draft.approvedAmount);

    if (decision === "approve" && approvedAmount <= 0) {
      setError("Informe um valor aprovado maior que zero.");
      return;
    }

    const verb = decision === "approve" ? "aprovar" : "não aprovar";
    if (!window.confirm(`Confirma ${verb} esta contribuição familiar?`)) return;

    setSaving(`decision-${group.id}`);
    setError("");
    setMessage("");
    try {
      const result = await post({
        action: "decideGroup",
        groupId: group.id,
        decision,
        approvedAmount,
        decisionNotes: draft.notes,
      });
      setMessage(result.message || "Solicitação analisada.");
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao analisar a solicitação.",
      );
    } finally {
      setSaving("");
    }
  }

  async function removeMember(member: Member) {
    const person = peopleMap.get(member.person_id);
    if (
      !window.confirm(
        `Remover ${person?.full_name ?? "esta pessoa"} do grupo familiar?`,
      )
    ) {
      return;
    }

    setSaving(`remove-${member.id}`);
    setError("");
    try {
      const result = await post({
        action: "removeMember",
        memberId: member.id,
      });
      setMessage(result.message || "Integrante removido.");
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Erro ao remover integrante.",
      );
    } finally {
      setSaving("");
    }
  }

  function groupMemberSummary(groupId: string) {
    return (membersByGroup.get(groupId) ?? []).map((member) => {
      const person = peopleMap.get(member.person_id);
      return {
        ...member,
        fullName: person?.full_name ?? "Pessoa não localizada",
        relationshipLabel: member.relationship_type_id
          ? relationshipMap.get(member.relationship_type_id) ?? "Parentesco"
          : "Parentesco não informado",
      };
    });
  }

  return (
    <OrganizacaoClientShell
      title="Contribuições familiares"
      description="Analise solicitações dos Filhos da Corrente, aprove o valor familiar e mantenha os agregados que serão considerados em cada contribuição."
    >
      {loading && (
        <p className="rounded-2xl bg-white p-4 font-bold text-slate-500 shadow">
          Carregando famílias...
        </p>
      )}
      {error && (
        <p className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">
          {message}
        </p>
      )}

      <section className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#CFE2C7]">
          Regra de proteção
        </p>
        <h2 className="mt-2 text-xl font-black">
          Aprovar a família é validar cuidado, valor e responsabilidade.
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#EEF7EA]">
          Confira o valor solicitado, os Filhos da Corrente agregados e os graus de parentesco. Depois da aprovação, essa composição passa a aparecer automaticamente no fluxo de contribuição do responsável.
        </p>
      </section>

      <section className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
              Pendências
            </p>
            <h2 className="mt-1 text-2xl font-black text-[#00334E]">
              Solicitações aguardando análise
            </h2>
          </div>
          <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-black text-amber-900">
            {pendingGroups.length} pendente{pendingGroups.length === 1 ? "" : "s"}
          </span>
        </div>

        {pendingGroups.map((group) => {
          const responsible = group.responsible_person_id
            ? peopleMap.get(group.responsible_person_id)
            : null;
          const members = groupMemberSummary(group.id);
          const draft = decisionDrafts[group.id] ?? {
            approvedAmount: String(group.requested_amount ?? "").replace(".", ","),
            notes: "",
          };
          const deciding = saving === `decision-${group.id}`;

          return (
            <article
              key={group.id}
              className="rounded-[2rem] border-2 border-amber-200 bg-white p-5 shadow sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-[#00334E]">
                    {group.name}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    Responsável: {responsible?.full_name ?? "Não localizado"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Enviada em {dateTime(group.submitted_at || group.created_at)}
                  </p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">
                  Aguardando aprovação
                </span>
              </div>

              <div className="mt-4 rounded-2xl bg-[#F7FAF2] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
                  Valor solicitado
                </p>
                <p className="mt-1 text-3xl font-black text-[#123D2C]">
                  {money(group.requested_amount)}
                </p>
              </div>

              <div className="mt-4 grid gap-2">
                <p className="font-black text-[#123D2C]">
                  Agregados desta contribuição
                </p>
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="rounded-2xl bg-[#E9F2E7] p-3"
                  >
                    <p className="font-black text-[#123D2C]">
                      {member.fullName}
                    </p>
                    <p className="text-sm font-semibold text-slate-600">
                      {member.relationshipLabel}
                    </p>
                  </div>
                ))}
                {members.length === 0 && (
                  <p className="rounded-2xl bg-red-50 p-3 font-bold text-red-700">
                    A solicitação não possui integrantes ativos. Revise antes de aprovar.
                  </p>
                )}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 font-black text-[#123D2C]">
                  Valor aprovado
                  <input
                    value={draft.approvedAmount}
                    onChange={(event) =>
                      setDecisionDrafts((current) => ({
                        ...current,
                        [group.id]: {
                          ...draft,
                          approvedAmount: event.target.value,
                        },
                      }))
                    }
                    inputMode="decimal"
                    className="rounded-2xl border border-slate-200 p-4"
                    placeholder="Ex.: 150,00"
                  />
                </label>
                <label className="grid gap-2 font-black text-[#123D2C]">
                  Observação da decisão
                  <textarea
                    value={draft.notes}
                    onChange={(event) =>
                      setDecisionDrafts((current) => ({
                        ...current,
                        [group.id]: {
                          ...draft,
                          notes: event.target.value,
                        },
                      }))
                    }
                    rows={3}
                    className="rounded-2xl border border-slate-200 p-4"
                    placeholder="Registre uma orientação quando necessário."
                  />
                </label>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => decideGroup(group, "approve")}
                  disabled={deciding || members.length === 0}
                  className="rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white disabled:opacity-50"
                >
                  {deciding ? "Salvando..." : "Aprovar contribuição familiar"}
                </button>
                <button
                  type="button"
                  onClick={() => decideGroup(group, "reject")}
                  disabled={deciding}
                  className="rounded-2xl bg-red-50 px-5 py-4 font-black text-red-700 ring-1 ring-red-100 disabled:opacity-50"
                >
                  Não aprovar
                </button>
              </div>
            </article>
          );
        })}

        {!loading && pendingGroups.length === 0 && (
          <p className="rounded-2xl bg-white p-5 font-bold text-slate-500 shadow">
            Nenhuma solicitação familiar aguarda aprovação.
          </p>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <form
          onSubmit={createGroup}
          className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6"
        >
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
            Cadastro administrativo
          </p>
          <h2 className="mt-2 text-xl font-black text-[#00334E]">
            Criar uma família diretamente
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Use quando a Tesouraria/Financeiro já conferiu a composição fora do fluxo de solicitação.
          </p>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 font-black text-[#123D2C]">
              Nome da família
              <input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Ex.: Família Silva"
                className="rounded-2xl border border-slate-200 p-4"
              />
            </label>
            <label className="grid gap-2 font-black text-[#123D2C]">
              Responsável financeiro
              <select
                value={responsiblePersonId}
                onChange={(event) => setResponsiblePersonId(event.target.value)}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <option value="">Selecione</option>
                {(payload.people ?? []).map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 font-black text-[#123D2C]">
              Valor aprovado
              <input
                value={manualApprovedAmount}
                onChange={(event) => setManualApprovedAmount(event.target.value)}
                inputMode="decimal"
                placeholder="Ex.: 150,00"
                className="rounded-2xl border border-slate-200 p-4"
              />
            </label>
            <label className="grid gap-2 font-black text-[#123D2C]">
              Forma de organização
              <select
                value={contributionMode}
                onChange={(event) => setContributionMode(event.target.value)}
                className="rounded-2xl border border-slate-200 p-4"
              >
                {Object.entries(contributionModes).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button
              disabled={
                saving === "create-group" ||
                !groupName.trim() ||
                !responsiblePersonId
              }
              className="rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white disabled:opacity-50"
            >
              {saving === "create-group" ? "Criando..." : "Criar grupo familiar"}
            </button>
          </div>
        </form>

        <form
          onSubmit={addMember}
          className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6"
        >
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
            Manutenção
          </p>
          <h2 className="mt-2 text-xl font-black text-[#00334E]">
            Incluir pessoa em um grupo existente
          </h2>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 font-black text-[#123D2C]">
              Grupo familiar
              <select
                value={selectedGroupId}
                onChange={(event) => setSelectedGroupId(event.target.value)}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <option value="">Selecione</option>
                {(payload.groups ?? []).map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} · {statusLabels[group.status] ?? group.status}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 font-black text-[#123D2C]">
              Pessoa
              <select
                value={memberPersonId}
                onChange={(event) => setMemberPersonId(event.target.value)}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <option value="">Selecione</option>
                {(payload.people ?? []).map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 font-black text-[#123D2C]">
              Grau de parentesco
              <select
                value={relationshipTypeId}
                onChange={(event) => setRelationshipTypeId(event.target.value)}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <option value="">Selecione</option>
                {activeRelationships.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 font-black text-[#123D2C]">
              Valor individual opcional
              <input
                value={individualAmount}
                onChange={(event) => setIndividualAmount(event.target.value)}
                inputMode="decimal"
                placeholder="Ex.: 50,00"
                className="rounded-2xl border border-slate-200 p-4"
              />
            </label>
            <label className="flex items-start gap-3 rounded-2xl bg-[#F7FAF2] p-4">
              <input
                type="checkbox"
                checked={includedInPayment}
                onChange={(event) => setIncludedInPayment(event.target.checked)}
                className="mt-1 h-5 w-5"
              />
              <span className="font-black text-[#123D2C]">
                Incluir esta pessoa no pagamento do responsável
              </span>
            </label>
            <button
              disabled={
                saving === "add-member" ||
                !selectedGroupId ||
                !memberPersonId ||
                !relationshipTypeId
              }
              className="rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white disabled:opacity-50"
            >
              {saving === "add-member" ? "Incluindo..." : "Incluir integrante"}
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
            Histórico e grupos ativos
          </p>
          <h2 className="mt-1 text-2xl font-black text-[#00334E]">
            Composições familiares registradas
          </h2>
        </div>

        {otherGroups.map((group) => {
          const responsible = group.responsible_person_id
            ? peopleMap.get(group.responsible_person_id)
            : null;
          const members = groupMemberSummary(group.id);

          return (
            <article
              key={group.id}
              className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-[#00334E]">
                    {group.name}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Responsável: {responsible?.full_name ?? "Não definido"} ·{" "}
                    {contributionModes[group.contribution_mode] ??
                      group.contribution_mode}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Solicitado: {money(group.requested_amount)}
                    {group.approved_amount
                      ? ` · Aprovado: ${money(group.approved_amount)}`
                      : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${statusClasses(group.status)}`}
                >
                  {statusLabels[group.status] ?? group.status}
                </span>
              </div>

              {group.decision_notes && (
                <p className="mt-4 rounded-2xl bg-[#F7FAF2] p-4 text-sm font-semibold text-slate-600">
                  Observação da análise: {group.decision_notes}
                </p>
              )}

              <div className="mt-4 grid gap-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#F7FAF2] p-4"
                  >
                    <div>
                      <p className="font-black text-[#123D2C]">
                        {member.fullName}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {member.relationshipLabel}
                        {member.individual_amount
                          ? ` · ${money(member.individual_amount)}`
                          : ""}
                        {member.included_in_payment ? " · incluído no pagamento" : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMember(member)}
                      disabled={saving === `remove-${member.id}`}
                      className="rounded-xl bg-red-50 px-3 py-2 text-sm font-black text-red-700 disabled:opacity-50"
                    >
                      Remover
                    </button>
                  </div>
                ))}
                {members.length === 0 && (
                  <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">
                    Nenhum integrante incluído.
                  </p>
                )}
              </div>
            </article>
          );
        })}

        {!loading && otherGroups.length === 0 && pendingGroups.length === 0 && (
          <p className="rounded-2xl bg-white p-5 font-bold text-slate-500 shadow">
            Nenhum grupo familiar cadastrado.
          </p>
        )}
      </section>
    </OrganizacaoClientShell>
  );
}

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
};

type Member = {
  id: string;
  family_group_id: string;
  person_id: string;
  relationship_type_id: string | null;
  individual_amount: number | null;
  included_in_payment: boolean;
};

type Payload = {
  people?: Person[];
  relationshipTypes?: RelationshipType[];
  groups?: Group[];
  members?: Member[];
  error?: string;
};

const contributionModes: Record<string, string> = {
  consolidada: "Uma contribuição para toda a família",
  valores_individuais: "Uma cobrança com valores individuais",
  separada: "Contribuições separadas",
  parcial: "Responsável paga somente por alguns integrantes",
};

export default function FamiliasPage() {
  const [payload, setPayload] = useState<Payload>({});
  const [groupName, setGroupName] = useState("");
  const [responsiblePersonId, setResponsiblePersonId] = useState("");
  const [contributionMode, setContributionMode] = useState("consolidada");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [memberPersonId, setMemberPersonId] = useState("");
  const [relationshipTypeId, setRelationshipTypeId] = useState("");
  const [individualAmount, setIndividualAmount] = useState("");
  const [includedInPayment, setIncludedInPayment] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    if (!selectedGroupId && result.groups?.[0]?.id) {
      setSelectedGroupId(result.groups[0].id);
    }
  }, [selectedGroupId, token]);

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
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await post({
        action: "createGroup",
        name: groupName,
        responsiblePersonId,
        contributionMode,
      });
      setGroupName("");
      setResponsiblePersonId("");
      setMessage(result.message || "Grupo familiar criado.");
      if (result.group?.id) setSelectedGroupId(result.group.id);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Erro ao criar família.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await post({
        action: "addMember",
        familyGroupId: selectedGroupId,
        personId: memberPersonId,
        relationshipTypeId,
        individualAmount: individualAmount
          ? Number(individualAmount.replace(",", "."))
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
      setSaving(false);
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

    setSaving(true);
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
      setSaving(false);
    }
  }

  return (
    <OrganizacaoClientShell
      title="Contribuições familiares"
      description="Organize vínculos familiares com confirmação, aprovação e sigilo. Cada integrante continua vendo somente as informações autorizadas."
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
          Vínculo familiar não significa exposição financeira.
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#EEF7EA]">
          A Tesouraria/Financeiro define os graus permitidos, aprova a composição e escolhe como a contribuição será organizada. Os valores individuais não ficam visíveis entre familiares sem autorização.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <form
          onSubmit={createGroup}
          className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6"
        >
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
            Novo grupo
          </p>
          <h2 className="mt-2 text-xl font-black text-[#00334E]">
            Defina o responsável financeiro
          </h2>

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
                saving || !groupName.trim() || !responsiblePersonId
              }
              className="rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white disabled:opacity-50"
            >
              Criar grupo familiar
            </button>
          </div>
        </form>

        <form
          onSubmit={addMember}
          className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6"
        >
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
            Integrantes
          </p>
          <h2 className="mt-2 text-xl font-black text-[#00334E]">
            Inclua uma pessoa já cadastrada na Base Única
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
                    {group.name}
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
                onChange={(event) =>
                  setIncludedInPayment(event.target.checked)
                }
                className="mt-1 h-5 w-5"
              />
              <span className="font-black text-[#123D2C]">
                Incluir esta pessoa no pagamento do responsável
              </span>
            </label>
            <button
              disabled={
                saving ||
                !selectedGroupId ||
                !memberPersonId ||
                !relationshipTypeId
              }
              className="rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white disabled:opacity-50"
            >
              Incluir integrante
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-4">
        {(payload.groups ?? []).map((group) => {
          const responsible = group.responsible_person_id
            ? peopleMap.get(group.responsible_person_id)
            : null;
          const members = membersByGroup.get(group.id) ?? [];

          return (
            <article
              key={group.id}
              className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-[#00334E]">
                    {group.name}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Responsável:{" "}
                    {responsible?.full_name ?? "Não definido"} ·{" "}
                    {contributionModes[group.contribution_mode] ??
                      group.contribution_mode}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">
                  {members.length} integrante{members.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mt-4 grid gap-2">
                {members.map((member) => {
                  const person = peopleMap.get(member.person_id);
                  return (
                    <div
                      key={member.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#F7FAF2] p-4"
                    >
                      <div>
                        <p className="font-black text-[#123D2C]">
                          {person?.full_name ?? "Pessoa"}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {member.relationship_type_id
                            ? relationshipMap.get(member.relationship_type_id)
                            : "Parentesco não informado"}
                          {member.individual_amount
                            ? ` · R$ ${Number(member.individual_amount).toLocaleString(
                                "pt-BR",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )}`
                            : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMember(member)}
                        disabled={saving}
                        className="rounded-xl bg-red-50 px-3 py-2 text-sm font-black text-red-700"
                      >
                        Remover
                      </button>
                    </div>
                  );
                })}
                {members.length === 0 && (
                  <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">
                    Nenhum integrante incluído.
                  </p>
                )}
              </div>
            </article>
          );
        })}

        {!loading && (payload.groups ?? []).length === 0 && (
          <p className="rounded-2xl bg-white p-5 font-bold text-slate-500 shadow">
            Nenhum grupo familiar cadastrado.
          </p>
        )}
      </section>
    </OrganizacaoClientShell>
  );
}

"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import {
  filhoDaCorrenteAgenda as fallbackFilhoDaCorrenteAgenda,
  filhoDaCorrenteFunctions,
} from "../tucxa-content";

type AccessPerson = {
  fullName: string;
  whatsapp: string;
  email: string;
  notes: string;
  accessStatus: string;
  modules: string[];
  profile?: {
    functionSlugs?: string[];
    agendaSlugs?: string[];
  } | null;
};

type EntityOption = {
  id: string;
  name: string;
  line?: string;
  entityType?: string;
  appointmentEnabled?: boolean;
};

type CavalinhoEntitiesPayload = {
  ok?: boolean;
  entities?: EntityOption[];
  error?: string;
};

type AgendaOption = {
  slug: string;
  label: string;
  title?: string;
  dateLabel?: string;
  timeLabel?: string;
  recurrenceLabel?: string;
  locationLabel?: string;
  description?: string;
};


type FirstAccessDraft = {
  fullName: string;
  whatsapp: string;
  email: string;
  password: string;
  notes: string;
  functionSlugs: string[];
  agendaSlugs: string[];
  selectedFunctions: Array<{ slug: string; label: string }>;
  selectedAgenda: Array<{ slug: string; label: string; description: string }>;
  cavalinhoEntityIds: string[];
  selectedEntities: Array<{ id: string; name: string }>;
  createdAt: string;
};

const FIRST_ACCESS_DRAFT_KEY = "oh_tucxa_filho_corrente_primeiro_acesso";

const statusLabels: Record<string, string> = {
  ativo: "Acesso liberado",
  pendente_validacao: "Aguardando validação do responsável do Tucxa",
  ajuste_solicitado: "Ajuste solicitado",
  inativo: "Cadastro inativo",
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export default function FilhoDaCorrenteTucxaPage() {

  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupShowPassword, setSignupShowPassword] = useState(false);
  const [notes, setNotes] = useState("");
  const [functionSlugs, setFunctionSlugs] = useState<string[]>([]);
  const [agendaSlugs, setAgendaSlugs] = useState<string[]>([]);
  const [agendaOptions, setAgendaOptions] = useState<AgendaOption[]>([
    ...fallbackFilhoDaCorrenteAgenda,
  ]);
  const [entityOptions, setEntityOptions] = useState<EntityOption[]>([]);
  const [cavalinhoEntityIds, setCavalinhoEntityIds] = useState<string[]>([]);
  const [cavalinhoEntityDraftId, setCavalinhoEntityDraftId] = useState("");
  const [entityModalOpen, setEntityModalOpen] = useState(false);
  const submitLoading = false;
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [foundPerson] = useState<AccessPerson | null>(null);

  useEffect(() => {
    let active = true;

    const timer = window.setTimeout(() => {
      void Promise.all([
        fetch("/api/organizacao-em-harmonia/site-tucxa/agenda-options"),
        fetch("/api/organizacao-em-harmonia/site-tucxa/cavalinho-entities"),
      ])
        .then(async ([agendaResponse, entitiesResponse]) => {
          const agendaResult = (await agendaResponse.json().catch(() => ({}))) as {
            options?: Array<Partial<AgendaOption>>;
            entities?: Array<Partial<EntityOption>>;
          };
          const entitiesResult = (await entitiesResponse.json().catch(() => ({}))) as CavalinhoEntitiesPayload;

          if (!active) return;

          const options = (agendaResult.options ?? [])
            .map((item) => ({
              slug: String(item.slug || "").trim(),
              label: String(item.label || "").trim(),
              title: typeof item.title === "string" ? item.title.trim() : undefined,
              dateLabel: typeof item.dateLabel === "string" ? item.dateLabel.trim() : undefined,
              timeLabel: typeof item.timeLabel === "string" ? item.timeLabel.trim() : undefined,
              recurrenceLabel: typeof item.recurrenceLabel === "string" ? item.recurrenceLabel.trim() : undefined,
              locationLabel: typeof item.locationLabel === "string" ? item.locationLabel.trim() : undefined,
              description: typeof item.description === "string" ? item.description.trim() : undefined,
            }))
            .filter((item) => item.slug && item.label);

          if (agendaResponse.ok && options.length) setAgendaOptions(options);

          const sourceEntities = entitiesResponse.ok && entitiesResult.entities?.length
            ? entitiesResult.entities
            : agendaResult.entities ?? [];

          setEntityOptions(sourceEntities.flatMap((item) => {
            const id = typeof item.id === "string" ? item.id.trim() : "";
            const name = typeof item.name === "string" ? item.name.trim() : "";
            if (!id || !name) return [];

            return [{
              id,
              name,
              line: typeof item.line === "string" ? item.line : "",
              entityType: typeof item.entityType === "string" ? item.entityType : "",
              appointmentEnabled: item.appointmentEnabled !== false,
            }];
          }));
        })
        .catch(() => undefined);
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const focus = params.get("modo");
    if (focus === "primeiro-acesso") {
      window.setTimeout(
        () =>
          document
            .getElementById("primeiro-acesso")
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        150,
      );
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("ajuste") !== "1") return;

      const raw = window.sessionStorage.getItem(FIRST_ACCESS_DRAFT_KEY);
      if (!raw) return;

      try {
        const draft = JSON.parse(raw) as Partial<FirstAccessDraft>;
        setFullName(typeof draft.fullName === "string" ? draft.fullName : "");
        setWhatsapp(typeof draft.whatsapp === "string" ? draft.whatsapp : "");
        setEmail(typeof draft.email === "string" ? draft.email : "");
        setSignupPassword(
          typeof draft.password === "string" ? draft.password : "",
        );
        setNotes(typeof draft.notes === "string" ? draft.notes : "");
        setFunctionSlugs(
          Array.isArray(draft.functionSlugs)
            ? draft.functionSlugs.filter(
                (item): item is string => typeof item === "string",
              )
            : [],
        );
        setAgendaSlugs(
          Array.isArray(draft.agendaSlugs)
            ? draft.agendaSlugs.filter(
                (item): item is string => typeof item === "string",
              )
            : [],
        );
        setCavalinhoEntityIds(Array.isArray(draft.cavalinhoEntityIds) ? draft.cavalinhoEntityIds.filter((item): item is string => typeof item === "string").slice(0, 1) : []);
      } catch {
        window.sessionStorage.removeItem(FIRST_ACCESS_DRAFT_KEY);
      }
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const selectedFunctions = useMemo(
    () =>
      filhoDaCorrenteFunctions
        .filter((item) => functionSlugs.includes(item.slug))
        .map((item) => ({ slug: item.slug, label: item.label })),
    [functionSlugs],
  );

  const hasCavalinho = functionSlugs.includes("cavalinho");
  const selectedEntities = useMemo(
    () => entityOptions.filter((item) => cavalinhoEntityIds.includes(item.id)).map((item) => ({ id: item.id, name: item.name })),
    [cavalinhoEntityIds, entityOptions],
  );

  const selectedAgenda = useMemo(
    () =>
      agendaOptions
        .filter((item) => agendaSlugs.includes(item.slug))
        .map((item) => ({
          slug: item.slug,
          label: item.label,
          description:
            item.description ||
            [item.recurrenceLabel, item.dateLabel, item.timeLabel]
              .filter(Boolean)
              .join(" • ") +
              (item.locationLabel ? ` Local: ${item.locationLabel}` : ""),
        })),
    [agendaOptions, agendaSlugs],
  );

  const selectedSummary = useMemo(
    () => ({
      functions: selectedFunctions.length,
      agenda: selectedAgenda.length,
    }),
    [selectedAgenda.length, selectedFunctions.length],
  );

  function openEntityModal() {
    setCavalinhoEntityDraftId(cavalinhoEntityIds[0] ?? "");
    setEntityModalOpen(true);
  }

  function saveEntitySelection() {
    if (!cavalinhoEntityDraftId) return;
    setCavalinhoEntityIds([cavalinhoEntityDraftId]);
    setEntityModalOpen(false);
  }

  function toggleFunction(slug: string) {
    const selected = functionSlugs.includes(slug);
    setFunctionSlugs((current) => toggleValue(current, slug));

    if (slug === "cavalinho") {
      if (selected) {
        setCavalinhoEntityIds([]);
        setCavalinhoEntityDraftId("");
      } else {
        window.setTimeout(openEntityModal, 0);
      }
    }
  }

  async function submitFirstAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!fullName.trim()) {
      setError("Informe seu nome completo.");
      return;
    }
    if (onlyDigits(whatsapp).length < 10) {
      setError(
        "Informe seu WhatsApp com DDD. Este é o principal canal de orientação do Tucxa.",
      );
      return;
    }
    if (functionSlugs.length === 0) {
      const confirmed = window.confirm(
        "Você não marcou nenhuma função além de Filho da Corrente. Confirma que atualmente é somente Filho da Corrente e não participa de nenhuma outra função listada?",
      );
      if (!confirmed) return;
    }
    if (hasCavalinho && cavalinhoEntityIds.length === 0) {
      setError("Selecione a entidade que você recebe para atender Consulentes.");
      openEntityModal();
      return;
    }
    if (signupPassword.length < 8) {
      setError(
        "Crie uma senha com pelo menos 8 caracteres para os próximos acessos.",
      );
      return;
    }
    if (email && !email.includes("@")) {
      setError("Confira o e-mail informado ou deixe o campo em branco.");
      return;
    }

    const draft: FirstAccessDraft = {
      fullName: fullName.trim(),
      whatsapp: whatsapp.trim(),
      email: email.trim(),
      password: signupPassword,
      notes: notes.trim(),
      functionSlugs,
      agendaSlugs,
      selectedFunctions,
      selectedAgenda,
      cavalinhoEntityIds: hasCavalinho ? cavalinhoEntityIds : [],
      selectedEntities: hasCavalinho ? selectedEntities : [],
      createdAt: new Date().toISOString(),
    };

    window.sessionStorage.setItem(
      FIRST_ACCESS_DRAFT_KEY,
      JSON.stringify(draft),
    );
    window.location.href =
      "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/confirmar";
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={[
          { label: "Primeiro acesso", href: "#primeiro-acesso", variant: "primary" },
          { label: "Site Tucxa", href: "/solucoes/organizacao-em-harmonia/tucxa", variant: "secondary" },
          { label: "Acesso liberado", href: "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login", variant: "secondary" },
        ]}
        navLabel="Menu dos Filhos da Corrente do Tucxa"
      />

      <section
        id="inicio"
        className="mx-auto grid max-w-6xl scroll-mt-48 gap-5 px-4 py-5 sm:scroll-mt-44 sm:px-6 lg:px-8 lg:py-8"
      >
        <div
          id="primeiro-acesso"
          className="order-2 scroll-mt-48 rounded-[1.75rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:scroll-mt-44 sm:p-6 lg:max-w-3xl lg:mx-auto"
        >
          <div className="rounded-[1.5rem] bg-[#E9F2E7] p-4 ring-1 ring-[#123D2C]/10">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2F6B43]">
              Primeiro acesso
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#123D2C]">
              Confirme seus dados para validação
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Nome completo e WhatsApp são obrigatórios. O e-mail é opcional,
              mas recomendado para receber orientações também fora do grupo de
              recados do WhatsApp.
            </p>
          </div>

          <div className="mt-4 rounded-3xl bg-[#123D2C] p-4 text-white shadow-lg shadow-green-900/10">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7]">
              Importante
            </p>
            <h2 className="mt-2 text-xl font-black">
              Informe somente o que se aplica a você.
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#EEF7EA]">
              As funções adicionais e a agenda ajudam a casa a orientar melhor
              cada filho, organizar grupos, evitar chamadas duplicadas e
              preparar os módulos Agenda Viva, Atendimento em Harmonia e
              Corrente em Dia com mais segurança.
            </p>
          </div>

          {foundPerson && (
            <div className="mt-4 rounded-3xl bg-blue-50 p-4 text-sm leading-6 text-[#123D2C] ring-1 ring-blue-100">
              <p className="font-black">Dados encontrados na Base Única</p>
              <p>
                Confira e ajuste abaixo. Status atual:{" "}
                {statusLabels[foundPerson.accessStatus] ??
                  foundPerson.accessStatus}
              </p>
            </div>
          )}

          <form onSubmit={submitFirstAccess} className="mt-5 grid gap-4">
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">
                Nome completo *
              </span>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="rounded-2xl border border-[#123D2C]/15 p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]"
                placeholder="Seu nome completo"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">
                Celular/WhatsApp *
              </span>
              <input
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                inputMode="tel"
                className="rounded-2xl border border-[#123D2C]/15 p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]"
                placeholder="(19) 99999-9999"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">E-mail</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                className="rounded-2xl border border-[#123D2C]/15 p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]"
                placeholder="Opcional, mas recomendado"
              />
              <span className="text-xs font-semibold text-slate-600">
                Com o e-mail, você recebe comunicados importantes em dois canais
                e reduz o risco de perder alguma orientação.
              </span>
            </label>

            <div className="rounded-3xl border border-[#123D2C]/10 bg-[#F7FAF2] p-4">
              <p className="text-sm font-black text-[#123D2C]">Função</p>
              <p className="mt-1 text-xs font-semibold text-slate-600">
                Marque somente as funções adicionais que você exerce. Se você
                for apenas Filho da Corrente, deixe sem marcar.
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                O vínculo de Filho da Corrente já fica registrado
                automaticamente neste cadastro.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {filhoDaCorrenteFunctions.map((item) => (
                  <label
                    key={item.slug}
                    className="flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10"
                  >
                    <input
                      type="checkbox"
                      checked={functionSlugs.includes(item.slug)}
                      onChange={() => toggleFunction(item.slug)}
                      className="mt-1 h-5 w-5"
                    />
                    <span className="text-sm font-bold text-[#123D2C]">
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
              {hasCavalinho && (
                <div className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-100">
                  <p className="font-black">Entidade que você recebe</p>
                  <p>{selectedEntities.length ? selectedEntities.map((item) => item.name).join(" • ") : "Seleção obrigatória ainda não informada."}</p>
                  <button type="button" onClick={openEntityModal} className="mt-2 rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white">Selecionar ou alterar entidade</button>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-[#123D2C]/10 bg-[#F7FAF2] p-4">
              <p className="text-sm font-black text-[#123D2C]">Agenda</p>
              <p className="mt-1 text-xs font-semibold text-slate-600">
                Informe também os atendimentos, grupos, estudos e ações em que
                você está envolvido.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {agendaOptions.map((item, index) => (
                  <label
                    key={`${item.slug}-${index}`}
                    className="flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10"
                  >
                    <input
                      type="checkbox"
                      checked={agendaSlugs.includes(item.slug)}
                      onChange={() =>
                        setAgendaSlugs((current) =>
                          toggleValue(current, item.slug),
                        )
                      }
                      className="mt-1 h-5 w-5"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-[#123D2C]">
                        {item.label}
                      </span>
                      {(item.description ||
                        item.recurrenceLabel ||
                        item.dateLabel ||
                        item.timeLabel) && (
                        <span className="mt-1 block text-xs font-semibold leading-5 text-slate-600">
                          {(
                            item.description ||
                            [
                              item.recurrenceLabel,
                              item.dateLabel,
                              item.timeLabel,
                            ]
                              .filter(Boolean)
                              .join(" • ") +
                              (item.locationLabel
                                ? ` Local: ${item.locationLabel}`
                                : "")
                          )
                            .split("\n")
                            .map((line) => (
                              <span key={line} className="block">
                                {line}
                              </span>
                            ))}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">
                Crie uma senha para os próximos acessos *
              </span>
              <div className="flex rounded-2xl border border-[#123D2C]/15 bg-white focus-within:border-[#2F6B43] focus-within:ring-4 focus-within:ring-[#E9F2E7]">
                <input
                  value={signupPassword}
                  onChange={(event) => setSignupPassword(event.target.value)}
                  type={signupShowPassword ? "text" : "password"}
                  className="min-w-0 flex-1 rounded-2xl bg-transparent p-4 text-base outline-none"
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setSignupShowPassword((value) => !value)}
                  className="shrink-0 px-4 text-sm font-black text-[#123D2C]"
                >
                  {signupShowPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">
                Observação para facilitar a validação
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="min-h-24 rounded-2xl border border-[#123D2C]/15 p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]"
                placeholder="Ex.: meu nome está abreviado no WhatsApp; participo do grupo 1; ajudo no Sementinha..."
              />
            </label>

            {(selectedSummary.functions > 0 || selectedSummary.agenda > 0) && (
              <div className="rounded-3xl bg-[#E9F2E7] p-4 text-sm leading-6 text-[#123D2C] ring-1 ring-[#123D2C]/10">
                <p className="font-black">Resumo preliminar</p>
                <p>
                  {selectedSummary.functions} função(ões) adicional(is) e{" "}
                  {selectedSummary.agenda} item(ns) de agenda selecionado(s).
                </p>
                <p className="mt-1 text-xs font-semibold text-[#123D2C]/70">
                  Na próxima etapa você verá tudo organizado por seção antes de
                  confirmar o envio para validação do Tucxa.
                </p>
              </div>
            )}

            <div className="rounded-3xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 ring-1 ring-amber-100">
              <p className="font-black">Depois de enviar</p>
              <p>
                O responsável do Tucxa irá confirmar seus dados e liberar o
                acesso com as orientações detalhadas de uso.
              </p>
            </div>

            {error && (
              <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">
                {error}
              </p>
            )}
            {message && (
              <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
                {message}
              </p>
            )}

            <button
              disabled={submitLoading}
              className="rounded-2xl bg-[#123D2C] px-5 py-4 text-base font-black text-white shadow-lg shadow-green-900/10 transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {submitLoading ? "Enviando..." : "Enviar para validação do Tucxa"}
            </button>
          </form>
        </div>
      </section>

      {entityModalOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-[#10251C]/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Entidade que o Cavalinho recebe">
          <section className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <header className="grid shrink-0 gap-3 border-b border-slate-100 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">Função Cavalinho</p>
                <h2 className="mt-1 text-lg font-black leading-tight text-[#123D2C] sm:text-xl">
                  Qual entidade, só pode ser uma, você recebe para atender Consulentes
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button type="button" onClick={() => setEntityModalOpen(false)} className="min-h-10 rounded-xl bg-white px-4 py-2 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">Fechar</button>
                <button type="button" onClick={saveEntitySelection} disabled={!cavalinhoEntityDraftId} className="min-h-10 rounded-xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white disabled:opacity-40">Salvar</button>
              </div>
            </header>
            <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
              <div className="grid gap-2">
                {entityOptions.length ? entityOptions.map((entity) => (
                  <label key={entity.id} className="flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10">
                    <input
                      type="radio"
                      name="cavalinho-entity"
                      value={entity.id}
                      checked={cavalinhoEntityDraftId === entity.id}
                      onChange={() => setCavalinhoEntityDraftId(entity.id)}
                      className="mt-1 h-5 w-5"
                    />
                    <span className="min-w-0">
                      <span className="block font-black text-[#123D2C]">{entity.name}</span>
                      {(entity.line || entity.entityType) && <span className="block text-xs font-semibold text-slate-600">{[entity.line, entity.entityType].filter(Boolean).join(" • ")}</span>}
                    </span>
                  </label>
                )) : <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900">Nenhuma entidade ativa foi localizada. Procure a organização antes de concluir o cadastro.</p>}
              </div>
              {!cavalinhoEntityDraftId && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">Selecione uma entidade para continuar com a função Cavalinho.</p>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";

type EntityOption = {
  id: string;
  name: string;
  line?: string;
  entityType?: string;
};

type Props = {
  entities: EntityOption[];
  selectedEntityIds: string[];
  consulenteEntityId: string;
  consulenteDefinitionCompleted: boolean;
  onChange: (value: {
    selectedEntityIds: string[];
    consulenteEntityId: string;
    consulenteDefinitionCompleted: boolean;
  }) => void;
};

const MOBILE_PAGE_SIZE = 5;

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function CavalinhoEntitySelector({
  entities,
  selectedEntityIds,
  consulenteEntityId,
  consulenteDefinitionCompleted,
  onChange,
}: Props) {
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [consulenteOpen, setConsulenteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectionPage, setSelectionPage] = useState(1);
  const [consulenteSearch, setConsulenteSearch] = useState("");
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [draftConsulenteId, setDraftConsulenteId] = useState("");
  const [draftConsulenteAnswer, setDraftConsulenteAnswer] = useState<
    "yes" | "no" | ""
  >("");

  const orderedEntities = useMemo(
    () =>
      [...entities].sort((left, right) =>
        left.name.localeCompare(right.name, "pt-BR", { sensitivity: "base" }),
      ),
    [entities],
  );
  const selectedEntities = useMemo(
    () => orderedEntities.filter((entity) => selectedEntityIds.includes(entity.id)),
    [orderedEntities, selectedEntityIds],
  );
  const consulenteEntity =
    orderedEntities.find((entity) => entity.id === consulenteEntityId) ?? null;

  const filteredEntities = useMemo(() => {
    const query = normalized(search.trim());
    return orderedEntities.filter(
      (entity) => !query || normalized(entity.name).includes(query),
    );
  }, [orderedEntities, search]);

  const selectionPageCount = Math.max(
    1,
    Math.ceil(filteredEntities.length / MOBILE_PAGE_SIZE),
  );
  const visibleEntities = useMemo(() => {
    const safePage = Math.min(selectionPage, selectionPageCount);
    const start = (safePage - 1) * MOBILE_PAGE_SIZE;
    return filteredEntities.slice(start, start + MOBILE_PAGE_SIZE);
  }, [filteredEntities, selectionPage, selectionPageCount]);

  const draftSelectedEntities = useMemo(
    () => orderedEntities.filter((entity) => draftIds.includes(entity.id)),
    [draftIds, orderedEntities],
  );

  const filteredConsulenteEntities = useMemo(() => {
    const query = normalized(consulenteSearch.trim());
    return draftSelectedEntities.filter(
      (entity) => !query || normalized(entity.name).includes(query),
    );
  }, [consulenteSearch, draftSelectedEntities]);

  useEffect(() => {
    if (!selectionOpen && !consulenteOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [consulenteOpen, selectionOpen]);

  function openSelection() {
    setDraftIds(selectedEntityIds);
    setSearch("");
    setSelectionPage(1);
    setSelectionOpen(true);
  }

  function continueToConsulente() {
    if (draftIds.length === 0) return;
    const currentPrimaryStillSelected = draftIds.includes(consulenteEntityId);
    setDraftConsulenteId(currentPrimaryStillSelected ? consulenteEntityId : "");
    setDraftConsulenteAnswer(
      consulenteDefinitionCompleted
        ? currentPrimaryStillSelected && consulenteEntityId
          ? "yes"
          : "no"
        : "",
    );
    setConsulenteSearch("");
    setSelectionOpen(false);
    setConsulenteOpen(true);
  }

  function saveConsulenteDefinition() {
    if (!draftConsulenteAnswer) return;
    if (draftConsulenteAnswer === "yes" && !draftConsulenteId) return;
    onChange({
      selectedEntityIds: draftIds,
      consulenteEntityId:
        draftConsulenteAnswer === "yes" ? draftConsulenteId : "",
      consulenteDefinitionCompleted: true,
    });
    setConsulenteOpen(false);
  }

  return (
    <>
      <button
        id="cavalinho-entity-selector-button"
        type="button"
        onClick={openSelection}
        className="mt-3 w-full rounded-2xl border-2 border-[#123D2C] bg-emerald-50 p-3 text-left shadow-md transition hover:-translate-y-0.5 hover:bg-emerald-100"
      >
        <span className="flex items-center justify-between gap-3">
          <span>
            <span className="block font-black text-[#123D2C]">
              Definir entidades do Cavalinho
            </span>
            <span className="mt-0.5 block text-xs font-semibold text-slate-600">
              {selectedEntities.length
                ? `${selectedEntities.length} selecionada${selectedEntities.length === 1 ? "" : "s"}`
                : "Seleção obrigatória"}
              {consulenteDefinitionCompleted
                ? consulenteEntity
                  ? ` · ${consulenteEntity.name} atende Consulentes`
                  : " · nenhuma atende Consulentes"
                : " · atendimento de Consulentes ainda não definido"}
            </span>
          </span>
          <span className="shrink-0 rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white">
            Abrir
          </span>
        </span>
      </button>

      {selectionOpen && (
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center bg-[#10251C]/75 p-2 backdrop-blur-sm sm:p-3"
          role="dialog"
          aria-modal="true"
          aria-label="Entidades que você recebe"
        >
          <section className="flex max-h-[calc(100dvh-0.75rem)] w-full max-w-xl flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-2xl sm:max-h-[calc(100dvh-1.5rem)] sm:rounded-[2rem]">
            <header className="shrink-0 border-b border-slate-100 px-3 py-3 sm:px-5 sm:py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43] sm:text-xs sm:tracking-[0.18em]">
                Função Cavalinho · tela {selectionPage} de {selectionPageCount}
              </p>
              <h2 className="mt-0.5 text-lg font-black leading-tight text-[#123D2C] sm:mt-1 sm:text-xl">
                Quais entidades você recebe
              </h2>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.08em] text-red-700">
                Selecione pelo menos uma
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-3">
                <button
                  type="button"
                  onClick={() => {
                    if (selectionPage === 1) {
                      setSelectionOpen(false);
                    } else {
                      setSelectionPage((current) => Math.max(1, current - 1));
                    }
                  }}
                  className="min-h-9 rounded-xl bg-white px-3 py-2 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 sm:min-h-10"
                >
                  {selectionPage === 1 ? "Fechar" : "Voltar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectionPage < selectionPageCount) {
                      setSelectionPage((current) => current + 1);
                    } else {
                      continueToConsulente();
                    }
                  }}
                  disabled={
                    selectionPage >= selectionPageCount && draftIds.length === 0
                  }
                  className="min-h-9 rounded-xl bg-[#123D2C] px-3 py-2 text-sm font-black text-white disabled:opacity-40 sm:min-h-10"
                >
                  {selectionPage < selectionPageCount
                    ? "Continuar"
                    : "Confirmar escolhas"}
                </button>
              </div>
            </header>
            <div className="min-h-0 overflow-y-auto p-3 sm:p-5">
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                Buscar pelo nome
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setSelectionPage(1);
                  }}
                  className="rounded-xl border border-[#123D2C]/15 bg-white px-3 py-2.5 font-semibold outline-none focus:border-[#2F6B43]"
                  placeholder="Digite o nome da entidade"
                />
              </label>
              <div className="mt-2 grid gap-2 sm:mt-3">
                {visibleEntities.map((entity) => {
                  const selected = draftIds.includes(entity.id);
                  return (
                    <label
                      key={entity.id}
                      className={`flex items-start gap-3 rounded-xl border-2 p-2.5 shadow-sm sm:rounded-2xl sm:p-3 ${
                        selected
                          ? "border-[#123D2C] bg-emerald-50"
                          : "border-transparent bg-white ring-1 ring-[#123D2C]/10"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          setDraftIds((current) =>
                            current.includes(entity.id)
                              ? current.filter((id) => id !== entity.id)
                              : [...current, entity.id],
                          )
                        }
                        className="mt-0.5 h-5 w-5 accent-[#123D2C]"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-black text-[#123D2C] sm:text-base">
                          {entity.name}
                        </span>
                        {(entity.line || entity.entityType) && (
                          <span className="block text-[11px] font-semibold leading-4 text-slate-600 sm:text-xs">
                            {[entity.line, entity.entityType]
                              .filter(Boolean)
                              .join(" • ")}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
                {visibleEntities.length === 0 && (
                  <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">
                    Nenhuma entidade encontrada.
                  </p>
                )}
              </div>
              <p className="mt-2 text-center text-xs font-bold text-slate-500">
                {draftIds.length} entidade{draftIds.length === 1 ? "" : "s"} selecionada{draftIds.length === 1 ? "" : "s"}
              </p>
            </div>
          </section>
        </div>
      )}

      {consulenteOpen && (
        <div
          className="fixed inset-0 z-[170] flex items-center justify-center bg-[#10251C]/75 p-2 backdrop-blur-sm sm:p-3"
          role="dialog"
          aria-modal="true"
          aria-label="Entidade que atende Consulentes"
        >
          <section className="flex max-h-[calc(100dvh-0.75rem)] w-full max-w-xl flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-2xl sm:max-h-[calc(100dvh-1.5rem)] sm:rounded-[2rem]">
            <header className="shrink-0 border-b border-slate-100 px-3 py-3 sm:px-5 sm:py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43] sm:text-xs sm:tracking-[0.18em]">
                Função Cavalinho
              </p>
              <h2 className="mt-0.5 text-lg font-black leading-tight text-[#123D2C] sm:mt-1 sm:text-xl">
                Entidade que atende Consulentes
              </h2>
              <p className="mt-1 text-xs font-semibold leading-4 text-slate-600 sm:text-sm sm:leading-5">
                Caso alguma das entidades que recebe atenda Consulentes, informe qual. Importante: somente uma entidade por Cavalinho pode atender Consulentes.
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setConsulenteOpen(false);
                    setSelectionOpen(true);
                  }}
                  className="min-h-9 rounded-xl bg-white px-3 py-2 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 sm:min-h-10"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={saveConsulenteDefinition}
                  disabled={
                    !draftConsulenteAnswer ||
                    (draftConsulenteAnswer === "yes" && !draftConsulenteId)
                  }
                  className="min-h-9 rounded-xl bg-[#123D2C] px-3 py-2 text-sm font-black text-white disabled:opacity-40 sm:min-h-10"
                >
                  Salvar
                </button>
              </div>
            </header>
            <div className="min-h-0 overflow-y-auto p-3 sm:p-5">
              <button
                type="button"
                onClick={() => {
                  setDraftConsulenteAnswer("no");
                  setDraftConsulenteId("");
                }}
                className={`w-full rounded-xl border-2 p-3 text-left text-sm font-black shadow-md transition sm:rounded-2xl ${
                  draftConsulenteAnswer === "no"
                    ? "border-[#123D2C] bg-emerald-100 text-emerald-950 ring-2 ring-[#123D2C]/20"
                    : "border-[#123D2C] bg-[#FFF8DD] text-[#123D2C] ring-2 ring-[#D99B42]/25 hover:bg-amber-50"
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span>Não. Nenhuma destas entidades atende Consulentes.</span>
                  <span className="shrink-0 rounded-lg bg-[#123D2C] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-white">
                    Selecionar
                  </span>
                </span>
              </button>
              <div className="my-2 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 sm:my-3 sm:text-xs sm:tracking-[0.14em]">
                <span className="h-px flex-1 bg-slate-200" />
                ou selecione uma
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                Buscar pelo nome
                <input
                  value={consulenteSearch}
                  onChange={(event) => setConsulenteSearch(event.target.value)}
                  className="rounded-xl border border-[#123D2C]/15 bg-white px-3 py-2.5 font-semibold outline-none focus:border-[#2F6B43]"
                  placeholder="Digite o nome da entidade"
                />
              </label>
              <div className="mt-2 grid gap-2 sm:mt-3">
                {filteredConsulenteEntities.map((entity) => {
                  const selected =
                    draftConsulenteAnswer === "yes" &&
                    draftConsulenteId === entity.id;
                  return (
                    <label
                      key={entity.id}
                      className={`flex items-start gap-3 rounded-xl border-2 p-3 shadow-sm sm:rounded-2xl ${
                        selected
                          ? "border-[#123D2C] bg-emerald-50"
                          : "border-transparent bg-white ring-1 ring-[#123D2C]/10"
                      }`}
                    >
                      <input
                        type="radio"
                        name="cavalinho-consulente-entity"
                        checked={selected}
                        onChange={() => {
                          setDraftConsulenteAnswer("yes");
                          setDraftConsulenteId(entity.id);
                        }}
                        className="mt-0.5 h-5 w-5 accent-[#123D2C]"
                      />
                      <span className="font-black text-[#123D2C]">
                        {entity.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

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
  const [consulenteSearch, setConsulenteSearch] = useState("");
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [draftConsulenteId, setDraftConsulenteId] = useState("");
  const [draftConsulenteAnswer, setDraftConsulenteAnswer] = useState<"yes" | "no" | "">("");

  const orderedEntities = useMemo(
    () => [...entities].sort((left, right) => left.name.localeCompare(right.name, "pt-BR", { sensitivity: "base" })),
    [entities],
  );
  const selectedEntities = useMemo(
    () => orderedEntities.filter((entity) => selectedEntityIds.includes(entity.id)),
    [orderedEntities, selectedEntityIds],
  );
  const consulenteEntity = orderedEntities.find((entity) => entity.id === consulenteEntityId) ?? null;

  const filteredEntities = useMemo(() => {
    const query = normalized(search.trim());
    return orderedEntities.filter((entity) => !query || normalized(entity.name).includes(query));
  }, [orderedEntities, search]);

  const draftSelectedEntities = useMemo(
    () => orderedEntities.filter((entity) => draftIds.includes(entity.id)),
    [draftIds, orderedEntities],
  );

  const filteredConsulenteEntities = useMemo(() => {
    const query = normalized(consulenteSearch.trim());
    return draftSelectedEntities.filter((entity) => !query || normalized(entity.name).includes(query));
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
      consulenteEntityId: draftConsulenteAnswer === "yes" ? draftConsulenteId : "",
      consulenteDefinitionCompleted: true,
    });
    setConsulenteOpen(false);
  }

  return (
    <>
      <div className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-950 ring-1 ring-emerald-100">
        <p className="font-black">Entidades que você recebe</p>
        {selectedEntities.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selectedEntities.map((entity) => (
              <span key={entity.id} className="rounded-full bg-white px-2.5 py-1 text-xs font-black ring-1 ring-emerald-200">
                {entity.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-red-700">Selecione pelo menos uma entidade.</p>
        )}
        <p className="mt-3 font-black">Entidade que atende Consulentes</p>
        <p className="mt-1">
          {!consulenteDefinitionCompleted
            ? "Definição obrigatória ainda não informada."
            : consulenteEntity
              ? consulenteEntity.name
              : "Nenhuma das entidades selecionadas atende Consulentes."}
        </p>
        <button id="cavalinho-entity-selector-button" type="button" onClick={openSelection} className="mt-3 min-h-10 rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white">
          Selecionar ou alterar entidades
        </button>
      </div>

      {selectionOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-[#10251C]/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Entidades que você recebe">
          <section className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <header className="shrink-0 border-b border-slate-100 px-4 py-4 sm:px-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">Função Cavalinho</p>
              <h2 className="mt-1 text-xl font-black leading-tight text-[#123D2C]">Quais entidades você recebe</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setSelectionOpen(false)} className="min-h-10 rounded-xl bg-white px-3 py-2 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">Fechar</button>
                <button type="button" onClick={continueToConsulente} disabled={draftIds.length === 0} className="min-h-10 rounded-xl bg-[#123D2C] px-3 py-2 text-sm font-black text-white disabled:opacity-40">Salvar</button>
              </div>
            </header>
            <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                Buscar pelo nome
                <input value={search} onChange={(event) => setSearch(event.target.value)} className="rounded-xl border border-[#123D2C]/15 bg-white px-3 py-2.5 font-semibold outline-none focus:border-[#2F6B43]" placeholder="Digite o nome da entidade" />
              </label>
              <div className="mt-3 grid gap-2">
                {filteredEntities.map((entity) => (
                  <label key={entity.id} className="flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10">
                    <input
                      type="checkbox"
                      checked={draftIds.includes(entity.id)}
                      onChange={() => setDraftIds((current) => current.includes(entity.id) ? current.filter((id) => id !== entity.id) : [...current, entity.id])}
                      className="mt-1 h-5 w-5 accent-[#123D2C]"
                    />
                    <span className="min-w-0">
                      <span className="block font-black text-[#123D2C]">{entity.name}</span>
                      {(entity.line || entity.entityType) && <span className="block text-xs font-semibold text-slate-600">{[entity.line, entity.entityType].filter(Boolean).join(" • ")}</span>}
                    </span>
                  </label>
                ))}
                {filteredEntities.length === 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">Nenhuma entidade encontrada.</p>}
              </div>
              {draftIds.length === 0 && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">Selecione pelo menos uma entidade para continuar.</p>}
            </div>
          </section>
        </div>
      )}

      {consulenteOpen && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center bg-[#10251C]/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Entidade que atende Consulentes">
          <section className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <header className="shrink-0 border-b border-slate-100 px-4 py-4 sm:px-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">Atendimento de Consulentes</p>
              <h2 className="mt-1 text-xl font-black leading-tight text-[#123D2C]">Alguma destas entidades atende Consulentes?</h2>
              <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">Caso sim, somente uma pode ser definida para este atendimento.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { setConsulenteOpen(false); setSelectionOpen(true); }} className="min-h-10 rounded-xl bg-white px-3 py-2 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">Voltar</button>
                <button type="button" onClick={saveConsulenteDefinition} disabled={!draftConsulenteAnswer || (draftConsulenteAnswer === "yes" && !draftConsulenteId)} className="min-h-10 rounded-xl bg-[#123D2C] px-3 py-2 text-sm font-black text-white disabled:opacity-40">Salvar</button>
              </div>
            </header>
            <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
              <button
                type="button"
                onClick={() => { setDraftConsulenteAnswer("no"); setDraftConsulenteId(""); }}
                className={`w-full rounded-2xl p-3 text-left text-sm font-black ring-1 ${draftConsulenteAnswer === "no" ? "bg-emerald-50 text-emerald-900 ring-emerald-200" : "bg-white text-[#123D2C] ring-[#123D2C]/10"}`}
              >
                Não. Nenhuma destas entidades atende Consulentes.
              </button>
              <div className="my-3 flex items-center gap-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400"><span className="h-px flex-1 bg-slate-200" />ou selecione uma<span className="h-px flex-1 bg-slate-200" /></div>
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                Buscar pelo nome
                <input value={consulenteSearch} onChange={(event) => setConsulenteSearch(event.target.value)} className="rounded-xl border border-[#123D2C]/15 bg-white px-3 py-2.5 font-semibold outline-none focus:border-[#2F6B43]" placeholder="Digite o nome da entidade" />
              </label>
              <div className="mt-3 grid gap-2">
                {filteredConsulenteEntities.map((entity) => (
                  <label key={entity.id} className="flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10">
                    <input
                      type="radio"
                      name="cavalinho-consulente-entity"
                      checked={draftConsulenteAnswer === "yes" && draftConsulenteId === entity.id}
                      onChange={() => { setDraftConsulenteAnswer("yes"); setDraftConsulenteId(entity.id); }}
                      className="mt-1 h-5 w-5 accent-[#123D2C]"
                    />
                    <span className="font-black text-[#123D2C]">{entity.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

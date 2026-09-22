"use client";

import { useMemo, useState } from "react";
import { MessageCircle } from "@/components/impacto-no-controle/icons";

type NumberItem = {
  number: number;
  status: string;
  buyer_display_name: string | null;
};

type CampaignParticipantListProps = {
  numbers: NumberItem[];
  supportHref: string;
  className?: string;
  label?: string;
};

type SortMode = "number" | "name";

function statusLabel(status: string) {
  if (status === "confirmed") return "Aprovado";
  if (status === "pending_approval") return "Reservado • em conferência";
  return "Reservado";
}

export function CampaignParticipantList({
  numbers,
  supportHref,
  className = "btn-secondary",
  label = "Ver lista",
}: CampaignParticipantListProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("number");

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");

    return numbers
      .filter((item) =>
        ["reserved", "pending_approval", "confirmed"].includes(item.status),
      )
      .map((item) => ({
        ...item,
        displayName:
          item.buyer_display_name?.split(" • ")[0]?.trim() || "Participante",
      }))
      .filter((item) => {
        if (!normalizedQuery) return true;

        const paddedNumber = String(item.number).padStart(2, "0");
        return (
          paddedNumber.includes(normalizedQuery) ||
          String(item.number).includes(normalizedQuery) ||
          item.displayName.toLocaleLowerCase("pt-BR").includes(normalizedQuery)
        );
      })
      .sort((left, right) => {
        if (sortMode === "name") {
          const byName = left.displayName.localeCompare(
            right.displayName,
            "pt-BR",
            { sensitivity: "base" },
          );
          if (byName !== 0) return byName;
        }

        return left.number - right.number;
      });
  }, [numbers, query, sortMode]);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>

      {open ? (
        <div
          className="impacto-participant-list-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="impacto-participant-list-title"
        >
          <div className="impacto-participant-list-card">
            <div className="impacto-participant-list-header">
              <div>
                <p className="impacto-guide-kicker">PARTICIPANTES</p>
                <h2 id="impacto-participant-list-title">Números e participantes</h2>
              </div>

              <button
                type="button"
                className="impacto-guide-close"
                onClick={() => setOpen(false)}
              >
                FECHAR
              </button>
            </div>

            <div className="impacto-participant-list-body">
              <div className="impacto-participant-list-controls">
                <label>
                  <span>Buscar por nome ou número</span>
                  <input
                    className="input"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Ex.: Márcio ou 47"
                  />
                </label>

                <label>
                  <span>Ordenar por</span>
                  <select
                    className="input"
                    value={sortMode}
                    onChange={(event) =>
                      setSortMode(event.target.value === "name" ? "name" : "number")
                    }
                  >
                    <option value="number">Número crescente</option>
                    <option value="name">Nome</option>
                  </select>
                </label>
              </div>

              <div className="impacto-participant-list-legend" aria-label="Legenda">
                <span className="impacto-list-status reserved">Reservado</span>
                <span className="impacto-list-status confirmed">Aprovado</span>
              </div>

              <div className="impacto-participant-list-results">
                {rows.length ? (
                  rows.map((item) => (
                    <div
                      className={`impacto-participant-list-row ${
                        item.status === "confirmed" ? "confirmed" : "reserved"
                      }`}
                      key={item.number}
                    >
                      <strong>{String(item.number).padStart(2, "0")}</strong>
                      <span>{item.displayName}</span>
                      <small>{statusLabel(item.status)}</small>
                    </div>
                  ))
                ) : (
                  <p className="impacto-participant-list-empty">
                    Nenhum participante encontrado para esta busca.
                  </p>
                )}
              </div>
            </div>

            <div className="impacto-participant-list-footer">
              <a
                className="btn-secondary"
                href={supportHref}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="h-4 w-4" /> TIRAR DÚVIDA
              </a>

              <button
                type="button"
                className="btn-primary"
                onClick={() => setOpen(false)}
              >
                CONTINUAR
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

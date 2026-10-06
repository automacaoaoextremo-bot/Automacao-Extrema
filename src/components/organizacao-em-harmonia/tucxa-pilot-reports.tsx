"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Row = Record<string, string | number | null>;
type DateMode = "from_today" | "specific" | "period" | "before" | "all";

const API = "/api/organizacao-em-harmonia/filhos-corrente/agendamento-piloto/relatorios";
const DATE_KINDS = new Set(["atendimentos", "caderno", "sem_whatsapp_terceiros"]);

function visibleHeaders(row: Row) {
  return Object.keys(row).filter((key) => !key.startsWith("_"));
}

function csv(rows: Row[]) {
  if (!rows.length) return "";
  const headers = visibleHeaders(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [headers.map(escape).join(";"), ...rows.map((row) => headers.map((key) => escape(row[key])).join(";"))].join("\r\n");
}

function download(name: string, body: string, type: string) {
  const anchor = document.createElement("a");
  const url = URL.createObjectURL(new Blob([body], { type }));
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function digitsToDate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function ptBrToIso(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return "";
  const [, day, month, year] = match;
  const date = new Date(`${year}-${month}-${day}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  if (date.getUTCDate() !== Number(day) || date.getUTCMonth() + 1 !== Number(month) || date.getUTCFullYear() !== Number(year)) return "";
  return `${year}-${month}-${day}`;
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-sm font-bold">
      <span>{label}</span>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input inputMode="numeric" value={value} onChange={(event) => onChange(digitsToDate(event.target.value))} placeholder="dd/mm/aaaa" maxLength={10} className="min-w-0 rounded-xl border p-3 font-normal" />
        <input type="date" value={ptBrToIso(value)} onChange={(event) => {
          const iso = event.target.value;
          if (!iso) return onChange("");
          const [year, month, day] = iso.split("-");
          onChange(`${day}/${month}/${year}`);
        }} aria-label={`${label} pelo calendário`} className="rounded-xl border p-3 font-normal" />
      </div>
    </label>
  );
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function cadernoGroups(rows: Row[]) {
  const groups = new Map<string, Map<string, Row[]>>();
  for (const row of rows) {
    const date = String(row.Data ?? "Sem data");
    const entity = String(row.Entidade ?? "Entidade");
    if (!groups.has(date)) groups.set(date, new Map());
    const entities = groups.get(date)!;
    if (!entities.has(entity)) entities.set(entity, []);
    entities.get(entity)!.push(row);
  }
  return groups;
}

type CadernoStatus = { label: string; className: string; printClass: string };

function cadernoStatus(row: Row): CadernoStatus | null {
  if (!String(row.Consulente ?? "").trim()) return null;
  const status = String(row.Status ?? "").trim().toLowerCase();
  const confirmation = String(row["Confirmação"] ?? "").trim().toLowerCase();
  const arrival = String(row.Chegada ?? "").trim().toLowerCase();

  if (status === "cancelado") return { label: "Cancelado · vaga liberada", className: "bg-red-50 text-red-700 ring-red-200", printClass: "status-cancelled" };
  if (arrival === "arrived") return { label: "Chegou", className: "bg-blue-50 text-blue-800 ring-blue-200", printClass: "status-arrived" };
  if (arrival === "absent") return { label: "Não Chegou", className: "bg-orange-50 text-orange-800 ring-orange-200", printClass: "status-absent" };
  if (confirmation === "confirmed") return { label: "Confirmado", className: "bg-emerald-50 text-emerald-800 ring-emerald-200", printClass: "status-confirmed" };
  if (confirmation === "expired") return { label: "Prazo encerrado", className: "bg-slate-100 text-slate-700 ring-slate-200", printClass: "status-expired" };
  if (confirmation === "declined") return { label: "Não comparecerá", className: "bg-rose-50 text-rose-800 ring-rose-200", printClass: "status-declined" };
  if (status === "solicitado") return { label: "Solicitado", className: "bg-amber-50 text-amber-900 ring-amber-200", printClass: "status-requested" };
  return { label: "Não Confirmado", className: "bg-violet-50 text-violet-800 ring-violet-200", printClass: "status-unconfirmed" };
}

function cadernoSummary(entities: Map<string, Row[]>) {
  const counts = new Map<string, number>();
  let total = 0;
  let vacancies = 0;
  for (const items of entities.values()) {
    const entityMeta = items.find((item) => String(item._entityId ?? "").trim()) ?? items[0];
    vacancies += Math.max(0, Number(entityMeta?._availableSlots ?? 0) || 0);
    for (const item of items) {
      const status = cadernoStatus(item);
      if (!status) continue;
      if (String(item.Status ?? "").trim().toLowerCase() !== "cancelado") total += 1;
      counts.set(status.label, (counts.get(status.label) ?? 0) + 1);
    }
  }
  return { total, vacancies, counts };
}

function summaryEntries(summary: ReturnType<typeof cadernoSummary>) {
  const order = ["Confirmado", "Solicitado", "Não Confirmado", "Prazo encerrado", "Não comparecerá", "Chegou", "Não Chegou", "Cancelado · vaga liberada"];
  return order.filter((label) => summary.counts.has(label)).map((label) => [label, summary.counts.get(label) ?? 0] as const);
}

function cadernoEntityState(items: Row[]) {
  const meta = items.find((item) => String(item._entityId ?? "").trim()) ?? items[0];
  return {
    unavailable: String(meta?._entityAvailable ?? "1") === "0",
    reason: String(meta?._entitySuspendedReason ?? "").trim(),
  };
}

function cadernoRowNote(row: Row) {
  const cancellation = String(row._cancellationReason ?? "").trim();
  const previousEntity = String(row._previousEntityName ?? "").trim();
  const changeReason = String(row._entityChangeReason ?? "").trim();
  if (String(row.Status ?? "").trim().toLowerCase() === "cancelado") {
    return cancellation ? `Motivo: ${cancellation}` : "Vaga liberada para a Triagem.";
  }
  if (previousEntity) {
    return `Realocado de: ${previousEntity}${changeReason ? ` · ${changeReason}` : ""}`;
  }
  return "";
}

function printableTable(rows: Row[], title: string, grouped: boolean) {
  if (!rows.length) return "";
  const headers = visibleHeaders(rows[0]);
  if (!grouped) {
    return `<h1>${escapeHtml(title)}</h1><table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((h) => `<td>${escapeHtml(row[h])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }

  const groups = cadernoGroups(rows);
  return `<h1>${escapeHtml(title)}</h1>${[...groups.entries()].map(([date, entities]) => {
    const summary = cadernoSummary(entities);
    return `
    <section class="caderno-page">
      <h2>${escapeHtml(date)}</h2>
      <div class="day-summary"><strong>Total previsto: ${summary.total}</strong><span>Vagas disponíveis: ${summary.vacancies}</span>${summaryEntries(summary).map(([label, count]) => `<span>${escapeHtml(label)}: ${count}</span>`).join("")}</div>
      <div class="entity-grid">
        ${[...entities.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR")).map(([entity, items]) => {
          const state = cadernoEntityState(items);
          return `
          <div class="entity-card ${state.unavailable ? "entity-unavailable" : ""}">
            <h3>${escapeHtml(entity)}</h3>
            ${state.unavailable ? `<div class="entity-alert"><strong>INDISPONÍVEL NESTA DATA</strong>${state.reason ? `<br>${escapeHtml(state.reason)}` : ""}</div>` : ""}
            <table>
              <tbody>
                ${items.map((item) => {
                  const status = cadernoStatus(item);
                  const note = cadernoRowNote(item);
                  return `<tr class="${String(item.Status ?? "").toLowerCase() === "cancelado" ? "cancelled-row" : ""}"><td class="order">${escapeHtml(item.Ordem || "")}</td><td><div class="consulente-name">${escapeHtml(item.Consulente)}</div>${status ? `<span class="status-badge ${status.printClass}">${escapeHtml(status.label)}</span>` : ""}${note ? `<div class="row-note">${escapeHtml(note)}</div>` : ""}</td></tr>`;
                }).join("")}
                ${Array.from({ length: Math.max(0, 8 - items.length) }).map(() => `<tr><td class="order">&nbsp;</td><td>&nbsp;</td></tr>`).join("")}
              </tbody>
            </table>
          </div>`;
        }).join("")}
      </div>
    </section>`;
  }).join("")}`;
}

export function TucxaPilotReports() {
  const [kind, setKind] = useState("atendimentos");
  const [dateMode, setDateMode] = useState<DateMode>("from_today");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [person, setPerson] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ownWhatsappAppointmentId, setOwnWhatsappAppointmentId] = useState("");
  const [ownWhatsappName, setOwnWhatsappName] = useState("");
  const [ownWhatsapp, setOwnWhatsapp] = useState("");
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [message, setMessage] = useState("");
  const usesDate = DATE_KINDS.has(kind);

  async function load() {
    setError("");
    setLoading(true);
    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return setError("Sessão não localizada.");
      const query = new URLSearchParams({ kind });
      if (usesDate) {
        query.set("dateMode", dateMode);
        if (dateMode === "specific" || dateMode === "period") {
          const iso = ptBrToIso(dateFrom);
          if (!iso) return setError("Informe a data inicial no formato dd/mm/aaaa.");
          query.set("dateFrom", iso);
        }
        if (dateMode === "before" || dateMode === "period") {
          const iso = ptBrToIso(dateTo);
          if (!iso) return setError(dateMode === "period" ? "Informe a data final no formato dd/mm/aaaa." : "Informe a data limite no formato dd/mm/aaaa.");
          query.set("dateTo", iso);
        }
      }
      if (person) query.set("person", person);
      const response = await fetch(`${API}?${query}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await response.json();
      if (!response.ok) return setError(json.error || "Falha ao gerar relatório.");
      setRows(json.rows || []);
    } finally {
      setLoading(false);
    }
  }

  async function saveOwnWhatsapp() {
    setError("");
    setMessage("");
    setSavingWhatsapp(true);
    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return setError("Sessão não localizada.");
      const response = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "adopt-own-whatsapp", appointmentId: ownWhatsappAppointmentId, whatsapp: ownWhatsapp }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) return setError(json.error || "Falha ao atualizar o WhatsApp.");
      setMessage(json.message || "WhatsApp próprio atualizado.");
      setOwnWhatsappAppointmentId("");
      setOwnWhatsappName("");
      setOwnWhatsapp("");
      await load();
    } finally {
      setSavingWhatsapp(false);
    }
  }

  function changeKind(value: string) {
    setKind(value);
    setRows([]);
    setError("");
  }

  const exportCsv = () => download(`tucxa-${kind}.csv`, `\ufeff${csv(rows)}`, "text/csv;charset=utf-8");
  const exportExcel = () => {
    if (!rows.length) return;
    const headers = visibleHeaders(rows[0]);
    const html = `<table><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>${rows.map((row) => `<tr>${headers.map((key) => `<td>${String(row[key] ?? "")}</td>`).join("")}</tr>`).join("")}</table>`;
    download(`tucxa-${kind}.xls`, html, "application/vnd.ms-excel");
  };

  return (
    <div className="grid gap-3 text-[#10251C]">
      <div className="grid gap-3 rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10 lg:grid-cols-4">
        <label className="grid gap-1 text-sm font-bold">
          <span>Relatório</span>
          <select value={kind} onChange={(event) => changeKind(event.target.value)} className="rounded-xl border p-3 font-normal">
            <option value="atendimentos">Atendimentos</option>
            <option value="caderno">Caderno da Triagem · Data / Entidade / Consulentes</option>
            <option value="sem_whatsapp_terceiros">Consulentes sem WhatsApp · agendados por outra pessoa</option>
            <option value="consulentes">Consulentes</option>
            <option value="entidades">Entidades / Cavalinhos</option>
          </select>
        </label>

        {usesDate && <label className="grid gap-1 text-sm font-bold"><span>Período</span><select value={dateMode} onChange={(event) => setDateMode(event.target.value as DateMode)} className="rounded-xl border p-3 font-normal"><option value="from_today">Todos a partir de hoje</option><option value="specific">Data específica</option><option value="period">Período específico</option><option value="before">Anteriores à data</option><option value="all">Todos</option></select></label>}
        {usesDate && (dateMode === "specific" || dateMode === "period") && <DateField label={dateMode === "specific" ? "Data" : "Data inicial"} value={dateFrom} onChange={setDateFrom} />}
        {usesDate && (dateMode === "period" || dateMode === "before") && <DateField label={dateMode === "period" ? "Data final" : "Antes de"} value={dateTo} onChange={setDateTo} />}
        <label className="grid gap-1 text-sm font-bold"><span>Consulente</span><input value={person} onChange={(event) => setPerson(event.target.value)} placeholder="Nome do consulente" className="rounded-xl border p-3 font-normal" /></label>
        <button onClick={() => void load()} disabled={loading} className="self-end rounded-xl bg-[#123D2C] p-3 font-black text-white disabled:opacity-60">{loading ? "Consultando..." : "Consultar"}</button>
      </div>

      {kind === "caderno" && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-950">Visão do Caderno da Triagem organizada por Data → Entidade → Consulentes. Cancelamentos permanecem visíveis como histórico e liberam vaga; Entidades indisponíveis na data são destacadas.</p>}
      {kind === "sem_whatsapp_terceiros" && <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">Lista atendimentos cadastrados como realizados por outro contato/familiar/responsável, exibindo quem recebe as comunicações.</p>}
      {error && <p className="rounded-xl bg-red-50 p-3 font-bold text-red-700">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button onClick={() => {
          if (!rows.length) return setError("Faça uma consulta antes de gerar o PDF.");
          const report = window.open("", "_blank");
          if (!report) return setError("O navegador bloqueou a janela de impressão. Libere pop-ups e tente novamente.");
          report.document.write(`<html><head><title>Relatório TUCXA</title><style>
            @page{size:A4 portrait;margin:10mm}
            body{font-family:Arial,sans-serif;padding:0;color:#10251c}
            table{border-collapse:collapse;width:100%}
            th,td{border:1px solid #aaa;padding:6px;text-align:left;font-size:11px}
            h1{color:#123D2C;font-size:18px;margin:0 0 12px}
            h2{color:#123D2C;font-size:14px;text-align:center;margin:8px 0 10px}
            h3{color:#123D2C;font-size:11px;text-align:center;text-transform:uppercase;border:1px solid #888;margin:0;padding:5px;background:#f3f6ef}
            .caderno-page{break-after:page}
            .caderno-page:last-child{break-after:auto}
            .entity-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
            .entity-card{break-inside:avoid}
            .entity-card td{height:18px;padding:3px 5px}
            .entity-card .order{width:20px;text-align:center}
            .day-summary{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin:0 0 10px;font-size:10px}
            .day-summary span,.day-summary strong{border:1px solid #c8d5cc;border-radius:10px;padding:3px 6px}
            .entity-unavailable{border:2px solid #b42318}
            .entity-unavailable h3{background:#fff0ed;color:#8a1c13}
            .entity-alert{border:1px solid #f1a99f;background:#fff4f2;color:#8a1c13;padding:5px;font-size:9px;text-align:center}
            .status-badge{display:inline-block;margin-top:2px;border:1px solid #bbb;border-radius:8px;padding:1px 5px;font-size:8px;font-weight:bold}
            .status-cancelled{border-color:#ef9a9a;background:#fff0f0;color:#9b1c1c}
            .status-confirmed{border-color:#a7d7b5;background:#edf9f0;color:#146b34}
            .status-requested{border-color:#e5c56f;background:#fff8df;color:#725000}
            .row-note{margin-top:2px;font-size:8px;color:#555}
            .cancelled-row .consulente-name{text-decoration:line-through;color:#777}
          </style></head><body>${printableTable(rows, "TUCXA · Relatório", kind === "caderno")}</body></html>`);
          report.document.close(); report.focus(); window.setTimeout(() => report.print(), 250);
        }} className="rounded-xl border bg-white px-4 py-2 font-black">PDF / Imprimir</button>
        <button onClick={exportCsv} className="rounded-xl border bg-white px-4 py-2 font-black">CSV</button>
        <button onClick={exportExcel} className="rounded-xl border bg-white px-4 py-2 font-black">Excel</button>
        <button onClick={async () => {
          if (!rows.length) return setError("Faça uma consulta antes de abrir o Google Sheets.");
          const headers = visibleHeaders(rows[0]);
          const tsv = [headers.join("\t"), ...rows.map((row) => headers.map((key) => String(row[key] ?? "").replaceAll("\t", " ")).join("\t"))].join("\n");
          await navigator.clipboard?.writeText(tsv); window.open("https://sheets.new", "_blank", "noopener,noreferrer"); setError("");
        }} className="rounded-xl border bg-white px-4 py-2 font-black">Abrir Google Sheets</button>
      </div>

      <div className="overflow-auto rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10">
        {!rows.length && <p className="p-4 font-semibold text-slate-500">Faça uma consulta para visualizar o relatório.</p>}

        {rows.length > 0 && kind === "caderno" && (
          <div className="grid gap-5">
            {[...cadernoGroups(rows).entries()].map(([date, entities]) => {
              const summary = cadernoSummary(entities);
              return (
              <section key={date} className="grid gap-3">
                <h3 className="rounded-xl bg-[#123D2C] px-3 py-2 text-center font-black text-white">{date}</h3>
                <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl bg-[#F7FAF2] px-3 py-2 text-xs font-bold ring-1 ring-[#123D2C]/10">
                  <span className="font-black text-[#123D2C]">Total previsto: {summary.total}</span>
                  <span className="rounded-full bg-white px-2 py-1 ring-1 ring-[#123D2C]/10">Vagas disponíveis: {summary.vacancies}</span>
                  {summaryEntries(summary).map(([label, count]) => <span key={label} className="rounded-full bg-white px-2 py-1 ring-1 ring-[#123D2C]/10">{label}: {count}</span>)}
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {[...entities.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR")).map(([entity, items]) => {
                    const state = cadernoEntityState(items);
                    return (
                      <div key={`${date}-${entity}`} className={`overflow-hidden rounded-2xl ring-1 ${state.unavailable ? "ring-2 ring-red-300" : "ring-[#123D2C]/15"}`}>
                        <h4 className={`px-3 py-2 text-center text-sm font-black uppercase ${state.unavailable ? "bg-red-50 text-red-800" : "bg-[#E9F2E7] text-[#123D2C]"}`}>{entity}</h4>
                        {state.unavailable && (
                          <div className="bg-red-50 px-3 py-2 text-center text-[10px] font-black text-red-800">
                            ⚠ INDISPONÍVEL NESTA DATA{state.reason ? ` · ${state.reason}` : ""}
                          </div>
                        )}
                        <div className="divide-y divide-[#123D2C]/10">
                          {items.map((item, index) => {
                            const status = cadernoStatus(item);
                            const note = cadernoRowNote(item);
                            const cancelled = String(item.Status ?? "").trim().toLowerCase() === "cancelado";
                            return (
                              <div key={`${date}-${entity}-${index}`} className={`grid grid-cols-[2.5rem_1fr] gap-2 px-3 py-2 ${cancelled ? "bg-red-50/40" : ""}`}>
                                <span className="text-center text-xs font-black text-slate-500">{String(item.Ordem || "")}</span>
                                <div>
                                  <div className={`font-bold ${cancelled ? "text-slate-500 line-through" : "text-[#123D2C]"}`}>{String(item.Consulente || "")}</div>
                                  {status && (
                                    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ${status.className}`}>
                                      {status.label}
                                    </span>
                                  )}
                                  {note && <p className="mt-1 text-[10px] font-semibold text-slate-600">{note}</p>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
              );
            })}
          </div>
        )}

        {rows.length > 0 && kind !== "caderno" && (
          <table className="min-w-full text-sm">
            <thead><tr>{visibleHeaders(rows[0]).map((header) => <th key={header} className="border-b p-2 text-left">{header}</th>)}{kind === "sem_whatsapp_terceiros" && <th className="border-b p-2 text-left">Ação</th>}</tr></thead>
            <tbody>{rows.map((row, index) => <tr key={index}>{visibleHeaders(rows[0]).map((header) => <td key={header} className="border-b p-2">{String(row[header] ?? "")}</td>)}{kind === "sem_whatsapp_terceiros" && <td className="border-b p-2"><button type="button" onClick={() => {
              const appointmentId = String(row._appointmentId || "").trim();
              if (!appointmentId) {
                setError("Não foi possível identificar o agendamento deste Consulente. Atualize a consulta e tente novamente.");
                return;
              }
              setOwnWhatsappAppointmentId(appointmentId);
              setOwnWhatsappName(String(row.Consulente || ""));
              setOwnWhatsapp("");
              setMessage("");
              setError("");
            }} className="whitespace-nowrap rounded-lg bg-[#123D2C] px-3 py-2 text-xs font-black text-white">Informar WhatsApp próprio</button></td>}</tr>)}</tbody>
          </table>
        )}
      </div>

      {ownWhatsappAppointmentId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="own-whatsapp-title">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-black/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="own-whatsapp-title" className="text-lg font-black text-[#123D2C]">Atualizar WhatsApp próprio</h3>
                <p className="mt-1 font-bold text-slate-700">{ownWhatsappName}</p>
              </div>
              <button
                type="button"
                disabled={savingWhatsapp}
                onClick={() => { setOwnWhatsappAppointmentId(""); setOwnWhatsappName(""); setOwnWhatsapp(""); setError(""); }}
                className="rounded-xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
              >
                Fechar
              </button>
            </div>

            <p className="mt-4 text-sm font-semibold leading-6 text-slate-700">
              A atualização passará os agendamentos anteriores e futuros para o contato próprio do Consulente.
              O contato responsável anterior será preservado no histórico de cada agendamento.
            </p>

            {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}

            <label className="mt-4 grid gap-1 text-sm font-bold text-[#123D2C]">
              <span>WhatsApp próprio</span>
              <input
                autoFocus
                inputMode="tel"
                value={ownWhatsapp}
                onChange={(event) => setOwnWhatsapp(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && ownWhatsapp.trim() && !savingWhatsapp) void saveOwnWhatsapp();
                }}
                placeholder="Ex.: (19) 99999-9999"
                className="rounded-xl border bg-white p-3 font-normal"
              />
            </label>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={savingWhatsapp}
                onClick={() => { setOwnWhatsappAppointmentId(""); setOwnWhatsappName(""); setOwnWhatsapp(""); setError(""); }}
                className="rounded-xl border bg-white px-4 py-2 font-black disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingWhatsapp || !ownWhatsapp.trim()}
                onClick={() => void saveOwnWhatsapp()}
                className="rounded-xl bg-[#123D2C] px-4 py-2 font-black text-white disabled:opacity-50"
              >
                {savingWhatsapp ? "Atualizando..." : "Confirmar atualização"}
              </button>
            </div>
          </div>
        </div>
      )}
      {message && <p className="rounded-xl bg-emerald-50 p-3 font-bold text-emerald-900">{message}</p>}
    </div>
  );
}

"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Row = Record<string, string | number | null>;
type DateMode = "from_today" | "specific" | "period" | "before" | "all";

const API = "/api/organizacao-em-harmonia/filhos-corrente/agendamento-piloto/relatorios";
const DATE_KINDS = new Set(["atendimentos", "caderno", "sem_whatsapp_terceiros"]);

function csv(rows: Row[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
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

function printableTable(rows: Row[], title: string, grouped: boolean) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  if (!grouped) {
    return `<h1>${title}</h1><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((h) => `<td>${String(row[h] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }
  const groups = new Map<string, Map<string, Row[]>>();
  for (const row of rows) {
    const date = String(row.Data ?? "Sem data");
    const entity = String(row.Entidade ?? "Entidade");
    if (!groups.has(date)) groups.set(date, new Map());
    const entities = groups.get(date)!;
    if (!entities.has(entity)) entities.set(entity, []);
    entities.get(entity)!.push(row);
  }
  return `<h1>${title}</h1>${[...groups.entries()].map(([date, entities]) => `<section><h2>${date}</h2>${[...entities.entries()].map(([entity, items]) => `<h3>${entity}</h3><ol>${items.map((item) => `<li>${String(item.Consulente ?? "")}${item.Ordem ? ` — ordem ${item.Ordem}` : ""}</li>`).join("")}</ol>`).join("")}</section>`).join("")}`;
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

  function changeKind(value: string) {
    setKind(value);
    setRows([]);
    setError("");
  }

  const exportCsv = () => download(`tucxa-${kind}.csv`, `\ufeff${csv(rows)}`, "text/csv;charset=utf-8");
  const exportExcel = () => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
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

      {kind === "caderno" && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-950">Visão do Caderno da Triagem organizada por Data → Entidade → Consulentes. Agendamentos cancelados não entram nesta visão.</p>}
      {kind === "sem_whatsapp_terceiros" && <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">Lista atendimentos cadastrados como realizados por outro contato/familiar/responsável, exibindo quem recebe as comunicações.</p>}
      {error && <p className="rounded-xl bg-red-50 p-3 font-bold text-red-700">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button onClick={() => {
          if (!rows.length) return setError("Faça uma consulta antes de gerar o PDF.");
          const report = window.open("", "_blank");
          if (!report) return setError("O navegador bloqueou a janela de impressão. Libere pop-ups e tente novamente.");
          report.document.write(`<html><head><title>Relatório TUCXA</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#10251c}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:7px;text-align:left;font-size:12px}h1,h2,h3{color:#123D2C}h2{margin-top:28px;border-bottom:2px solid #123D2C;padding-bottom:5px}h3{margin-bottom:5px}li{margin:5px 0}</style></head><body>${printableTable(rows, "TUCXA · Relatório", kind === "caderno")}</body></html>`);
          report.document.close(); report.focus(); window.setTimeout(() => report.print(), 250);
        }} className="rounded-xl border bg-white px-4 py-2 font-black">PDF / Imprimir</button>
        <button onClick={exportCsv} className="rounded-xl border bg-white px-4 py-2 font-black">CSV</button>
        <button onClick={exportExcel} className="rounded-xl border bg-white px-4 py-2 font-black">Excel</button>
        <button onClick={async () => {
          if (!rows.length) return setError("Faça uma consulta antes de abrir o Google Sheets.");
          const headers = Object.keys(rows[0]);
          const tsv = [headers.join("\t"), ...rows.map((row) => headers.map((key) => String(row[key] ?? "").replaceAll("\t", " ")).join("\t"))].join("\n");
          await navigator.clipboard?.writeText(tsv); window.open("https://sheets.new", "_blank", "noopener,noreferrer"); setError("");
        }} className="rounded-xl border bg-white px-4 py-2 font-black">Abrir Google Sheets</button>
      </div>

      <div className="overflow-auto rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10">
        {rows.length ? <table className="min-w-full text-sm"><thead><tr>{Object.keys(rows[0]).map((header) => <th key={header} className="border-b p-2 text-left">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{Object.keys(rows[0]).map((header) => <td key={header} className="border-b p-2">{String(row[header] ?? "")}</td>)}</tr>)}</tbody></table> : <p className="p-4 font-semibold text-slate-500">Faça uma consulta para visualizar o relatório.</p>}
      </div>
    </div>
  );
}

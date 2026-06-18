"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { AeSolutionHeader } from "@/components/ae-solution-header";
import { currencyBR, type CorrenteClientDashboardPayload } from "@/lib/corrente-em-dia";
import { supabaseBrowser } from "@/lib/supabase-browser";

type DashboardPayload = CorrenteClientDashboardPayload;

type ContributorImportRow = {
  nome_completo: string;
  email: string;
  whatsapp: string;
  tipo_pessoa: string;
  funcao: string;
  valor_contribuicao: string;
  dia_vencimento: string;
  modo_vencimento: string;
  contribuicao_habilitada: string;
  gestor: string;
  financeiro: string;
  observacoes: string;
};

type ImportResult = {
  imported: number;
  skipped: number;
  messages: string[];
};

const expectedColumns: Array<keyof ContributorImportRow> = [
  "nome_completo",
  "email",
  "whatsapp",
  "tipo_pessoa",
  "funcao",
  "valor_contribuicao",
  "dia_vencimento",
  "modo_vencimento",
  "contribuicao_habilitada",
  "gestor",
  "financeiro",
  "observacoes",
];

function parseCsv(text: string): ContributorImportRow[] {
  const normalized = text.replace(/^\uFEFF/, "").trim();
  if (!normalized) return [];

  const lines = normalized.split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(";").map((header) => header.trim().toLowerCase());

  return lines.slice(1).map((line) => {
    const values = line.split(";").map((value) => value.trim());
    const row = Object.fromEntries(
      expectedColumns.map((column) => {
        const index = headers.indexOf(column);
        return [column, index >= 0 ? values[index] ?? "" : ""];
      }),
    ) as ContributorImportRow;
    return row;
  });
}

function buildWhatsAppLink(phone: string, message: string) {
  const cleanedPhone = phone.replace(/\D/g, "");
  const number = cleanedPhone.startsWith("55") ? cleanedPhone : `55${cleanedPhone}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export default function CorrenteEmDiaAccessImportPage() {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [rows, setRows] = useState<ContributorImportRow[]>([]);
  const [loadError, setLoadError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        window.location.href = "/solucoes/corrente-em-dia/login";
        return;
      }

      const response = await fetch("/api/corrente-em-dia/cliente/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível carregar os dados de acesso.");
      if (isMounted) setPayload(result);
    }

    const timer = window.setTimeout(() => {
      loadDashboard().catch((error) => {
        if (!isMounted) return;
        setLoadError(error instanceof Error ? error.message : "Erro ao carregar dados.");
      });
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, []);

  const organization = payload?.organizations?.[0];
  const managerCanImport = Boolean(payload?.is_manager && organization?.id);
  const accessBaseUrl = typeof window !== "undefined" ? window.location.origin : "https://www.automacaoextrema.com";

  const previewTotals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.total += 1;
        const amount = Number(row.valor_contribuicao.replace(",", "."));
        if (!Number.isNaN(amount)) acc.amount += amount;
        if (row.gestor.toLowerCase() === "sim") acc.managers += 1;
        return acc;
      },
      { total: 0, amount: 0, managers: 0 },
    );
  }, [rows]);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    setImportResult(null);
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setRows(parseCsv(text));
  }

  async function logout() {
    await supabaseBrowser.auth.signOut();
    window.location.href = "/solucoes/corrente-em-dia/login";
  }

  async function importRows() {
    setImportResult(null);

    if (!organization?.id || rows.length === 0) return;

    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      window.location.href = "/solucoes/corrente-em-dia/login";
      return;
    }

    setImporting(true);
    const response = await fetch("/api/corrente-em-dia/cliente/acessos/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ organization_id: organization.id, rows }),
    });
    const result = await response.json();
    setImporting(false);

    if (!response.ok) {
      setImportResult({ imported: 0, skipped: rows.length, messages: [result.error || "Não foi possível importar."] });
      return;
    }

    setImportResult(result);
  }

  return (
    <main className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <AeSolutionHeader
        solutionName="Corrente em Dia"
        logoSrc="/corrente-em-dia-logo.svg"
        logoAlt="Logo Corrente em Dia"
        actions={[]}
        sectionLinks={[]}
        topAction={
          <div className="flex shrink-0 gap-2">
            <Link
              href="/solucoes/corrente-em-dia/cliente"
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#31C16B]/30 bg-[#31C16B] px-3 py-2 text-sm font-black text-[#00334E] shadow-md shadow-emerald-200/70 transition hover:-translate-y-0.5 hover:bg-[#43db7c]"
            >
              ← Painel
            </Link>
            <button
              type="button"
              onClick={logout}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#00334E] bg-[#00334E] px-3 py-2 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#064969]"
            >
              Sair
            </button>
          </div>
        }
      />

      <section className="mx-auto max-w-6xl px-4 py-7 lg:py-10">
        <div className="space-y-3">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#2F6B43]">Acessos</p>
          <h1 className="text-4xl font-black leading-tight text-[#00334E]">Importar contribuintes</h1>
          <p className="text-base leading-7 text-slate-600">
            Baixe o modelo, preencha os dados dos responsáveis e contribuintes, faça o upload da planilha e confira antes de importar. Depois da importação, use as mensagens sugeridas para orientar o acesso por e-mail ou WhatsApp.
          </p>
        </div>

        {loadError && <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5 font-bold text-red-700">{loadError}</div>}

        {payload && !managerCanImport && (
          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            Esta página é liberada apenas para responsáveis da organização. Contribuintes visualizam somente suas próprias contribuições, comprovantes e histórico.
          </div>
        )}

        {managerCanImport && (
          <div className="mt-7 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-6">
              <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2F6B43]">Organização</p>
                <h2 className="mt-1 text-2xl font-black text-[#00334E]">{organization?.name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  A importação será vinculada a esta organização. O responsável indicado pela casa poderá revisar dados, contribuições e acessos.
                </p>
              </section>

              <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2F6B43]">Modelo</p>
                <h2 className="mt-1 text-2xl font-black text-[#00334E]">Planilha de contribuintes</h2>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Use ponto e vírgula como separador. O modelo traz responsáveis, cambonos, médiuns, consulentes e família contribuinte com dados fictícios para teste.
                </p>
                <a
                  href="/modelos/modelo-importacao-contribuintes-corrente-em-dia.csv"
                  download
                  className="mt-4 inline-flex rounded-full bg-[#31C16B] px-4 py-3 text-sm font-black text-[#00334E] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#43db7c]"
                >
                  Baixar modelo CSV
                </a>
              </section>

              <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2F6B43]">Upload</p>
                <h2 className="mt-1 text-2xl font-black text-[#00334E]">Enviar planilha preenchida</h2>
                <label className="mt-4 block rounded-3xl border border-dashed border-[#31C16B] bg-emerald-50 p-5 text-center text-sm font-bold text-emerald-950">
                  <input type="file" accept=".csv,text/csv" onChange={handleFile} className="sr-only" />
                  Clique para selecionar o arquivo CSV
                </label>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2F6B43]">Prévia</p>
                <h2 className="mt-1 text-2xl font-black text-[#00334E]">Conferência antes de importar</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Pessoas</p><p className="mt-1 text-2xl font-black text-[#00334E]">{previewTotals.total}</p></div>
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Gestores</p><p className="mt-1 text-2xl font-black text-[#00334E]">{previewTotals.managers}</p></div>
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Previsto</p><p className="mt-1 text-2xl font-black text-[#00334E]">{currencyBR(previewTotals.amount)}</p></div>
                </div>

                <div className="mt-4 max-h-[28rem] overflow-auto rounded-2xl border border-slate-100">
                  {rows.length === 0 ? (
                    <p className="p-4 text-sm text-slate-600">Nenhuma planilha selecionada.</p>
                  ) : (
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                        <tr>
                          <th className="p-3">Nome</th>
                          <th className="p-3">E-mail</th>
                          <th className="p-3">Função</th>
                          <th className="p-3">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, index) => (
                          <tr key={`${row.email}-${index}`} className="border-t border-slate-100">
                            <td className="p-3 font-bold text-slate-800">{row.nome_completo}</td>
                            <td className="p-3 text-slate-600">{row.email}</td>
                            <td className="p-3 text-slate-600">{row.funcao}</td>
                            <td className="p-3 text-slate-600">{row.valor_contribuicao || "livre"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <button
                  type="button"
                  onClick={importRows}
                  disabled={importing || rows.length === 0}
                  className="mt-5 w-full rounded-2xl bg-[#31C16B] px-5 py-4 text-base font-black text-[#00334E] shadow-lg shadow-emerald-200 ring-2 ring-[#31C16B]/20 transition hover:-translate-y-0.5 hover:bg-[#43db7c] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {importing ? "Importando..." : "Importar contribuintes"}
                </button>

                {importResult && (
                  <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
                    <p className="font-black">Resultado da importação</p>
                    <p>Importados/atualizados: {importResult.imported}</p>
                    <p>Ignorados: {importResult.skipped}</p>
                    {importResult.messages.length > 0 && (
                      <ul className="mt-2 list-disc pl-5">
                        {importResult.messages.map((message) => <li key={message}>{message}</li>)}
                      </ul>
                    )}
                  </div>
                )}
              </section>

              <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2F6B43]">Comunicação</p>
                <h2 className="mt-1 text-2xl font-black text-[#00334E]">E-mail e WhatsApp</h2>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Após importar, o responsável pode enviar uma orientação simples com o link de acesso. No piloto, use o botão de WhatsApp ou copie a mensagem para e-mail.
                </p>
                <div className="mt-4 space-y-3">
                  {rows.slice(0, 3).map((row) => {
                    const message = `Olá, ${row.nome_completo}. Sua organização está usando o Corrente em Dia para organizar contribuições, Pix e comprovantes. Acesse: ${accessBaseUrl}/solucoes/corrente-em-dia/login usando o e-mail ${row.email}. Caso ainda não tenha senha, clique em Esqueci minha senha.`;
                    return (
                      <div key={row.email} className="rounded-2xl bg-slate-50 p-4 text-sm">
                        <p className="font-black text-slate-800">{row.nome_completo}</p>
                        <p className="text-slate-600">{row.email} • {row.whatsapp}</p>
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(message)}
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 font-black text-[#00334E]"
                          >
                            Copiar mensagem
                          </button>
                          {row.whatsapp && (
                            <a
                              href={buildWhatsAppLink(row.whatsapp, message)}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full bg-[#31C16B] px-4 py-2 text-center font-black text-[#00334E]"
                            >
                              Enviar WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Mapping = {
  date?: string;
  description?: string;
  amount?: string;
  entryType?: string;
  category?: string;
  paymentMethod?: string;
  account?: string;
  status?: string;
};

type Preview = {
  import: { id: string; import_type: string; original_file_name: string };
  headers: string[];
  previewRows: Array<Record<string, string>>;
  suggestedMapping: Mapping;
  warnings: string[];
};

type ImportHistory = {
  id: string;
  import_type: string;
  source_name: string | null;
  original_file_name: string | null;
  status: string;
  totals: Record<string, unknown>;
  error_log: string[];
  created_at: string;
};

type OcrResult = {
  document?: { id: string; original_file_name: string; ocr_status: string };
  extractedData?: Record<string, unknown>;
  message?: string;
  error?: string;
};

type Category = {
  id: string;
  entry_type: "receita" | "despesa";
  name: string;
  group_name: string;
};

type OcrDraft = {
  entryDate: string;
  amount: string;
  entryType: "receita" | "despesa";
  descriptionInternal: string;
  descriptionPublic: string;
  categoryId: string;
  paymentMethod: string;
  publicVisible: boolean;
};

const EMPTY_OCR_DRAFT: OcrDraft = {
  entryDate: "",
  amount: "",
  entryType: "despesa",
  descriptionInternal: "",
  descriptionPublic: "",
  categoryId: "",
  paymentMethod: "",
  publicVisible: true,
};

function extractedText(
  value: Record<string, unknown>,
  ...keys: string[]
) {
  for (const key of keys) {
    const current = value[key];
    if (typeof current === "string" || typeof current === "number") {
      const text = String(current).trim();
      if (text) return text;
    }
  }
  return "";
}

const mappingFields: Array<[keyof Mapping, string]> = [
  ["date", "Data"],
  ["description", "Descrição"],
  ["amount", "Valor"],
  ["entryType", "Tipo receita/despesa"],
  ["category", "Categoria"],
  ["paymentMethod", "Forma de pagamento"],
  ["account", "Conta financeira"],
  ["status", "Situação"],
];

const statusLabels: Record<string, string> = {
  pre_visualizacao: "Pré-visualização",
  aguardando_mapeamento: "Aguardando mapeamento",
  processando: "Processando",
  concluido: "Concluído",
  concluido_com_erros: "Concluído com erros",
  cancelado: "Cancelado",
};

export default function ImportacoesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState("lancamentos");
  const [importMode, setImportMode] = useState("lancamentos");
  const [defaultType, setDefaultType] = useState("despesa");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Mapping>({});
  const [history, setHistory] = useState<ImportHistory[]>([]);
  const [googleUrl, setGoogleUrl] = useState("");
  const [googleTab, setGoogleTab] = useState("");
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [ocrDraft, setOcrDraft] = useState<OcrDraft>(EMPTY_OCR_DRAFT);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const token = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    return data.session?.access_token ?? "";
  }, []);

  const loadHistory = useCallback(async () => {
    const accessToken = await token();
    const response = await fetch(
      "/api/organizacao-em-harmonia/cliente/corrente-em-dia/importacoes",
      {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
        cache: "no-store",
      },
    );
    const result = (await response.json()) as {
      imports?: ImportHistory[];
      error?: string;
    };
    if (!response.ok) {
      throw new Error(result.error || "Não foi possível carregar o histórico.");
    }
    setHistory(result.imports ?? []);
  }, [token]);

  const loadCategories = useCallback(async () => {
    const accessToken = await token();
    const response = await fetch(
      "/api/organizacao-em-harmonia/cliente/corrente-em-dia/lancamentos",
      {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
        cache: "no-store",
      },
    );
    const result = (await response.json()) as {
      categories?: Category[];
      error?: string;
    };
    if (!response.ok) {
      throw new Error(result.error || "Não foi possível carregar as categorias.");
    }
    setCategories(result.categories ?? []);
  }, [token]);

  useEffect(() => {
    let active = true;
    const timerId = window.setTimeout(() => {
      void Promise.all([loadHistory(), loadCategories()])
        .catch((reason) => {
          if (active) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Erro ao carregar importações.",
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
  }, [loadCategories, loadHistory]);

  async function previewFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Selecione um arquivo CSV, XLSX ou OFX.");
      return;
    }

    setProcessing(true);
    setError("");
    setMessage("");
    setPreview(null);

    try {
      const accessToken = await token();
      const form = new FormData();
      form.set("file", file);
      form.set("importType", importType);

      const response = await fetch(
        "/api/organizacao-em-harmonia/cliente/corrente-em-dia/importacoes",
        {
          method: "POST",
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : undefined,
          body: form,
        },
      );
      const result = (await response.json()) as Preview & { error?: string };
      if (!response.ok) {
        throw new Error(result.error || "Não foi possível analisar o arquivo.");
      }
      setPreview(result);
      setMapping(result.suggestedMapping ?? {});
      setMessage(
        `${result.previewRows.length} linha(s) exibida(s) na prévia. Revise o mapeamento antes de importar.`,
      );
      await loadHistory();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao analisar o arquivo.",
      );
    } finally {
      setProcessing(false);
    }
  }

  async function googlePreview() {
    if (!googleUrl.trim()) {
      setError("Informe a URL do Google Sheets.");
      return;
    }
    setProcessing(true);
    setError("");
    setMessage("");
    setPreview(null);

    try {
      const accessToken = await token();
      const response = await fetch(
        "/api/organizacao-em-harmonia/cliente/corrente-em-dia/importacoes",
        {
          method: "POST",
          headers: {
            ...(accessToken
              ? { Authorization: `Bearer ${accessToken}` }
              : {}),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "googleSheetsPreview",
            url: googleUrl,
            tab: googleTab,
            importType: "google_sheets",
          }),
        },
      );
      const result = (await response.json()) as Preview & { error?: string };
      if (!response.ok) {
        throw new Error(result.error || "Não foi possível ler a planilha.");
      }
      setPreview(result);
      setMapping(result.suggestedMapping ?? {});
      setMessage("Planilha carregada. Revise o mapeamento.");
      await loadHistory();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao ler Google Sheets.",
      );
    } finally {
      setProcessing(false);
    }
  }

  async function commitImport() {
    if (!preview?.import.id) return;
    if (!mapping.date || !mapping.description || !mapping.amount) {
      setError("Mapeie pelo menos Data, Descrição e Valor.");
      return;
    }

    setProcessing(true);
    setError("");
    setMessage("");

    try {
      const accessToken = await token();
      const response = await fetch(
        "/api/organizacao-em-harmonia/cliente/corrente-em-dia/importacoes",
        {
          method: "POST",
          headers: {
            ...(accessToken
              ? { Authorization: `Bearer ${accessToken}` }
              : {}),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "commitImport",
            importId: preview.import.id,
            mapping,
            defaultType,
            importMode,
          }),
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        created?: number;
        skipped?: number;
        errors?: string[];
      };
      if (!response.ok) {
        throw new Error(result.error || "Não foi possível concluir a importação.");
      }
      setMessage(
        `${result.created ?? 0} registro(s) importado(s). ${
          result.skipped ? `${result.skipped} linha(s) exigem revisão.` : ""
        }`,
      );
      setPreview(null);
      setFile(null);
      await loadHistory();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao concluir importação.",
      );
    } finally {
      setProcessing(false);
    }
  }

  async function uploadOcr() {
    if (!ocrFile) {
      setError("Selecione um comprovante, recibo ou nota.");
      return;
    }
    setProcessing(true);
    setError("");
    setMessage("");
    setOcrResult(null);

    try {
      const accessToken = await token();
      const form = new FormData();
      form.set("file", ocrFile);
      form.set("documentType", "comprovante");

      const response = await fetch(
        "/api/organizacao-em-harmonia/cliente/corrente-em-dia/ocr",
        {
          method: "POST",
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : undefined,
          body: form,
        },
      );
      const result = (await response.json()) as OcrResult;
      if (!response.ok) {
        throw new Error(result.error || "Não foi possível processar o documento.");
      }
      setOcrResult(result);
      const extracted = result.extractedData ?? {};
      const description =
        extractedText(extracted, "descricao", "description", "fornecedor") ||
        ocrFile.name;
      const suggestedType = extractedText(
        extracted,
        "tipo",
        "entryType",
        "natureza",
      )
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      setOcrDraft({
        entryDate: extractedText(extracted, "data", "date", "entryDate"),
        amount: extractedText(extracted, "valor", "amount", "total"),
        entryType: suggestedType.includes("receita")
          ? "receita"
          : "despesa",
        descriptionInternal: description,
        descriptionPublic: description,
        categoryId: "",
        paymentMethod: extractedText(
          extracted,
          "forma_pagamento",
          "paymentMethod",
        ),
        publicVisible: true,
      });
      setMessage(result.message || "Documento enviado para validação.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao enviar documento.",
      );
    } finally {
      setProcessing(false);
    }
  }

  async function validateOcrAndCreateEntry() {
    const documentId = ocrResult?.document?.id;
    if (!documentId) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ocrDraft.entryDate)) {
      setError("Revise a data no formato AAAA-MM-DD.");
      return;
    }
    if (!ocrDraft.descriptionInternal.trim()) {
      setError("Revise a descrição do documento.");
      return;
    }

    setProcessing(true);
    setError("");
    setMessage("");
    try {
      const accessToken = await token();
      const entryResponse = await fetch(
        "/api/organizacao-em-harmonia/cliente/corrente-em-dia/lancamentos",
        {
          method: "POST",
          headers: {
            ...(accessToken
              ? { Authorization: `Bearer ${accessToken}` }
              : {}),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "save",
            entryType: ocrDraft.entryType,
            entryDate: ocrDraft.entryDate,
            amount: ocrDraft.amount,
            descriptionInternal: ocrDraft.descriptionInternal,
            descriptionPublic: ocrDraft.descriptionPublic,
            categoryId: ocrDraft.categoryId,
            paymentMethod: ocrDraft.paymentMethod,
            publicVisible: ocrDraft.publicVisible,
            status: "em_revisao",
            metadata: {
              source: "ocr",
              financialDocumentId: documentId,
            },
          }),
        },
      );
      const entryResult = (await entryResponse.json().catch(() => ({}))) as {
        entry?: { id: string };
        error?: string;
      };
      if (!entryResponse.ok || !entryResult.entry?.id) {
        throw new Error(
          entryResult.error || "Não foi possível criar o lançamento.",
        );
      }

      const validationResponse = await fetch(
        "/api/organizacao-em-harmonia/cliente/corrente-em-dia/ocr",
        {
          method: "POST",
          headers: {
            ...(accessToken
              ? { Authorization: `Bearer ${accessToken}` }
              : {}),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "validate",
            documentId,
            entryId: entryResult.entry.id,
            extractedData: ocrDraft,
          }),
        },
      );
      const validationResult = (await validationResponse.json().catch(
        () => ({}),
      )) as { error?: string; message?: string };
      if (!validationResponse.ok) {
        throw new Error(
          validationResult.error || "Não foi possível validar o documento.",
        );
      }

      setMessage(
        "Documento validado e lançamento criado para revisão da Tesouraria.",
      );
      setOcrResult(null);
      setOcrFile(null);
      setOcrDraft(EMPTY_OCR_DRAFT);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao validar o documento.",
      );
    } finally {
      setProcessing(false);
    }
  }

  const previewColumns = useMemo(
    () => preview?.headers.slice(0, 8) ?? [],
    [preview],
  );

  return (
    <OrganizacaoClientShell
      title="Importar e conciliar"
      description="Traga planilhas, extratos e documentos para uma fila segura de revisão. Nenhuma importação é publicada automaticamente."
    >
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

      <section className="grid gap-4 xl:grid-cols-2">
        <form
          onSubmit={previewFile}
          className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6"
        >
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
            CSV, XLSX e OFX
          </p>
          <h2 className="mt-2 text-xl font-black text-[#00334E]">
            Selecione o arquivo e revise antes de importar
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Para planilhas, o sistema permite mapear colunas. Para OFX ou CSV bancário, as transações entram primeiro na fila de conciliação.
          </p>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 font-black text-[#123D2C]">
              Arquivo
              <input
                type="file"
                accept=".csv,.xlsx,.ofx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="rounded-2xl border border-dashed border-[#123D2C]/30 bg-[#F7FAF2] p-4"
              />
            </label>
            <label className="grid gap-2 font-black text-[#123D2C]">
              Conteúdo do arquivo
              <select
                value={importType}
                onChange={(event) => {
                  setImportType(event.target.value);
                  setImportMode(
                    event.target.value === "extrato"
                      ? "extrato"
                      : "lancamentos",
                  );
                }}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <option value="lancamentos">Receitas e despesas</option>
                <option value="contribuicoes">Contribuições</option>
                <option value="balancete">Balancete mensal</option>
                <option value="extrato">Extrato bancário</option>
              </select>
            </label>
            <button
              disabled={processing || !file}
              className="rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white disabled:opacity-50"
            >
              {processing ? "Analisando..." : "Gerar pré-visualização"}
            </button>
          </div>
        </form>

        <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
            Google Sheets
          </p>
          <h2 className="mt-2 text-xl font-black text-[#00334E]">
            Importe uma planilha publicada para leitura
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Informe a URL da planilha. Planilhas privadas exigirão uma credencial de serviço em uma próxima etapa de integração.
          </p>

          <div className="mt-5 grid gap-4">
            <input
              value={googleUrl}
              onChange={(event) => setGoogleUrl(event.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="rounded-2xl border border-slate-200 p-4"
            />
            <input
              value={googleTab}
              onChange={(event) => setGoogleTab(event.target.value)}
              placeholder="GID da aba, opcional"
              className="rounded-2xl border border-slate-200 p-4"
            />
            <button
              type="button"
              onClick={googlePreview}
              disabled={processing || !googleUrl.trim()}
              className="rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white disabled:opacity-50"
            >
              Ler planilha
            </button>
          </div>
        </section>
      </section>

      {preview && (
        <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
            Mapeamento
          </p>
          <h2 className="mt-2 text-xl font-black text-[#00334E]">
            Confirme o significado de cada coluna
          </h2>
          {preview.warnings.length > 0 && (
            <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">
              {preview.warnings.join(" ")}
            </div>
          )}

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {mappingFields.map(([key, label]) => (
              <label key={key} className="grid gap-2 font-black text-[#123D2C]">
                {label}
                <select
                  value={mapping[key] ?? ""}
                  onChange={(event) =>
                    setMapping((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-slate-200 p-3"
                >
                  <option value="">Não mapear</option>
                  {preview.headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {importMode !== "extrato" && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 font-black text-[#123D2C]">
                Tipo padrão quando a planilha não informar
                <select
                  value={defaultType}
                  onChange={(event) => setDefaultType(event.target.value)}
                  className="rounded-2xl border border-slate-200 p-3"
                >
                  <option value="despesa">Despesa</option>
                  <option value="receita">Receita</option>
                </select>
              </label>
              <div className="rounded-2xl bg-[#F7FAF2] p-4 text-sm leading-6 text-slate-600">
                Linhas com data ou valor inválidos ficam marcadas para revisão e não são gravadas.
              </div>
            </div>
          )}

          <div className="mt-5 overflow-x-auto rounded-2xl ring-1 ring-slate-100">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-[#F7FAF2] text-[#123D2C]">
                <tr>
                  {previewColumns.map((header) => (
                    <th key={header} className="px-3 py-3 font-black">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.previewRows.slice(0, 8).map((row, index) => (
                  <tr key={index} className="border-t border-slate-100">
                    {previewColumns.map((header) => (
                      <td key={header} className="max-w-52 px-3 py-3">
                        <span className="line-clamp-2">{row[header] || "-"}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={commitImport}
            disabled={processing}
            className="mt-5 w-full rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white disabled:opacity-50 sm:w-fit"
          >
            {processing
              ? "Importando..."
              : importMode === "extrato"
                ? "Importar para conciliação"
                : "Confirmar importação"}
          </button>
        </section>
      )}

      <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
          Documentos e OCR
        </p>
        <h2 className="mt-2 text-xl font-black text-[#00334E]">
          Fotografe o comprovante e valide os dados sugeridos
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          O documento fica protegido. Quando um provedor de OCR estiver configurado, o sistema sugere data, valor, fornecedor e categoria. A validação humana continua obrigatória.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
          <input
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            onChange={(event) => setOcrFile(event.target.files?.[0] ?? null)}
            className="rounded-2xl border border-dashed border-[#123D2C]/30 bg-[#F7FAF2] p-4"
          />
          <button
            type="button"
            onClick={uploadOcr}
            disabled={processing || !ocrFile}
            className="rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white disabled:opacity-50"
          >
            Enviar e extrair
          </button>
        </div>

        {ocrResult && (
          <div className="mt-4 rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10 sm:p-5">
            <p className="font-black text-[#123D2C]">
              {ocrResult.document?.original_file_name}
            </p>
            <p className="mt-1 text-sm text-slate-600">{ocrResult.message}</p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 font-black text-[#123D2C]">
                Data
                <input
                  type="date"
                  value={ocrDraft.entryDate}
                  onChange={(event) =>
                    setOcrDraft((current) => ({
                      ...current,
                      entryDate: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-slate-200 bg-white p-3"
                />
              </label>
              <label className="grid gap-2 font-black text-[#123D2C]">
                Valor
                <input
                  inputMode="decimal"
                  value={ocrDraft.amount}
                  onChange={(event) =>
                    setOcrDraft((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  placeholder="0,00"
                  className="rounded-2xl border border-slate-200 bg-white p-3"
                />
              </label>
              <label className="grid gap-2 font-black text-[#123D2C]">
                Tipo
                <select
                  value={ocrDraft.entryType}
                  onChange={(event) =>
                    setOcrDraft((current) => ({
                      ...current,
                      entryType: event.target.value as "receita" | "despesa",
                      categoryId: "",
                    }))
                  }
                  className="rounded-2xl border border-slate-200 bg-white p-3"
                >
                  <option value="despesa">Despesa</option>
                  <option value="receita">Receita</option>
                </select>
              </label>
              <label className="grid gap-2 font-black text-[#123D2C]">
                Categoria
                <select
                  value={ocrDraft.categoryId}
                  onChange={(event) =>
                    setOcrDraft((current) => ({
                      ...current,
                      categoryId: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-slate-200 bg-white p-3"
                >
                  <option value="">Sem categoria</option>
                  {categories
                    .filter(
                      (category) => category.entry_type === ocrDraft.entryType,
                    )
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.group_name} · {category.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="grid gap-2 font-black text-[#123D2C] md:col-span-2">
                Descrição interna
                <input
                  value={ocrDraft.descriptionInternal}
                  onChange={(event) =>
                    setOcrDraft((current) => ({
                      ...current,
                      descriptionInternal: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-slate-200 bg-white p-3"
                />
              </label>
              <label className="grid gap-2 font-black text-[#123D2C] md:col-span-2">
                Descrição pública
                <input
                  value={ocrDraft.descriptionPublic}
                  onChange={(event) =>
                    setOcrDraft((current) => ({
                      ...current,
                      descriptionPublic: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-slate-200 bg-white p-3"
                />
              </label>
              <label className="grid gap-2 font-black text-[#123D2C]">
                Forma de pagamento
                <input
                  value={ocrDraft.paymentMethod}
                  onChange={(event) =>
                    setOcrDraft((current) => ({
                      ...current,
                      paymentMethod: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-slate-200 bg-white p-3"
                />
              </label>
              <label className="flex items-start gap-3 rounded-2xl bg-white p-4 font-bold text-[#123D2C] ring-1 ring-slate-100">
                <input
                  type="checkbox"
                  checked={ocrDraft.publicVisible}
                  onChange={(event) =>
                    setOcrDraft((current) => ({
                      ...current,
                      publicVisible: event.target.checked,
                    }))
                  }
                  className="mt-1 h-5 w-5"
                />
                Incluir somente o valor agregado na prestação pública.
              </label>
            </div>

            <details className="mt-4 rounded-2xl bg-white p-3 text-xs text-slate-700">
              <summary className="cursor-pointer font-black text-[#123D2C]">
                Ver dados brutos extraídos
              </summary>
              <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap">
                {JSON.stringify(ocrResult.extractedData ?? {}, null, 2)}
              </pre>
            </details>

            <button
              type="button"
              onClick={validateOcrAndCreateEntry}
              disabled={processing}
              className="mt-4 w-full rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white disabled:opacity-50 sm:w-fit"
            >
              Validar e criar lançamento
            </button>
          </div>
        )}
      </section>

      <section className="rounded-[2rem] bg-[#E9F2E7] p-5 ring-1 ring-[#123D2C]/10 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
            Extratos importados
          </p>
          <h2 className="mt-2 text-xl font-black text-[#00334E]">
            Revise a fila de conciliação
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Associe cada movimento a um lançamento existente ou crie o lançamento a partir do extrato.
          </p>
        </div>
        <Link
          href="/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/reconciliacao"
          className="mt-4 block rounded-2xl bg-[#123D2C] px-5 py-4 text-center font-black text-white sm:mt-0 sm:shrink-0"
        >
          Abrir conciliação
        </Link>
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
          Histórico
        </p>
        <h2 className="mt-2 text-xl font-black text-[#00334E]">
          Importações recentes
        </h2>

        <div className="mt-4 grid gap-3">
          {history.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-black text-[#123D2C]">
                    {item.original_file_name || item.source_name || item.import_type}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {new Date(item.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">
                  {statusLabels[item.status] ?? item.status}
                </span>
              </div>
            </article>
          ))}
          {!loading && history.length === 0 && (
            <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">
              Nenhuma importação registrada.
            </p>
          )}
        </div>
      </section>
    </OrganizacaoClientShell>
  );
}

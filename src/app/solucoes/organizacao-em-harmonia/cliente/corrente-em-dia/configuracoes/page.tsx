"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Settings = {
  defaultMonthlyAmount: number;
  amountIsMandatory: boolean;
  allowCustomAmount: boolean;
  allowedDueDays: number[];
  defaultDueDay: number;
  reminderDaysBefore: number[];
  reminderOnDueDate: boolean;
  reminderChannels: string[];
  familyContributionsEnabled: boolean;
  familyRequiresMemberConfirmation: boolean;
  familyRequiresFinancialApproval: boolean;
  publicDetailLevel: "resumido" | "grupos" | "itens";
  publicShowLast12Months: boolean;
  publicShowDrilldown: boolean;
  publicShowTopExpenses: boolean;
  publicShowTopRevenues: boolean;
  publicShowNegativeResults: boolean;
  publicShowAccumulatedBalance: boolean;
  publicShowSimulator: boolean;
  publicShowProvisionalData: boolean;
  publicPopupAutoOpen: boolean;
  publicPopupFrequency:
    | "every_access"
    | "once_per_session"
    | "once_per_day"
    | "once_per_month"
    | "on_update"
    | "disabled";
  publicHeadline: string;
  publicMessage: string;
  googleSheetsUrl: string;
  googleSheetsTab: string;
  googleSheetsLastSyncAt: string | null;
  ocrProvider: string;
  receptionContactName: string;
  receptionWhatsapp: string;
  contributionNotificationEmails: string[];
};

type RelationshipType = {
  id: string;
  slug: string;
  label: string;
  active: boolean;
  requires_member_confirmation: boolean;
  requires_financial_approval: boolean;
  allow_responsible_payment: boolean;
};

type Payload = {
  canManage?: boolean;
  settings?: Settings;
  relationshipTypes?: RelationshipType[];
  error?: string;
};

const ALL_DUE_DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

const defaults: Settings = {
  defaultMonthlyAmount: 50,
  amountIsMandatory: false,
  allowCustomAmount: true,
  allowedDueDays: ALL_DUE_DAYS,
  defaultDueDay: 10,
  reminderDaysBefore: [7, 5, 3, 1],
  reminderOnDueDate: false,
  reminderChannels: ["email"],
  familyContributionsEnabled: true,
  familyRequiresMemberConfirmation: true,
  familyRequiresFinancialApproval: true,
  publicDetailLevel: "grupos",
  publicShowLast12Months: true,
  publicShowDrilldown: true,
  publicShowTopExpenses: true,
  publicShowTopRevenues: true,
  publicShowNegativeResults: true,
  publicShowAccumulatedBalance: true,
  publicShowSimulator: false,
  publicShowProvisionalData: false,
  publicPopupAutoOpen: true,
  publicPopupFrequency: "once_per_session",
  publicHeadline: "Fortalecendo a confiança",
  publicMessage:
    "Acompanhe os recursos do último mês finalizado e a previsão do mês atual, com clareza sobre receitas, despesas, resultado e saldo.",
  googleSheetsUrl: "",
  googleSheetsTab: "",
  googleSheetsLastSyncAt: null,
  ocrProvider: "external_adapter",
  receptionContactName: "Recepção do Tucxa",
  receptionWhatsapp: "",
  contributionNotificationEmails: ["automacao-ao-extremo@gmail.com"],
};

const dueDayOptions = ALL_DUE_DAYS;
const reminderOptions = [7, 5, 3, 1];

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5"
      />
      <span>
        <span className="block font-black text-[#123D2C]">{label}</span>
        {description && (
          <span className="mt-1 block text-sm leading-6 text-slate-600">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

export default function CorrenteConfiguracoesPage() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [relationships, setRelationships] = useState<RelationshipType[]>([]);
  const [newRelationship, setNewRelationship] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [relationshipSaving, setRelationshipSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const token = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    return data.session?.access_token ?? "";
  }, []);

  const load = useCallback(async () => {
    const accessToken = await token();
    const response = await fetch(
      "/api/organizacao-em-harmonia/cliente/corrente-em-dia",
      {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
        cache: "no-store",
      },
    );
    const result = (await response.json()) as Payload;
    if (!response.ok) {
      throw new Error(
        result.error || "Não foi possível carregar as configurações.",
      );
    }
    setSettings({
      ...defaults,
      ...(result.settings ?? {}),
      allowedDueDays: ALL_DUE_DAYS,
      reminderOnDueDate: false,
      reminderChannels: ["email"],
    });
    setRelationships(result.relationshipTypes ?? []);
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
                : "Erro ao carregar configurações.",
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

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function toggleNumber(
    key: "reminderDaysBefore",
    value: number,
  ) {
    setSettings((current) => {
      const list = current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value].sort((a, b) => a - b);
      return { ...current, [key]: list };
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const accessToken = await token();
      const response = await fetch(
        "/api/organizacao-em-harmonia/cliente/corrente-em-dia",
        {
          method: "POST",
          headers: {
            ...(accessToken
              ? { Authorization: `Bearer ${accessToken}` }
              : {}),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "saveSettings", settings }),
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(result.error || "Não foi possível salvar.");
      }
      setMessage(result.message || "Configurações salvas.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao salvar configurações.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveRelationship(input: {
    id?: string;
    label: string;
    active?: boolean;
    requiresMemberConfirmation?: boolean;
    requiresFinancialApproval?: boolean;
    allowResponsiblePayment?: boolean;
  }) {
    setRelationshipSaving(true);
    setError("");
    setMessage("");
    try {
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
          body: JSON.stringify({
            action: "saveRelationshipType",
            ...input,
          }),
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(result.error || "Não foi possível salvar o parentesco.");
      }
      setNewRelationship("");
      setMessage(result.message || "Parentesco salvo.");
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao salvar parentesco.",
      );
    } finally {
      setRelationshipSaving(false);
    }
  }

  const dueDayHint = useMemo(() => {
    if (settings.defaultDueDay === 31) {
      return "Em meses sem dia 31, será utilizado o último dia do mês.";
    }
    return `O dia ${settings.defaultDueDay} será sugerido inicialmente.`;
  }, [settings.defaultDueDay]);

  return (
    <OrganizacaoClientShell
      title="Configurações do Corrente em Dia"
      description="Defina valor padrão, vencimentos, lembretes, regras familiares e o nível de transparência pública."
    >
      <form onSubmit={submit} className="grid gap-5">
        {loading && (
          <p className="rounded-2xl bg-white p-4 font-bold text-slate-500 shadow">
            Carregando...
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

        <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
            Contribuição mensal
          </p>
          <h2 className="mt-2 text-xl font-black text-[#00334E]">
            Valor padrão e liberdade responsável
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            O valor padrão orienta a rotina da Casa. Ele não altera competências já fechadas e pode ser acompanhado por exceções aprovadas pela Tesouraria/Financeiro.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 font-black text-[#123D2C]">
              Valor padrão mensal
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.defaultMonthlyAmount}
                onChange={(event) =>
                  update(
                    "defaultMonthlyAmount",
                    Number(event.target.value),
                  )
                }
                inputMode="decimal"
                className="rounded-2xl border border-slate-200 p-4"
              />
            </label>
            <label className="grid gap-2 font-black text-[#123D2C]">
              Melhor dia sugerido
              <select
                value={settings.defaultDueDay}
                onChange={(event) =>
                  update("defaultDueDay", Number(event.target.value))
                }
                className="rounded-2xl border border-slate-200 p-4"
              >
                {dueDayOptions.map((day) => (
                  <option key={day} value={day}>
                    Dia {day}
                  </option>
                ))}
              </select>
              <span className="text-xs font-semibold text-slate-500">
                {dueDayHint}
              </span>
            </label>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Toggle
              checked={settings.amountIsMandatory}
              onChange={(value) => update("amountIsMandatory", value)}
              label="Valor obrigatório"
              description="Use apenas quando houver decisão formal da Diretoria. Exceções continuam registradas com justificativa."
            />
            <Toggle
              checked={settings.allowCustomAmount}
              onChange={(value) => update("allowCustomAmount", value)}
              label="Permitir valor diferente"
              description="A pessoa pode contribuir com outro valor sem expor essa escolha publicamente."
            />
          </div>

          <div className="mt-5 rounded-2xl bg-[#F7FAF2] p-4 text-sm leading-6 text-slate-600 ring-1 ring-[#123D2C]/10">
            <p className="font-black text-[#123D2C]">
              Dias disponíveis para escolha
            </p>
            <p className="mt-1">
              Os Filhos da Corrente podem escolher livremente qualquer dia entre
              1 e 31. Quando o mês não possuir o dia escolhido, será considerado
              o último dia do mês.
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
            Recepção e notificações
          </p>
          <h2 className="mt-2 text-xl font-black text-[#00334E]">
            Defina quem recebe os pagamentos assistidos
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            O contato configurado será usado quando o Filho da Corrente escolher cartão de crédito, débito ou dinheiro. Na ausência dele, o sistema procura uma pessoa ativa com função de Recepção.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 font-black text-[#123D2C]">
              Nome exibido da Recepção
              <input
                value={settings.receptionContactName}
                onChange={(event) =>
                  update("receptionContactName", event.target.value)
                }
                placeholder="Recepção do Tucxa"
                className="rounded-2xl border border-slate-200 p-4"
              />
            </label>
            <label className="grid gap-2 font-black text-[#123D2C]">
              WhatsApp da Recepção
              <input
                value={settings.receptionWhatsapp}
                onChange={(event) =>
                  update(
                    "receptionWhatsapp",
                    event.target.value.replace(/\D/g, ""),
                  )
                }
                inputMode="tel"
                placeholder="19999999999"
                className="rounded-2xl border border-slate-200 p-4"
              />
              <span className="text-xs font-semibold text-slate-500">
                Informe DDD e número. O código do Brasil será acrescentado automaticamente quando necessário.
              </span>
            </label>
            <label className="grid gap-2 font-black text-[#123D2C] md:col-span-2">
              E-mails que recebem avisos de contribuição
              <textarea
                value={settings.contributionNotificationEmails.join("\n")}
                onChange={(event) =>
                  update(
                    "contributionNotificationEmails",
                    event.target.value
                      .split(/[;,|\n]+/)
                      .map((item) => item.trim())
                      .filter(Boolean),
                  )
                }
                placeholder={"automacao-ao-extremo@gmail.com\ntesouraria@exemplo.com"}
                className="min-h-28 rounded-2xl border border-slate-200 p-4"
              />
              <span className="text-xs font-semibold text-slate-500">
                Um endereço por linha. Pessoas ativas da Tesouraria/Financeiro com e-mail cadastrado também recebem os avisos.
              </span>
            </label>
          </div>
        </section>

        <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
            Lembretes
          </p>
          <h2 className="mt-2 text-xl font-black text-[#00334E]">
            Apoio sem constrangimento
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Os lembretes ajudam a pessoa a se organizar. A comunicação deve falar de cuidado e previsibilidade, nunca de exposição ou culpa.
          </p>

          <div className="mt-5">
            <p className="font-black text-[#123D2C]">
              Enviar antes do vencimento
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {reminderOptions.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() =>
                    toggleNumber("reminderDaysBefore", day)
                  }
                  className={`rounded-2xl px-4 py-3 font-black ring-1 ${
                    settings.reminderDaysBefore.includes(day)
                      ? "bg-[#123D2C] text-white ring-[#123D2C]"
                      : "bg-white text-[#123D2C] ring-[#123D2C]/15"
                  }`}
                >
                  {day} dia{day > 1 ? "s" : ""}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-[#F7FAF2] p-4 text-sm leading-6 text-slate-600 ring-1 ring-[#123D2C]/10">
            <p className="font-black text-[#123D2C]">Canal dos lembretes</p>
            <p className="mt-1">
              Os lembretes selecionados serão enviados por e-mail para o
              endereço cadastrado pelo Filho da Corrente.
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
            Contribuição familiar
          </p>
          <h2 className="mt-2 text-xl font-black text-[#00334E]">
            Regras definidas pela Tesouraria/Financeiro
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Toggle
              checked={settings.familyContributionsEnabled}
              onChange={(value) =>
                update("familyContributionsEnabled", value)
              }
              label="Habilitar contribuição familiar"
            />
            <Toggle
              checked={settings.familyRequiresMemberConfirmation}
              onChange={(value) =>
                update("familyRequiresMemberConfirmation", value)
              }
              label="Exigir confirmação do familiar"
            />
            <Toggle
              checked={settings.familyRequiresFinancialApproval}
              onChange={(value) =>
                update("familyRequiresFinancialApproval", value)
              }
              label="Exigir aprovação financeira"
            />
          </div>

          <div className="mt-5 grid gap-3">
            {relationships.map((item) => (
              <div
                key={item.id}
                className="grid gap-3 rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-black text-[#123D2C]">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Confirmação do familiar:{" "}
                    {item.requires_member_confirmation ? "sim" : "não"} ·
                    Aprovação financeira:{" "}
                    {item.requires_financial_approval ? "sim" : "não"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={relationshipSaving}
                  onClick={() =>
                    saveRelationship({
                      id: item.id,
                      label: item.label,
                      active: !item.active,
                      requiresMemberConfirmation:
                        item.requires_member_confirmation,
                      requiresFinancialApproval:
                        item.requires_financial_approval,
                      allowResponsiblePayment:
                        item.allow_responsible_payment,
                    })
                  }
                  className={`rounded-xl px-4 py-2 text-sm font-black ${
                    item.active
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {item.active ? "Ativo" : "Inativo"}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={newRelationship}
              onChange={(event) => setNewRelationship(event.target.value)}
              placeholder="Novo grau de parentesco"
              className="min-h-12 flex-1 rounded-2xl border border-slate-200 px-4"
            />
            <button
              type="button"
              disabled={!newRelationship.trim() || relationshipSaving}
              onClick={() =>
                saveRelationship({
                  label: newRelationship,
                  active: true,
                  requiresMemberConfirmation: true,
                  requiresFinancialApproval: true,
                  allowResponsiblePayment: true,
                })
              }
              className="rounded-2xl bg-[#123D2C] px-5 py-3 font-black text-white disabled:opacity-50"
            >
              Incluir parentesco
            </button>
          </div>
        </section>

        <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
            Painel público
          </p>
          <h2 className="mt-2 text-xl font-black text-[#00334E]">
            Transparência sem exposição individual
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Toggle
                checked={settings.publicPopupAutoOpen}
                onChange={(value) => update("publicPopupAutoOpen", value)}
                label="Abrir a prestação de contas automaticamente"
                description="Quando desativado, o conteúdo continua disponível pelo link Prestação de Contas no site público do Tucxa."
              />
            </div>
            <label className="grid gap-2 font-black text-[#123D2C]">
              Nível de detalhamento
              <select
                value={settings.publicDetailLevel}
                onChange={(event) =>
                  update(
                    "publicDetailLevel",
                    event.target.value as Settings["publicDetailLevel"],
                  )
                }
                className="rounded-2xl border border-slate-200 p-4"
              >
                <option value="resumido">Nível 1 — Resumido</option>
                <option value="grupos">Nível 2 — Por grupos</option>
                <option value="itens">Nível 3 — Grupos e itens</option>
              </select>
            </label>
            <label className="grid gap-2 font-black text-[#123D2C]">
              Frequência quando a abertura automática estiver ativa
              <select
                disabled={!settings.publicPopupAutoOpen}
                value={settings.publicPopupFrequency}
                onChange={(event) =>
                  update(
                    "publicPopupFrequency",
                    event.target.value as Settings["publicPopupFrequency"],
                  )
                }
                className="rounded-2xl border border-slate-200 p-4 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="every_access">A cada acesso</option>
                <option value="once_per_session">Uma vez por sessão</option>
                <option value="once_per_day">Uma vez por dia</option>
                <option value="once_per_month">Uma vez por mês</option>
                <option value="on_update">Somente quando houver atualização</option>
                <option value="disabled">Não exibir</option>
              </select>
            </label>
            <label className="grid gap-2 font-black text-[#123D2C] md:col-span-2">
              Título público
              <input
                value={settings.publicHeadline}
                onChange={(event) =>
                  update("publicHeadline", event.target.value)
                }
                className="rounded-2xl border border-slate-200 p-4"
              />
            </label>
            <label className="grid gap-2 font-black text-[#123D2C] md:col-span-2">
              Mensagem pública
              <textarea
                value={settings.publicMessage}
                onChange={(event) =>
                  update("publicMessage", event.target.value)
                }
                className="min-h-28 rounded-2xl border border-slate-200 p-4 font-semibold text-slate-700"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[
              ["publicShowLast12Months", "Histórico dos últimos 12 meses"],
              ["publicShowDrilldown", "Drilldown por grupos"],
              ["publicShowTopExpenses", "Maiores despesas"],
              ["publicShowTopRevenues", "Melhores receitas"],
              ["publicShowNegativeResults", "Resultados negativos destacados"],
              ["publicShowAccumulatedBalance", "Saldo acumulado"],
            ].map(([key, label]) => (
              <Toggle
                key={key}
                checked={Boolean(settings[key as keyof Settings])}
                onChange={(value) =>
                  update(key as keyof Settings, value as never)
                }
                label={label}
              />
            ))}
          </div>

          <p className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-900">
            A Simulação de equilíbrio fica restrita à Gestão Financeira. Meses anteriores só aparecem publicamente quando o financeiro estiver finalizado; o mês atual mostra apenas os valores registrados até a consulta.
          </p>
        </section>

        <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
            Integrações
          </p>
          <h2 className="mt-2 text-xl font-black text-[#00334E]">
            Google Sheets e OCR
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 font-black text-[#123D2C] md:col-span-2">
              URL da planilha
              <input
                value={settings.googleSheetsUrl}
                onChange={(event) =>
                  update("googleSheetsUrl", event.target.value)
                }
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="rounded-2xl border border-slate-200 p-4"
              />
              <span className="text-xs font-semibold text-slate-500">
                A primeira versão lê planilhas publicadas ou compartilhadas para leitura.
              </span>
            </label>
            <label className="grid gap-2 font-black text-[#123D2C]">
              Aba ou GID
              <input
                value={settings.googleSheetsTab}
                onChange={(event) =>
                  update("googleSheetsTab", event.target.value)
                }
                className="rounded-2xl border border-slate-200 p-4"
              />
            </label>
            <label className="grid gap-2 font-black text-[#123D2C]">
              Adaptador de OCR
              <input
                value={settings.ocrProvider}
                onChange={(event) =>
                  update("ocrProvider", event.target.value)
                }
                className="rounded-2xl border border-slate-200 p-4"
              />
              <span className="text-xs font-semibold text-slate-500">
                Configure FINANCIAL_OCR_ENDPOINT e FINANCIAL_OCR_API_KEY no Vercel para extração automática.
              </span>
            </label>
          </div>
        </section>

        <button
          disabled={saving || loading}
          className="sticky bottom-3 z-20 w-full rounded-2xl bg-[#123D2C] px-5 py-4 text-base font-black text-white shadow-xl disabled:opacity-60 sm:static sm:w-fit"
        >
          {saving ? "Salvando..." : "Salvar configurações"}
        </button>
      </form>
    </OrganizacaoClientShell>
  );
}

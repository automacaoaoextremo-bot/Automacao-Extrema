"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FilhoCorrentePanelHeader,
  filhoPanelBase,
  filhoSignOutAction,
  filhoSupportAction,
  type PanelHeaderAction,
} from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

type PanelPreferences = {
  upcomingAppointmentsPopup: boolean;
  pendingProofsPopup: boolean;
  dueContributionPopup: boolean;
  dueContributionDaysBefore: number;
  overdueContributionPopup: boolean;
};

type Payload = {
  panelPreferences?: PanelPreferences;
  error?: string;
};

const API = "/api/organizacao-em-harmonia/filhos-corrente/corrente-em-dia";

const headerActions: PanelHeaderAction[] = [
  { label: "Início", href: filhoPanelBase, variant: "primary" },
  { label: "Voltar", href: filhoPanelBase, variant: "secondary" },
  filhoSignOutAction,
  filhoSupportAction,
];

const defaults: PanelPreferences = {
  upcomingAppointmentsPopup: true,
  pendingProofsPopup: true,
  dueContributionPopup: true,
  dueContributionDaysBefore: 7,
  overdueContributionPopup: true,
};

function PreferenceCard({
  title,
  description,
  checked,
  onChange,
  children,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <article className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-[#123D2C]/10 sm:rounded-2xl sm:p-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#123D2C] sm:h-5 sm:w-5"
        />
        <span className="min-w-0">
          <span className="block text-xs font-black leading-4 text-[#123D2C] sm:text-base">{title}</span>
          <span className="mt-0.5 block text-[10px] font-semibold leading-3.5 text-slate-600 sm:mt-1 sm:text-sm sm:leading-5">
            {description}
          </span>
        </span>
      </label>
      {children}
    </article>
  );
}

export default function ConfiguracoesPainelFilhoCorrentePage() {
  const [preferences, setPreferences] = useState<PanelPreferences>(defaults);
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
    if (!accessToken) {
      window.location.replace(
        "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login",
      );
      return;
    }

    const response = await fetch(API, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => ({}))) as Payload;
    if (!response.ok) {
      throw new Error(payload.error || "Não foi possível carregar as configurações.");
    }

    setPreferences({ ...defaults, ...(payload.panelPreferences ?? {}) });
  }, [token]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void load()
        .catch((reason) => {
          if (active) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Erro ao carregar as configurações.",
            );
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [load]);

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const accessToken = await token();
      if (!accessToken) throw new Error("Sessão não encontrada.");

      const response = await fetch(API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "savePanelPreferences",
          panelPreferences: preferences,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        panelPreferences?: PanelPreferences;
      };
      if (!response.ok) {
        throw new Error(result.error || "Não foi possível salvar as configurações.");
      }

      if (result.panelPreferences) {
        setPreferences(result.panelPreferences);
      }
      setMessage(result.message || "Preferências salvas.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao salvar as configurações.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader
        navLabel="Configurações"
        actions={headerActions}
        mobileActionColumns={4}
        autoHighlightCurrent={false}
      />

      <section className="mx-auto max-w-3xl px-3 py-2 sm:px-6 sm:py-4 lg:px-8">
        <div className="rounded-[1.35rem] bg-[#123D2C] p-3 text-white shadow-xl sm:rounded-[2rem] sm:p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#CFE2C7] sm:text-xs">
            Preferências pessoais
          </p>
          <h1 className="mt-0.5 text-xl font-black leading-tight sm:mt-1 sm:text-3xl">
            Escolha quais avisos deseja ver ao entrar.
          </h1>
          <p className="mt-1 text-xs font-semibold leading-4 text-[#EEF7EA] sm:mt-2 sm:text-base sm:leading-6">
            As opções abaixo alteram somente os pop-ups do seu acesso. Você pode
            continuar consultando as mesmas informações dentro dos módulos.
          </p>
        </div>

        {loading && (
          <p className="mt-3 rounded-2xl bg-white p-4 font-bold text-[#123D2C] shadow-sm">
            Carregando preferências...
          </p>
        )}

        {!loading && (
          <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-3 sm:grid-cols-1 sm:gap-3">
            <PreferenceCard
              title="Agendamentos futuros"
              description="Abrir pop-up com os próximos agendamentos ao entrar no painel."
              checked={preferences.upcomingAppointmentsPopup}
              onChange={(checked) =>
                setPreferences((current) => ({
                  ...current,
                  upcomingAppointmentsPopup: checked,
                }))
              }
            />

            <PreferenceCard
              title="Comprovantes pendentes"
              description="Avisar quando existir contribuição aguardando envio de comprovante."
              checked={preferences.pendingProofsPopup}
              onChange={(checked) =>
                setPreferences((current) => ({
                  ...current,
                  pendingProofsPopup: checked,
                }))
              }
            />

            <PreferenceCard
              title="Contribuições a vencer"
              description="Avisar antes da data prevista de uma contribuição."
              checked={preferences.dueContributionPopup}
              onChange={(checked) =>
                setPreferences((current) => ({
                  ...current,
                  dueContributionPopup: checked,
                }))
              }
            >
              {preferences.dueContributionPopup && (
                <label className="mt-2 block rounded-xl bg-[#F7FAF2] p-2.5 text-xs font-bold text-[#123D2C] sm:mt-3 sm:p-3 sm:text-sm">
                  Começar a avisar quantos dias antes?
                  <input
                    type="number"
                    min={0}
                    max={31}
                    value={preferences.dueContributionDaysBefore}
                    onChange={(event) => {
                      const parsed = Number(event.target.value);
                      setPreferences((current) => ({
                        ...current,
                        dueContributionDaysBefore: Number.isFinite(parsed)
                          ? Math.min(31, Math.max(0, Math.trunc(parsed)))
                          : 0,
                      }));
                    }}
                    className="mt-1.5 w-full rounded-xl border border-[#123D2C]/15 bg-white px-3 py-2 text-sm font-black outline-none focus:border-[#123D2C]"
                  />
                </label>
              )}
            </PreferenceCard>

            <PreferenceCard
              title="Contribuições vencidas"
              description="Avisar quando existir contribuição prevista que passou da data e continua pendente."
              checked={preferences.overdueContributionPopup}
              onChange={(checked) =>
                setPreferences((current) => ({
                  ...current,
                  overdueContributionPopup: checked,
                }))
              }
            />

            {error && (
              <p className="col-span-2 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 sm:col-span-1">
                {error}
              </p>
            )}
            {message && (
              <p className="col-span-2 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800 sm:col-span-1">
                {message}
              </p>
            )}

            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="col-span-2 rounded-xl bg-[#123D2C] px-5 py-2.5 font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-1 sm:rounded-2xl sm:py-3"
            >
              {saving ? "Salvando..." : "Salvar configurações"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

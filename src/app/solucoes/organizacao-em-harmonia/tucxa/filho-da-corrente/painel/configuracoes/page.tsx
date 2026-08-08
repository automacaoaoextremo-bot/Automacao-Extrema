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
    <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#123D2C]/10 sm:p-5">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 accent-[#123D2C]"
        />
        <span className="min-w-0">
          <span className="block font-black text-[#123D2C]">{title}</span>
          <span className="mt-1 block text-sm font-semibold leading-5 text-slate-600">
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
      />

      <section className="mx-auto max-w-3xl px-3 py-3 sm:px-6 sm:py-5 lg:px-8">
        <div className="rounded-[1.75rem] bg-[#123D2C] p-4 text-white shadow-xl sm:rounded-[2rem] sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#CFE2C7] sm:text-xs">
            Preferências pessoais
          </p>
          <h1 className="mt-1 text-2xl font-black leading-tight sm:text-3xl">
            Escolha quais avisos deseja ver ao entrar.
          </h1>
          <p className="mt-2 text-sm font-semibold leading-5 text-[#EEF7EA] sm:text-base sm:leading-6">
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
          <div className="mt-3 grid gap-3">
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
                <label className="mt-3 block rounded-xl bg-[#F7FAF2] p-3 text-sm font-bold text-[#123D2C]">
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
                    className="mt-2 w-full rounded-xl border border-[#123D2C]/15 bg-white px-3 py-2.5 text-base font-black outline-none focus:border-[#123D2C]"
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
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="rounded-2xl bg-[#123D2C] px-5 py-3.5 font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar configurações"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

const ACCESS_API = "/api/organizacao-em-harmonia/agendamento/acesso";

type Profile = {
  fullName: string;
  whatsapp: string;
  email: string;
  privacyAccepted: boolean;
  destination: string;
};

type Props = {
  destination?: string;
  onCancel?: () => void;
};

export function TucxaFirstAccessModal({ destination = "/solucoes/organizacao-em-harmonia/agendamento", onCancel }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let active = true;

    const timer = window.setTimeout(() => {
      void supabaseBrowser.auth.getSession().then(async ({ data }) => {
        if (!data.session) {
          if (active) {
            setError("Sua sessão expirou. Entre novamente.");
            setLoading(false);
          }
          return;
        }

        const response = await fetch(ACCESS_API, {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
          cache: "no-store",
        });
        const result = (await response.json().catch(() => ({}))) as { profile?: Profile; error?: string };
        if (!active) return;
        if (!response.ok || !result.profile) {
          setError(result.error || "Não foi possível carregar seus dados.");
          setLoading(false);
          return;
        }

        setProfile(result.profile);
        setFullName(result.profile.fullName || "");
        setWhatsapp(result.profile.whatsapp || "");
        setEmail(result.profile.email || "");
        setPrivacyAccepted(false);
        setLoading(false);
      });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
      document.body.style.overflow = previous;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("A nova senha e a confirmação não conferem.");
      return;
    }
    if (!privacyAccepted) {
      setError("Confirme sua ciência do Aviso de Privacidade (LGPD) para continuar.");
      return;
    }

    setSaving(true);
    try {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      if (!sessionData.session) throw new Error("Sua sessão expirou. Entre novamente.");

      const { error: passwordError } = await supabaseBrowser.auth.updateUser({
        password,
        data: { must_change_password: false, password_changed_at: new Date().toISOString() },
      });
      if (passwordError) {
        const text = passwordError.message.toLowerCase();
        if (text.includes("different") || text.includes("same password")) {
          throw new Error("Escolha uma senha diferente da senha temporária usada no primeiro acesso.");
        }
        throw new Error("Não foi possível atualizar a senha. Tente novamente.");
      }

      const response = await fetch(ACCESS_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ action: "complete-first-access", fullName, whatsapp, email, privacyAccepted }),
      });
      const result = (await response.json().catch(() => ({}))) as { destination?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível concluir seu primeiro acesso.");
      window.location.replace(result.destination || profile?.destination || destination);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível concluir o primeiro acesso.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#10251C]/80 p-2 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Primeiro acesso">
      <section className="flex max-h-[calc(100dvh-1rem)] w-full max-w-xl flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-2 bg-[#123D2C] px-4 py-3 text-white">
          <div>
            <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-[#CFE2C7]">Primeiro acesso</p>
            <h2 className="text-base font-black sm:text-xl">Confirme seus dados e troque a senha.</h2>
          </div>
          {onCancel && (
            <button type="button" onClick={onCancel} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black ring-1 ring-white/20">Sair</button>
          )}
        </header>

        <div className="min-h-0 flex-1 overflow-hidden p-3 sm:p-4">
          {loading ? (
            <p className="rounded-2xl bg-[#F7FAF2] p-4 text-center text-sm font-bold text-[#123D2C]">Carregando seu cadastro...</p>
          ) : (
            <form onSubmit={submit} className="grid gap-2">
              <CompactField label="Nome">
                <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="h-9 rounded-xl border border-slate-200 px-3 text-sm font-semibold" required />
              </CompactField>
              <div className="grid grid-cols-2 gap-2">
                <CompactField label="Telefone / WhatsApp">
                  <input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} className="h-9 min-w-0 rounded-xl border border-slate-200 px-3 text-sm font-semibold" required />
                </CompactField>
                <CompactField label="E-mail (opcional)">
                  <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="h-9 min-w-0 rounded-xl border border-slate-200 px-3 text-sm font-semibold" />
                </CompactField>
              </div>
              <label className="flex items-start gap-2 rounded-xl bg-[#F7FAF2] p-2 text-[0.66rem] font-semibold leading-4 ring-1 ring-[#123D2C]/10 sm:text-xs">
                <input type="checkbox" checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Estou de acordo com o uso dos meus dados pelo Tucxa para identificação, acesso, agendamentos e comunicações relacionadas ao atendimento, conforme o Aviso de Privacidade (LGPD).</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <CompactField label="Nova senha">
                  <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} minLength={8} autoComplete="new-password" className="h-9 min-w-0 rounded-xl border border-slate-200 px-3 text-sm font-semibold" required />
                </CompactField>
                <CompactField label="Confirmar senha">
                  <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} type={showPassword ? "text" : "password"} minLength={8} autoComplete="new-password" className="h-9 min-w-0 rounded-xl border border-slate-200 px-3 text-sm font-semibold" required />
                </CompactField>
              </div>
              <div className="grid grid-cols-[auto_1fr] gap-2">
                <button type="button" onClick={() => setShowPassword((current) => !current)} className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-black text-[#123D2C]">
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
                <button disabled={saving} className="h-10 rounded-xl bg-[#123D2C] px-4 text-sm font-black text-white disabled:opacity-60">
                  {saving ? "Salvando..." : "Confirmar e continuar"}
                </button>
              </div>
              {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-[0.68rem] font-bold leading-4 text-red-700 sm:text-xs">{error}</p>}
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

function CompactField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid min-w-0 gap-0.5 text-[0.66rem] font-black text-[#123D2C] sm:text-xs"><span>{label}</span>{children}</label>;
}

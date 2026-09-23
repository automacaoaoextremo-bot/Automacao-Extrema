"use client";

import { FormEvent, useEffect, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const ACCESS_API = "/api/organizacao-em-harmonia/agendamento/acesso";
const LOGIN_PATH = "/solucoes/organizacao-em-harmonia/agendamento/login";

type Profile = {
  fullName: string;
  whatsapp: string;
  email: string;
  privacyAccepted: boolean;
  destination: string;
};

function safeReturnTo(fallback: string) {
  if (typeof window === "undefined") return fallback;
  const value = new URLSearchParams(window.location.search).get("returnTo") || "";
  return value.startsWith("/solucoes/organizacao-em-harmonia/") && !value.startsWith("//") ? value : fallback;
}

export default function AgendamentoPrimeiroAcessoPage() {
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
    let active = true;
    const timer = window.setTimeout(() => {
      void supabaseBrowser.auth.getSession().then(async ({ data }) => {
        if (!data.session) {
          const returnTo = `${window.location.pathname}${window.location.search}`;
          window.location.replace(`${LOGIN_PATH}?returnTo=${encodeURIComponent(returnTo)}`);
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
        setPrivacyAccepted(result.profile.privacyAccepted === true);
        setLoading(false);
      });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
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
      const destination = safeReturnTo(result.destination || profile?.destination || "/solucoes/organizacao-em-harmonia/agendamento");
      window.location.replace(destination);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível concluir o primeiro acesso.");
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader actions={[]} navLabel="Primeiro acesso ao Agendamento" showSessionName />
      <section className="mx-auto max-w-2xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <article className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7]">Primeiro acesso</p>
          <h1 className="mt-2 text-3xl font-black">Confirme seus dados e crie sua senha.</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#E6F0E2]">
            Esta confirmação ajuda o Tucxa a manter telefone, contato e acesso corretos para os agendamentos. Seu e-mail é opcional.
          </p>

          {loading ? (
            <p className="mt-5 rounded-2xl bg-white/10 p-4 font-bold">Carregando seu cadastro...</p>
          ) : (
            <form onSubmit={submit} className="mt-5 grid gap-3 rounded-[1.6rem] bg-white p-4 text-[#10251C] sm:p-5">
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">Nome
                <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold" required />
              </label>
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">Telefone / WhatsApp
                <input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold" required />
              </label>
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">E-mail (opcional)
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold" />
              </label>
              <label className="flex items-start gap-3 rounded-2xl bg-[#F7FAF2] p-3 text-sm font-semibold leading-5 ring-1 ring-[#123D2C]/10">
                <input type="checkbox" checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} className="mt-1 h-4 w-4" />
                <span>Estou ciente de que meus dados serão usados pelo Tucxa para identificação, acesso ao sistema, organização dos agendamentos e comunicações relacionadas ao atendimento, conforme o Aviso de Privacidade.</span>
              </label>
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">Nova senha
                <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} minLength={8} autoComplete="new-password" className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold" required />
              </label>
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">Confirmar nova senha
                <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} type={showPassword ? "text" : "password"} minLength={8} autoComplete="new-password" className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold" required />
              </label>
              <button type="button" onClick={() => setShowPassword((current) => !current)} className="min-h-11 rounded-2xl border border-slate-200 font-black text-[#123D2C]">
                {showPassword ? "Ocultar senhas" : "Mostrar senhas"}
              </button>
              {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
              <button disabled={saving} className="min-h-12 rounded-2xl bg-[#123D2C] px-5 font-black text-white disabled:opacity-60">
                {saving ? "Salvando..." : "Confirmar dados e continuar"}
              </button>
            </form>
          )}
        </article>
      </section>
    </main>
  );
}

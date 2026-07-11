"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AeSolutionHeader } from "@/components/ae-solution-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

type AccessPerson = {
  fullName: string;
  whatsapp: string;
  email: string;
  notes: string;
  accessStatus: string;
  modules: string[];
};

type AccessResponse = {
  ok?: boolean;
  found?: boolean;
  authEmail?: string;
  displayEmail?: string;
  message?: string;
  error?: string;
  organizationName?: string;
  status?: string;
  loginIdentifier?: string;
  whatsappUrl?: string;
  person?: AccessPerson | null;
};

const statusLabels: Record<string, string> = {
  ativo: "Acesso liberado",
  pendente_validacao: "Aguardando validação do responsável do Tucxa",
  inativo: "Cadastro inativo",
  ajuste_solicitado: "Ajuste solicitado",
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isEmail(value: string) {
  return value.includes("@");
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || "irmão(ã)";
}

export default function OrganizacaoEmHarmoniaLoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordLoading, setNewPasswordLoading] = useState(false);
  const [newPasswordMessage, setNewPasswordMessage] = useState("");

  const [signupLookup, setSignupLookup] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupWhatsapp, setSignupWhatsapp] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupNotes, setSignupNotes] = useState("");
  const [signupShowPassword, setSignupShowPassword] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupMessage, setSignupMessage] = useState("");
  const [signupError, setSignupError] = useState("");
  const [foundPerson, setFoundPerson] = useState<AccessPerson | null>(null);

  useEffect(() => {
    const { data } = supabaseBrowser.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
        setResetMessage("Link validado. Defina uma nova senha para continuar.");
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  async function resolveLoginEmail() {
    const value = identifier.trim();
    if (!value) throw new Error("Informe o e-mail de gestor da Organização em Harmonia.");
    if (!isEmail(value)) {
      throw new Error("A área de gestão deve ser acessada somente com e-mail de gestor. Filhos da Corrente devem usar o acesso próprio do Tucxa.");
    }
    return value.toLowerCase();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResetMessage("");
    setLoading(true);

    try {
      const authEmail = await resolveLoginEmail();
      const { error: authError } = await supabaseBrowser.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (authError) {
        setError("Não foi possível entrar. Confira e-mail e senha. Caso seja Filho da Corrente, use o acesso próprio do Tucxa.");
        setLoading(false);
        return;
      }

      const { data: userData } = await supabaseBrowser.auth.getUser();
      const metadata = userData.user?.user_metadata ?? {};
      if (metadata.oh_profile === "filho-da-corrente") {
        await supabaseBrowser.auth.signOut();
        setError("Este usuário é de Filho da Corrente e não pode acessar a área de gestão. Use o acesso próprio no site público do Tucxa.");
        setLoading(false);
        return;
      }

      window.location.href = "/solucoes/organizacao-em-harmonia/cliente";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar agora.");
      setLoading(false);
    }
  }

  async function requestPasswordReset() {
    setError("");
    setResetMessage("");

    const value = identifier.trim();
    if (!value) {
      setResetMessage("Informe seu e-mail no campo acima e clique novamente em Esqueci minha senha.");
      return;
    }

    if (!isEmail(value)) {
      setResetMessage("Para redefinir por link, informe o e-mail cadastrado. Se você acessa apenas pelo WhatsApp, peça apoio ao responsável do Tucxa ou confirme seus dados novamente no primeiro acesso.");
      return;
    }

    setResetLoading(true);
    const { error: resetError } = await supabaseBrowser.auth.resetPasswordForEmail(value.toLowerCase(), {
      redirectTo: `${window.location.origin}/solucoes/organizacao-em-harmonia/login`,
    });
    setResetLoading(false);

    if (resetError) {
      setResetMessage("Não foi possível enviar o link de redefinição. Confira o e-mail ou fale com a Automação Extrema.");
      return;
    }

    setResetMessage("Enviamos um link de redefinição para este e-mail, se ele estiver cadastrado na Organização em Harmonia.");
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNewPasswordMessage("");

    if (newPassword.length < 8) {
      setNewPasswordMessage("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setNewPasswordLoading(true);
    const { error: updateError } = await supabaseBrowser.auth.updateUser({ password: newPassword });
    setNewPasswordLoading(false);

    if (updateError) {
      setNewPasswordMessage("Não foi possível atualizar a senha. Solicite um novo link de redefinição.");
      return;
    }

    setNewPasswordMessage("Senha atualizada com sucesso. Você já pode acessar a Organização em Harmonia.");
    setRecoveryMode(false);
    setPassword("");
    setNewPassword("");
  }

  async function lookupSignup() {
    setSignupError("");
    setSignupMessage("");
    setFoundPerson(null);

    const value = signupLookup.trim() || signupWhatsapp.trim() || signupEmail.trim();
    if (!value) {
      setSignupError("Informe seu WhatsApp ou e-mail para localizar dados que já estejam na Base Única.");
      return;
    }

    setSignupLoading(true);
    try {
      const response = await fetch("/api/organizacao-em-harmonia/filhos-corrente/acesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lookup", identifier: value }),
      });
      const result = (await response.json()) as AccessResponse;
      if (!response.ok) throw new Error(result.error || "Não foi possível consultar a Base Única.");

      if (result.person) {
        setFoundPerson(result.person);
        setSignupName(result.person.fullName || signupName);
        setSignupWhatsapp(result.person.whatsapp || signupWhatsapp || onlyDigits(value));
        setSignupEmail(result.person.email || signupEmail);
        setSignupNotes(result.person.notes || signupNotes);
        setSignupMessage(`Localizamos alguns dados, ${firstName(result.person.fullName)}. Confira, ajuste o que precisar e crie sua senha para solicitar a liberação.`);
      } else {
        if (isEmail(value)) setSignupEmail(value.toLowerCase());
        else setSignupWhatsapp(onlyDigits(value));
        setSignupMessage("Ainda não localizamos seus dados automaticamente. Preencha nome completo, WhatsApp e senha para o responsável do Tucxa conferir com segurança.");
      }
    } catch (err) {
      setSignupError(err instanceof Error ? err.message : "Erro ao localizar cadastro.");
    } finally {
      setSignupLoading(false);
    }
  }

  async function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignupError("");
    setSignupMessage("");

    if (!signupName.trim()) {
      setSignupError("Informe seu nome completo.");
      return;
    }
    if (onlyDigits(signupWhatsapp).length < 10) {
      setSignupError("Informe seu WhatsApp com DDD. Este é o canal principal de orientação do Tucxa.");
      return;
    }
    if (signupPassword.length < 8) {
      setSignupError("Crie uma senha com pelo menos 8 caracteres para os próximos acessos.");
      return;
    }

    setSignupLoading(true);
    try {
      const response = await fetch("/api/organizacao-em-harmonia/filhos-corrente/acesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          fullName: signupName,
          whatsapp: signupWhatsapp,
          email: signupEmail,
          password: signupPassword,
          notes: signupNotes,
        }),
      });
      const result = (await response.json()) as AccessResponse;
      if (!response.ok) throw new Error(result.error || "Não foi possível enviar seu cadastro.");

      setFoundPerson(result.person ?? null);
      setSignupPassword("");
      setSignupMessage(result.message || "Cadastro recebido. O responsável do Tucxa irá confirmar seus dados e liberar o acesso.");
    } catch (err) {
      setSignupError(err instanceof Error ? err.message : "Erro ao enviar cadastro.");
    } finally {
      setSignupLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <AeSolutionHeader
        solutionName="Organização em Harmonia"
        logoSrc="/organizacao-em-harmonia-logo.svg"
        logoAlt="Logo Organização em Harmonia"
        actions={[]}
        sectionLinks={[]}
        topAction={
          <Link
            href="/solucoes/organizacao-em-harmonia"
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#31C16B]/30 bg-[#31C16B] px-4 py-2 text-sm font-black text-[#00334E] shadow-md shadow-emerald-200/70 transition hover:-translate-y-0.5 hover:bg-[#43db7c]"
          >
            ← Voltar
          </Link>
        }
      />

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-5 lg:grid-cols-[0.9fr_1.1fr] lg:py-8">
        <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-slate-100 sm:p-7">
          <div className="space-y-3">
            <p className="text-sm font-black uppercase tracking-[0.28em] text-[#2F6B43]">Já sou cliente</p>
            <h1 className="text-3xl font-black text-[#00334E]">Acessar Organização em Harmonia</h1>
            <p className="text-base leading-7 text-slate-700">
              Entre com seu e-mail ou WhatsApp. A proposta é facilitar o acesso de todos, inclusive quem usa mais o celular do que o computador.
            </p>
          </div>

          {recoveryMode && (
            <form onSubmit={updatePassword} className="mt-5 rounded-[1.5rem] bg-emerald-50 p-4 ring-1 ring-emerald-100 sm:p-5">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2F6B43]">Redefinir senha</p>
              <h2 className="mt-2 text-2xl font-black text-[#00334E]">Criar nova senha</h2>
              <label className="mt-5 block">
                <span className="text-sm font-bold text-slate-700">Nova senha</span>
                <input
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  type="password"
                  autoComplete="new-password"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white p-4 text-base outline-none transition focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-100"
                  placeholder="Digite a nova senha"
                  required
                />
              </label>
              {newPasswordMessage && <p className="mt-4 rounded-2xl bg-white p-3 text-sm font-bold text-emerald-800">{newPasswordMessage}</p>}
              <button
                type="submit"
                disabled={newPasswordLoading}
                className="mt-5 w-full rounded-2xl bg-[#31C16B] px-5 py-4 text-base font-black text-[#00334E] shadow-lg shadow-emerald-200 ring-2 ring-[#31C16B]/20 transition hover:-translate-y-0.5 hover:bg-[#43db7c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {newPasswordLoading ? "Atualizando..." : "Atualizar senha"}
              </button>
            </form>
          )}

          <form onSubmit={onSubmit} className="mt-5">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">E-mail ou WhatsApp</span>
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                type="text"
                inputMode="email"
                autoComplete="username"
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white p-4 text-base outline-none transition focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-100"
                placeholder="seu@email.com ou (19) 99999-9999"
                required
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-bold text-slate-700">Senha</span>
              <div className="mt-2 flex rounded-2xl border border-slate-300 bg-white focus-within:border-[#31C16B] focus-within:ring-4 focus-within:ring-emerald-100">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="min-w-0 flex-1 rounded-2xl bg-transparent p-4 text-base outline-none"
                  placeholder="Digite a senha"
                  required
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="shrink-0 px-4 text-sm font-black text-[#00334E]">
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </label>

            {error && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
            {resetMessage && <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{resetMessage}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-2xl bg-[#31C16B] px-5 py-4 text-base font-black text-[#00334E] shadow-lg shadow-emerald-200 ring-2 ring-[#31C16B]/20 transition hover:-translate-y-0.5 hover:bg-[#43db7c] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Entrar no painel"}
            </button>

            <button
              type="button"
              onClick={requestPasswordReset}
              disabled={resetLoading}
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#00334E] transition hover:-translate-y-0.5 hover:border-[#31C16B] hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resetLoading ? "Enviando link..." : "Esqueci minha senha"}
            </button>
          </form>
        </div>

        <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-slate-100 sm:p-7">
          <div className="rounded-[1.5rem] bg-emerald-50 p-4 ring-1 ring-emerald-100">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#2F6B43]">Primeiro acesso dos Filhos da Corrente</p>
            <h2 className="mt-2 text-2xl font-black text-[#00334E]">Confirme seus dados uma única vez</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Nome completo e WhatsApp são suficientes para começar. O e-mail não é obrigatório, mas ajuda o Tucxa a enviar orientações importantes também fora do grupo de recados, sem depender de uma única mensagem perdida no WhatsApp.
            </p>
          </div>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <label className="block">
              <span className="text-sm font-black text-[#00334E]">Localizar meus dados pelo WhatsApp ou e-mail</span>
              <input
                value={signupLookup}
                onChange={(event) => setSignupLookup(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-4 text-base outline-none focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-100"
                placeholder="Digite seu WhatsApp ou e-mail"
              />
            </label>
            <button type="button" onClick={lookupSignup} disabled={signupLoading} className="mt-3 w-full rounded-2xl bg-white px-5 py-3 font-black text-[#00334E] ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-emerald-50 disabled:opacity-60">
              {signupLoading ? "Consultando..." : "Buscar meus dados"}
            </button>
          </div>

          {foundPerson && (
            <div className="mt-4 rounded-3xl bg-blue-50 p-4 text-sm leading-6 text-[#00334E] ring-1 ring-blue-100">
              <p className="font-black">Dados encontrados na Base Única</p>
              <p>Confira abaixo e ajuste o que estiver incompleto ou desatualizado.</p>
              <p className="mt-2 font-bold">Status: {statusLabels[foundPerson.accessStatus] ?? foundPerson.accessStatus}</p>
            </div>
          )}

          <form onSubmit={submitSignup} className="mt-5 grid gap-4">
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#00334E]">Nome completo *</span>
              <input value={signupName} onChange={(event) => setSignupName(event.target.value)} className="rounded-2xl border border-slate-200 p-4 text-base" placeholder="Seu nome completo" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#00334E]">WhatsApp com DDD *</span>
              <input value={signupWhatsapp} onChange={(event) => setSignupWhatsapp(event.target.value)} inputMode="tel" className="rounded-2xl border border-slate-200 p-4 text-base" placeholder="(19) 99999-9999" />
              <span className="text-xs font-semibold text-slate-500">Este será o canal principal para avisos, orientações e liberação de acesso.</span>
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#00334E]">E-mail</span>
              <input value={signupEmail} onChange={(event) => setSignupEmail(event.target.value)} type="email" className="rounded-2xl border border-slate-200 p-4 text-base" placeholder="Opcional, mas recomendado" />
              <span className="text-xs font-semibold text-slate-500">Com e-mail, você recebe comunicados e orientações em dois canais, reduzindo o risco de perder informações importantes.</span>
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#00334E]">Crie uma senha para os próximos acessos *</span>
              <div className="flex rounded-2xl border border-slate-200 bg-white focus-within:border-[#31C16B] focus-within:ring-4 focus-within:ring-emerald-100">
                <input
                  value={signupPassword}
                  onChange={(event) => setSignupPassword(event.target.value)}
                  type={signupShowPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="min-w-0 flex-1 rounded-2xl bg-transparent p-4 text-base outline-none"
                  placeholder="Mínimo 8 caracteres"
                />
                <button type="button" onClick={() => setSignupShowPassword((value) => !value)} className="shrink-0 px-4 text-sm font-black text-[#00334E]">
                  {signupShowPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#00334E]">Alguma observação para facilitar a validação?</span>
              <textarea value={signupNotes} onChange={(event) => setSignupNotes(event.target.value)} className="min-h-24 rounded-2xl border border-slate-200 p-4 text-base" placeholder="Ex.: sou do grupo de quinta, sou cambono, meu nome está abreviado no WhatsApp..." />
            </label>

            <div className="rounded-3xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 ring-1 ring-amber-100">
              <p className="font-black">Depois de enviar</p>
              <p>O responsável do Tucxa irá confirmar seus dados e liberar o acesso com as orientações detalhadas de uso. Isso evita confusão, protege a Base Única e simplifica a implantação para todos.</p>
            </div>

            {signupError && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{signupError}</p>}
            {signupMessage && <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{signupMessage}</p>}

            <button type="submit" disabled={signupLoading} className="rounded-2xl bg-[#00334E] px-5 py-4 text-base font-black text-white shadow-lg shadow-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60">
              {signupLoading ? "Enviando..." : "Enviar para validação do Tucxa"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

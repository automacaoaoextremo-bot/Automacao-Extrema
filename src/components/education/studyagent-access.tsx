"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

const HOME = "/solucoes/studyagent/residencia-ia";
const STUDY = "/solucoes/studyagent/residencia-ia/estudar";

export function StudyAgentAccess() {
  const [mode, setMode] = useState<"login" | "cadastro">("login");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const shouldOpenCadastro = params.get("modo") === "cadastro";
    const recoveryLink = params.get("type") === "recovery" || hashParams.get("type") === "recovery";

    const initialStateTimer = window.setTimeout(() => {
      if (shouldOpenCadastro) setMode("cadastro");
      if (recoveryLink) setRecoveryMode(true);
    }, 0);

    const { data } = supabaseBrowser.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
        setMessage("Link validado. Defina uma nova senha para continuar.");
        return;
      }
      if (event === "SIGNED_IN" && session?.user && !recoveryLink) {
        window.location.replace(STUDY);
      }
    });

    supabaseBrowser.auth.getSession().then(({ data: sessionData }) => {
      if (sessionData.session?.user && !recoveryLink) {
        window.location.replace(STUDY);
      }
    });

    return () => {
      window.clearTimeout(initialStateTimer);
      data.subscription.unsubscribe();
    };
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const { error: authError } = await supabaseBrowser.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      setError("Não foi possível entrar. Confira e-mail e senha ou use Esqueci minha senha.");
      setLoading(false);
      return;
    }

    window.location.href = STUDY;
  }

  async function signup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (fullName.trim().length < 3) {
      setError("Informe seu nome completo.");
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      setLoading(false);
      return;
    }

    const redirectTo = `${window.location.origin}${STUDY}`;
    const { data, error: signupError } = await supabaseBrowser.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          studyagent_profile: "learner",
          study_program_slug: "residencia-ia",
        },
      },
    });

    if (signupError) {
      setError("Não foi possível concluir o cadastro. Confira os dados e tente novamente.");
      setLoading(false);
      return;
    }

    if (data.session) {
      window.location.href = STUDY;
      return;
    }

    setMessage("Cadastro recebido. Confira seu e-mail para confirmar o acesso e depois volte para entrar.");
    setLoading(false);
  }

  async function resetPassword() {
    setError("");
    setMessage("");
    const value = email.trim().toLowerCase();
    if (!value.includes("@")) {
      setMessage("Informe seu e-mail no campo acima e clique novamente em Esqueci minha senha.");
      return;
    }
    setLoading(true);
    const redirectTo = `${window.location.origin}/solucoes/studyagent/residencia-ia/acesso`;
    const { error: resetError } = await supabaseBrowser.auth.resetPasswordForEmail(value, { redirectTo });
    setLoading(false);
    setMessage(resetError ? "Não foi possível enviar o link agora." : "Se o e-mail estiver cadastrado, enviaremos um link de redefinição.");
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (newPassword.length < 8) {
      setError("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabaseBrowser.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (updateError) {
      setError("Não foi possível atualizar a senha. Solicite um novo link.");
      return;
    }
    setMessage("Senha atualizada. Você já pode continuar seus estudos.");
    window.setTimeout(() => { window.location.href = STUDY; }, 700);
  }

  if (recoveryMode) {
    return (
      <AccessCard title="Defina sua nova senha" eyebrow="StudyAgent · Recuperação">
        <form onSubmit={updatePassword} className="space-y-3">
          <label className="block text-sm font-bold text-[#00334E]">Nova senha</label>
          <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#00A8CC]" placeholder="Mínimo de 8 caracteres" />
          <button disabled={loading} className="w-full rounded-xl bg-[#00334E] px-5 py-3 font-black text-white disabled:opacity-60">{loading ? "Salvando..." : "Salvar nova senha"}</button>
          <Feedback error={error} message={message} />
        </form>
      </AccessCard>
    );
  }

  return (
    <AccessCard
      title={mode === "login" ? "Entre para continuar seus estudos" : "Cadastre para estudar"}
      eyebrow={mode === "login" ? "StudyAgent · Acesso" : "StudyAgent · Primeiro acesso"}
    >
      <form onSubmit={mode === "login" ? login : signup} className="space-y-3">
        {mode === "cadastro" ? (
          <>
            <Field label="Nome completo">
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#00A8CC]" placeholder="Como você quer ser identificado" autoComplete="name" />
            </Field>
            <Field label="WhatsApp/celular (opcional)">
              <input value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#00A8CC]" placeholder="(19) 99999-9999" autoComplete="tel" />
            </Field>
          </>
        ) : null}

        <Field label="E-mail">
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#00A8CC]" placeholder="seu@email.com" autoComplete="email" required />
        </Field>

        <Field label="Senha">
          <div className="flex rounded-xl border border-slate-300 bg-white focus-within:border-[#00A8CC]">
            <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className="min-w-0 flex-1 rounded-xl px-4 py-3 outline-none" placeholder={mode === "cadastro" ? "Mínimo de 8 caracteres" : "Digite sua senha"} autoComplete={mode === "cadastro" ? "new-password" : "current-password"} required />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="px-4 text-sm font-bold text-slate-500">{showPassword ? "Ocultar" : "Mostrar"}</button>
          </div>
        </Field>

        <button disabled={loading} className="w-full rounded-xl bg-[#00334E] px-5 py-3.5 font-black text-white shadow-sm disabled:opacity-60">
          {loading ? "Processando..." : mode === "login" ? "Entrar no StudyAgent" : "Criar meu acesso"}
        </button>

        {mode === "login" ? (
          <button type="button" onClick={resetPassword} className="w-full rounded-xl bg-white px-5 py-3 text-sm font-black text-[#00334E] ring-1 ring-slate-200">Esqueci minha senha</button>
        ) : null}

        <Feedback error={error} message={message} />
      </form>

      <div className="mt-5 border-t border-white/20 pt-4">
        <p className="text-sm font-semibold text-white/75">{mode === "login" ? "Ainda não tem acesso?" : "Já possui cadastro?"}</p>
        <button type="button" onClick={() => { setMode(mode === "login" ? "cadastro" : "login"); setError(""); setMessage(""); }} className="mt-2 w-full rounded-xl bg-[#31C16B] px-5 py-3 font-black text-[#00334E]">
          {mode === "login" ? "Cadastre para estudar" : "Voltar para entrar"}
        </button>
      </div>
    </AccessCard>
  );
}

function AccessCard({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <main id="inicio" className="min-h-screen bg-[#f4fbfd] px-3 py-4 text-slate-900 sm:px-5 sm:py-8">
      <div className="mx-auto max-w-xl">
        <Link href={HOME} className="mb-3 inline-flex text-sm font-black text-[#007C9B] hover:underline">← Voltar</Link>
        <section className="rounded-[1.75rem] bg-[#00334E] p-3 shadow-xl sm:rounded-[2rem] sm:p-5">
          <div className="rounded-[1.35rem] bg-white p-4 sm:p-6">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#00A8CC]">{eyebrow}</p>
            <h1 className="mt-2 text-2xl font-black text-[#00334E] sm:text-3xl">{title}</h1>
            <div className="mt-5">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-[#00334E]">{label}</span>
      {children}
    </label>
  );
}

function Feedback({ error, message }: { error: string; message: string }) {
  if (!error && !message) return null;
  return <p className={`rounded-xl p-3 text-sm leading-6 ${error ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{error || message}</p>;
}

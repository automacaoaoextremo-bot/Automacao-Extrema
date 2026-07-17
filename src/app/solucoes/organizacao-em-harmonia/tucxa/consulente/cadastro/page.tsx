"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

type ConsulenteResponse = { ok?: boolean; message?: string; error?: string; whatsappUrl?: string; redirectUrl?: string; statusUrl?: string };

const headerActions = [
  { label: "É novo por aqui", href: "/solucoes/organizacao-em-harmonia/tucxa/consulente/novo", variant: "primary" as const },
  { label: "Atendimento em Harmonia", href: "/solucoes/organizacao-em-harmonia/tucxa/consulente/login?destino=agenda", variant: "secondary" as const },
  { label: "Site do Tucxa", href: "/solucoes/organizacao-em-harmonia/tucxa", variant: "secondary" as const },
];

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export default function CadastroConsulenteTucxaPage() {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setWhatsappUrl("");

    if (!name.trim()) {
      setError("Informe seu nome completo para liberar seu acesso com segurança.");
      return;
    }
    if (onlyDigits(whatsapp).length < 10) {
      setError("Informe seu celular com WhatsApp e DDD. É por ele que o Tucxa fará o retorno principal.");
      return;
    }
    if (email && !email.includes("@")) {
      setError("Confira o e-mail informado ou deixe o campo em branco.");
      return;
    }
    if (password.length < 8) {
      setError("Crie uma senha com pelo menos 8 caracteres para os próximos acessos.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/organizacao-em-harmonia/site-tucxa/consulentes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit-cadastro", requestType: "cadastro-consulente", name, whatsapp, email, password }),
      });
      const result = (await response.json()) as ConsulenteResponse;
      if (!response.ok) throw new Error(result.error || "Não foi possível registrar suas informações.");
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      setMessage(result.message || "Cadastro recebido. Seu acesso já está liberado para entrar com WhatsApp ou e-mail e a senha cadastrada.");
      setWhatsappUrl(result.whatsappUrl || result.statusUrl || "");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar as informações.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader actions={headerActions} navLabel="Menu de cadastro de consulentes do Tucxa" />

      <section className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="rounded-[1.75rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6">
          <p className="text-xs font-black tracking-[0.22em] text-[#2F6B43] sm:text-sm">Cadastro de consulente</p>
          <h1 className="mt-2 text-2xl font-black text-[#123D2C] sm:text-3xl">Faça seu primeiro cadastro para orientação e próximos acessos.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
            Preencha somente o essencial. Ao enviar, seu acesso de Consulente / Filho de Fora já fica liberado para entrar com WhatsApp ou e-mail e a senha cadastrada.
          </p>

          <form onSubmit={submit} className="mt-5 grid gap-4">
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">Nome completo *</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-2xl border border-[#123D2C]/15 bg-white p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]"
                placeholder="Seu nome completo"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">Celular com WhatsApp *</span>
              <input
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                inputMode="tel"
                className="rounded-2xl border border-[#123D2C]/15 bg-white p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]"
                placeholder="(19) 99999-9999"
              />
              <span className="text-xs font-semibold text-slate-600">Este será o canal principal para orientações de atendimento, avisos e confirmação de cadastro.</span>
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">E-mail</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                className="rounded-2xl border border-[#123D2C]/15 bg-white p-4 text-base outline-none focus:border-[#2F6B43] focus:ring-4 focus:ring-[#E9F2E7]"
                placeholder="Opcional, mas recomendado"
              />
              <span className="text-xs font-semibold leading-5 text-slate-600">Com o e-mail, você recebe comunicados importantes em dois canais. Isso reduz o risco de perder orientações, links de senha, confirmações de agenda e informações da casa.</span>
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">Cadastro de senha *</span>
              <div className="flex rounded-2xl border border-[#123D2C]/15 bg-white focus-within:border-[#2F6B43] focus-within:ring-4 focus-within:ring-[#E9F2E7]">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  className="min-w-0 flex-1 rounded-2xl bg-transparent p-4 text-base outline-none"
                  placeholder="Mínimo 8 caracteres"
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="shrink-0 px-4 text-sm font-black text-[#123D2C]">
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </label>

            <div className="rounded-3xl bg-[#E9F2E7] p-4 text-sm leading-6 text-[#123D2C] ring-1 ring-[#123D2C]/10">
              <p className="font-black">Depois de enviar</p>
              <p>Seu acesso será liberado automaticamente. Use o WhatsApp ou e-mail cadastrado e a senha criada para entrar na área do Consulente / Filho de Fora.</p>
            </div>

            {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
            {message && <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}

            <button disabled={loading} className="rounded-2xl bg-[#123D2C] px-5 py-4 text-base font-black text-white shadow-lg shadow-green-900/10 transition hover:-translate-y-0.5 disabled:opacity-60">
              {loading ? "Enviando..." : "Criar cadastro e liberar acesso"}
            </button>

            {whatsappUrl && (
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="rounded-2xl bg-[#E9F2E7] px-5 py-4 text-center text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5">
                Continuar pelo WhatsApp
              </a>
            )}

            <Link href="/solucoes/organizacao-em-harmonia/tucxa/consulente/login" className="text-center text-sm font-black text-[#123D2C] underline underline-offset-4">
              Já tenho cadastro e quero entrar
            </Link>
          </form>
        </div>
      </section>
    </main>
  );
}

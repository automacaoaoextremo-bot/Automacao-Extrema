"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CorrenteClientHeader } from "@/components/corrente-client-header";
import { CorrenteOnboardingChecklist } from "@/components/corrente-onboarding-checklist";
import type { CorrenteOnboardingStep } from "@/lib/corrente-em-dia";
import { supabaseBrowser } from "@/lib/supabase-browser";

type OnboardingPayload = {
  steps: CorrenteOnboardingStep[];
  progress: {
    total: number;
    completed: number;
    percentage: number;
    nextStep: CorrenteOnboardingStep | null;
  };
};

const flow = [
  {
    title: "1. Organize a base",
    text: "Confirme os dados da organização, Pix, valor padrão e dia de contribuição. Isso evita dúvidas antes de liberar o uso.",
  },
  {
    title: "2. Defina quem faz o quê",
    text: "Revise funções e permissões para que cada pessoa veja apenas as telas necessárias: cadastro, contribuintes, contribuição ou aprovações.",
  },
  {
    title: "3. Cadastre contribuintes",
    text: "Inclua pessoas manualmente ou por planilha, defina valor, dia combinado, função e status ativo/inativo.",
  },
  {
    title: "4. Faça um teste completo",
    text: "Simule uma contribuição, envie comprovante e aprove. Esse teste fecha o ciclo antes de comunicar a todos.",
  },
  {
    title: "5. Libere com cuidado",
    text: "Envie acessos e lembretes com tom de cuidado coletivo, sem constranger quem está pendente.",
  },
];

export default function CorrentePrimeirosPassosPage() {
  const [payload, setPayload] = useState<OnboardingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        window.location.href = "/solucoes/corrente-em-dia/login";
        return;
      }

      const response = await fetch("/api/corrente-em-dia/cliente/onboarding", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível carregar primeiros passos.");
      if (active) setPayload(result);
    }

    const timer = window.setTimeout(() => {
      load()
        .catch((error) => {
          if (active) setMessage(error instanceof Error ? error.message : "Erro ao carregar primeiros passos.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <CorrenteClientHeader />
      <section className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-[#2F6B43]">Primeiros passos</p>
        <h1 className="mt-2 text-4xl font-black leading-tight text-[#00334E]">Antes de liberar para todos, faça este caminho</h1>
        <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">
          O Corrente em Dia funciona melhor quando a organização começa com um fluxo simples: cadastro, Pix, funções, contribuintes, teste e aprovação. Isso reduz suporte e deixa todos mais seguros.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-5">
          {flow.map((item) => (
            <article key={item.title} className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <p className="font-black text-[#00334E]">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
            </article>
          ))}
        </div>

        {loading && <p className="mt-6 rounded-2xl bg-white p-5 shadow-sm">Carregando checklist...</p>}
        {message && <p className="mt-6 rounded-2xl bg-red-50 p-5 font-bold text-red-700">{message}</p>}
        {!loading && payload?.steps && (
          <div className="mt-6">
            <CorrenteOnboardingChecklist steps={payload.steps} />
          </div>
        )}

        <div className="mt-6 rounded-[2rem] bg-emerald-50 p-5 shadow-sm ring-1 ring-emerald-100">
          <h2 className="text-2xl font-black text-[#00334E]">Tom recomendado para comunicar a corrente</h2>
          <p className="mt-2 leading-7 text-slate-700">
            Evite falar em cobrança. Use uma linguagem de cuidado, previsibilidade e transparência: “estamos organizando as contribuições para reduzir retrabalho, evitar esquecimentos e manter a casa funcionando com mais tranquilidade”.
          </p>
          <Link href="/solucoes/corrente-em-dia/cliente/cadastro" className="mt-4 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#31C16B] px-5 py-3 font-black text-[#00334E] shadow-lg shadow-emerald-900/15">
            Começar configuração guiada
          </Link>
        </div>
      </section>
    </main>
  );
}

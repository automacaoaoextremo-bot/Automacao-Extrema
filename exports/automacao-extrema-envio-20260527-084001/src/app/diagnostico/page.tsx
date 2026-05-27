"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function DiagnosticoPage() {
  return (
    <Suspense fallback={<DiagnosticoLoading />}>
      <DiagnosticoContent />
    </Suspense>
  );
}

function DiagnosticoLoading() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto max-w-3xl">
        <div className="rounded-3xl bg-white/10 p-6 shadow-xl ring-1 ring-white/10">
          <p className="text-slate-200">Carregando diagnóstico...</p>
        </div>
      </section>
    </main>
  );
}

function DiagnosticoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const origin = searchParams.get("origem") ?? "landing_page";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);

    const payload = {
      fullName: String(formData.get("fullName") || ""),
      whatsapp: String(formData.get("whatsapp") || ""),
      email: String(formData.get("email") || ""),
      origin,
      profileType: String(formData.get("profileType") || ""),
      mainArea: String(formData.get("mainArea") || ""),
      mainPain: String(formData.get("mainPain") || ""),
      urgency: String(formData.get("urgency") || ""),
      hasBusiness: String(formData.get("hasBusiness") || "") === "sim",
      businessStage: String(formData.get("businessStage") || ""),
      ideaDescription: String(formData.get("ideaDescription") || ""),
      consentContact: formData.get("consentContact") === "on",
      consentLgpd: formData.get("consentLgpd") === "on",
    };

    const response = await fetch("/api/diagnosticos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      setError(result.error || "Não foi possível enviar.");
      setLoading(false);
      return;
    }

    router.push(
      `/obrigado?solucao=${encodeURIComponent(
        result.recommendedSolution
      )}&score=${result.score}`
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto max-w-3xl">
        <div className="rounded-3xl bg-white/10 p-6 shadow-xl ring-1 ring-white/10">
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
            Automação Extrema
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            Diagnóstico AE — Mapa de Dores e Oportunidades
          </h1>

          <p className="mt-4 text-slate-200">
            Responda algumas perguntas rápidas para identificarmos onde tecnologia,
            automação ou organização simples podem economizar tempo, reduzir
            retrabalho ou revelar uma oportunidade.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-medium">Nome</label>
              <input
                name="fullName"
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/90 p-3 text-slate-900"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">WhatsApp</label>
                <input
                  name="whatsapp"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/90 p-3 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">E-mail</label>
                <input
                  name="email"
                  type="email"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/90 p-3 text-slate-900"
                />
              </div>
            </div>

            <Select
              name="profileType"
              label="Qual perfil mais combina com você hoje?"
              options={[
                ["pessoa_fisica", "Pessoa física querendo organizar melhor a vida"],
                ["profissional", "Profissional autônomo ou prestador de serviço"],
                ["negocio", "Tenho um negócio ou participo de um negócio"],
                [
                  "voluntario",
                  "Participo de escola, grupo, comunidade ou ação voluntária",
                ],
                ["empreendedor_ideia", "Tenho uma ideia e talvez queira empreender"],
                ["outro", "Outro"],
              ]}
            />

            <Select
              name="mainArea"
              label="Onde você sente mais perda de tempo, confusão ou retrabalho?"
              options={[
                ["financeiro", "Vida financeira, contas, gastos ou planilhas"],
                ["trabalho_clientes", "Trabalho, clientes, agenda ou atendimento"],
                ["eventos", "Eventos, escola, comunidade ou voluntariado"],
                ["familia_idosos", "Família, idosos, rotina ou apoio digital"],
                ["negocio_ideia", "Negócio próprio ou ideia de negócio"],
                ["catalogo_acervo", "Produtos, catálogo, coleção ou acervo"],
                ["pesquisa_decisao", "Pesquisas, opiniões, decisões ou prioridades"],
                ["outro", "Outro"],
              ]}
            />

            <Select
              name="mainPain"
              label="Isso incomoda mais por quê?"
              options={[
                ["perco_tempo", "Perco tempo demais"],
                ["perco_dinheiro", "Perco dinheiro ou oportunidade"],
                [
                  "papel_planilha",
                  "Dependo de papel, planilha, WhatsApp ou memória",
                ],
                ["confusao_pessoas", "Dá confusão com outras pessoas"],
                ["sem_clareza", "Não tenho clareza para decidir"],
                ["tirar_ideia_papel", "Tenho uma ideia, mas não sei tirar do papel"],
              ]}
            />

            <Select
              name="urgency"
              label="Qual a urgência para resolver ou melhorar isso?"
              options={[
                ["agora", "Agora / o quanto antes"],
                ["30_dias", "Nos próximos 30 dias"],
                ["90_dias", "Nos próximos 90 dias"],
                ["sem_pressa", "Sem pressa, estou apenas avaliando"],
              ]}
            />

            <Select
              name="hasBusiness"
              label="Você tem negócio, atende clientes ou pretende empreender?"
              options={[
                ["sim", "Sim"],
                ["nao", "Não"],
              ]}
            />

            <Select
              name="businessStage"
              label="Em que fase está?"
              options={[
                ["nao_aplica", "Não se aplica"],
                ["so_ideia", "Só ideia"],
                ["comecando", "Começando"],
                ["ja_funciona", "Já funciona, mas é desorganizado"],
                ["crescendo", "Crescendo e precisando de processo"],
              ]}
            />

            <div>
              <label className="block text-sm font-medium">
                Descreva rapidamente a situação, dor ou ideia
              </label>
              <textarea
                name="ideaDescription"
                rows={5}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/90 p-3 text-slate-900"
                placeholder="Exemplo: organizo uma festa na escola e tudo fica no WhatsApp, papel e planilha..."
              />
            </div>

            <label className="flex gap-3 text-sm text-slate-200">
              <input name="consentContact" type="checkbox" className="mt-1" />
              Aceito receber uma devolutiva da Automação Extrema sobre este
              diagnóstico.
            </label>

            <label className="flex gap-3 text-sm text-slate-200">
              <input
                name="consentLgpd"
                type="checkbox"
                className="mt-1"
                required
              />
              Concordo com o uso das respostas para análise do diagnóstico e
              contato relacionado.
            </label>

            {error && (
              <p className="rounded-xl bg-red-500/20 p-3 text-sm text-red-100">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
            >
              {loading ? "Enviando..." : "Receber sugestão de oportunidade"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function Select({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: [string, string][];
}) {
  return (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      <select
        name={name}
        required
        className="mt-1 w-full rounded-xl border border-white/10 bg-white/90 p-3 text-slate-900"
      >
        <option value="">Selecione...</option>
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}
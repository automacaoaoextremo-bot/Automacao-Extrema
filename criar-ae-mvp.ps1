New-Item -ItemType Directory -Force -Path "src\lib" | Out-Null
New-Item -ItemType Directory -Force -Path "src\app\diagnostico" | Out-Null
New-Item -ItemType Directory -Force -Path "src\app\obrigado" | Out-Null
New-Item -ItemType Directory -Force -Path "src\app\admin\ae" | Out-Null
New-Item -ItemType Directory -Force -Path "src\app\api\diagnosticos" | Out-Null

@'
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada.");
}

if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
  },
});
'@ | Set-Content -Encoding UTF8 "src\lib\supabase-admin.ts"

@'
export type DiagnosticPayload = {
  fullName?: string;
  whatsapp?: string;
  email?: string;
  origin?: string;
  profileType?: string;
  mainArea?: string;
  mainPain?: string;
  urgency?: string;
  hasBusiness?: boolean;
  businessStage?: string;
  ideaDescription?: string;
  consentContact: boolean;
  consentLgpd: boolean;
};

type SolutionScore = {
  slug: string;
  score: number;
  reason: string;
};

export function calculateScores(payload: DiagnosticPayload): SolutionScore[] {
  const text = [
    payload.profileType,
    payload.mainArea,
    payload.mainPain,
    payload.businessStage,
    payload.ideaDescription,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const scores: SolutionScore[] = [
    {
      slug: "caixa-claro",
      score: match(text, ["financeiro", "finança", "conta", "gasto", "despesa", "dinheiro", "orçamento", "planilha"]),
      reason: "Indícios de dor financeira, controle de gastos, contas futuras ou organização por planilha.",
    },
    {
      slug: "festa-no-controle",
      score: match(text, ["evento", "festa", "voluntário", "voluntarios", "pedido", "cardápio", "cardapio", "caixa", "fila", "pix"]),
      reason: "Indícios de operação de evento, voluntários, pedidos, caixa ou filas.",
    },
    {
      slug: "escuta-viva",
      score: match(text, ["pesquisa", "opinião", "opiniao", "comunidade", "grupo", "decisão", "decisao", "priorizar", "melhoria"]),
      reason: "Indícios de necessidade de ouvir pessoas, priorizar melhorias ou tomar decisões com dados.",
    },
    {
      slug: "familia-presente-60-mais",
      score: match(text, ["idoso", "idosa", "família", "familia", "rotina", "cuidado", "remédio", "remedio", "tecnologia", "digital"]),
      reason: "Indícios de apoio a idosos, rotina familiar ou dificuldade digital.",
    },
    {
      slug: "dna-de-valor",
      score: match(text, ["currículo", "curriculo", "profissional", "posicionamento", "diferencial", "consultoria", "serviço", "servico", "cliente"]),
      reason: "Indícios de necessidade de posicionamento, diferenciação ou transformação de histórico em oferta.",
    },
    {
      slug: "presenca-querida",
      score: match(text, ["convite", "convidado", "rsvp", "presença", "presenca", "aniversário", "aniversario", "casamento"]),
      reason: "Indícios de organização de convidados, confirmações e mensagens personalizadas.",
    },
    {
      slug: "discoteca-digital",
      score: match(text, ["disco", "vinil", "cd", "coleção", "colecao", "acervo", "catálogo", "catalogo"]),
      reason: "Indícios de coleção, acervo ou catálogo visual.",
    },
    {
      slug: "jornada-personal-extrema",
      score: match(text, ["aluno", "treino", "personal", "agenda", "follow", "acompanhamento", "evolução", "evolucao"]),
      reason: "Indícios de acompanhamento recorrente de alunos/clientes e necessidade de CRM pessoal.",
    },
    {
      slug: "lacos-letras-papelaria-criativa",
      score: match(text, ["papelaria", "personalizado", "topo", "bolo", "festa infantil", "produto", "tema"]),
      reason: "Indícios de catálogo de produtos personalizados e organização comercial por tema/linha.",
    },
  ];

  const urgencyBonus = payload.urgency === "agora" ? 3 : payload.urgency === "30_dias" ? 2 : 0;

  return scores
    .map((item) => ({ ...item, score: item.score + urgencyBonus }))
    .sort((a, b) => b.score - a.score);
}

function match(text: string, terms: string[]) {
  return terms.reduce((total, term) => {
    return total + (text.includes(term) ? 2 : 0);
  }, 0);
}

export function calculateDiagnosticScore(payload: DiagnosticPayload, bestScore: number) {
  let score = bestScore;

  if (payload.consentContact) score += 2;
  if (payload.whatsapp) score += 2;
  if (payload.email) score += 1;
  if (payload.hasBusiness) score += 2;
  if (payload.urgency === "agora") score += 4;
  if (payload.urgency === "30_dias") score += 3;
  if (payload.ideaDescription && payload.ideaDescription.length > 40) score += 2;

  return score;
}
'@ | Set-Content -Encoding UTF8 "src\lib\ae-scoring.ts"

@'
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { calculateDiagnosticScore, calculateScores, DiagnosticPayload } from "@/lib/ae-scoring";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as DiagnosticPayload;

    if (!payload.consentLgpd) {
      return NextResponse.json(
        { error: "É necessário aceitar o uso dos dados para enviar o diagnóstico." },
        { status: 400 }
      );
    }

    const scores = calculateScores(payload);
    const best = scores[0];

    const { data: solution } = await supabaseAdmin
      .from("ae_solutions")
      .select("id, name, slug")
      .eq("slug", best?.slug ?? "escuta-viva")
      .single();

    const diagnosticScore = calculateDiagnosticScore(payload, best?.score ?? 0);

    const { data: lead, error: leadError } = await supabaseAdmin
      .from("ae_leads")
      .insert({
        full_name: payload.fullName || null,
        whatsapp: payload.whatsapp || null,
        email: payload.email || null,
        origin: payload.origin || null,
        profile_type: payload.profileType || null,
        main_area: payload.mainArea || null,
        main_pain: payload.mainPain || null,
        urgency: payload.urgency || null,
        has_business: payload.hasBusiness ?? null,
        business_stage: payload.businessStage || null,
        idea_description: payload.ideaDescription || null,
        consent_contact: payload.consentContact,
        consent_lgpd: payload.consentLgpd,
        recommended_solution_id: solution?.id ?? null,
        diagnostic_score: diagnosticScore,
        status: "novo",
      })
      .select("id")
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: leadError?.message ?? "Erro ao salvar lead." }, { status: 500 });
    }

    const answers = [
      ["profile_type", "Qual perfil mais combina com você?", payload.profileType],
      ["main_area", "Onde você sente mais perda de tempo, confusão ou retrabalho?", payload.mainArea],
      ["main_pain", "Isso incomoda mais por quê?", payload.mainPain],
      ["urgency", "Qual a urgência para resolver?", payload.urgency],
      ["has_business", "Você tem negócio, atende clientes ou pretende empreender?", String(payload.hasBusiness)],
      ["business_stage", "Em que fase está?", payload.businessStage],
      ["idea_description", "Descreva rapidamente a situação ou ideia.", payload.ideaDescription],
    ]
      .filter(([, , answer]) => answer !== undefined && answer !== null && answer !== "")
      .map(([question_key, question_text, answer]) => ({
        lead_id: lead.id,
        question_key,
        question_text,
        answer,
      }));

    if (answers.length > 0) {
      await supabaseAdmin.from("ae_lead_answers").insert(answers);
    }

    const activeSolutions = await supabaseAdmin
      .from("ae_solutions")
      .select("id, slug");

    const solutionMap = new Map((activeSolutions.data ?? []).map((item) => [item.slug, item.id]));

    const matches = scores
      .filter((item) => item.score > 0 && solutionMap.has(item.slug))
      .slice(0, 5)
      .map((item) => ({
        lead_id: lead.id,
        solution_id: solutionMap.get(item.slug),
        score: item.score,
        reason: item.reason,
      }));

    if (matches.length > 0) {
      await supabaseAdmin.from("ae_solution_matches").insert(matches);
    }

    return NextResponse.json({
      ok: true,
      leadId: lead.id,
      recommendedSolution: solution?.name ?? "Escuta Viva",
      score: diagnosticScore,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
'@ | Set-Content -Encoding UTF8 "src\app\api\diagnosticos\route.ts"

@'
"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function DiagnosticoPage() {
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      setError(result.error || "Não foi possível enviar.");
      setLoading(false);
      return;
    }

    router.push(`/obrigado?solucao=${encodeURIComponent(result.recommendedSolution)}&score=${result.score}`);
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
            automação ou organização simples podem economizar tempo, reduzir retrabalho
            ou revelar uma oportunidade.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-medium">Nome</label>
              <input name="fullName" className="mt-1 w-full rounded-xl border border-white/10 bg-white/90 p-3 text-slate-900" />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">WhatsApp</label>
                <input name="whatsapp" className="mt-1 w-full rounded-xl border border-white/10 bg-white/90 p-3 text-slate-900" />
              </div>

              <div>
                <label className="block text-sm font-medium">E-mail</label>
                <input name="email" type="email" className="mt-1 w-full rounded-xl border border-white/10 bg-white/90 p-3 text-slate-900" />
              </div>
            </div>

            <Select
              name="profileType"
              label="Qual perfil mais combina com você hoje?"
              options={[
                ["pessoa_fisica", "Pessoa física querendo organizar melhor a vida"],
                ["profissional", "Profissional autônomo ou prestador de serviço"],
                ["negocio", "Tenho um negócio ou participo de um negócio"],
                ["voluntario", "Participo de escola, grupo, comunidade ou ação voluntária"],
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
                ["papel_planilha", "Dependo de papel, planilha, WhatsApp ou memória"],
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
              Aceito receber uma devolutiva da Automação Extrema sobre este diagnóstico.
            </label>

            <label className="flex gap-3 text-sm text-slate-200">
              <input name="consentLgpd" type="checkbox" className="mt-1" required />
              Concordo com o uso das respostas para análise do diagnóstico e contato relacionado.
            </label>

            {error && (
              <p className="rounded-xl bg-red-500/20 p-3 text-sm text-red-100">{error}</p>
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
'@ | Set-Content -Encoding UTF8 "src\app\diagnostico\page.tsx"

@'
import Link from "next/link";

export default async function ObrigadoPage({
  searchParams,
}: {
  searchParams: Promise<{ solucao?: string; score?: string }>;
}) {
  const params = await searchParams;
  const solucao = params.solucao ?? "uma solução da Automação Extrema";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto max-w-2xl rounded-3xl bg-white/10 p-8 shadow-xl ring-1 ring-white/10">
        <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
          Diagnóstico recebido
        </p>

        <h1 className="mt-3 text-3xl font-bold">Obrigado pelas respostas.</h1>

        <p className="mt-4 text-slate-200">
          Pelo que você respondeu, a oportunidade mais próxima parece estar relacionada a:
        </p>

        <div className="mt-6 rounded-2xl bg-cyan-400 p-5 text-slate-950">
          <p className="text-2xl font-bold">{solucao}</p>
        </div>

        <p className="mt-6 text-slate-200">
          A Automação Extrema poderá analisar suas respostas e devolver uma sugestão prática
          de melhoria, automação ou próximo passo.
        </p>

        <Link href="/diagnostico" className="mt-8 inline-block rounded-xl bg-white px-5 py-3 font-bold text-slate-950">
          Fazer novo diagnóstico
        </Link>
      </section>
    </main>
  );
}
'@ | Set-Content -Encoding UTF8 "src\app\obrigado\page.tsx"

@'
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto flex max-w-4xl flex-col items-start justify-center py-20">
        <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
          Automação Extrema
        </p>

        <h1 className="mt-4 max-w-3xl text-4xl font-bold md:text-6xl">
          Tecnologia só faz sentido quando resolve uma dor real.
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-slate-200">
          Faça um diagnóstico rápido para descobrir onde você, sua família, seu projeto
          ou seu negócio podem economizar tempo, reduzir retrabalho e organizar melhor
          as oportunidades.
        </p>

        <Link
          href="/diagnostico"
          className="mt-8 rounded-xl bg-cyan-400 px-6 py-4 font-bold text-slate-950 hover:bg-cyan-300"
        >
          Fazer diagnóstico gratuito
        </Link>
      </section>
    </main>
  );
}
'@ | Set-Content -Encoding UTF8 "src\app\page.tsx"

@'
import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function AdminAEPage({
  searchParams,
}: {
  searchParams: Promise<{ senha?: string }>;
}) {
  const params = await searchParams;
  const senha = params.senha;

  if (!process.env.ADMIN_PASSWORD || senha !== process.env.ADMIN_PASSWORD) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <section className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold">Admin AE</h1>
          <p className="mt-3 text-slate-600">
            Informe a senha na URL para acessar.
          </p>
          <p className="mt-3 rounded bg-slate-100 p-3 font-mono text-sm">
            /admin/ae?senha=SUA_SENHA
          </p>
        </section>
      </main>
    );
  }

  const [{ data: leads }, { data: solutions }] = await Promise.all([
    supabaseAdmin
      .from("ae_leads")
      .select("id, full_name, whatsapp, email, profile_type, main_area, main_pain, urgency, diagnostic_score, status, created_at, recommended_solution_id, ae_solutions(name)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("ae_solutions")
      .select("id, name, current_status, stage, priority, main_pains, source_file")
      .order("priority", { ascending: false }),
  ]);

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Painel Automação Extrema</h1>
          <p className="text-slate-600">
            Leads, diagnósticos e soluções em validação.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="text-xl font-bold">Soluções cadastradas</h2>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2">Solução</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Etapa</th>
                  <th className="p-2">Prioridade</th>
                  <th className="p-2">Fonte</th>
                </tr>
              </thead>
              <tbody>
                {(solutions ?? []).map((solution) => (
                  <tr key={solution.id} className="border-b align-top">
                    <td className="p-2 font-semibold">{solution.name}</td>
                    <td className="p-2">{solution.current_status}</td>
                    <td className="p-2">{solution.stage}</td>
                    <td className="p-2">{solution.priority}</td>
                    <td className="p-2">{solution.source_file}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="text-xl font-bold">Últimos diagnósticos</h2>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2">Lead</th>
                  <th className="p-2">Contato</th>
                  <th className="p-2">Área</th>
                  <th className="p-2">Dor</th>
                  <th className="p-2">Urgência</th>
                  <th className="p-2">Score</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(leads ?? []).map((lead) => (
                  <tr key={lead.id} className="border-b align-top">
                    <td className="p-2">
                      <strong>{lead.full_name || "Sem nome"}</strong>
                      <br />
                      <span className="text-xs text-slate-500">
                        {new Date(lead.created_at).toLocaleString("pt-BR")}
                      </span>
                    </td>
                    <td className="p-2">
                      {lead.whatsapp}
                      <br />
                      <span className="text-xs text-slate-500">{lead.email}</span>
                    </td>
                    <td className="p-2">{lead.main_area}</td>
                    <td className="p-2">{lead.main_pain}</td>
                    <td className="p-2">{lead.urgency}</td>
                    <td className="p-2 font-bold">{lead.diagnostic_score}</td>
                    <td className="p-2">{lead.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
'@ | Set-Content -Encoding UTF8 "src\app\admin\ae\page.tsx"

Write-Host "Arquivos do MVP AE criados com sucesso."
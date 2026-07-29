"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Person = { id: string; full_name: string; email: string | null; whatsapp: string | null; active: boolean };
type Membership = { id: string; person_id: string; status: string | null; active: boolean | null; module_slugs: string[] | null; agenda_viva_profile: Record<string, unknown> | null };
type Payload = { people: Person[]; memberships: Membership[]; error?: string };

type DraftItem = { slug?: string; label?: string; description?: string };

const statusLabels: Record<string, string> = {
  ativo: "Acesso liberado",
  pendente_validacao: "Aguardando validação",
  ajuste_solicitado: "Ajuste solicitado",
  inativo: "Cadastro inativo",
};

const moduleLabels: Record<string, string> = {
  "agenda-viva": "Agenda Viva",
  "atendimento-em-harmonia": "Atendimento em Harmonia",
  "corrente-em-dia": "Corrente em Dia",
};

const simulatedModuleCards = [
  {
    title: "Agenda Viva",
    description: "Atividades, grupos, estudos e eventos associados ao vínculo aprovado do Filho da Corrente.",
    bullets: ["Calendário completo e próximos eventos", "Filtros por Umbanda/outros, público, responsável e período", "Itens escolhidos no Primeiro Acesso e aprovados pelo Tucxa"],
  },
  {
    title: "Atendimento em Harmonia",
    description: "Orientações de atendimento, retorno, responsabilidades de cambonos, cavalinhos e comunicação com a coordenação.",
    bullets: ["Orientação de retorno com a mesma entidade", "Cuidados de sigilo e discrição", "Informações úteis para atuação nos atendimentos"],
  },
  {
    title: "Corrente em Dia",
    description: "Comunicação, contribuições, compromissos e orientações administrativas da corrente.",
    bullets: ["Contribuição mensal ou pontual", "Status e histórico individual", "Lembretes respeitosos e comprovantes quando habilitados"],
  },
  {
    title: "Documentos do Tucxa",
    description: "Regulamento, procedimentos básicos e manual para consulta rápida dentro do painel.",
    bullets: ["Regulamento e horários", "Procedimentos de preparo e conduta", "Manual e orientações por função"],
  },
  {
    title: "Funções e responsabilidades",
    description: "Descrição do que a pessoa verá conforme os vínculos aprovados.",
    bullets: ["Funções selecionadas e aprovadas", "Responsabilidades por função", "Permissões e orientações de atuação"],
  },
  {
    title: "Entidades e vínculos",
    description: "Consulta de entidades, linhas, dias de atendimento e vínculos com cavalinhos quando cadastrados.",
    bullets: ["Entidades associadas ao Cavalinho", "Entidades cambonadas", "Capacidade e dias de atendimento quando aplicável"],
  },
];

function clientLoginUrl() {
  if (typeof window === "undefined") return "/solucoes/organizacao-em-harmonia/login";
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.sessionStorage.setItem("oh_client_return_to", returnTo);
  return `/solucoes/organizacao-em-harmonia/login?returnTo=${encodeURIComponent(returnTo)}`;
}

function selectedItems(value: unknown): DraftItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as DraftItem;
      const label = typeof candidate.label === "string" ? candidate.label : "";
      if (!label) return null;
      return {
        slug: typeof candidate.slug === "string" ? candidate.slug : label,
        label,
        description: typeof candidate.description === "string" ? candidate.description : "",
      };
    })
    .filter(Boolean) as DraftItem[];
}

function displayEmail(email: string | null | undefined) {
  if (!email) return "E-mail não informado";
  return email.includes("organizacao-em-harmonia.local") ? "E-mail não informado" : email;
}

function currentStatus(membership: Membership | null) {
  return membership?.status || (membership?.active ? "ativo" : "pendente_validacao");
}

export default function SimularAcessoFilhoDaCorrentePage() {
  const params = useParams<{ personId: string }>();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      window.location.replace(clientLoginUrl());
      return;
    }
    const response = await fetch("/api/organizacao-em-harmonia/cliente/base-unica", { headers: { Authorization: `Bearer ${token}` } });
    const result = (await response.json()) as Payload;
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar simulação.");
    setPayload(result);
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      load()
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : "Erro ao carregar simulação.");
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

  const target = useMemo(() => {
    const person = (payload?.people ?? []).find((item) => item.id === params.personId) ?? null;
    const membership = (payload?.memberships ?? []).find((item) => item.person_id === params.personId) ?? null;
    return { person, membership };
  }, [params.personId, payload?.memberships, payload?.people]);

  const profile = target.membership?.agenda_viva_profile ?? {};
  const functionItems = selectedItems(profile.selectedFunctions);
  const agendaItems = selectedItems(profile.selectedAgenda);
  const moduleSlugs = target.membership?.module_slugs?.length ? target.membership.module_slugs : ["agenda-viva", "atendimento-em-harmonia", "corrente-em-dia"];
  const status = currentStatus(target.membership);

  return (
    <OrganizacaoClientShell title="Simular acesso" description="Veja a experiência limitada do Filho da Corrente como ele verá após a aprovação, sem usar a senha dele e sem sair da sessão de gestor.">
      {loading && <p className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">Carregando simulação...</p>}
      {error && <p className="rounded-3xl bg-red-50 p-5 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}

      {!loading && !target.person && <p className="rounded-3xl bg-white p-5 font-bold text-slate-500 shadow ring-1 ring-slate-100">Filho da Corrente não encontrado.</p>}

      {target.person && (
        <section className="grid gap-5">
          <div className="rounded-[2rem] bg-[#123D2C] p-6 text-white shadow-xl shadow-green-900/10">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#CFE2C7]">Simulação administrativa</p>
            <h2 className="mt-2 text-3xl font-black">Simulando {target.person.full_name}</h2>
            <p className="mt-3 max-w-3xl leading-7 text-[#EEF7EA]">
              Você continua logado como gestor. Esta visão usa os vínculos, módulos, funções e agenda aprovados ou pendentes deste Filho da Corrente, sem precisar saber ou usar a senha dele.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/solucoes/organizacao-em-harmonia/cliente/validacoes" className="rounded-2xl bg-white px-5 py-3 font-black text-[#123D2C]">Sair da simulação</Link>
              <Link href="/solucoes/organizacao-em-harmonia/cliente/base-unica/envolvidos" className="rounded-2xl bg-white/10 px-5 py-3 font-black text-white ring-1 ring-white/20">Abrir Base Única</Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">
              <p className="text-sm font-black text-[#00334E]">Status visto pelo Filho</p>
              <p className="mt-2 text-lg font-black text-[#123D2C]">{statusLabels[status] ?? status}</p>
            </article>
            <article className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">
              <p className="text-sm font-black text-[#00334E]">Módulos liberados</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{moduleSlugs.map((slug) => moduleLabels[slug] ?? slug).join(" • ")}</p>
            </article>
            <article className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">
              <p className="text-sm font-black text-[#00334E]">Contato</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{target.person.whatsapp || "WhatsApp não informado"}<br />{displayEmail(target.person.email)}</p>
            </article>
          </div>

          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100">
              <h3 className="text-xl font-black text-[#00334E]">Funções e responsabilidades visíveis</h3>
              <div className="mt-4 grid gap-2">
                {functionItems.length ? functionItems.map((item) => (
                  <div key={`${item.slug}-${item.label}`} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                    <p className="font-black text-[#123D2C]">{item.label}</p>
                    {item.description && <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{item.description}</p>}
                  </div>
                )) : <p className="text-sm font-semibold leading-6 text-slate-600">Somente Filho da Corrente.</p>}
              </div>
            </article>
            <article className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100">
              <h3 className="text-xl font-black text-[#00334E]">Agenda Viva associada</h3>
              <div className="mt-4 grid gap-2">
                {agendaItems.length ? agendaItems.map((item) => (
                  <div key={`${item.slug}-${item.label}`} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                    <p className="font-black text-[#123D2C]">{item.label}</p>
                    {item.description && <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{item.description}</p>}
                  </div>
                )) : <p className="text-sm font-semibold leading-6 text-slate-600">Nenhum item de agenda associado.</p>}
              </div>
            </article>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43]">Painel limitado simulado</p>
            <h3 className="mt-2 text-2xl font-black text-[#00334E]">O que este Filho da Corrente verá</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {simulatedModuleCards.map((card) => (
                <article key={card.title} className="rounded-[1.75rem] bg-[#F7FAF2] p-5 ring-1 ring-[#123D2C]/10">
                  <h4 className="text-xl font-black text-[#123D2C]">{card.title}</h4>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{card.description}</p>
                  <ul className="mt-4 grid gap-2 text-sm font-semibold leading-6 text-slate-600">
                    {card.bullets.map((bullet) => <li key={bullet}>• {bullet}</li>)}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        </section>
      )}
    </OrganizacaoClientShell>
  );
}

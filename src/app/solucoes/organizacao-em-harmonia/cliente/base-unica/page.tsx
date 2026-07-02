"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OrganizacaoBaseUnicaSubnav } from "@/components/organizacao-base-unica-subnav";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Payload = {
  people?: Array<{ id: string; active: boolean }>;
  roles?: Array<{ id: string; active: boolean }>;
  modules?: Array<{ module_slug: string; enabled: boolean }>;
  memberships?: Array<{ agenda_viva_profile?: Record<string, unknown> | null }>;
  locations?: Array<{ id: string; active: boolean }>;
  entities?: Array<{ id: string; active: boolean }>;
};

const overviewCards = [
  {
    href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/envolvidos",
    title: "Envolvidos",
    description: "Cadastre pessoas, contatos, função principal, módulos liberados e vínculos operacionais.",
  },
  {
    href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/funcoes",
    title: "Funções",
    description: "Mantenha Presidente, Diretoria, Coordenação, Cambono, Cavalinho e funções personalizadas.",
  },
  {
    href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/entidades",
    title: "Entidades",
    description: "Registre entidades, linhas, materiais usuais e dias em que costumam atender.",
  },
  {
    href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/vinculos",
    title: "Vínculos em lote",
    description: "Aplique grupo, dias, módulo, função e permissões para vários envolvidos ao mesmo tempo.",
  },
  {
    href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/localidades",
    title: "Localidades",
    description: "Organize sede principal, espaços de eventos, locais externos e pontos de encontro.",
  },
  {
    href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/orientacoes",
    title: "Orientações",
    description: "Consulte regras da casa, manual de cambonos, procedimentos e responsabilidades por função.",
  },
];

function boolCount(items: Array<{ active: boolean }> | undefined) {
  return (items ?? []).filter((item) => item.active !== false).length;
}

export default function OrganizacaoBaseUnicaPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      supabaseBrowser.auth
        .getSession()
        .then(({ data: sessionData }) => {
          const token = sessionData.session?.access_token;
          if (!token) {
            router.replace("/solucoes/organizacao-em-harmonia/login");
            return null;
          }
          return fetch("/api/organizacao-em-harmonia/cliente/base-unica", {
            headers: { Authorization: `Bearer ${token}` },
          });
        })
        .then(async (response) => {
          if (!response) return;
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Não foi possível carregar a Base Única.");
          if (active) setPayload(result);
        })
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : "Erro ao carregar Base Única.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [router]);

  const stats = useMemo(() => {
    const memberships = payload?.memberships ?? [];
    return {
      people: boolCount(payload?.people),
      roles: boolCount(payload?.roles),
      locations: boolCount(payload?.locations),
      entities: boolCount(payload?.entities),
      cavalinhos: memberships.filter((item) => item.agenda_viva_profile?.isCavalinho).length,
      cambonos: memberships.filter((item) => item.agenda_viva_profile?.isCambono).length,
    };
  }, [payload]);

  return (
    <OrganizacaoClientShell
      title="Base Única"
      description="Pessoas, funções, entidades, grupos, localidades, permissões e documentos em um núcleo compartilhado pelos módulos Agenda Viva, Atendimento em Harmonia e Corrente em Dia."
    >
      <OrganizacaoBaseUnicaSubnav />
      {loading && <p className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">Carregando Base Única...</p>}
      {error && <p className="rounded-3xl bg-red-50 p-5 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
      {!loading && !error && (
        <>
          <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Metric label="Envolvidos" value={stats.people} />
            <Metric label="Funções" value={stats.roles} />
            <Metric label="Entidades" value={stats.entities} />
            <Metric label="Localidades" value={stats.locations} />
            <Metric label="Cavalinhos" value={stats.cavalinhos} />
            <Metric label="Cambonos" value={stats.cambonos} />
          </section>
          <section className="grid gap-4 lg:grid-cols-2">
            {overviewCards.map((card) => (
              <Link key={card.href} href={card.href} className="rounded-[2rem] bg-white p-6 shadow ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-lg">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Configurar</p>
                <h2 className="mt-2 text-2xl font-black text-[#00334E]">{card.title}</h2>
                <p className="mt-2 leading-7 text-slate-600">{card.description}</p>
                <span className="mt-4 inline-flex rounded-full bg-[#31C16B] px-4 py-2 text-sm font-black text-[#00334E]">Abrir cadastro</span>
              </Link>
            ))}
          </section>
        </>
      )}
    </OrganizacaoClientShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-[#00334E]">{value}</p>
    </div>
  );
}

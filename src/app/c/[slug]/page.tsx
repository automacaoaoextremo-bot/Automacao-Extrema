import Link from "next/link";
import { notFound } from "next/navigation";
import { AeBrandStrip } from "@/components/ae-solution-header";
import { buildAeWhatsAppUrl } from "@/lib/ae-public-links";
import { currencyBR, contributionModeLabel, organizationTypeLabel } from "@/lib/corrente-em-dia";
import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function CorrenteEmDiaClientPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data: organization, error } = await supabaseAdmin
    .from("ced_organizations")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !organization) notFound();

  const whatsappUrl = buildAeWhatsAppUrl(
    `Olá! Estou na página ${organization.name} do Corrente em Dia e quero orientação sobre contribuições e acesso.`,
  );

  return (
    <main className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#2F6B43]">Corrente em Dia</p>
            <h1 className="text-2xl font-black leading-tight text-[#00334E]">{organization.name}</h1>
            <p className="text-sm text-slate-500">{organizationTypeLabel(organization.organization_type)} • {organization.city}/{organization.state}</p>
          </div>
          <Link href="/solucoes/corrente-em-dia/login" className="rounded-full bg-[#31C16B] px-4 py-2 text-sm font-black text-[#00334E] shadow-sm">
            Entrar
          </Link>
        </div>
        <AeBrandStrip compact />
      </header>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_0.8fr] lg:py-12">
        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2F6B43]">Página pública da casa</p>
          <h2 className="mt-3 text-4xl font-black leading-tight text-[#00334E]">
            {organization.public_headline ?? "Contribuições organizadas para manter a corrente firme."}
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-700">
            {organization.deep_dive_text ?? "Sua contribuição ajuda a manter a casa preparada, organizada e acolhedora. Quando cada um cuida de uma parte, a corrente segue firme sem constrangimento e com mais clareza para todos."}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link href="/solucoes/corrente-em-dia/login" className="rounded-2xl bg-[#31C16B] px-5 py-4 text-center font-black text-[#00334E] shadow-lg shadow-emerald-200">
              Acessar minha contribuição
            </Link>
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="rounded-2xl border border-[#00334E] bg-white px-5 py-4 text-center font-black text-[#00334E] shadow-sm">
              Falar no WhatsApp
            </a>
          </div>
        </div>

        <aside className="rounded-[2rem] bg-[#00334E] p-6 text-white shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-emerald-300">Dados da contribuição</p>
          <div className="mt-5 space-y-3 text-sm">
            <div className="rounded-2xl bg-white/10 p-4"><strong>Pix oficial:</strong><br />{organization.pix_key ?? "não informado"}</div>
            <div className="rounded-2xl bg-white/10 p-4"><strong>Recebedor:</strong><br />{organization.pix_receiver_name ?? organization.name}</div>
            <div className="rounded-2xl bg-white/10 p-4"><strong>Valor individual:</strong><br />{currencyBR(organization.default_individual_amount)}</div>
            <div className="rounded-2xl bg-white/10 p-4"><strong>Valor família:</strong><br />{currencyBR(organization.default_family_amount)}</div>
            <div className="rounded-2xl bg-white/10 p-4"><strong>Prazo:</strong><br />{organization.contribution_due_day ? `${contributionModeLabel(organization.contribution_due_mode)} ${organization.contribution_due_day}` : "livre dentro do mês"}</div>
          </div>
          <p className="mt-5 text-xs leading-5 text-white/70">
            Esta página usa dados fictícios nos testes. Em uso real, cada organização define seus valores, prazos, Pix e textos.
          </p>
        </aside>
      </section>
    </main>
  );
}

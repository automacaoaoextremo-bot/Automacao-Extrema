import Link from "next/link";
import { notFound } from "next/navigation";
import { AeBrandStrip, AeSolutionHeader } from "@/components/ae-solution-header";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { contributionModeLabel, currencyBR, organizationTypeLabel, type CorrenteOrganization } from "@/lib/corrente-em-dia";
import { buildAeWhatsAppUrl } from "@/lib/ae-public-links";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function getOrganization(slug: string) {
  const { data, error } = await supabaseAdmin
    .from("ced_organizations")
    .select("id, organization_type, name, slug, email, whatsapp, city, state, pix_key, pix_receiver_name, default_individual_amount, default_family_amount, contribution_due_day, contribution_due_mode, public_headline, deep_dive_text, public_status, is_demo")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as CorrenteOrganization | null;
}

export default async function CorrenteEmDiaClientPage({ params }: PageProps) {
  const { slug } = await params;
  const organization = await getOrganization(slug);
  if (!organization) notFound();

  const whatsappUrl = buildAeWhatsAppUrl(
    `Olá! Quero suporte para acessar minha contribuição no Corrente em Dia da organização ${organization.name}.`,
  );

  const headline = organization.public_headline || "Contribuir é ajudar a manter a casa organizada, acolhedora e preparada para servir.";
  const deepDiveText =
    organization.deep_dive_text ||
    "Sua contribuição ajuda a manter luz, água, limpeza, materiais, acolhimento e organização. Quando cada pessoa cuida de uma parte, a corrente permanece firme e a casa ganha tranquilidade para continuar seus trabalhos.";

  return (
    <main className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <AeSolutionHeader
        solutionName="Corrente em Dia"
        logoSrc="/corrente-em-dia-logo.svg"
        logoAlt="Logo Corrente em Dia"
        actions={[
          { label: "Contribuir", href: "/login", variant: "secondary" },
          { label: "Entrar", href: "/login", variant: "secondary" },
        ]}
      />
      <AeBrandStrip />

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-[2rem] bg-white p-5 shadow-xl sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2F6B43]">{organizationTypeLabel(organization.organization_type)}</p>
              <h1 className="mt-2 text-3xl font-black text-[#00334E] sm:text-5xl">{organization.name}</h1>
              <p className="mt-3 text-sm font-semibold text-slate-500">
                {[organization.city, organization.state].filter(Boolean).join("/") || "Organização cadastrada no Corrente em Dia"}
              </p>
            </div>
            {organization.is_demo && <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-black text-amber-800">Dados fictícios para teste</span>}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-5">
              <h2 className="text-3xl font-black leading-tight text-[#00334E]">{headline}</h2>
              <p className="text-lg leading-8 text-slate-700">{deepDiveText}</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/login" className="rounded-2xl bg-[#31C16B] px-5 py-4 text-center font-black text-[#00334E] shadow transition hover:bg-[#4ada82]">
                  Acessar minha contribuição
                </Link>
                <a href={whatsappUrl} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-300 bg-white px-5 py-4 text-center font-black text-slate-700 transition hover:bg-slate-50">
                  Falar no WhatsApp
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="font-black text-[#00334E]">Minha contribuição</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Depois do login, cada contribuinte vê somente a própria contribuição, QR Code Pix, histórico e comprovantes enviados.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Individual</p>
                  <p className="mt-1 text-2xl font-black text-[#00334E]">{currencyBR(organization.default_individual_amount)}</p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Família</p>
                  <p className="mt-1 text-2xl font-black text-[#00334E]">{currencyBR(organization.default_family_amount)}</p>
                </div>
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-600">
                Prazo padrão: {organization.contribution_due_day ? `${contributionModeLabel(organization.contribution_due_mode)} ${organization.contribution_due_day}` : "definido pela organização"}.
              </p>
              <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
                <strong>Privacidade e LGPD:</strong> os valores contribuídos são de acesso individual e da organização responsável. Somente a organização, conforme consentimento do contribuinte, pode acessar seus dados para conferência, aprovação e prestação de contas.
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

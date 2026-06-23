import Link from "next/link";
import { redirect } from "next/navigation";
import { AeSolutionHeader } from "@/components/ae-solution-header";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Params = { token: string };

function eventLandingUrl(slug: string, token: string) {
  return `/solucoes/presenca-querida/evento/${encodeURIComponent(slug)}?convite=${encodeURIComponent(token)}#confirmacao`;
}

export default async function PresencaConfirmarRedirectPage({ params }: { params: Promise<Params> }) {
  const { token } = await params;
  const cleanToken = String(token ?? "").trim();

  if (cleanToken) {
    const { data } = await supabaseAdmin
      .from("pq_guests")
      .select("event:pq_events(slug)")
      .eq("individual_token", cleanToken)
      .maybeSingle();

    const event = Array.isArray(data?.event) ? data?.event[0] : data?.event;
    const slug = String(event?.slug ?? "").trim();

    if (slug) redirect(eventLandingUrl(slug, cleanToken));
  }

  return (
    <main className="min-h-screen bg-[#fffaf8] text-slate-800">
      <AeSolutionHeader solutionName="Presença Querida" logoSrc="/presenca-querida-logo.svg" logoAlt="Logo Presença Querida" homeHref="/solucoes/presenca-querida" navLabel="Menu" actions={[]} sectionLinks={[]} />
      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-rose-100">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E85D75]">Convite individual</p>
          <h1 className="mt-2 text-3xl font-black text-[#00334E]">Não localizamos este convite</h1>
          <p className="mt-3 leading-7 text-slate-600">Confira se o link recebido no WhatsApp está completo ou fale com quem enviou o convite.</p>
          <Link href="/solucoes/presenca-querida/evento/daniela-50-anos" className="mt-6 inline-flex rounded-2xl bg-[#E85D75] px-5 py-3 font-black text-white">Ver landing da festa</Link>
        </div>
      </section>
    </main>
  );
}

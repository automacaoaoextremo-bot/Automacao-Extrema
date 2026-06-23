import Link from "next/link";
import { AeSolutionHeader } from "@/components/ae-solution-header";
import { PresencaPublicConfirmation, type PresencaPublicGuestPayload } from "@/components/presenca-public-confirmation";
import {
  DANIELA50_FALLBACK_EVENT,
  buildDaniela50EarlyInviteReason,
  formatDaniela50Deadline,
  getPresencaPublicEventExtras,
  isDaniela50Event,
} from "@/lib/presenca-daniela50";
import { formatDateBR, type PresencaEvent } from "@/lib/presenca-querida";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Params = { slug: string };
type SearchParams = { convite?: string | string[]; token?: string | string[] };

type EventWithExtras = PresencaEvent & Record<string, unknown>;

type GuestRow = PresencaPublicGuestPayload & {
  event_id?: string;
  primary_guest_id?: string | null;
  is_invite_recipient?: boolean | null;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function loadEvent(slug: string) {
  const { data, error } = await supabaseAdmin.from("pq_events").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data as EventWithExtras;
  if (isDaniela50Event({ slug, name: slug })) return DANIELA50_FALLBACK_EVENT as EventWithExtras;
  return null;
}

async function loadGuestForEvent(token: string, eventId?: string | null) {
  if (!token || !eventId) return null;

  const { data, error } = await supabaseAdmin
    .from("pq_guests")
    .select("id,event_id,full_name,group_name,relationship_label,relationship_context,invite_context,message_preview,guest_status,adults_count,children_count,primary_guest_id,household_label,is_invite_recipient,dietary_notes,notes")
    .eq("individual_token", token)
    .eq("event_id", eventId)
    .maybeSingle();

  if (error || !data) return null;

  let recipient = data as GuestRow;
  if (recipient.primary_guest_id) {
    const { data: primary } = await supabaseAdmin
      .from("pq_guests")
      .select("id,event_id,full_name,group_name,relationship_label,relationship_context,invite_context,message_preview,guest_status,adults_count,children_count,primary_guest_id,household_label,is_invite_recipient,dietary_notes,notes")
      .eq("id", recipient.primary_guest_id)
      .eq("event_id", eventId)
      .maybeSingle();

    if (primary) recipient = primary as GuestRow;
  }

  const { data: linked } = await supabaseAdmin
    .from("pq_guests")
    .select("id,event_id,full_name,group_name,relationship_label,relationship_context,invite_context,message_preview,guest_status,adults_count,children_count,primary_guest_id,household_label,is_invite_recipient,dietary_notes,notes")
    .eq("event_id", eventId)
    .eq("primary_guest_id", recipient.id)
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  return {
    ...recipient,
    linked_guests: (linked ?? []) as PresencaPublicGuestPayload[],
  } satisfies PresencaPublicGuestPayload;
}

export default async function PresencaQueridaEventoPublicoPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams?: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const inviteToken = String(firstValue(query.convite) ?? firstValue(query.token) ?? "").trim();
  const event = await loadEvent(slug);
  const guest = event?.id && inviteToken ? await loadGuestForEvent(inviteToken, event.id) : null;

  if (!event) {
    return (
      <main className="min-h-screen bg-[#fffaf8] text-slate-800">
        <AeSolutionHeader solutionName="Presença Querida" logoSrc="/presenca-querida-logo.svg" logoAlt="Logo Presença Querida" homeHref="/solucoes/presenca-querida" navLabel="Menu" actions={[]} sectionLinks={[]} />
        <section className="mx-auto max-w-3xl px-4 py-12">
          <h1 className="text-3xl font-black text-[#00334E]">Evento não localizado</h1>
          <p className="mt-3 leading-7 text-slate-600">Confira se o link está correto ou fale com quem enviou o convite.</p>
        </section>
      </main>
    );
  }

  const extras = getPresencaPublicEventExtras(event);
  const photos = extras.hostPhotoGallery.length > 0 ? extras.hostPhotoGallery : extras.eventGallery;

  return (
    <main className="min-h-screen bg-[#fffaf8] text-slate-800">
      <AeSolutionHeader solutionName="Presença Querida" logoSrc="/presenca-querida-logo.svg" logoAlt="Logo Presença Querida" homeHref="/solucoes/presenca-querida" navLabel="Menu" actions={[]} sectionLinks={[]} />

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E85D75]">Convite afetivo</p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-[#00334E] sm:text-6xl">{event.public_headline || event.name}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">{event.invitation_message}</p>

          <div className="mt-6 rounded-[1.7rem] bg-white p-5 shadow-sm ring-1 ring-rose-100">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#E85D75]">Por que o convite está chegando agora?</p>
            <p className="mt-3 leading-7 text-slate-700">{buildDaniela50EarlyInviteReason()}</p>
            <p className="mt-3 text-sm font-black text-[#00334E]">Prazo ideal para confirmar: {formatDaniela50Deadline()}.</p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-rose-100">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Quando</p>
              <p className="mt-2 text-xl font-black text-[#00334E]">{formatDateBR(event.event_date)} · {event.event_time}</p>
            </div>
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-rose-100">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Onde</p>
              <p className="mt-2 text-xl font-black text-[#00334E]">{event.venue_name}</p>
              <p className="mt-1 text-sm text-slate-600">{event.city}{event.state ? `/${event.state}` : ""}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a href={extras.mapUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#E85D75] px-5 py-3 text-center font-black text-white shadow-lg shadow-rose-900/15 transition hover:-translate-y-0.5">
              Abrir endereço no Google Maps
            </a>
            {extras.venueInstagramUrl && (
              <a href={extras.venueInstagramUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-5 py-3 text-center font-black text-[#00334E] shadow-sm ring-1 ring-rose-100 transition hover:-translate-y-0.5">
                Conhecer o espaço
              </a>
            )}
          </div>
          {!inviteToken && <p className="mt-4 text-sm leading-6 text-slate-500">Recebeu um link individual pelo WhatsApp? Abra por ele para responder direto nesta página.</p>}
        </div>

        <div className="rounded-[2.2rem] bg-white p-3 shadow-2xl ring-1 ring-rose-100">
          {extras.hostPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={extras.hostPhotoUrl} alt={`Foto de ${event.host_name || event.name}`} className="h-[34rem] w-full rounded-[1.8rem] object-cover object-center" />
          ) : (
            <div className="flex h-[28rem] items-center justify-center rounded-[1.8rem] bg-rose-50 text-center text-xl font-black text-[#00334E]">{event.name}</div>
          )}
        </div>
      </section>

      {inviteToken && guest && <PresencaPublicConfirmation token={inviteToken} initialGuest={guest} />}
      {inviteToken && !guest && (
        <section id="confirmacao" className="mx-auto max-w-4xl px-4 py-8">
          <div className="rounded-[2rem] bg-red-50 p-6 font-bold text-red-700 ring-1 ring-red-100">Não localizamos este convite individual. Confira o link recebido no WhatsApp ou fale com a família.</div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pb-10">
        <div className="grid gap-4 md:grid-cols-3">
          {extras.eventPositivePoints.map((point) => (
            <article key={point} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-rose-100">
              <p className="font-bold leading-7 text-slate-700">{point}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white/70 py-10">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E85D75]">Programação</p>
          <h2 className="mt-2 text-3xl font-black text-[#00334E]">Música, almoço e celebração</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {extras.attractions.map((item) => (
              <article key={item.title} className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-rose-100">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">{item.time}</p>
                <h3 className="mt-2 text-2xl font-black text-[#00334E]">{item.title}</h3>
                {item.subtitle && <p className="mt-1 font-bold text-[#E85D75]">{item.subtitle}</p>}
                <p className="mt-3 leading-7 text-slate-600">{item.description}</p>
                {item.instagramUrl && <a href={item.instagramUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex font-black text-[#00334E] underline">Ver Instagram</a>}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E85D75]">Cardápio</p>
        <h2 className="mt-2 text-3xl font-black text-[#00334E]">Tudo preparado para receber bem</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {extras.menuSections.map((section) => (
            <article key={section.title} className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-rose-100">
              <h3 className="text-xl font-black text-[#00334E]">{section.title}</h3>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
                {section.items.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {extras.buffetName && <a href={extras.buffetInstagramUrl} target="_blank" rel="noreferrer" className="rounded-3xl bg-[#00334E] p-5 font-black text-white transition hover:-translate-y-0.5">Buffet: {extras.buffetName}</a>}
          {extras.drinksProviderName && <a href={extras.drinksProviderInstagramUrl} target="_blank" rel="noreferrer" className="rounded-3xl bg-[#00334E] p-5 font-black text-white transition hover:-translate-y-0.5">Chopp: {extras.drinksProviderName}</a>}
          {extras.cakeInfo && <div className="rounded-3xl bg-rose-50 p-5 font-bold text-[#00334E] ring-1 ring-rose-100">{extras.cakeInfo}</div>}
        </div>
      </section>

      {extras.menuGallery.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-12">
          <h2 className="text-3xl font-black text-[#00334E]">Fotos do cardápio</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {extras.menuGallery.map((src, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt={`Foto do cardápio ${index + 1}`} className="h-56 w-full rounded-3xl object-cover shadow-sm ring-1 ring-rose-100" />
            ))}
          </div>
        </section>
      )}

      {photos.length > 1 && (
        <section className="bg-[#00334E] py-10 text-white">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-3xl font-black">Uma celebração com presença, carinho e memória</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {photos.slice(0, 3).map((src, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt={`Foto da Daniela ${index + 1}`} className="h-80 w-full rounded-3xl object-cover shadow-lg" />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-4xl px-4 py-10 text-center">
        <h2 className="text-3xl font-black text-[#00334E]">Recebeu seu link individual?</h2>
        <p className="mt-3 leading-7 text-slate-600">Abra o link enviado no WhatsApp para confirmar direto nesta landing page. Assim a família consegue cuidar melhor de buffet, convidados vinculados, crianças, recepção e orientações finais.</p>
        <Link href="/solucoes/presenca-querida" className="mt-6 inline-flex rounded-2xl bg-[#E85D75] px-6 py-4 font-black text-white shadow-lg shadow-rose-900/15">Conhecer Presença Querida</Link>
      </section>
    </main>
  );
}

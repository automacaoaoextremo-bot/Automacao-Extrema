import Link from "next/link";
import { AeSolutionHeader } from "@/components/ae-solution-header";
import { formatDaniela50Deadline, getPresencaPublicEventExtras, isDaniela50Event } from "@/lib/presenca-daniela50";
import { formatDateBR, PRESENCA_GUEST_STATUS_LABELS, type PresencaGuestStatus } from "@/lib/presenca-querida";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Params = { slug: string };
type SearchParams = { convite?: string | string[]; token?: string | string[] };

type GuestRow = {
  id: string;
  event_id: string;
  full_name: string;
  email?: string | null;
  whatsapp?: string | null;
  relationship_label?: string | null;
  relationship_context?: string | null;
  guest_status: PresencaGuestStatus;
  primary_guest_id?: string | null;
  is_active?: boolean | null;
};

type EventRow = {
  id: string;
  name: string;
  slug: string;
  host_name: string | null;
  event_date: string | null;
  event_time: string | null;
  venue_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  map_url?: string | null;
  venue_instagram_url?: string | null;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function statusLabel(status: PresencaGuestStatus) {
  return PRESENCA_GUEST_STATUS_LABELS[status] ?? status;
}

function statusTone(status: PresencaGuestStatus) {
  if (status === "confirmado") return "bg-emerald-50 text-emerald-800 ring-emerald-100";
  if (status === "talvez") return "bg-amber-50 text-amber-800 ring-amber-100";
  if (status === "nao_podera_ir") return "bg-slate-100 text-slate-700 ring-slate-200";
  return "bg-rose-50 text-[#00334E] ring-rose-100";
}

async function loadEvent(slug: string) {
  const { data, error } = await supabaseAdmin.from("pq_events").select("id,name,slug,host_name,event_date,event_time,venue_name,address,city,state,map_url,venue_instagram_url").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data as EventRow | null;
}

async function loadGuestBundle(token: string, eventId: string) {
  const select = "id,event_id,full_name,email,whatsapp,relationship_label,relationship_context,guest_status,primary_guest_id,is_active";
  const { data, error } = await supabaseAdmin.from("pq_guests").select(select).eq("event_id", eventId).eq("individual_token", token).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  let principal = data as GuestRow;
  if (principal.primary_guest_id) {
    const { data: primary, error: primaryError } = await supabaseAdmin.from("pq_guests").select(select).eq("event_id", eventId).eq("id", principal.primary_guest_id).maybeSingle();
    if (primaryError) throw new Error(primaryError.message);
    if (primary) principal = primary as GuestRow;
  }

  const { data: linked, error: linkedError } = await supabaseAdmin
    .from("pq_guests")
    .select(select)
    .eq("event_id", eventId)
    .eq("primary_guest_id", principal.id)
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (linkedError) throw new Error(linkedError.message);

  return [principal, ...((linked ?? []) as GuestRow[])];
}

export default async function PresencaEventoObrigadoPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams?: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const token = String(firstValue(query.convite) ?? firstValue(query.token) ?? "").trim();
  const event = await loadEvent(slug);
  const guests = event?.id && token ? await loadGuestBundle(token, event.id) : null;
  const extras = getPresencaPublicEventExtras(event ?? { slug });
  const eventUrl = `/solucoes/presenca-querida/evento/${encodeURIComponent(slug)}${token ? `?convite=${encodeURIComponent(token)}#confirmacao` : ""}`;
  const confirmedCount = (guests ?? []).filter((guest) => guest.guest_status === "confirmado").length;
  const hasMaybeOrPending = (guests ?? []).some((guest) => guest.guest_status === "talvez" || guest.guest_status === "pendente");

  return (
    <main className="min-h-screen bg-[#fffaf8] text-slate-800">
      <AeSolutionHeader
        solutionName="Presença Querida"
        logoSrc="/presenca-querida-logo.svg"
        logoAlt="Logo Presença Querida"
        homeHref="/solucoes/presenca-querida"
        navLabel="Menu"
        actions={[]}
        sectionLinks={[]}
      />

      <section className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
        <div className="overflow-hidden rounded-[1.8rem] bg-white shadow-2xl ring-1 ring-rose-100 sm:rounded-[2.2rem]">
          <div className="bg-[#00334E] px-5 py-7 text-white sm:px-8 sm:py-9">
            <p className="text-xs font-black uppercase tracking-[0.26em] text-[#9bd8b0]">Resposta registrada</p>
            <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
              Obrigado por responder com carinho.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/88 sm:text-lg sm:leading-8">
              A sua resposta ajuda a família a transformar uma lista de nomes em uma recepção cuidada: buffet mais organizado, mesas melhor pensadas, bebidas na medida e uma chegada mais acolhedora para cada pessoa querida.
            </p>
          </div>

          <div className="grid gap-6 p-5 sm:p-8">
            {guests && guests.length > 0 ? (
              <div className="rounded-3xl bg-[#fff7f4] p-4 ring-1 ring-rose-100 sm:p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#E85D75]">Status atual do convite</p>
                <div className="mt-4 grid gap-3">
                  {guests.map((guest, index) => (
                    <div key={guest.id} className="flex flex-col gap-2 rounded-2xl bg-white p-4 ring-1 ring-rose-100 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-black text-[#00334E]">{guest.full_name}</p>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{index === 0 ? "Convidado principal" : "Convidado vinculado"}</p>
                      </div>
                      <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black ring-1 ${statusTone(guest.guest_status)}`}>{statusLabel(guest.guest_status)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-3xl bg-rose-50 p-5 text-sm font-bold leading-6 text-[#00334E] ring-1 ring-rose-100">
                Não foi possível localizar os detalhes deste convite agora. Sua resposta pode ter sido registrada, mas confira o link recebido no WhatsApp ou fale com a família.
              </div>
            )}

            <div className="rounded-3xl bg-emerald-50 p-5 text-[#00334E] ring-1 ring-emerald-100">
              <p className="text-lg font-black">Sua presença faz diferença.</p>
              <p className="mt-2 text-sm leading-6 sm:text-base sm:leading-7">
                {confirmedCount > 0
                  ? "Quem confirma ajuda a Daniela a sentir, desde agora, que esse momento já começou a ser vivido com as pessoas certas por perto."
                  : "Mesmo quando a resposta ainda é talvez ou quando não será possível ir, avisar com clareza ajuda a família a cuidar dos próximos passos sem cobrança e sem correria."}
              </p>
            </div>

            <div className="rounded-3xl bg-white p-5 ring-1 ring-rose-100">
              <p className="text-lg font-black text-[#00334E]">Se acontecer algum imprevisto</p>
              <p className="mt-2 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
                Caso você tenha confirmado e, mais perto da data, aconteça algo que impeça sua presença, avise o quanto antes ou volte ao link do convite para alterar sua resposta. Isso ajuda a família a reorganizar buffet, bebidas, mesas e recepção com respeito por todos.
              </p>
            </div>

            {hasMaybeOrPending && (
              <div className="rounded-3xl bg-amber-50 p-5 text-amber-900 ring-1 ring-amber-100">
                <p className="font-black">Ainda dá para atualizar até {formatDaniela50Deadline()}.</p>
                <p className="mt-2 text-sm leading-6 sm:text-base sm:leading-7">Quem ficou como talvez ou pendente pode voltar ao mesmo link e ajustar a resposta com calma antes do fechamento da lista.</p>
              </div>
            )}

            {event && (
              <div className="rounded-3xl bg-[#fffdf7] p-5 ring-1 ring-[#efe7d2]">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Resumo do evento</p>
                <h2 className="mt-2 text-xl font-black text-[#00334E] sm:text-2xl">{event.name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
                  {event.event_date ? formatDateBR(event.event_date) : "Data a confirmar"} • {event.event_time || "Horário a confirmar"}
                  <br />
                  {event.venue_name || "Local a confirmar"}{event.address ? ` — ${event.address}` : ""}
                </p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Link href={eventUrl} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#E85D75] px-5 py-3 text-center text-sm font-black text-white shadow-lg shadow-rose-900/15 transition hover:-translate-y-0.5 sm:text-base">
                Alterar minha resposta
              </Link>
              {extras.mapUrl && (
                <a href={extras.mapUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#00334E] px-5 py-3 text-center text-sm font-black text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 sm:text-base">
                  Ver local no mapa
                </a>
              )}
            </div>

            {isDaniela50Event(event ?? { slug }) && (
              <p className="text-center text-sm leading-6 text-slate-500">
                Mais perto da festa, a família enviará um lembrete carinhoso com horário, local e orientações finais.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

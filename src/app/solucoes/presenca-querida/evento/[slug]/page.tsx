import { AeSolutionHeader, type SolutionHeaderAction, type SolutionSectionLink } from "@/components/ae-solution-header";
import { PresencaPublicConfirmation, type PresencaPublicGuestPayload } from "@/components/presenca-public-confirmation";
import {
  DANIELA50_FALLBACK_EVENT,
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

const MENU_SECTION_COPY: Record<string, string> = {
  "Entradinhas e acompanhamentos": "Para receber bem desde o começo, com sabores leves, variados e aquele clima de mesa farta que acolhe cada convidado.",
  "Carnes e pratos quentes": "Um almoço pensado para celebrar com fartura, conforto e sabor, deixando a tarde ainda mais especial.",
  "Bebidas para refrescar a tarde": "Para refrescar, brindar e acompanhar as conversas com leveza durante toda a tarde.",
  "Bolo e docinhos": "Um fechamento doce para marcar os 50 anos da Dani com sabor, carinho e memória afetiva.",
};

const MENU_ITEM_COPY: Record<string, string> = {
  "Churipam com chimichurri": "Um começo cheio de sabor para abrir o apetite com carinho.",
  "Guacamole com doritos caseiro": "Toque leve e descontraído para circular entre conversas e sorrisos.",
  "Pão de alho": "Clássico querido que combina com encontro, chácara e celebração.",
  "Mandioca frita": "Aquele acompanhamento que convida a ficar mais um pouco à mesa.",
  "Batata frita": "Crocante e democrática, para agradar diferentes gostos ao longo da tarde.",
  "Salada Caesar": "Frescor para equilibrar a mesa e deixar o almoço mais leve.",
  "Maionese de legumes": "Conforto e memória afetiva em uma combinação sempre querida.",
  "Salada marroquina": "Um toque especial para trazer variedade e cor ao cardápio.",
  Vinagrete: "Companhia perfeita para deixar as escolhas da mesa ainda mais gostosas.",
  Farofa: "Detalhe simples que faz diferença e completa a experiência do almoço.",
  "Contra filé": "Carne escolhida para um almoço caprichado e acolhedor.",
  Maminha: "Sabor e maciez para um momento de celebração à altura da ocasião.",
  Linguiça: "Presença certeira para um clima leve, familiar e descontraído.",
  "Tulipa de frango": "Opção saborosa para agradar quem gosta de variedade à mesa.",
  "Arroz branco": "Base clássica que acompanha bem toda a composição do almoço.",
  "Arroz primavera": "Cor e leveza para compor uma mesa ainda mais bonita.",
  "Feijão gordo": "Sustância e aconchego em um prato cheio de personalidade.",
  "Coca-Cola": "Refrigerante clássico para acompanhar o almoço e o bate-papo.",
  Guaraná: "Opção refrescante para brindar o encontro em família.",
  "Água aromatizada": "Leveza e frescor para uma tarde de celebração diurna.",
  "Chopp Kremer": "Brinde artesanal para quem gosta de celebrar com sabor e boa companhia.",
  "Bolo de abacaxi": "Doçura especial para marcar os 50 anos da Dani.",
  Docinhos: "Pequenos detalhes que deixam a memória da festa ainda mais gostosa.",
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

function buildHeaderLinks(hasInviteToken: boolean, guestName?: string | null) {
  const sectionLinks: SolutionSectionLink[] = [
    { label: "Convite afetivo", href: "#convite-afetivo" },
    { label: "Quando e onde", href: "#quando-onde" },
    { label: "Programação", href: "#programacao" },
    { label: "Cardápio", href: "#cardapio" },
  ];

  const actions: SolutionHeaderAction[] = hasInviteToken
    ? [{ label: guestName ? `Convite: ${guestName}` : "Convite", href: "#confirmacao", variant: "primary" }]
    : [];

  return { sectionLinks, actions };
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

  const isDaniela = isDaniela50Event(event);
  const extras = getPresencaPublicEventExtras(event);
  const hostPhoto = extras.hostPhotoUrl;
  const inviteTitleName = guest?.full_name?.trim().split(/\s+/)[0] ?? null;
  const { actions, sectionLinks } = buildHeaderLinks(Boolean(inviteToken), inviteTitleName);
  const headline = isDaniela ? DANIELA50_FALLBACK_EVENT.public_headline : event.public_headline || event.name;
  const introMessage = isDaniela ? DANIELA50_FALLBACK_EVENT.invitation_message : event.invitation_message || DANIELA50_FALLBACK_EVENT.invitation_message;

  return (
    <main className="min-h-screen bg-[#fffaf8] text-slate-800">
      <AeSolutionHeader
        solutionName="Presença Querida"
        logoSrc="/presenca-querida-logo.svg"
        logoAlt="Logo Presença Querida"
        homeHref="/solucoes/presenca-querida"
        navLabel="Menu"
        actions={actions}
        sectionLinks={sectionLinks}
      />

      <section id="convite-afetivo" className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-7">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E85D75]">Convite afetivo</p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-[#00334E] sm:text-6xl">{headline}</h1>

          {hostPhoto && (
            <div className="mt-6 overflow-hidden rounded-[1.8rem] bg-[#fff7f4] ring-1 ring-rose-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hostPhoto} alt={`Foto de ${event.host_name || event.name}`} className="h-[22rem] w-full object-cover object-center sm:h-[30rem]" />
            </div>
          )}

          <div className="mt-6 space-y-4 text-lg leading-8 text-slate-700">
            <p>{introMessage}</p>
          </div>
        </div>
      </section>

      <section id="quando-onde" className="mx-auto max-w-6xl px-4 py-2">
        <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-7">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E85D75]">Quando e onde</p>
          <h2 className="mt-2 text-3xl font-black text-[#00334E]">Tudo o que você precisa para se programar com calma</h2>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div className="rounded-[1.7rem] bg-[#fff7f4] p-5 ring-1 ring-rose-100">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Quando</p>
                  <p className="mt-2 text-2xl font-black text-[#00334E]">{formatDateBR(event.event_date)}</p>
                  <p className="mt-1 text-base font-semibold text-slate-700">{event.event_time}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Onde</p>
                  <p className="mt-2 text-2xl font-black text-[#00334E]">{event.venue_name}</p>
                  <p className="mt-1 text-base text-slate-700">{event.address || `${event.city}${event.state ? `/${event.state}` : ""}`}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {extras.venueGallery.slice(0, 2).map((src, index) => (
                  <div key={src} className="overflow-hidden rounded-[1.5rem] bg-white ring-1 ring-rose-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Foto da Chácara Piloto ${index + 1}`} className="h-60 w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.7rem] bg-[#00334E] p-6 text-white shadow-lg">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9bd8b0]">Organização com carinho</p>
              <h3 className="mt-2 text-2xl font-black">Confirme até {formatDaniela50Deadline()}</h3>
              <p className="mt-4 leading-7 text-white/90">
                Confirmar até essa data ajuda a família a cuidar do buffet, das bebidas, das mesas e da recepção com mais organização e carinho.
              </p>

              <div className="mt-6 flex flex-col gap-3">
                <a href={extras.mapUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#E85D75] px-5 py-3 text-center font-black text-white shadow-lg shadow-rose-900/15 transition hover:-translate-y-0.5">
                  Abrir no Google Maps
                </a>
                {extras.venueInstagramUrl && (
                  <a href={extras.venueInstagramUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#31C16B] px-5 py-3 text-center font-black text-[#00334E] shadow-lg shadow-emerald-950/10 transition hover:-translate-y-0.5">
                    Conheça mais do espaço
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="programacao" className="bg-white/70 py-10">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E85D75]">Programação</p>
          <h2 className="mt-2 text-3xl font-black text-[#00334E]">Música, recepção e clima de celebração</h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {extras.attractions.map((item) => (
              <article key={item.title} className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-rose-100">
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={item.title} className="h-72 w-full object-cover" />
                )}
                <div className="p-6">
                  {item.time && <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">{item.time}</p>}
                  <h3 className="mt-2 text-2xl font-black text-[#00334E]">{item.title}</h3>
                  {item.subtitle && <p className="mt-1 font-bold text-[#E85D75]">{item.subtitle}</p>}
                  <p className="mt-3 leading-7 text-slate-600">{item.description}</p>
                  {item.instagramUrl && (
                    <a href={item.instagramUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex font-black text-[#00334E] underline">
                      Ver Instagram
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="cardapio" className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E85D75]">Cardápio</p>
        <h2 className="mt-2 text-3xl font-black text-[#00334E]">Tudo preparado para receber bem</h2>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">Um cardápio pensado para acolher, refrescar e prolongar os bons encontros — com variedade, sabor e detalhes que ajudam a transformar a tarde em memória afetiva.</p>

        <div className="mt-6 grid gap-4">
          {extras.menuSections.map((section) => (
            <article key={section.title} className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-rose-100">
              <p className="inline-flex rounded-full bg-[#eef8f0] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">{section.title}</p>
              <p className="mt-4 leading-7 text-slate-600">{MENU_SECTION_COPY[section.title] ?? "Itens escolhidos com cuidado para acolher quem faz parte dessa celebração."}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {section.items.map((item) => (
                  <div key={item} className="rounded-3xl border border-[#efe7d2] bg-[#fffdf7] p-4 shadow-sm">
                    <p className="font-black text-[#173323]">{item}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{MENU_ITEM_COPY[item] ?? "Presença escolhida para deixar a experiência ainda mais completa e gostosa."}</p>
                    {item === "Chopp Kremer" && extras.drinksPhotoUrl && (
                      <div className="mt-4 overflow-hidden rounded-2xl bg-white ring-1 ring-[#efe7d2]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={extras.drinksPhotoUrl} alt={extras.drinksProviderName || "Chopp Kremer"} className="h-56 w-full object-cover" />
                      </div>
                    )}
                    {item === "Chopp Kremer" && extras.drinksProviderInstagramUrl && (
                      <a href={extras.drinksProviderInstagramUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex font-black text-[#00334E] underline">
                        Conhecer o Chopp Kremer
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {inviteToken && guest && <PresencaPublicConfirmation token={inviteToken} initialGuest={guest} />}
      {inviteToken && !guest && (
        <section id="confirmacao" className="mx-auto max-w-4xl px-4 py-8">
          <div className="rounded-[2rem] bg-red-50 p-6 font-bold text-red-700 ring-1 ring-red-100">Não localizamos este convite individual. Confira o link recebido no WhatsApp ou fale com a família.</div>
        </section>
      )}

      <section className="bg-[#00334E] py-10 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-black">Uma celebração com presença, carinho e memória</h2>
        </div>
      </section>
    </main>
  );
}

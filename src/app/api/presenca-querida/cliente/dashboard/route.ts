import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { PresencaEvent, PresencaGuest, PresencaPersonEventLink, PresencaRole } from "@/lib/presenca-querida";

type RawPersonEventLink = Omit<PresencaPersonEventLink, "role" | "event"> & {
  role: PresencaRole | PresencaRole[] | null;
  event: PresencaEvent | PresencaEvent[] | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function normalizeLink(link: RawPersonEventLink): PresencaPersonEventLink {
  return {
    ...link,
    role: firstRelation(link.role),
    event: firstRelation(link.event),
  };
}

async function getAuthenticatedUser(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";

  if (!token) {
    return { user: null, error: NextResponse.json({ error: "Acesso não autenticado." }, { status: 401 }) };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return { user: null, error: NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 }) };
  }

  return { user: data.user, error: null };
}

export async function GET(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;

  const user = auth.user;
  if (!user) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 401 });

  let person = null;
  const { data: personByAuth, error: personByAuthError } = await supabaseAdmin
    .from("pq_people")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (personByAuthError) return NextResponse.json({ error: personByAuthError.message }, { status: 500 });
  person = personByAuth;

  if (!person && user.email) {
    const { data: personByEmail, error: personByEmailError } = await supabaseAdmin
      .from("pq_people")
      .select("*")
      .ilike("email", user.email)
      .maybeSingle();

    if (personByEmailError) return NextResponse.json({ error: personByEmailError.message }, { status: 500 });
    person = personByEmail;
  }

  if (!person) {
    return NextResponse.json(
      { error: "Este usuário ainda não está vinculado a um cliente Presença Querida. Verifique o e-mail do usuário no Supabase ou vincule o auth_user_id na tabela pq_people." },
      { status: 404 },
    );
  }

  const { data: links, error: linksError } = await supabaseAdmin
    .from("pq_person_events")
    .select(
      `
      id,
      is_manager,
      is_support,
      role:pq_roles(id, name, slug, is_manager, is_guest_role),
      event:pq_events(
        id,
        ae_client_id,
        event_type,
        name,
        slug,
        host_name,
        event_date,
        event_time,
        venue_name,
        address,
        city,
        state,
        whatsapp,
        email,
        public_headline,
        invitation_message,
        dress_code,
        parking_info,
        status,
        is_surprise,
        is_demo,
        primary_color,
        accent_color
      )
    `,
    )
    .eq("person_id", person.id);

  if (linksError) return NextResponse.json({ error: linksError.message }, { status: 500 });

  const normalizedLinks = ((links ?? []) as RawPersonEventLink[]).map(normalizeLink);
  const events = normalizedLinks.map((link) => link.event).filter((event): event is PresencaEvent => Boolean(event));
  const eventIds = events.map((event) => event.id);
  const isAnyManager = normalizedLinks.some((link) => link.is_manager || link.is_support || Boolean(link.role?.is_manager));

  if (eventIds.length === 0) {
    return NextResponse.json({ person, links: [], events: [], dashboard: [], guests: [], clientTerms: [] });
  }

  const dashboardPromise = supabaseAdmin
    .from("pq_v_dashboard_events")
    .select("*")
    .in("event_id", eventIds)
    .order("event_date", { ascending: true });

  let guestsQuery = supabaseAdmin
    .from("pq_guests")
    .select("*")
    .in("event_id", eventIds)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!isAnyManager) {
    guestsQuery = guestsQuery.eq("email", person.email);
  }

  const termsPromise = supabaseAdmin
    .from("pq_client_terms")
    .select("*")
    .in("event_id", eventIds)
    .order("created_at", { ascending: false });

  const [dashboardResult, guestsResult, termsResult] = await Promise.all([dashboardPromise, guestsQuery, termsPromise]);

  if (dashboardResult.error) return NextResponse.json({ error: dashboardResult.error.message }, { status: 500 });
  if (guestsResult.error) return NextResponse.json({ error: guestsResult.error.message }, { status: 500 });
  if (termsResult.error) return NextResponse.json({ error: termsResult.error.message }, { status: 500 });

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    person,
    links: normalizedLinks,
    events,
    is_manager: isAnyManager,
    dashboard: dashboardResult.data ?? [],
    guests: (guestsResult.data ?? []) as PresencaGuest[],
    clientTerms: termsResult.data ?? [],
  });
}

import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { PresencaEvent, PresencaPerson, PresencaPersonEventLink, PresencaRole } from "@/lib/presenca-querida";

type RawPersonEventLink = Omit<PresencaPersonEventLink, "role" | "event"> & {
  role: PresencaRole | PresencaRole[] | null;
  event: PresencaEvent | PresencaEvent[] | null;
};

type PresencaAuthContext = {
  user: User;
  person: PresencaPerson;
  eventId: string;
  event: PresencaEvent;
  link: PresencaPersonEventLink;
  isManager: boolean;
};

type PresencaAuthResult =
  | { ok: true; context: PresencaAuthContext }
  | { ok: false; response: NextResponse };

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

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
}

export async function getPresencaAuthContext(request: Request): Promise<PresencaAuthResult> {
  const token = getBearerToken(request);
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: "Acesso não autenticado." }, { status: 401 }) };
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) {
    return { ok: false, response: NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 }) };
  }

  const user = authData.user;
  let person: PresencaPerson | null = null;

  const { data: personByAuth, error: personByAuthError } = await supabaseAdmin
    .from("pq_people")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (personByAuthError) {
    return { ok: false, response: NextResponse.json({ error: personByAuthError.message }, { status: 500 }) };
  }

  person = personByAuth as PresencaPerson | null;

  if (!person && user.email) {
    const { data: personByEmail, error: personByEmailError } = await supabaseAdmin
      .from("pq_people")
      .select("*")
      .ilike("email", user.email)
      .maybeSingle();

    if (personByEmailError) {
      return { ok: false, response: NextResponse.json({ error: personByEmailError.message }, { status: 500 }) };
    }

    person = personByEmail as PresencaPerson | null;
  }

  if (!person) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Este usuário ainda não está vinculado a um evento Presença Querida." },
        { status: 404 },
      ),
    };
  }

  const requestedEventId = new URL(request.url).searchParams.get("eventId")?.trim();

  const { data: links, error: linksError } = await supabaseAdmin
    .from("pq_person_events")
    .select(
      `
      id,
      is_manager,
      is_support,
      role:pq_roles(id, name, slug, is_manager, is_guest_role),
      event:pq_events(*)
    `,
    )
    .eq("person_id", person.id);

  if (linksError) {
    return { ok: false, response: NextResponse.json({ error: linksError.message }, { status: 500 }) };
  }

  const normalizedLinks = ((links ?? []) as RawPersonEventLink[]).map(normalizeLink).filter((link) => Boolean(link.event));
  const selectedLink = requestedEventId
    ? normalizedLinks.find((link) => link.event?.id === requestedEventId)
    : normalizedLinks[0];

  if (!selectedLink?.event) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Nenhum evento Presença Querida foi encontrado para este usuário." },
        { status: 404 },
      ),
    };
  }

  const isManager = Boolean(selectedLink.is_manager || selectedLink.is_support || selectedLink.role?.is_manager);
  if (!isManager) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Seu acesso não permite alterar este evento Presença Querida." },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true,
    context: {
      user,
      person,
      eventId: selectedLink.event.id,
      event: selectedLink.event,
      link: selectedLink,
      isManager,
    },
  };
}

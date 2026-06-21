import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type PresencaAuthContext = {
  user: { id: string; email?: string | null };
  person: {
    id: string;
    full_name: string;
    email: string | null;
    whatsapp: string | null;
    auth_user_id: string | null;
  };
  eventId: string;
  isManager: boolean;
};

export async function getPresencaAuthContext(request: Request): Promise<
  | { ok: true; context: PresencaAuthContext }
  | { ok: false; response: NextResponse }
> {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Acesso não autenticado." }, { status: 401 }),
    };
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 }),
    };
  }

  const user = userData.user;
  let person = null;
  const { data: byAuth, error: byAuthError } = await supabaseAdmin
    .from("pq_people")
    .select("id, full_name, email, whatsapp, auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (byAuthError) {
    return { ok: false, response: NextResponse.json({ error: byAuthError.message }, { status: 500 }) };
  }

  person = byAuth;

  if (!person && user.email) {
    const { data: byEmail, error: byEmailError } = await supabaseAdmin
      .from("pq_people")
      .select("id, full_name, email, whatsapp, auth_user_id")
      .ilike("email", user.email)
      .maybeSingle();

    if (byEmailError) {
      return { ok: false, response: NextResponse.json({ error: byEmailError.message }, { status: 500 }) };
    }

    person = byEmail;
  }

  if (!person) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Usuário sem vínculo com o Presença Querida." }, { status: 404 }),
    };
  }

  const { data: link, error: linkError } = await supabaseAdmin
    .from("pq_person_events")
    .select("event_id, is_manager, is_support, role:pq_roles(is_manager, is_guest_role)")
    .eq("person_id", person.id)
    .limit(1)
    .maybeSingle();

  if (linkError) {
    return { ok: false, response: NextResponse.json({ error: linkError.message }, { status: 500 }) };
  }

  if (!link?.event_id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Pessoa sem evento vinculado." }, { status: 404 }),
    };
  }

  const role = Array.isArray(link.role) ? link.role[0] : link.role;
  const isManager = Boolean(link.is_manager || link.is_support || role?.is_manager);

  return {
    ok: true,
    context: {
      user: { id: user.id, email: user.email },
      person,
      eventId: link.event_id as string,
      isManager,
    },
  };
}

import { NextResponse } from "next/server";
import { getPresencaAuthContext } from "@/lib/presenca-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type ResetBody = {
  id?: string;
  guestId?: string;
  all?: boolean;
  clearNotes?: boolean;
};

function asText(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(request: Request) {
  const auth = await getPresencaAuthContext(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as ResetBody;
  const guestId = asText(body.id ?? body.guestId);
  const resetAll = body.all === true;

  if (!resetAll && !guestId) {
    return NextResponse.json({ error: "Informe o convidado ou marque all=true." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    guest_status: "pendente",
    confirmed_at: null,
    companions_confirmed_count: 0,
  };

  if (body.clearNotes !== false) {
    patch.dietary_notes = null;
    patch.notes = null;
  }

  let query = supabaseAdmin.from("pq_guests").update(patch).eq("event_id", auth.context.eventId);
  if (!resetAll) query = query.eq("id", guestId);

  const { data, error } = await query.select("id,full_name,guest_status,confirmed_at,dietary_notes,notes");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, reset: data ?? [], count: data?.length ?? 0 });
}

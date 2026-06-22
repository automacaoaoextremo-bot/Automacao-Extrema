import { NextResponse } from "next/server";
import { DANIELA50_FALLBACK_EVENT, getPresencaPublicEventExtras, isDaniela50Event } from "@/lib/presenca-daniela50";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Params = { slug: string };

export async function GET(_request: Request, { params }: { params: Promise<Params> }) {
  const { slug } = await params;
  if (!slug) return NextResponse.json({ error: "Evento não informado." }, { status: 400 });

  const { data, error } = await supabaseAdmin.from("pq_events").select("*").eq("slug", slug).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const event = data ?? (isDaniela50Event({ slug, name: slug }) ? DANIELA50_FALLBACK_EVENT : null);
  if (!event) return NextResponse.json({ error: "Evento não localizado." }, { status: 404 });

  return NextResponse.json({ ok: true, event, extras: getPresencaPublicEventExtras(event) });
}

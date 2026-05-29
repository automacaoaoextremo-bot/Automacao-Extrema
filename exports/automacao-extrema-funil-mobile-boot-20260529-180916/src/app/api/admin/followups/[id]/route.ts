import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

type Params = Promise<{ id: string }>;

export async function PATCH(request: Request, { params }: { params: Params }) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;
  const { id } = await params;
  const body = await request.json();

  const { data, error } = await supabaseAdmin
    .from("ae_lead_followups")
    .update({
      status: body.status ?? "enviado",
      sent_at: body.status === "pendente" ? null : new Date().toISOString(),
      notes: body.notes ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ followup: data });
}

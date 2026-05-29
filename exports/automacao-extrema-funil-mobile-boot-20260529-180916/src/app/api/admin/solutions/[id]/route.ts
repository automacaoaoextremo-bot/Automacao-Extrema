import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

type Params = Promise<{ id: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("ae_solutions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ solution: data });
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;
  const { id } = await params;
  const body = await request.json();

  const allowed = {
    name: body.name,
    short_description: body.short_description,
    target_audience: body.target_audience,
    main_pains: body.main_pains,
    current_status: body.current_status,
    stage: body.stage,
    priority: Number(body.priority ?? 0),
    is_active: Boolean(body.is_active),
  };

  const { data, error } = await supabaseAdmin
    .from("ae_solutions")
    .update(allowed)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ solution: data });
}

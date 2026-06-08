import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requiredText, toSlug } from "@/lib/ae-utils";

export async function GET(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const { data, error } = await supabaseAdmin
    .from("ae_client_sites")
    .select("*, ae_solutions(id, name, slug)")
    .order("client_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ client_sites: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const body = await request.json();
  const clientName = requiredText(body.client_name);
  const siteName = requiredText(body.site_name) || clientName;
  const slug = toSlug(requiredText(body.slug) || siteName);
  const solutionId = requiredText(body.solution_id);

  if (!clientName || !siteName || !slug || !solutionId) {
    return NextResponse.json({ error: "Preencha solução, cliente, nome do site e slug." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("ae_client_sites")
    .insert({
      solution_id: solutionId,
      client_name: clientName,
      site_name: siteName,
      slug,
      url: requiredText(body.url) || null,
      public_path: requiredText(body.public_path) || null,
      page_type: requiredText(body.page_type) || "site_cliente",
      status: requiredText(body.status) || "planejado",
      notes: requiredText(body.notes) || null,
    })
    .select("*, ae_solutions(id, name, slug)")
    .single();

  if (error) {
    const message = error.code === "23505" ? "Já existe um site/página com este slug." : error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ client_site: data }, { status: 201 });
}

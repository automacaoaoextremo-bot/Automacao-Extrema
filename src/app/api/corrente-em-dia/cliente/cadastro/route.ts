import { NextResponse } from "next/server";
import { getCorrenteAuthContext } from "@/lib/corrente-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = text(value).replace(".", "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function bool(value: unknown) {
  return Boolean(value);
}

export async function GET(request: Request) {
  const auth = await getCorrenteAuthContext(request);
  if (!auth.ok) return auth.response;

  const { data: organization, error } = await supabaseAdmin
    .from("ced_organizations")
    .select("*")
    .eq("id", auth.context.organizationId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: options, error: optionsError } = await supabaseAdmin
    .from("ced_contribution_options")
    .select("*")
    .eq("organization_id", auth.context.organizationId)
    .order("created_at", { ascending: true });

  if (optionsError) return NextResponse.json({ error: optionsError.message }, { status: 500 });

  const { data: link } = await supabaseAdmin
    .from("ced_person_organizations")
    .select("person:ced_people(full_name, email, whatsapp)")
    .eq("organization_id", auth.context.organizationId)
    .eq("is_manager", true)
    .limit(1)
    .maybeSingle();

  const managerPerson = Array.isArray(link?.person) ? link?.person[0] : link?.person;

  return NextResponse.json({
    organization,
    contributionOptions: options ?? [],
    contact: {
      name: organization.contact_name ?? managerPerson?.full_name ?? auth.context.person.full_name,
      email: organization.contact_email ?? managerPerson?.email ?? auth.context.person.email,
      whatsapp: organization.whatsapp ?? managerPerson?.whatsapp ?? auth.context.person.whatsapp,
    },
  });
}

export async function PUT(request: Request) {
  const auth = await getCorrenteAuthContext(request);
  if (!auth.ok) return auth.response;

  if (!auth.context.isManager) {
    return NextResponse.json({ error: "Apenas responsáveis podem alterar o cadastro." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const dueMode = text(body.contribution_due_mode) || "until_day";
  const dueDay = numberOrNull(body.contribution_due_day);

  const payload = {
    contact_name: text(body.contact_name),
    contact_email: text(body.contact_email).toLowerCase(),
    whatsapp: text(body.whatsapp).replace(/\D/g, ""),
    organization_type: text(body.organization_type) || "terreiro",
    name: text(body.name) || "Organização em configuração",
    responsible_manager_name: text(body.responsible_manager_name),
    pix_key: text(body.pix_key) || null,
    pix_receiver_name: text(body.pix_receiver_name) || null,
    default_individual_amount: numberOrNull(body.default_individual_amount),
    contribution_due_day: dueMode === "free_month" ? null : dueDay,
    contribution_due_mode: dueMode,
    reminder_before_due_enabled: bool(body.reminder_before_due_enabled),
    reminder_due_day_enabled: bool(body.reminder_due_day_enabled),
    reminder_after_due_enabled: bool(body.reminder_after_due_enabled),
    reminder_five_days_after_enabled: bool(body.reminder_five_days_after_enabled),
    state: text(body.state) || "SP",
    city: text(body.city) || "Campinas",
    postal_code: text(body.postal_code).replace(/\D/g, "") || null,
    address_line: text(body.address_line) || null,
    neighborhood: text(body.neighborhood) || null,
    address_number: text(body.address_number) || null,
    address_complement: text(body.address_complement) || null,
  };

  const { data: organization, error } = await supabaseAdmin
    .from("ced_organizations")
    .update(payload)
    .eq("id", auth.context.organizationId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const options = Array.isArray(body.contribution_options) ? body.contribution_options : [];

  await supabaseAdmin
    .from("ced_contribution_options")
    .delete()
    .eq("organization_id", auth.context.organizationId)
    .eq("is_default", false);

  const rows = options
    .map((item) => {
      const option = item as Record<string, unknown>;
      return {
        organization_id: auth.context.organizationId,
        description: text(option.description),
        amount: numberOrNull(option.amount),
        is_default: false,
        is_active: true,
      };
    })
    .filter((item) => item.description);

  if (rows.length > 0) {
    const { error: insertError } = await supabaseAdmin.from("ced_contribution_options").insert(rows);
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ organization });
}

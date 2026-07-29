import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type EntityRecord = {
  id: string;
  name: string | null;
  line: string | null;
  entity_type: string | null;
  active: boolean | null;
  attends_consulentes: boolean | null;
  appointment_enabled: boolean | null;
};

async function findTucxaOrganizationId() {
  const { data: bySlug, error: slugError } = await supabaseAdmin
    .from("oh_organizations")
    .select("id")
    .eq("slug", "tucxa")
    .maybeSingle();

  if (slugError) throw slugError;
  if (bySlug?.id) return bySlug.id as string;

  const { data: byName, error: nameError } = await supabaseAdmin
    .from("oh_organizations")
    .select("id")
    .ilike("name", "%tucxa%")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (nameError) throw nameError;
  return (byName?.id as string | undefined) ?? null;
}

export async function GET() {
  try {
    const organizationId = await findTucxaOrganizationId();
    if (!organizationId) {
      return NextResponse.json(
        { error: "Organização Tucxa não encontrada.", entities: [] },
        { status: 404 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("oh_spiritual_entities")
      .select("id, name, line, entity_type, active, attends_consulentes, appointment_enabled")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .order("name", { ascending: true });

    if (error) throw error;

    const entities = ((data ?? []) as EntityRecord[])
      .filter((entity) => Boolean(entity.id) && Boolean(entity.name?.trim()))
      .map((entity) => ({
        id: entity.id,
        name: entity.name?.trim() || "Entidade",
        line: entity.line?.trim() || "",
        entityType: entity.entity_type?.trim() || "",
        attendsConsulentes: entity.attends_consulentes !== false,
        appointmentEnabled: entity.appointment_enabled !== false,
      }));

    return NextResponse.json(
      { ok: true, entities },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Não foi possível carregar as entidades do Tucxa.";

    return NextResponse.json({ error: message, entities: [] }, { status: 500 });
  }
}

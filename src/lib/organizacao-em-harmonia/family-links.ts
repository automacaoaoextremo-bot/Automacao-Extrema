import { supabaseAdmin } from "@/lib/supabase-admin";

export const FAMILY_RELATIONSHIP_SLUGS = [
  "pai",
  "mae",
  "marido",
  "esposa",
  "filho",
  "filha",
] as const;

const STORED_FAMILY_RELATIONSHIP_SLUGS = [
  ...FAMILY_RELATIONSHIP_SLUGS,
  "filho-ou-filha",
  "pai-ou-mae",
] as const;

export type FamilyRelationshipSlug = (typeof FAMILY_RELATIONSHIP_SLUGS)[number];

export type FamilyLinkInput = {
  personId: string;
  relationshipTypeId: string;
};

export type FamilyLink = FamilyLinkInput & {
  personName: string;
  relationshipSlug: string;
  relationshipLabel: string;
  source?: string;
  reciprocal?: boolean;
};

export type FamilyPersonOption = {
  id: string;
  fullName: string;
};

export type FamilyRelationshipOption = {
  id: string;
  slug: string;
  label: string;
};

type FamilyRelationshipRow = {
  id: string | null;
  slug: string | null;
  label: string | null;
};

type FamilyPersonRow = {
  id: string | null;
  full_name: string | null;
};

type MembershipPersonRow = {
  person_id: string | null;
};

type StoredFamilyLinkRow = {
  related_person_id: string | null;
  relationship_type_id: string | null;
  source: string | null;
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function parseFamilyLinks(value: unknown): FamilyLinkInput[] {
  if (!Array.isArray(value)) return [];

  const links = value.flatMap<FamilyLinkInput>((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const personId = asText(record.personId ?? record.relatedPersonId);
    const relationshipTypeId = asText(record.relationshipTypeId);
    return personId && relationshipTypeId ? [{ personId, relationshipTypeId }] : [];
  });

  const seen = new Set<string>();
  return links.filter((item) => {
    if (seen.has(item.personId)) return false;
    seen.add(item.personId);
    return true;
  });
}

export async function loadFamilyRelationshipOptions(
  organizationId: string,
): Promise<FamilyRelationshipOption[]> {
  const { data, error } = await supabaseAdmin
    .from("oh_family_relationship_types")
    .select("id, slug, label, active, sort_order")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .in("slug", [...FAMILY_RELATIONSHIP_SLUGS])
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as FamilyRelationshipRow[]).map((item) => ({
    id: asText(item.id),
    slug: asText(item.slug),
    label: asText(item.label),
  }));
}

export async function loadEligibleFamilyPeople(
  organizationId: string,
  excludePersonId = "",
): Promise<FamilyPersonOption[]> {
  const { data: memberships, error: membershipsError } = await supabaseAdmin
    .from("oh_memberships")
    .select("person_id")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .eq("status", "ativo");

  if (membershipsError) throw membershipsError;

  const personIds = Array.from(
    new Set(
      ((memberships ?? []) as MembershipPersonRow[])
        .map((item) => asText(item.person_id))
        .filter((personId) => personId && personId !== excludePersonId),
    ),
  );

  if (personIds.length === 0) return [];

  const { data: people, error: peopleError } = await supabaseAdmin
    .from("oh_people")
    .select("id, full_name, active")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .in("id", personIds)
    .order("full_name", { ascending: true });

  if (peopleError) throw peopleError;

  return ((people ?? []) as FamilyPersonRow[]).map((item) => ({
    id: asText(item.id),
    fullName: asText(item.full_name) || "Filho da Corrente",
  }));
}

export async function validateFamilyLinks(input: {
  organizationId: string;
  personId?: string;
  links: FamilyLinkInput[];
}): Promise<FamilyLink[]> {
  const uniqueLinks = parseFamilyLinks(input.links);
  if (uniqueLinks.length === 0) return [];

  if (
    input.personId &&
    uniqueLinks.some((item) => item.personId === input.personId)
  ) {
    throw new Error("A própria pessoa não pode ser cadastrada como familiar.");
  }

  const personIds = uniqueLinks.map((item) => item.personId);
  const relationshipIds = Array.from(
    new Set(uniqueLinks.map((item) => item.relationshipTypeId)),
  );

  const [peopleResult, membershipsResult, relationshipsResult] = await Promise.all([
    supabaseAdmin
      .from("oh_people")
      .select("id, full_name, active")
      .eq("organization_id", input.organizationId)
      .eq("active", true)
      .in("id", personIds),
    supabaseAdmin
      .from("oh_memberships")
      .select("person_id")
      .eq("organization_id", input.organizationId)
      .eq("active", true)
      .eq("status", "ativo")
      .in("person_id", personIds),
    supabaseAdmin
      .from("oh_family_relationship_types")
      .select("id, slug, label, active")
      .eq("organization_id", input.organizationId)
      .eq("active", true)
      .in("slug", [...STORED_FAMILY_RELATIONSHIP_SLUGS])
      .in("id", relationshipIds),
  ]);

  if (peopleResult.error) throw peopleResult.error;
  if (membershipsResult.error) throw membershipsResult.error;
  if (relationshipsResult.error) throw relationshipsResult.error;

  const peopleById = new Map(
    ((peopleResult.data ?? []) as FamilyPersonRow[]).map((item) => [asText(item.id), item]),
  );
  const activeMembershipIds = new Set(
    ((membershipsResult.data ?? []) as MembershipPersonRow[])
      .map((item) => asText(item.person_id))
      .filter(Boolean),
  );
  const relationshipsById = new Map(
    ((relationshipsResult.data ?? []) as FamilyRelationshipRow[]).map((item) => [asText(item.id), item]),
  );

  if (
    personIds.some(
      (personId) => !peopleById.has(personId) || !activeMembershipIds.has(personId),
    )
  ) {
    throw new Error(
      "Um dos familiares não está disponível como Filho da Corrente com acesso ativo.",
    );
  }

  if (relationshipIds.some((relationshipId) => !relationshipsById.has(relationshipId))) {
    throw new Error("Um dos graus de parentesco não está disponível.");
  }

  return uniqueLinks.map((item) => {
    const person = peopleById.get(item.personId);
    const relationship = relationshipsById.get(item.relationshipTypeId);
    return {
      ...item,
      personName: asText(person?.full_name) || "Filho da Corrente",
      relationshipSlug: asText(relationship?.slug),
      relationshipLabel: asText(relationship?.label),
    };
  });
}

export async function loadPersonFamilyLinks(
  organizationId: string,
  personId: string,
): Promise<FamilyLink[]> {
  const { data: links, error: linksError } = await supabaseAdmin
    .from("oh_person_family_links")
    .select("related_person_id, relationship_type_id, source")
    .eq("organization_id", organizationId)
    .eq("person_id", personId)
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (linksError) throw linksError;

  const storedLinks = (links ?? []) as StoredFamilyLinkRow[];
  const validated = await validateFamilyLinks({
    organizationId,
    personId,
    links: storedLinks.map((item) => ({
      personId: asText(item.related_person_id),
      relationshipTypeId: asText(item.relationship_type_id),
    })),
  });
  const sourceByPerson = new Map(
    storedLinks.map((item) => [asText(item.related_person_id), asText(item.source)]),
  );
  return validated.map((item) => {
    const source = sourceByPerson.get(item.personId) || "cadastro";
    return {
      ...item,
      source,
      reciprocal: source.startsWith("reciprocal:"),
    };
  });
}

export async function syncPersonFamilyLinks(input: {
  organizationId: string;
  personId: string;
  links: FamilyLinkInput[];
  source?: string;
}) {
  const validated = await validateFamilyLinks({
    organizationId: input.organizationId,
    personId: input.personId,
    links: input.links,
  });
  const now = new Date().toISOString();

  const { error: deactivateError } = await supabaseAdmin
    .from("oh_person_family_links")
    .update({ active: false, updated_at: now })
    .eq("organization_id", input.organizationId)
    .eq("person_id", input.personId)
    .eq("active", true)
    .not("source", "like", "reciprocal:%");

  if (deactivateError) throw deactivateError;

  if (validated.length === 0) return [];

  const rows = validated.map((item) => ({
    organization_id: input.organizationId,
    person_id: input.personId,
    related_person_id: item.personId,
    relationship_type_id: item.relationshipTypeId,
    source: input.source || "cadastro",
    active: true,
    updated_at: now,
  }));

  const { error: upsertError } = await supabaseAdmin
    .from("oh_person_family_links")
    .upsert(rows, {
      onConflict: "organization_id,person_id,related_person_id",
    });

  if (upsertError) throw upsertError;
  return validated;
}

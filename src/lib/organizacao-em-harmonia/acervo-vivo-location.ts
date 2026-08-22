import { supabaseAdmin } from "@/lib/supabase-admin";

export type AcervoPickupDetails = {
  label: string;
  address: string;
  mapsUrl: string;
};

const FALLBACK: AcervoPickupDetails = {
  label: "Tucxa 1",
  address: "Rua Talvino Egídio de Souza Aranha Júnior, 179 - Jardim Miranda - Campinas/SP - CEP 13034-611",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Rua%20Talvino%20Eg%C3%ADdio%20de%20Souza%20Aranha%20J%C3%BAnior%2C%20179%20-%20Jardim%20Miranda%20-%20Campinas%2FSP%20-%20CEP%2013034-611",
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value: unknown) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function formatAddress(location: Record<string, unknown>) {
  const street = text(location.address);
  const number = text(location.number);
  const complement = text(location.complement);
  const district = text(location.district);
  const city = text(location.city);
  const state = text(location.state);
  const zip = text(location.zip_code);

  const streetLine = [street, number].filter(Boolean).join(", ");
  const cityState = [city, state].filter(Boolean).join("/");
  const parts = [
    streetLine,
    complement,
    district,
    cityState,
    zip ? `CEP ${zip}` : "",
  ].filter(Boolean);

  return parts.join(" - ");
}

export async function getAcervoPickupDetails(
  organizationId: string,
  configuredLabel = "Tucxa 1",
): Promise<AcervoPickupDetails> {
  if (!organizationId) return FALLBACK;

  const { data, error } = await supabaseAdmin
    .from("oh_locations")
    .select("name,address,number,complement,district,city,state,zip_code,is_primary,active")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .order("is_primary", { ascending: false });

  if (error || !data?.length) {
    return {
      ...FALLBACK,
      label: configuredLabel || FALLBACK.label,
    };
  }

  const wanted = normalize(configuredLabel);
  const selected =
    data.find((item) => {
      const name = normalize(item.name);
      return Boolean(wanted) && (name === wanted || name.includes(wanted) || wanted.includes(name));
    }) ??
    data.find((item) => item.is_primary === true) ??
    data[0];

  const selectedRecord = selected as Record<string, unknown>;
  const address = formatAddress(selectedRecord) || FALLBACK.address;
  const label = text(selectedRecord.name) || configuredLabel || FALLBACK.label;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return { label, address, mapsUrl };
}

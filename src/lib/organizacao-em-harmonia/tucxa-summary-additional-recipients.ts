/** Destinatários adicionais dos resumos da Recepção, sem atribuir função/permissão.
 * Chave canônica: número de celular (DDD + número), nunca nome.
 * Configuração em oh_module_settings.settings.pilotReceptionAdditionalRecipients:
 * [{ "phone": "DDDNUMERO", "weekdays": [1], "enabled": true }]
 */
import { supabaseAdmin } from "@/lib/supabase-admin";

type Person = {
  id: string;
  full_name: string | null;
  whatsapp: string | null;
  normalized_whatsapp: string | null;
  active: boolean | null;
};
type Diagnostic = { reason: string; phoneMasked: string };
export type AdditionalReceptionRecipients = { people: Person[]; diagnostics: Diagnostic[] };

export function canonicalTucxaPhone(raw: unknown): string {
  let value = String(raw ?? "").replace(/\D/g, "");
  if (value.startsWith("55") && value.length === 13) value = value.slice(2);
  return value.length === 11 ? value : "";
}

function phoneFor(person: Person): string {
  const normalized = canonicalTucxaPhone(person.normalized_whatsapp);
  const raw = canonicalTucxaPhone(person.whatsapp);
  if (person.normalized_whatsapp && !normalized) return "";
  if (person.whatsapp && !raw) return "";
  if (normalized && raw && normalized !== raw) return "";
  return normalized || raw;
}

export async function additionalReceptionRecipientsForDate(
  organizationId: string,
  date: string,
): Promise<AdditionalReceptionRecipients> {
  const diagnostics: Diagnostic[] = [];
  const { data, error } = await supabaseAdmin.from("oh_module_settings")
    .select("settings").eq("organization_id", organizationId)
    .eq("module_slug", "atendimento-em-harmonia").maybeSingle();
  if (error) throw error;

  const settings = data?.settings && typeof data.settings === "object" && !Array.isArray(data.settings)
    ? data.settings as Record<string, unknown> : {};
  const rules = Array.isArray(settings.pilotReceptionAdditionalRecipients)
    ? settings.pilotReceptionAdditionalRecipients : [];
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const phones = new Set<string>();
  for (const item of rules) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const rule = item as Record<string, unknown>;
    if (rule.enabled === false || !Array.isArray(rule.weekdays) || !rule.weekdays.includes(weekday)) continue;
    const phone = canonicalTucxaPhone(rule.phone);
    if (!phone) {
      diagnostics.push({ reason: "invalid_configured_phone", phoneMasked: "***" });
      continue;
    }
    phones.add(phone);
  }
  if (!phones.size) return { people: [], diagnostics };

  // Varre em páginas para contemplar também os cadastros legados cujo
  // normalized_whatsapp está vazio, sem recorrer a buscas por nome.
  const matches = new Map<string, Person[]>();
  let start = 0;
  const pageSize = 500;
  for (;;) {
    const { data: batch, error: peopleError } = await supabaseAdmin.from("oh_people")
      .select("id,full_name,whatsapp,normalized_whatsapp,active")
      .eq("organization_id", organizationId).eq("active", true)
      .order("id").range(start, start + pageSize - 1);
    if (peopleError) throw peopleError;
    for (const person of (batch ?? []) as Person[]) {
      const raw = canonicalTucxaPhone(person.whatsapp);
      const normalized = canonicalTucxaPhone(person.normalized_whatsapp);
      if ((person.whatsapp && !raw) || (person.normalized_whatsapp && !normalized) ||
          (raw && normalized && raw !== normalized)) {
        if (phones.has(raw) || phones.has(normalized)) {
          diagnostics.push({ reason: "phone_fields_conflict", phoneMasked: `***${(raw || normalized).slice(-4)}` });
        }
        continue;
      }
      const phone = phoneFor(person);
      if (phones.has(phone)) matches.set(phone, [...(matches.get(phone) ?? []), person]);
    }
    if (!batch || batch.length < pageSize) break;
    start += pageSize;
  }

  const people: Person[] = [];
  for (const phone of phones) {
    const rows = matches.get(phone) ?? [];
    if (rows.length === 1) people.push(rows[0]);
    else diagnostics.push({
      reason: rows.length ? "duplicate_canonical_whatsapp" : "configured_phone_not_found",
      phoneMasked: `***${phone.slice(-4)}`,
    });
  }
  return { people, diagnostics };
}

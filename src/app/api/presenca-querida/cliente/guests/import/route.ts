import { NextResponse } from "next/server";
import { getPresencaAuthContext } from "@/lib/presenca-auth";
import { buildRelationshipLine } from "@/lib/presenca-daniela50";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type ImportBody = {
  csv?: string;
};

type CsvRow = Record<string, string>;

type PendingPrimaryLink = {
  guestId: string;
  primaryName: string;
  lineNumber: number;
};

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function parseCsv(csv: string) {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const headers = parseCsvLine(lines[0] ?? "").map(normalizeKey);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return headers.reduce<CsvRow>((acc, header, index) => {
      acc[header] = cells[index] ?? "";
      return acc;
    }, {});
  });
}

function asNumber(value: string, fallback: number) {
  const digits = value.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : fallback;
}

function asBoolean(value: string, fallback: boolean) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (["sim", "s", "true", "1", "yes", "recebe"].includes(normalized)) return true;
  if (["nao", "n", "false", "0", "no", "vinculado"].includes(normalized)) return false;
  return fallback;
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

async function findPrimaryGuestId(eventId: string, primaryName: string, nameToId: Map<string, string>) {
  const normalized = normalizeName(primaryName);
  const localId = nameToId.get(normalized);
  if (localId) return localId;

  const { data } = await supabaseAdmin
    .from("pq_guests")
    .select("id")
    .eq("event_id", eventId)
    .ilike("full_name", primaryName)
    .maybeSingle();

  return data?.id ?? null;
}

export async function POST(request: Request) {
  const auth = await getPresencaAuthContext(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as ImportBody;
  const csv = String(body.csv ?? "").trim();
  if (!csv) return NextResponse.json({ error: "Envie o conteúdo CSV para importar." }, { status: 400 });

  const rows = parseCsv(csv);
  let imported = 0;
  let skipped = 0;
  let linked = 0;
  const errors: string[] = [];
  const nameToId = new Map<string, string>();
  const pendingLinks: PendingPrimaryLink[] = [];

  for (const [index, row] of rows.entries()) {
    const lineNumber = index + 2;
    const fullName = String(row.nome ?? row.full_name ?? "").trim();
    if (!fullName) {
      skipped += 1;
      errors.push(`Linha ${lineNumber}: nome não informado.`);
      continue;
    }

    const whatsapp = normalizePhone(row.whatsapp ?? "");
    const primaryName = String(row.convidado_principal ?? row.primary_guest ?? row.responsavel_convite ?? "").trim();
    const receivesInvite = asBoolean(row.recebe_convite ?? row.is_invite_recipient ?? "", !primaryName);

    const existingQuery = supabaseAdmin
      .from("pq_guests")
      .select("id")
      .eq("event_id", auth.context.eventId)
      .eq("full_name", fullName);

    const { data: existing, error: existingError } = whatsapp
      ? await existingQuery.eq("whatsapp", whatsapp).maybeSingle()
      : await existingQuery.maybeSingle();

    if (existingError) {
      skipped += 1;
      errors.push(`Linha ${lineNumber}: ${existingError.message}`);
      continue;
    }

    if (existing?.id) {
      skipped += 1;
      nameToId.set(normalizeName(fullName), existing.id);
      if (primaryName) pendingLinks.push({ guestId: existing.id, primaryName, lineNumber });
      continue;
    }

    const relationshipLabel = String(row.parentesco ?? "").trim() || null;
    const relationshipContext = String(row.origem_relacionamento ?? row.relacionamento ?? "").trim() || null;
    const payload = {
      event_id: auth.context.eventId,
      full_name: fullName,
      whatsapp: whatsapp || null,
      email: String(row.email ?? "").trim() || null,
      group_name: String(row.grupo ?? row.group_name ?? "").trim() || null,
      relationship_type: relationshipLabel ? "parentesco" : relationshipContext ? "relacionamento" : null,
      relationship_label: relationshipLabel,
      relationship_context: relationshipContext,
      guest_status: "pendente",
      adults_count: asNumber(row.adultos ?? row.adults_count ?? "", 1),
      children_count: asNumber(row.criancas ?? row.children_count ?? "", 0),
      companions_allowed: 0,
      companions_confirmed_count: 0,
      primary_guest_id: null,
      household_label: String(row.grupo_familiar ?? row.household_label ?? "").trim() || null,
      is_invite_recipient: receivesInvite,
      dietary_notes: String(row.observacao_alimentar ?? row.dietary_notes ?? "").trim() || null,
      notes: String(row.observacoes ?? row.notes ?? "").trim() || null,
      is_active: true,
    };

    const { data, error } = await supabaseAdmin.from("pq_guests").insert({
      ...payload,
      invite_context: buildRelationshipLine(payload),
    }).select("id").single();

    if (error) {
      skipped += 1;
      errors.push(`Linha ${lineNumber}: ${error.message}`);
      continue;
    }

    imported += 1;
    nameToId.set(normalizeName(fullName), data.id);
    if (primaryName) pendingLinks.push({ guestId: data.id, primaryName, lineNumber });
  }

  for (const item of pendingLinks) {
    const primaryId = await findPrimaryGuestId(auth.context.eventId, item.primaryName, nameToId);
    if (!primaryId) {
      errors.push(`Linha ${item.lineNumber}: convidado principal "${item.primaryName}" não localizado.`);
      continue;
    }

    if (primaryId === item.guestId) continue;

    const { error } = await supabaseAdmin
      .from("pq_guests")
      .update({ primary_guest_id: primaryId, is_invite_recipient: false })
      .eq("id", item.guestId)
      .eq("event_id", auth.context.eventId);

    if (error) {
      errors.push(`Linha ${item.lineNumber}: ${error.message}`);
      continue;
    }

    linked += 1;
  }

  return NextResponse.json({ ok: true, imported, skipped, linked, errors });
}

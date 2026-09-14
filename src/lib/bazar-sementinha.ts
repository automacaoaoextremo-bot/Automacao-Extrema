import { cookies } from "next/headers";
import { createHmac, randomUUID } from "crypto";
import QRCode from "qrcode";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const LEGACY_BAZAR_EVENT_SLUG = "bazar-sementinha-2026-07-04";
export const BAZAR_CLIENT_EMAIL = "bazardosementinha@gmail.com";
export const BAZAR_PIX_KEY = "58392598000191";
export const BAZAR_PIX_RECEIVER = "SEMENTINHA DO TUCXA";
export const BAZAR_PIX_CITY = "CAMPINAS";

export type BazarEvent = {
  id: string;
  client_name: string;
  name: string;
  slug: string;
  event_date: string;
  status: string;
  is_public?: boolean;
  source_event_id?: string | null;
  pix_key?: string | null;
  pix_receiver?: string | null;
  pix_city?: string | null;
  primary_color?: string | null;
  accent_color?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  require_corrente_identification?: boolean;
};

export type BazarItemInput = {
  kind: "bazar" | "menu";
  name: string;
  quantity: number;
  unitPrice: number;
  categoryPath?: string | null;
  sourceId?: string | null;
};

export type BazarOrderInput = {
  clientName: string;
  whatsapp?: string | null;
  attemptId?: string | null;
  notes?: string | null;
  items: BazarItemInput[];
  eventId?: string | null;
  isCorrente?: boolean | null;
};

export type PaymentInput = {
  clientId?: string | null;
  orderIds: string[];
  method: "pix" | "credito" | "debito" | "dinheiro";
  amount: number;
  notes?: string | null;
  eventId?: string | null;
};

export type ConfigKind = "price" | "category" | "menu";

export function normalizeClientName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

export function formatBazarDate(value?: string | null) {
  if (!value) return "";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export function parseMoney(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const normalized = value.replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function orderTotal(items: BazarItemInput[]) {
  return items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
}

export function orderSignature(input: BazarOrderInput) {
  const normalizedItems = [...input.items]
    .map((item) => ({
      kind: item.kind,
      name: item.name.trim(),
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      categoryPath: item.categoryPath?.trim() || "",
    }))
    .sort((a, b) => `${a.kind}|${a.name}|${a.unitPrice}|${a.categoryPath}`.localeCompare(`${b.kind}|${b.name}|${b.unitPrice}|${b.categoryPath}`));

  return JSON.stringify({
    client: normalizeClientName(input.clientName),
    total: orderTotal(input.items).toFixed(2),
    items: normalizedItems,
  });
}

export function makeOrderCode() {
  return randomUUID().slice(0, 8).toUpperCase();
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function findEventBySelector(selector: string) {
  const query = supabaseAdmin.from("bazar_events").select("*");
  const result = looksLikeUuid(selector)
    ? await query.eq("id", selector).maybeSingle()
    : await query.eq("slug", selector).maybeSingle();

  if (result.error) throw result.error;
  return (result.data || null) as BazarEvent | null;
}

export async function getBazarEvent(selector?: string | null): Promise<BazarEvent> {
  const requested = String(selector || "").trim();
  if (requested) {
    const selected = await findEventBySelector(requested);
    if (!selected) throw new Error("Evento do Bazar Sementinha não encontrado.");
    return selected;
  }

  // A coluna is_public é criada pela evolução multi-eventos. O fallback mantém
  // compatibilidade durante a janela entre o deploy do código e a aplicação da migration.
  const publicResult = await supabaseAdmin
    .from("bazar_events")
    .select("*")
    .eq("is_public", true)
    .order("event_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!publicResult.error && publicResult.data) {
    return publicResult.data as BazarEvent;
  }

  const activeResult = await supabaseAdmin
    .from("bazar_events")
    .select("*")
    .eq("status", "ativo")
    .order("event_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!activeResult.error && activeResult.data) {
    return activeResult.data as BazarEvent;
  }

  const legacy = await findEventBySelector(LEGACY_BAZAR_EVENT_SLUG);
  if (legacy) return legacy;

  throw new Error("Evento Bazar do Sementinha não encontrado. Rode a migration/SQL do Bazar no Supabase.");
}

export function getBazarEventSelectorFromRequest(request: Request, body?: Record<string, unknown> | null) {
  const url = new URL(request.url);
  const querySelector = url.searchParams.get("evento") || url.searchParams.get("eventId") || url.searchParams.get("event");
  const bodySelector = body ? String(body.eventId || body.evento || body.event || "").trim() : "";
  return bodySelector || querySelector || null;
}

export async function getBazarEventFromRequest(request: Request, body?: Record<string, unknown> | null) {
  return getBazarEvent(getBazarEventSelectorFromRequest(request, body));
}

export async function buildPixCopyPaste(amount: number, txid: string) {
  const value = Math.max(0, Number(amount || 0)).toFixed(2);
  const merchantName = BAZAR_PIX_RECEIVER.normalize("NFD").replace(/[\u0300-\u036f]/g, "").slice(0, 25);
  const city = BAZAR_PIX_CITY.normalize("NFD").replace(/[\u0300-\u036f]/g, "").slice(0, 15);
  const safeTxid = txid.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "BAZAR";

  const tlv = (id: string, content: string) => `${id}${String(content.length).padStart(2, "0")}${content}`;
  const gui = tlv("00", "br.gov.bcb.pix");
  const key = tlv("01", onlyDigits(BAZAR_PIX_KEY));
  const desc = tlv("02", "Bazar Sementinha");
  const merchantAccount = tlv("26", gui + key + desc);
  const additional = tlv("62", tlv("05", safeTxid));
  const payloadWithoutCrc =
    tlv("00", "01") +
    merchantAccount +
    tlv("52", "0000") +
    tlv("53", "986") +
    tlv("54", value) +
    tlv("58", "BR") +
    tlv("59", merchantName) +
    tlv("60", city) +
    additional +
    "6304";

  return `${payloadWithoutCrc}${crc16(payloadWithoutCrc)}`;
}

export async function buildPixQrDataUrl(amount: number, txid: string) {
  const payload = await buildPixCopyPaste(amount, txid);
  const dataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 260 });
  return { payload, dataUrl };
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export async function getSessionToken() {
  const jar = await cookies();
  return jar.get("bazar_sementinha_session")?.value || null;
}

export function getRequestSessionToken(request?: Request) {
  if (!request) return null;

  const authorization = request.headers.get("authorization") || "";
  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  const headerToken = request.headers.get("x-bazar-session");
  if (headerToken) return headerToken.trim();

  const cookieHeader = request.headers.get("cookie") || "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("bazar_sementinha_session="));

  if (!cookie) return null;
  return decodeURIComponent(cookie.split("=").slice(1).join("="));
}

export function signSession(email: string) {
  const secret = process.env.BAZAR_SEMENTINHA_AUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "bazar-sementinha-dev";
  const exp = Date.now() + 1000 * 60 * 60 * 12;
  const payload = `${email}|${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}|${sig}`).toString("base64url");
}

export function verifySession(token: string | null) {
  if (!token) return false;
  const secret = process.env.BAZAR_SEMENTINHA_AUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "bazar-sementinha-dev";
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [email, expRaw, sig] = decoded.split("|");
    const payload = `${email}|${expRaw}`;
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    return email === BAZAR_CLIENT_EMAIL && sig === expected && Number(expRaw) > Date.now();
  } catch {
    return false;
  }
}

export class BazarUnauthorizedError extends Error {
  constructor() {
    super("Acesso não autorizado.");
    this.name = "BazarUnauthorizedError";
  }
}

export async function isBazarSessionValid(request?: Request) {
  const requestToken = getRequestSessionToken(request);
  if (verifySession(requestToken)) return true;

  const cookieToken = await getSessionToken();
  return verifySession(cookieToken);
}

export async function requireBazarSession(request?: Request) {
  const valid = await isBazarSessionValid(request);
  if (!valid) {
    throw new BazarUnauthorizedError();
  }
}

export function sessionErrorStatus(error: unknown) {
  return error instanceof BazarUnauthorizedError ? 401 : 500;
}

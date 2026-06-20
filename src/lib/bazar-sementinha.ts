import { cookies } from "next/headers";
import { createHmac, randomUUID } from "crypto";
import QRCode from "qrcode";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const BAZAR_EVENT_SLUG = "bazar-sementinha-2026-07-04";
export const BAZAR_CLIENT_EMAIL = "bazardosementinha@gmail.com";
export const BAZAR_PIX_KEY = "58.392.598/0001-91";
export const BAZAR_PIX_RECEIVER = "SEMENTINHA DO TUCXA";
export const BAZAR_PIX_CITY = "CAMPINAS";

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
};

export type PaymentInput = {
  clientId?: string | null;
  orderIds: string[];
  method: "pix" | "credito" | "debito" | "dinheiro";
  amount: number;
  notes?: string | null;
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

export async function getBazarEvent() {
  const { data, error } = await supabaseAdmin
    .from("bazar_events")
    .select("*")
    .eq("slug", BAZAR_EVENT_SLUG)
    .single();

  if (error || !data) {
    throw new Error("Evento Bazar do Sementinha não encontrado. Rode o SQL de criação/seed no Supabase.");
  }

  return data;
}

export async function buildPixCopyPaste(amount: number, txid: string) {
  const value = Math.max(0, Number(amount || 0)).toFixed(2);
  const merchantName = BAZAR_PIX_RECEIVER.normalize("NFD").replace(/[\u0300-\u036f]/g, "").slice(0, 25);
  const city = BAZAR_PIX_CITY.normalize("NFD").replace(/[\u0300-\u036f]/g, "").slice(0, 15);
  const safeTxid = txid.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "BAZAR";

  const tlv = (id: string, content: string) => `${id}${String(content.length).padStart(2, "0")}${content}`;
  const gui = tlv("00", "br.gov.bcb.pix");
  const key = tlv("01", BAZAR_PIX_KEY);
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

export async function requireBazarSession() {
  const token = await getSessionToken();
  if (!verifySession(token)) {
    throw new Error("Acesso não autorizado.");
  }
}

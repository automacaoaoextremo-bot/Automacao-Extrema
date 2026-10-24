import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const LU_COOKIE = "ae_lu_preview";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 3;

function settings() {
  const code = process.env.MEMORIAS_LU_PREVIEW_CODE ?? "";
  const secret = process.env.MEMORIAS_LU_SESSION_SECRET ?? "";
  if (code.length < 8 || secret.length < 32) return null;
  return { code, secret };
}

export function luPreviewConfigured(): boolean {
  return settings() !== null;
}

export function verifyLuPreviewCode(submitted: string): boolean {
  const config = settings();
  if (!config) return false;
  const a = createHash("sha256").update(submitted).digest();
  const b = createHash("sha256").update(config.code).digest();
  return timingSafeEqual(a, b);
}

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createLuPreviewSession(): string {
  const config = settings();
  if (!config) throw new Error("Homologação não configurada.");
  const payload = `v1.${Math.floor(Date.now() / 1000)}`;
  return `${payload}.${signature(payload, config.secret)}`;
}

export function isLuPreviewSessionValid(value?: string): boolean {
  const config = settings();
  if (!config || !value) return false;
  const [version, issued, supplied, extra] = value.split(".");
  if (version !== "v1" || !issued || !supplied || extra || !/^\d+$/.test(issued) || !/^[a-f0-9]{64}$/.test(supplied)) return false;
  const issuedAt = Number(issued);
  const current = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(issuedAt) || issuedAt > current + 60 || current - issuedAt > MAX_AGE_SECONDS) return false;
  const correct = signature(`${version}.${issued}`, config.secret);
  return timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(correct, "hex"));
}

export async function hasLuPreviewAccess(): Promise<boolean> {
  const cookieStore = await cookies();
  return isLuPreviewSessionValid(cookieStore.get(LU_COOKIE)?.value);
}

export const LU_COOKIE_MAX_AGE = MAX_AGE_SECONDS;

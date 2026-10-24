import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const LU_COOKIE = "ae_lu_preview";
export const LU_ADMIN_COOKIE = "ae_lu_admin";
export const LU_COOKIE_MAX_AGE = 60 * 60 * 24;

type Role = "reader" | "admin";
const accessCode = () => process.env.MEMORIAS_LU_ACCESS_CODE || process.env.MEMORIAS_LU_PREVIEW_CODE || "";
const adminCode = () => process.env.MEMORIAS_LU_ADMIN_CODE || "";
const secret = () => process.env.MEMORIAS_LU_SESSION_SECRET || "";
const enabled = (role: Role) => (role === "admin" ? adminCode().length >= 12 : accessCode().length >= 8) && secret().length >= 32;
export const luPreviewConfigured = () => enabled("reader");
export const luAdminConfigured = () => enabled("admin");
function equals(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}
export function verifyLuPreviewCode(code: string): boolean { return enabled("reader") && equals(code, accessCode()); }
export function verifyLuAdminCode(code: string): boolean { return enabled("admin") && equals(code, adminCode()); }
function signature(payload: string): string { return createHmac("sha256", secret()).update(payload).digest("hex"); }
export function createLuSession(role: Role): string {
  if (!enabled(role)) throw new Error("Acesso não configurado");
  const payload = `v2.${role}.${Math.floor(Date.now() / 1000)}`;
  return `${payload}.${signature(payload)}`;
}
export function isLuSessionValid(value: string | undefined, role: Role): boolean {
  if (!enabled(role) || !value) return false;
  const match = /^v2\.(reader|admin)\.(\d{10})\.([a-f0-9]{64})$/.exec(value);
  if (!match || match[1] !== role) return false;
  const issued = Number(match[2]); const now = Math.floor(Date.now()/1000);
  if (!Number.isSafeInteger(issued) || issued > now+60 || now-issued > LU_COOKIE_MAX_AGE) return false;
  return equals(match[3], signature(`v2.${role}.${match[2]}`));
}
export async function hasLuPreviewAccess(): Promise<boolean> {
  return isLuSessionValid((await cookies()).get(LU_COOKIE)?.value,"reader");
}
export async function hasLuAdminAccess(): Promise<boolean> {
  return isLuSessionValid((await cookies()).get(LU_ADMIN_COOKIE)?.value,"admin");
}

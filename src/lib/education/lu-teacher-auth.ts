import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { LU_BASE_PATH } from "@/lib/education/lu-pilot";

export const LU_TEACHER_COOKIE = "ae_lu_teacher_v3";
export const LU_TEACHER_MAX_AGE = 60 * 60 * 12;
// Validade mais curta para concluir a primeira troca de senha.
export const LU_FIRST_ACCESS_MAX_AGE = 60 * 15;
export const teacherCookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: LU_BASE_PATH, maxAge: LU_TEACHER_MAX_AGE };

export type LuTeacher = { id: string; name: string; phone_digits: string; email: string | null; password_hash: string; must_change_password: boolean; session_version: number; failed_attempts: number; locked_until: string | null };
const teacherFields = "id,name,phone_digits,email,password_hash,must_change_password,session_version,failed_attempts,locked_until";
const secret = () => process.env.MEMORIAS_LU_SESSION_SECRET || "";
export const normalizeLuPhone = (value: string) => value.replace(/\D/g, "");
export function teacherPasswordHash(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(password, Buffer.from(salt,"hex"),64).toString("hex")}`;
}
export function teacherPasswordValid(password: string, hash: string): boolean {
  const match = /^scrypt\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(hash);
  if (!match) return false;
  const derived = scryptSync(password,Buffer.from(match[1],"hex"),64);
  return timingSafeEqual(derived,Buffer.from(match[2],"hex"));
}
function sign(payload:string) { if(secret().length<32) throw new Error("Segredo da sessão não configurado"); return createHmac("sha256",secret()).update(payload).digest("hex"); }
export function newLuTeacherSession(teacher: Pick<LuTeacher,"id"|"session_version">): string {
  const payload = `t3.${teacher.id}.${teacher.session_version}.${Math.floor(Date.now()/1000)}`;
  return `${payload}.${sign(payload)}`;
}
export async function getLuTeacherSession(): Promise<LuTeacher|null> {
  if(secret().length<32) return null;
  const value = (await cookies()).get(LU_TEACHER_COOKIE)?.value || "";
  const match = /^(t3)\.([0-9a-f-]{36})\.(\d{1,9})\.(\d{10})\.([a-f0-9]{64})$/i.exec(value);
  if(!match) return null;
  const now=Math.floor(Date.now()/1000), issued=Number(match[4]);
  if(issued>now+60 || now-issued>LU_TEACHER_MAX_AGE || issued<=0) return null;
  const expected=sign(`t3.${match[2]}.${match[3]}.${match[4]}`);
  if(!timingSafeEqual(Buffer.from(expected,"hex"),Buffer.from(match[5],"hex"))) return null;
  const {data,error}=await supabaseAdmin.from("ae_education_teachers").select(teacherFields).eq("id",match[2]).eq("project_slug","lu-2026").eq("active",true).maybeSingle();
  if(error||!data||data.session_version!==Number(match[3])) return null;
  if (data.must_change_password && now - issued > LU_FIRST_ACCESS_MAX_AGE) return null;
  return data as LuTeacher;
}
export async function hasLuAdminAccess(): Promise<boolean> {
  const teacher=await getLuTeacherSession(); return !!teacher && !teacher.must_change_password;
}
export async function findLuTeacher(phone:string): Promise<LuTeacher|null> {
  const {data,error}=await supabaseAdmin.from("ae_education_teachers").select(teacherFields).eq("phone_digits",normalizeLuPhone(phone)).eq("project_slug","lu-2026").eq("active",true).maybeSingle();
  if(error) throw error;
  return data as LuTeacher|null;
}
export async function teacherLogin(phone:string,password:string):Promise<{teacher:LuTeacher|null;error:string}> {
  const normalized=normalizeLuPhone(phone);
  if(normalized.length<10||normalized.length>13||password.length>256||!password) return {teacher:null,error:"Dados inválidos"};
  const teacher=await findLuTeacher(normalized);
  if(!teacher) { teacherPasswordValid(password,teacherPasswordHash("irrelevante")); return {teacher:null,error:"Celular ou senha incorretos"}; }
  if(teacher.locked_until && new Date(teacher.locked_until).getTime()>Date.now())return {teacher:null,error:"Muitas tentativas. Tente mais tarde."};
  if(!teacherPasswordValid(password,teacher.password_hash)) {
    const failed=teacher.failed_attempts+1;
    await supabaseAdmin.from("ae_education_teachers").update({failed_attempts: failed>=5?0:failed,locked_until:failed>=5?new Date(Date.now()+15*60000).toISOString():null}).eq("id",teacher.id);
    return {teacher:null,error:"Celular ou senha incorretos"};
  }
  await supabaseAdmin.from("ae_education_teachers").update({failed_attempts:0,locked_until:null}).eq("id",teacher.id);
  return {teacher,error:""};
}

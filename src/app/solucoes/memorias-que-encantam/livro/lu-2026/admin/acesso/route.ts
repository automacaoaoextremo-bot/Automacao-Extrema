import { NextRequest, NextResponse } from "next/server";
import { createLuSession, LU_ADMIN_COOKIE, LU_COOKIE_MAX_AGE, verifyLuAdminCode } from "@/lib/education/lu-preview-auth";
import { LU_BASE_PATH } from "@/lib/education/lu-pilot";
export async function POST(request: NextRequest) {
  const origin=request.headers.get("origin");
  if (origin && origin!==request.nextUrl.origin) return new NextResponse("Origem inválida",{status:403});
  const form=await request.formData(); const code=String(form.get("codigo")||"").slice(0,256);
  if (!verifyLuAdminCode(code)) return NextResponse.redirect(new URL(`${LU_BASE_PATH}/admin?erro=1`,request.url),303);
  const res=NextResponse.redirect(new URL(`${LU_BASE_PATH}/admin`,request.url),303);
  res.cookies.set(LU_ADMIN_COOKIE,createLuSession("admin"),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:LU_BASE_PATH,maxAge:LU_COOKIE_MAX_AGE});
  res.headers.set("Cache-Control","no-store"); return res;
}

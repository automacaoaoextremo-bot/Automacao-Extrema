import { NextRequest, NextResponse } from "next/server";
import { createLuSession, LU_COOKIE, LU_COOKIE_MAX_AGE, verifyLuPreviewCode } from "@/lib/education/lu-preview-auth";
import { LU_BASE_PATH } from "@/lib/education/lu-pilot";
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return new NextResponse("Origem inválida",{status:403});
  const form = await request.formData();
  const code=String(form.get("codigo")||"").slice(0,256);
  if (!verifyLuPreviewCode(code)) return NextResponse.redirect(new URL(`${LU_BASE_PATH}?erro=1`,request.url),303);
  const response=NextResponse.redirect(new URL(LU_BASE_PATH,request.url),303);
  response.cookies.set(LU_COOKIE,createLuSession("reader"),{httpOnly:true,secure:process.env.NODE_ENV === "production",sameSite:"lax",path:LU_BASE_PATH,maxAge:LU_COOKIE_MAX_AGE});
  response.headers.set("Cache-Control","no-store");
  return response;
}

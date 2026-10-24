import { NextRequest, NextResponse } from "next/server";
import { createLuPreviewSession, LU_COOKIE, LU_COOKIE_MAX_AGE, verifyLuPreviewCode } from "@/lib/education/lu-preview-auth";
import { LU_BASE_PATH } from "@/lib/education/lu-pilot";

export async function POST(request: NextRequest) {
  // Verificação no servidor: o código nunca é enviado ao navegador via JavaScript.
  const form = await request.formData();
  const code = String(form.get("codigo") ?? "").slice(0, 256);
  if (!verifyLuPreviewCode(code)) {
    return NextResponse.redirect(new URL(`${LU_BASE_PATH}?erro=1`, request.url), { status: 303 });
  }
  const response = NextResponse.redirect(new URL(LU_BASE_PATH, request.url), { status: 303 });
  response.cookies.set(LU_COOKIE, createLuPreviewSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: LU_BASE_PATH,
    maxAge: LU_COOKIE_MAX_AGE,
  });
  return response;
}

import { NextRequest, NextResponse } from "next/server";
import { LU_COOKIE } from "@/lib/education/lu-preview-auth";
import { LU_BASE_PATH } from "@/lib/education/lu-pilot";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL(LU_BASE_PATH, request.url), { status: 303 });
  response.cookies.set(LU_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: LU_BASE_PATH,
    maxAge: 0,
  });
  return response;
}

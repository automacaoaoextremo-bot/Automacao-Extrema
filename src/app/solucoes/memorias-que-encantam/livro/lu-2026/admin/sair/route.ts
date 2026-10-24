import { NextRequest, NextResponse } from "next/server";
import { LU_ADMIN_COOKIE } from "@/lib/education/lu-preview-auth";
import { LU_BASE_PATH } from "@/lib/education/lu-pilot";
export async function POST(request:NextRequest) {
  const res=NextResponse.redirect(new URL(`${LU_BASE_PATH}/admin`,request.url),303);
  res.cookies.set(LU_ADMIN_COOKIE,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:LU_BASE_PATH,maxAge:0});return res;
}

import { NextRequest, NextResponse } from "next/server";
import { LU_TEACHER_COOKIE,teacherCookieOptions } from "@/lib/education/lu-teacher-auth";
import { LU_BASE_PATH } from "@/lib/education/lu-pilot";
export async function POST(request:NextRequest) {
 if(request.headers.get("origin")!==request.nextUrl.origin)return new NextResponse("Origem inválida",{status:403});
 const res=NextResponse.redirect(new URL(LU_BASE_PATH,request.url),303);
 res.cookies.set(LU_TEACHER_COOKIE,"",{...teacherCookieOptions,maxAge:0});return res;
}

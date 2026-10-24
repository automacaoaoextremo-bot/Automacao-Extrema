import { NextRequest, NextResponse } from "next/server";
import { teacherLogin, newLuTeacherSession, LU_TEACHER_COOKIE, teacherCookieOptions } from "@/lib/education/lu-teacher-auth";
import { LU_BASE_PATH } from "@/lib/education/lu-pilot";
export async function POST(req:NextRequest) {
  if(req.headers.get("origin")!==req.nextUrl.origin)return new NextResponse("Origem inválida",{status:403});
  try {
    const form=await req.formData();
    const {teacher}=await teacherLogin(String(form.get("telefone")||"").slice(0,50),String(form.get("senha")||"").slice(0,256));
    if(!teacher)return NextResponse.redirect(new URL(`${LU_BASE_PATH}/admin?erro=1`,req.url),303);
    const target=teacher.must_change_password?"/admin/trocar-senha":"/admin";
    const res=NextResponse.redirect(new URL(`${LU_BASE_PATH}${target}`,req.url),303);
    res.cookies.set(LU_TEACHER_COOKIE,newLuTeacherSession(teacher),teacherCookieOptions);
    res.headers.set("Cache-Control","no-store");return res;
  } catch {return NextResponse.redirect(new URL(`${LU_BASE_PATH}/admin?erro=2`,req.url),303);}
}

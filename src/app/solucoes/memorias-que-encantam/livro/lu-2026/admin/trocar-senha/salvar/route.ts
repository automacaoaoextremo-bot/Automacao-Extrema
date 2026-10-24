import { NextRequest,NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { LU_BASE_PATH } from "@/lib/education/lu-pilot";
import { getLuTeacherSession,teacherPasswordHash,teacherPasswordValid,newLuTeacherSession,LU_TEACHER_COOKIE,teacherCookieOptions } from "@/lib/education/lu-teacher-auth";
export async function POST(req:NextRequest){
 if(req.headers.get("origin")!==req.nextUrl.origin)return new NextResponse("Origem inválida",{status:403});
 const teacher=await getLuTeacherSession();
 if(!teacher)return NextResponse.redirect(new URL(`${LU_BASE_PATH}/admin`,req.url),303);
 const form=await req.formData();
 const current=String(form.get("atual")||"");const next=String(form.get("nova")||"");const confirm=String(form.get("confirmar")||"");const name=String(form.get("nome")||"").trim().slice(0,120);const email=String(form.get("email")||"").trim().toLowerCase().slice(0,200);
 const invalid=!teacherPasswordValid(current,teacher.password_hash)||next!==confirm||next.length<10||next.length>128||next==="12345678"||next===current||!/[A-Za-z]/.test(next)||!/[0-9]/.test(next)||!name||form.get("aceite")!=="sim"||(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
 if(invalid)return NextResponse.redirect(new URL(`${LU_BASE_PATH}/admin/trocar-senha?erro=1`,req.url),303);
 const nextVersion=teacher.session_version+1;
 const {error}=await supabaseAdmin.from("ae_education_teachers").update({password_hash:teacherPasswordHash(next),must_change_password:false,session_version:nextVersion,name,email:email||null,privacy_accepted_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",teacher.id).eq("session_version",teacher.session_version);
 if(error)return NextResponse.redirect(new URL(`${LU_BASE_PATH}/admin/trocar-senha?erro=2`,req.url),303);
 const res=NextResponse.redirect(new URL(`${LU_BASE_PATH}/admin`,req.url),303);
 res.cookies.set(LU_TEACHER_COOKIE,newLuTeacherSession({id:teacher.id,session_version:nextVersion}),teacherCookieOptions);
 res.headers.set("Cache-Control","no-store");return res;
}

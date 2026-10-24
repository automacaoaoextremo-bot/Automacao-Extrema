import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLuTeacherSession } from "@/lib/education/lu-teacher-auth";
import { LU_BASE_PATH } from "@/lib/education/lu-pilot";
import { LuHeader } from "@/components/education/lu-header";
import { LuCuration } from "@/components/education/lu-curation";
import { LuTeacherLoginForm } from "@/components/education/lu-teacher-login";
import "../lu-music.css";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Professoras — Livro Musical da Lu",robots:{index:false,follow:false}};
type Props={searchParams:Promise<{erro?:string}>};
export default async function Page({searchParams}:Props){
 const teacher=await getLuTeacherSession();
 if(teacher?.must_change_password)redirect(`${LU_BASE_PATH}/admin/trocar-senha`);
 if(teacher)return <LuCuration/>;
 const {erro}=await searchParams;
 return <main className="lu-root lu-book"><LuHeader login/><div className="lu-container"><section className="lu-teacher-panel"><span className="lu-eyebrow">🔐 Área das professoras</span><h1>Acesse a curadoria</h1><p>Utilize seu celular cadastrado e sua senha pessoal para escolher as gravações da turma.</p><LuTeacherLoginForm erro={erro}/><p className="lu-recovery">Esqueceu sua senha? Solicite ao responsável pelo projeto a redefinição de acesso.</p></section></div></main>;
}

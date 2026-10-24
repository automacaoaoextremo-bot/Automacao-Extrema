import { redirect } from "next/navigation";
import { getLuTeacherSession } from "@/lib/education/lu-teacher-auth";
import { LU_BASE_PATH } from "@/lib/education/lu-pilot";
import { LuHeader } from "@/components/education/lu-header";
import "../../lu-music.css";
export const dynamic="force-dynamic";
type Props={searchParams:Promise<{erro?:string}>};
export default async function TrocarSenha({searchParams}:Props){
 const teacher=await getLuTeacherSession();if(!teacher)redirect(`${LU_BASE_PATH}/admin`);
 if(!teacher.must_change_password)redirect(`${LU_BASE_PATH}/admin`);
 const {erro}=await searchParams;
 return <main className="lu-root lu-book"><LuHeader admin/><div className="lu-container"><section className="lu-teacher-panel"><h1>Primeiro acesso</h1><p>Confirme seus dados e escolha uma senha pessoal para continuar.</p><form className="lu-teacher-form" method="post" action={`${LU_BASE_PATH}/admin/trocar-senha/salvar`}>
 <label>Nome<input type="text" name="nome" defaultValue={teacher.name} minLength={2} required maxLength={120}/></label>
 <label>Celular / WhatsApp<input type="text" value={teacher.phone_digits} readOnly/></label>
 <label>E-mail (opcional)<input type="email" name="email" maxLength={200} defaultValue={teacher.email||""}/></label>
 <label>Senha temporária<input type="password" name="atual" autoComplete="current-password" required/></label>
 <label>Nova senha (10+ caracteres, letras e números)<input type="password" name="nova" minLength={10} maxLength={128} autoComplete="new-password" required/></label>
 <label>Confirmar nova senha<input type="password" name="confirmar" minLength={10} maxLength={128} autoComplete="new-password" required/></label>
 <label className="lu-consent"><input type="checkbox" name="aceite" value="sim" required/> Confirmo meus dados e concordo com seu uso para autenticação e administração deste projeto educacional. Posso solicitar esclarecimentos ou correção ao responsável pela solução.</label>
 {erro&&<p role="alert" className="lu-alert">Não foi possível atualizar. Confira a senha atual, os dados e a nova senha.</p>}
 <button className="lu-button lu-button-primary" type="submit">Confirmar e continuar</button></form></section></div></main>;
}

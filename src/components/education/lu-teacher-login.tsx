"use client";
import { useState } from "react";
import { LU_BASE_PATH } from "@/lib/education/lu-pilot";
export function LuTeacherLoginForm({erro}:{erro?:string}) {
 const [visible,setVisible]=useState(false);
 return <form className="lu-teacher-form" action={`${LU_BASE_PATH}/admin/entrar`} method="post">
 <label>Celular / WhatsApp<input name="telefone" type="tel" autoComplete="username" inputMode="tel" required placeholder="(19) 99999-9999" maxLength={30}/></label>
 <label>Senha<div className="lu-password-row"><input name="senha" type={visible?"text":"password"} required autoComplete="current-password" maxLength={256} placeholder="Digite sua senha"/><button type="button" onClick={()=>setVisible(v=>!v)} aria-label={visible?"Ocultar senha":"Mostrar senha"}>{visible?"Ocultar":"Mostrar"}</button></div></label>
 {erro&&<p className="lu-alert" role="alert">{erro==="2"?"Não foi possível entrar neste momento. Confira a configuração de acesso.":"Celular ou senha incorretos. Após várias tentativas, aguarde 15 minutos."}</p>}
 <button className="lu-button lu-button-primary" type="submit">Entrar no Livro Musical</button>
 </form>;
}

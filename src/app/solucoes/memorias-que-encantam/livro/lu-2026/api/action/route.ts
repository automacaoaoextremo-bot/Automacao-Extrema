import { NextRequest,NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hasLuAdminAccess } from "@/lib/education/lu-preview-auth";
export async function POST(req:NextRequest){
 if(!(await hasLuAdminAccess()))return NextResponse.json({error:"Não autorizado"},{status:401});
 if(req.headers.get("origin")!==req.nextUrl.origin)return NextResponse.json({error:"Origem inválida"},{status:403});
 try{ const {id,action}=await req.json() as {id:string;action:string};
  if(!/^[0-9a-f-]{36}$/i.test(id)||!(["choose","hide","restore"].includes(action)))return NextResponse.json({error:"Operação inválida"},{status:400});
  const fn=action==="choose"?"ae_education_choose_audio":action==="hide"?"ae_education_hide_audio":"ae_education_restore_audio";
  const {error}=await supabaseAdmin.rpc(fn,{p_id:id});if(error)return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:"Não foi possível aplicar a alteração"},{status:500});}
}

import { NextRequest,NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hasLuAdminAccess } from "@/lib/education/lu-preview-auth";
import { LU_BUCKET,LU_PROJECT } from "@/lib/education/lu-storage";
export async function POST(req:NextRequest){
 if(!(await hasLuAdminAccess()))return NextResponse.json({error:"Não autorizado"},{status:401});
 if(req.headers.get("origin")!==req.nextUrl.origin)return NextResponse.json({error:"Origem inválida"},{status:403});
 try{
  const {id}=await req.json() as {id:string};
  if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:"Identificador inválido"},{status:400});
  const {data,error}=await supabaseAdmin.from("ae_education_audio_versions").select("id,storage_path,status").eq("id",id).eq("project_slug",LU_PROJECT).single();
  if(error||!data||data.status!=="pending")return NextResponse.json({error:"Envio inválido"},{status:400});
  // Verifica objeto com API Storage antes de marcar disponível.
  const directory=data.storage_path.substring(0,data.storage_path.lastIndexOf("/"));
  const filename=data.storage_path.substring(data.storage_path.lastIndexOf("/")+1);
  const {data:files,error:listError}=await supabaseAdmin.storage.from(LU_BUCKET).list(directory,{search:filename,limit:10});
  if(listError||!files?.some(item=>item.name===filename))return NextResponse.json({error:"Arquivo ainda não encontrado no armazenamento"},{status:409});
  const {error:updateError}=await supabaseAdmin.from("ae_education_audio_versions").update({status:"available"}).eq("id",id).eq("status","pending");
  if(updateError)throw updateError;
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:"Falha ao finalizar arquivo"},{status:500});}
}

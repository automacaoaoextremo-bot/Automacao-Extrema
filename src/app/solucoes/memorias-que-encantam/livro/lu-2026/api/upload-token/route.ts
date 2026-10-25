import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hasLuAdminAccess } from "@/lib/education/lu-preview-auth";
import { getLuProject,LU_BUCKET,LU_PROJECT,songValid } from "@/lib/education/lu-storage";
export const dynamic="force-dynamic";
const formats:Record<string,string>={"audio/mp4":"m4a","audio/x-m4a":"m4a","audio/ogg":"ogg","audio/mpeg":"mp3","audio/wav":"wav","audio/x-wav":"wav","audio/webm":"webm","audio/aac":"aac"};
export async function POST(req:NextRequest){
 if(!(await hasLuAdminAccess()))return NextResponse.json({error:"Não autorizado"},{status:401});
 if(req.headers.get("origin")!==req.nextUrl.origin)return NextResponse.json({error:"Origem inválida"},{status:403});
 try{
  const {trackId,fileName,fileType,fileSize,sourceType}=await req.json() as {trackId:string;fileName:string;fileType:string;fileSize:number;sourceType:string};
  if(!songValid(trackId)||!(sourceType==="celular"||sourceType==="whatsapp"||sourceType==="nova"))return NextResponse.json({error:"Música ou origem inválida"},{status:400});
  const ext=formats[fileType];if(!ext||!Number.isInteger(fileSize)||fileSize<=0||fileSize>25*1024*1024||!fileName||fileName.length>200)return NextResponse.json({error:"Arquivo inválido (áudio até 25 MB)"},{status:400});
  const project=await getLuProject();if(!project.media_authorized)return NextResponse.json({error:"A escola ainda não autorizou o armazenamento das gravações"},{status:403});
  const id=randomUUID(); const path=`projects/${LU_PROJECT}/songs/${trackId}/${id}.${ext}`;
  const {error:dbError}=await supabaseAdmin.from("ae_education_audio_versions").insert({id,project_slug:LU_PROJECT,track_id:trackId,source_type:sourceType,original_filename:fileName,storage_path:path,mime_type:fileType,file_bytes:fileSize,status:"pending"});
  if(dbError)throw dbError;
  const {data,error}=await supabaseAdmin.storage.from(LU_BUCKET).createSignedUploadUrl(path);
  if(error)throw error;
  const res=NextResponse.json({id,path,token:data.token,bucket:LU_BUCKET,url:process.env.NEXT_PUBLIC_SUPABASE_URL,anonKey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY});res.headers.set("Cache-Control","no-store");return res;
 }catch{return NextResponse.json({error:"Não foi possível preparar o envio. Confira banco, bucket e configuração"},{status:500});}
}

import { NextResponse } from "next/server";
import { hasLuAdminAccess, hasLuPreviewAccess } from "@/lib/education/lu-preview-auth";
import { getLuProject, getLuVersions } from "@/lib/education/lu-storage";
export const dynamic="force-dynamic";
export async function GET() {
 const admin=await hasLuAdminAccess(); const reader=admin||await hasLuPreviewAccess();
 if(!reader)return NextResponse.json({error:"Acesso não autorizado"},{status:401});
 try {const project=await getLuProject(); const showReal=project.media_authorized && (admin || project.family_released);
  const versions=showReal?await getLuVersions(!admin):[];
  const response=NextResponse.json({project,versions:admin?versions:versions.map(({id,track_id,url})=>({id,track_id,url})),admin});
  response.headers.set("Cache-Control","private, no-store"); return response;
 }catch{return NextResponse.json({error:"Configuração de armazenamento pendente"},{status:503});}
}

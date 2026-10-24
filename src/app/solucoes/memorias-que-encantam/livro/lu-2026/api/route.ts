import { NextResponse } from "next/server";
import { hasLuAdminAccess } from "@/lib/education/lu-teacher-auth";
import { getLuProject,getLuVersions } from "@/lib/education/lu-storage";
export const dynamic="force-dynamic";
export async function GET() {
 try {
  const admin=await hasLuAdminAccess();
  const project=await getLuProject();
  const versions=project.media_authorized&&(admin||project.family_released)?await getLuVersions(!admin):[];
  const response=NextResponse.json({project:admin?project:{family_released:project.family_released},versions:admin?versions:versions.map(({id,track_id,url})=>({id,track_id,url})),admin});
  response.headers.set("Cache-Control","private, no-store");return response;
 }catch{return NextResponse.json({error:"Armazenamento em preparação",versions:[],project:{family_released:false}},{status:503,headers:{"Cache-Control":"no-store"}});}
}

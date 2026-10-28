import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { luTracks } from "@/lib/education/lu-pilot";
export const LU_PROJECT = "lu-2026";
export const LU_BUCKET = "education-media-private";
export type Version = { id: string; track_id: string; source_type: string; original_filename: string; storage_path: string; mime_type: string; status: string; is_selected: boolean; created_at: string; url?: string; };
export const songValid=(s:string)=>luTracks.some(t=>t.id===s);
export async function getLuProject() {
 const {data,error}=await supabaseAdmin.from("ae_education_projects").select("slug,title,media_authorized,family_released,illustrations_released").eq("slug",LU_PROJECT).single();
 if(error) throw new Error(`Projeto educacional não inicializado: ${error.message}`);
 return data as {slug:string;title:string;media_authorized:boolean;family_released:boolean;illustrations_released:boolean};
}
export async function getLuVersions(onlyReleased=false):Promise<Version[]> {
 const q=supabaseAdmin.from("ae_education_audio_versions").select("id,track_id,source_type,original_filename,storage_path,mime_type,status,is_selected,created_at").eq("project_slug",LU_PROJECT).neq("status","pending").order("created_at",{ascending:true});
 const {data,error}=await q;if(error)throw new Error(error.message);
 const records=(data||[]) as Version[];
 const visible=onlyReleased?records.filter(v=>v.status==="available"&&v.is_selected):records;
 return await Promise.all(visible.map(async (v)=>{
  if(v.status==="hidden")return {...v,url:undefined};
  const {data:signed,error:signErr}=await supabaseAdmin.storage.from(LU_BUCKET).createSignedUrl(v.storage_path,300);
  if(signErr)return {...v,url:undefined};return {...v,url:signed?.signedUrl};
 }));
}

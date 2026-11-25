import { getPresencaAuthContext } from "@/lib/presenca-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PHOTO_BUCKET, PHOTO_SELECT, UUID, loadPhotoSettings, photoJson, photoLinks, signPhotoRows, type PhotoRow } from "@/lib/presenca-photos";
export const dynamic="force-dynamic";
export async function GET(request:Request){
  const auth=await getPresencaAuthContext(request);if(!auth.ok)return auth.response;
  try{const {event,eventId}=auth.context; const settings=await loadPhotoSettings(eventId);
    if(!settings)return photoJson({name:event.name,eventId,settings:null,photos:[]});
    const page=Math.max(0,Math.min(30,Math.floor(Number(new URL(request.url).searchParams.get("page"))||0)));
    const {data,error,count}=await supabaseAdmin.from("pq_event_photos").select(PHOTO_SELECT,{count:"exact"}).eq("event_id",eventId).in("status",["pending","approved","hidden","deleting"]).order("created_at",{ascending:false}).order("id").range(page*20,page*20+19);
    if(error)throw error;
    const rows=(data??[]) as PhotoRow[];
    const counts=await Promise.all(["pending","approved","hidden"].map(status=>supabaseAdmin.from("pq_event_photos").select("id",{count:"exact",head:true}).eq("event_id",eventId).eq("status",status)));
    if(counts.some(r=>r.error))throw new Error("count");
    return photoJson({name:event.name,eventId,settings:{uploads_open:settings.uploads_open,album_open:settings.album_open},links:photoLinks(event.slug,settings),previewLinks:photoLinks(event.slug,settings,new URL(request.url).origin),photos:await signPhotoRows(rows),total:count??0,counts:{pending:counts[0].count,approved:counts[1].count,hidden:counts[2].count}});
  }catch{return photoJson({error:"Não foi possível carregar as memórias. Confira se o SQL foi aplicado."},503);}
}
export async function PATCH(request:Request){
  const auth=await getPresencaAuthContext(request);if(!auth.ok)return auth.response;
  const {eventId}=auth.context;
  try{const body=await request.json();
    if(body.action==="initialize"){
      const {error}=await supabaseAdmin.from("pq_event_photo_settings").upsert({event_id:eventId},{onConflict:"event_id",ignoreDuplicates:true});if(error)throw error;
      return photoJson({ok:true});
    }
    if(body.action==="settings"){
      const patch:Record<string,boolean>={};if(typeof body.uploads_open==="boolean")patch.uploads_open=body.uploads_open;if(typeof body.album_open==="boolean")patch.album_open=body.album_open;
      if(!Object.keys(patch).length)return photoJson({error:"Nenhuma alteração."},400);
      const {data,error}=await supabaseAdmin.from("pq_event_photo_settings").update(patch).eq("event_id",eventId).select("event_id").maybeSingle();if(error)throw error;if(!data)return photoJson({error:"Inicialize primeiro."},404);return photoJson({ok:true});
    }
    if(!UUID.test(String(body.id??"")))return photoJson({error:"Foto inválida."},400);
    const {data,error}=await supabaseAdmin.from("pq_event_photos").select(PHOTO_SELECT).eq("event_id",eventId).eq("id",body.id).maybeSingle();if(error)throw error;
    const row=data as PhotoRow|null;if(!row||!["pending","approved","hidden","deleting"].includes(row.status))return photoJson({error:"Foto não localizada."},404);
    if(body.action==="delete"){
      // Bloquear publicação durante a exclusão. Se Storage falhar, permitir nova tentativa.
      const hidden=await supabaseAdmin.from("pq_event_photos").update({status:"deleting"}).eq("event_id",eventId).eq("id",row.id).eq("status",row.status).select("id").maybeSingle();if(hidden.error)throw hidden.error;if(!hidden.data)return photoJson({error:"Foto alterada. Atualize a lista."},409);
      const removed=await supabaseAdmin.storage.from(PHOTO_BUCKET).remove([row.object_path]);if(removed.error)throw removed.error;
      const deleted=await supabaseAdmin.from("pq_event_photos").update({status:"deleted",author_name:"",caption:"",share_allowed:false}).eq("event_id",eventId).eq("id",row.id);if(deleted.error)throw deleted.error;
      return photoJson({ok:true});
    }
    if(row.status==="deleting")return photoJson({error:"Exclusão pendente. Tente excluir novamente."},409);
    const status=body.action==="approve"?"approved":body.action==="hide"?"hidden":body.action==="pending"?"pending":null;
    if(!status)return photoJson({error:"Ação inválida."},400);
    if(status==="approved"&&!row.share_allowed)return photoJson({error:"Esta foto foi autorizada apenas para a organização."},409);
    const updated=await supabaseAdmin.from("pq_event_photos").update({status}).eq("event_id",eventId).eq("id",row.id).eq("status",row.status).select("id").maybeSingle();if(updated.error)throw updated.error;if(!updated.data)return photoJson({error:"Foto alterada. Atualize a lista."},409);
    return photoJson({ok:true});
  }catch{return photoJson({error:"Não foi possível concluir a operação."},503);}
}

import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PHOTO_BUCKET, PHOTO_MAX_BYTES, PHOTO_SELECT, UUID, loadPhotoSettings, photoJson, signPhotoRows, type PhotoRow } from "@/lib/presenca-photos";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Params = { params: Promise<{ slug: string }> };
async function access(request: Request, slug: string, album = false) {
  const token = request.headers.get("x-pq-photo-key") || "";
  if (!UUID.test(token)) return null;
  const { data: event, error } = await supabaseAdmin.from("pq_events").select("id,name,slug").eq("slug",slug).maybeSingle();
  if (error) throw error;
  if (!event) return null;
  const settings = await loadPhotoSettings(event.id);
  if (!settings || token !== (album ? settings.album_token : settings.upload_token)) return null;
  return { event, settings, token };
}
export async function GET(request: Request, { params }: Params) {
  try {
    const album = new URL(request.url).searchParams.get("mode") === "album";
    const context = await access(request, (await params).slug, album);
    if (!context) return photoJson({ error: "Link inválido. Solicite o link à organização." }, 403);
    const { event, settings } = context;
    if (!album) return photoJson({ name: event.name, open: settings.uploads_open });
    if (!settings.album_open) return photoJson({ name: event.name, open: false, photos: [] });
    const page = Math.max(0, Math.min(30, Number(new URL(request.url).searchParams.get("page")) || 0));
    const offset = Math.floor(page) * 24;
    const { data, error } = await supabaseAdmin.from("pq_event_photos").select(PHOTO_SELECT).eq("event_id",event.id).eq("status","approved").eq("share_allowed",true).order("created_at",{ascending:false}).order("id").range(offset,offset+23);
    if (error) throw error;
    return photoJson({ name:event.name, open:true, photos:await signPhotoRows((data ?? []) as PhotoRow[],true), more:(data ?? []).length===24 });
  } catch { return photoJson({ error: "Não foi possível consultar as memórias. Tente novamente." }, 503); }
}
export async function POST(request: Request, { params }: Params) {
  try {
    const context = await access(request, (await params).slug);
    if (!context || !context.settings.uploads_open) return photoJson({ error: "Envio indisponível para este link." }, 403);
    // O upload passa pela API para validar e retirar metadados antes do Storage.
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 4*1024*1024) return photoJson({ error: "Foto muito grande." },413);
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) return photoJson({error:"Formato inválido."},415);
    const reader=request.body?.getReader();
    if(!reader)return photoJson({error:"Envio vazio."},400);
    const chunks:Uint8Array[]=[];let total=0;
    try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>4*1024*1024){await reader.cancel();return photoJson({error:"Foto muito grande."},413);}chunks.push(value);}}finally{reader.releaseLock();}
    const form=await new Response(new Uint8Array(Buffer.concat(chunks)),{headers:{"Content-Type":request.headers.get("content-type")!}}).formData();
    const file = form.get("photo");
    if (!(file instanceof File) || file.size < 1 || file.size > PHOTO_MAX_BYTES || file.type !== "image/jpeg") return photoJson({error:"Envie uma imagem JPEG de até 3 MB."},400);
    if (form.get("consent") !== "yes") return photoJson({error:"Confirme a autorização de armazenamento."},400);
    const author = String(form.get("author") ?? "").trim().slice(0,80);
    const caption = String(form.get("caption") ?? "").trim().slice(0,240);
    let image: Buffer;
    try {
      const input = Buffer.from(await file.arrayBuffer());
      if (input[0]!==255 || input[1]!==216 || input[2]!==255) throw new Error("JPEG");
      image = await sharp(input,{limitInputPixels:20_000_000,failOn:"warning"}).rotate().resize({width:2400,height:2400,fit:"inside",withoutEnlargement:true}).jpeg({quality:82}).toBuffer();
      if (image.length > PHOTO_MAX_BYTES) throw new Error("size");
    } catch { return photoJson({error:"Não foi possível ler a foto. Escolha outro arquivo JPEG."},400); }
    const id = randomUUID();
    const path = `eventos/${context.event.id}/${id}.jpg`;
    const origin = (request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
    const rate = createHash("sha256").update(`${context.token}:${origin}`).digest("hex");
    const { data: reserved, error: reserveError } = await supabaseAdmin.rpc("pq_reserve_event_photo",{p_event:context.event.id,p_token:context.token,p_id:id,p_size:image.length,p_rate:rate,p_author:author,p_caption:caption,p_share:form.get("share")==="yes"});
    if (reserveError) throw reserveError;
    if (!reserved) return photoJson({error:"Limite temporário ou capacidade do evento atingida. Avise a organização."},429);
    const { error: uploadError } = await supabaseAdmin.storage.from(PHOTO_BUCKET).upload(path,image,{contentType:"image/jpeg",upsert:false,cacheControl:"0"});
    if (!uploadError) {
      const { data, error } = await supabaseAdmin.from("pq_event_photos").update({status:"pending"}).eq("id",id).eq("event_id",context.event.id).eq("status","uploading").select("id").maybeSingle();
      if (!error && data) return photoJson({ok:true,id},201);
    }
    // Se a finalização falhar, tentar remover o objeto e marcar a tentativa.
    await supabaseAdmin.storage.from(PHOTO_BUCKET).remove([path]);
    await supabaseAdmin.from("pq_event_photos").update({status:"failed"}).eq("id",id).eq("event_id",context.event.id).eq("status","uploading");
    return photoJson({error:"Envio não concluído. Tente novamente."},503);
  } catch { return photoJson({error:"Não foi possível enviar a foto. Tente novamente."},503); }
}

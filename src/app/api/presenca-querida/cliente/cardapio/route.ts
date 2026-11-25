import { getPresencaAuthContext } from "@/lib/presenca-auth";
import { getPresencaPublicEventExtras, isDaniela50Event, DANIELA50_FALLBACK_EVENT } from "@/lib/presenca-daniela50";
import { formatDateBR } from "@/lib/presenca-querida";
import { loadPhotoSettings, photoLinks, photoJson } from "@/lib/presenca-photos";
import { buildPresencaMenuPdf } from "@/lib/presenca-menu-pdf";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export async function GET(request:Request){
  const auth=await getPresencaAuthContext(request);if(!auth.ok)return auth.response;
  try{const {event,eventId}=auth.context;const settings=await loadPhotoSettings(eventId);if(!settings)return photoJson({error:"Inicialize as memórias do evento antes de gerar o cardápio."},409);
    const preview=new URL(request.url).searchParams.get("preview")==="1";
    const url=photoLinks(event.slug,settings,preview?new URL(request.url).origin:undefined).upload;
    const extras=getPresencaPublicEventExtras(event);
    const date=isDaniela50Event(event)?DANIELA50_FALLBACK_EVENT.event_date:event.event_date;
    const pdf=buildPresencaMenuPdf({name:event.name,date:formatDateBR(date),sections:extras.menuSections,uploadUrl:url,preview,hostName:isDaniela50Event(event)?"Dani":event.host_name||undefined});
    return new Response(new Uint8Array(pdf),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="cardapio-${preview?"preview":"a5"}.pdf"`,"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer","X-Robots-Tag":"noindex, nofollow"}});
  }catch(e){return photoJson({error:e instanceof Error&&/A5|cardápio|evento longo/i.test(e.message)?e.message:"Não foi possível gerar o cardápio. Confira a configuração."},400);}
}

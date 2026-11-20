import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { aeScope, allowed, isUuid, safeError } from '@/lib/atendimento-inteligente/security';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{id:string}> };
type Payload = {
  summary?: string; materialsCents?: number; laborCents?: number; otherCents?: number;
  validityDays?: number; dates?: string[]; action?: string; quoteId?: string;
  chosenDate?: string; defaultValidityDays?: number;
};
function validMoney(x: unknown): x is number { return typeof x === "number" && Number.isSafeInteger(x) && x >= 0 && x <= 100000000; }
function validDay(x: unknown): x is string {
  if (typeof x !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x)) return false;
  return !Number.isNaN(Date.parse(`${x}T12:00:00Z`)) && new Date(`${x}T12:00:00Z`).toISOString().slice(0,10) === x;
}
async function scoped(request: NextRequest, id: string) {
  const scope = await aeScope(request);
  if (!scope) return { error: NextResponse.json({error:'Sessão necessária.'},{status:401}) };
  if (!isUuid(id)) return { error: NextResponse.json({error:'Pedido inválido.'},{status:400}) };
  const {data: item,error: readErr} = await supabaseAdmin.from('ae_ai_requests').select('id,organization_id,status').eq('id',id).maybeSingle();
  if (readErr) throw readErr;
  if (!item || !allowed(scope,item.organization_id)) return {error:NextResponse.json({error:'Pedido não encontrado.'},{status:404})};
  const {data: roles,error: roleErr} = await supabaseAdmin.from('ae_ai_memberships')
    .select('role').eq('organization_id',item.organization_id).eq('user_id',scope.userId);
  if (roleErr) throw roleErr;
  return {scope,item,canManage:scope.platformAdmin || (roles ?? []).some(x=>x.role==='owner')};
}
export async function GET(request:NextRequest,{params}:Context) {
  try {
    const {id}=await params;const s=await scoped(request,id);if(s.error)return s.error;
    const orgId=s.item!.organization_id;
    const [{data:quote,error:qErr},{data:settings,error:sErr}] = await Promise.all([
      supabaseAdmin.from('ae_ai_quotes').select('id,summary,materials_cents,labor_cents,other_cents,total_cents,valid_until,proposed_dates,chosen_date,status,sent_at,reminder_sent_at,created_at').eq('organization_id',orgId).eq('request_id',id).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(1).maybeSingle(),
      supabaseAdmin.from('ae_ai_quote_settings').select('default_validity_days,reminder_hours').eq('organization_id',orgId).maybeSingle(),
    ]);
    if(qErr)throw qErr;if(sErr)throw sErr;
    return NextResponse.json({quote:quote??null,settings:settings??{default_validity_days:7,reminder_hours:24},canManage:s.canManage});
  }catch(e){return NextResponse.json({error:safeError(e)},{status:500});}
}
export async function POST(request:NextRequest,{params}:Context) {
  try {
    const {id}=await params;const s=await scoped(request,id);if(s.error)return s.error;
    if(!s.canManage)return NextResponse.json({error:'Somente o proprietário N2 ou administrador AE pode elaborar orçamento.'},{status:403});
    const body=await request.json() as Payload;
    const summary=String(body.summary??'').trim();
    const dates=body.dates;
    if(summary.length<10||summary.length>3000||!validMoney(body.materialsCents)||!validMoney(body.laborCents)||!validMoney(body.otherCents)
      ||typeof body.validityDays !== "number"||!Number.isInteger(body.validityDays)||body.validityDays<1||body.validityDays>30
      ||!Array.isArray(dates)||dates.length<2||dates.length>3||!dates.every(validDay)||new Set(dates).size!==dates.length) {
      return NextResponse.json({error:'Confira descrição, valores, validade (1–30 dias) e 2 ou 3 datas distintas.'},{status:400});
    }
    const {data,error}=await supabaseAdmin.rpc('ae_ai_create_quote_v3',{
      p_organization_id:s.item!.organization_id,p_request_id:id,p_actor_id:s.scope!.userId,p_summary:summary,
      p_materials_cents:body.materialsCents,p_labor_cents:body.laborCents,p_other_cents:body.otherCents,
      p_validity_days:body.validityDays,p_proposed_dates:dates,
    });
    if(error)throw error;
    return NextResponse.json({ok:true,quoteId:data},{status:201});
  }catch(e){return NextResponse.json({error:safeError(e)},{status:500});}
}
export async function PATCH(request:NextRequest,{params}:Context) {
  try {
    const {id}=await params;const s=await scoped(request,id);if(s.error)return s.error;
    if(!s.canManage)return NextResponse.json({error:'Somente N2 pode alterar o orçamento.'},{status:403});
    const body=await request.json() as Payload;
    if(body.action==='settings') {
      if(typeof body.defaultValidityDays !== "number"||!Number.isInteger(body.defaultValidityDays)||body.defaultValidityDays<1||body.defaultValidityDays>30)
        return NextResponse.json({error:'A validade padrão deve ser de 1 a 30 dias.'},{status:400});
      const {error}=await supabaseAdmin.from('ae_ai_quote_settings').upsert({
        organization_id:s.item!.organization_id,default_validity_days:body.defaultValidityDays,
        reminder_hours:24,updated_by:s.scope!.userId,updated_at:new Date().toISOString(),
      },{onConflict:'organization_id'});
      if(error)throw error;return NextResponse.json({ok:true});
    }
    if(!isUuid(body.quoteId)||!['sent','accepted','declined','expired','reminded'].includes(body.action??''))
      return NextResponse.json({error:'Ação inválida.'},{status:400});
    if(body.action==='accepted'&&!validDay(body.chosenDate))
      return NextResponse.json({error:'Selecione uma das datas propostas.'},{status:400});
    const {data,error}=await supabaseAdmin.rpc('ae_ai_transition_quote_v3',{
      p_organization_id:s.item!.organization_id,p_request_id:id,p_quote_id:body.quoteId,
      p_actor_id:s.scope!.userId,p_action:body.action,
      p_chosen_date:body.action==='accepted'?body.chosenDate:null,
    });
    if(error)throw error;
    return NextResponse.json({ok:Boolean(data)});
  }catch(e){return NextResponse.json({error:safeError(e)},{status:500});}
}

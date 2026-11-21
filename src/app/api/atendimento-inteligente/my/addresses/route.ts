import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rmcActor, customerIsActive } from '@/lib/atendimento-inteligente/customer-auth';
import { safeError } from '@/lib/atendimento-inteligente/security';
export const dynamic = 'force-dynamic';
export async function GET(request: Request){
 try{
  const actor=await rmcActor(request);
  if(actor?.role!=='customer'||!customerIsActive(actor.customer!)||actor.customer!.must_change_password)
    return NextResponse.json({error:'Acesso nao autorizado.'},{status:403});
  const {data,error}=await supabaseAdmin.from('ae_ai_customer_addresses')
   .select('id,label,cep,street,number,complement,neighborhood,city,state')
   .eq('organization_id',actor.organizationId).eq('contact_id',actor.customer!.contact_id)
   .order('created_at',{ascending:false}).limit(50);
  if(error)throw error;
  const {data:recipients,error:recipientError}=await supabaseAdmin.from('ae_ai_rmc_saved_recipients')
    .select('id,name,phone,relationship,contact_channel,address_id').eq('organization_id',actor.organizationId)
    .eq('owner_user_id',actor.userId).eq('customer_id',actor.customer!.id).order('updated_at',{ascending:false}).limit(200);
  if(recipientError)throw recipientError;
  const ids=(recipients??[]).map(r=>r.address_id);
  const {data:locations,error:locationError}=ids.length?await supabaseAdmin.from('ae_ai_customer_addresses')
    .select('id,label,cep,street,number,complement,neighborhood,city,state').eq('organization_id',actor.organizationId)
    .eq('contact_id',actor.customer!.contact_id).in('id',ids):{data:[],error:null};
  if(locationError)throw locationError;
  const byId=new Map((locations??[]).map(a=>[a.id,a]));
  return NextResponse.json({addresses:data??[],recipients:(recipients??[]).filter(r=>byId.has(r.address_id)).map(r=>({...r,address:byId.get(r.address_id)}))});
 }catch(err){return NextResponse.json({error:safeError(err)},{status:500});}
}
